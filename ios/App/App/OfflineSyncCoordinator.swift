import Foundation
import BackgroundTasks
import Network

final class OfflineSyncCoordinator {
    static let shared = OfflineSyncCoordinator()
    static let server = "https://pqsbcwmtemlwvcpkcyum.supabase.co"
    static let taskIdentifier = "br.com.abencoada.diesel.sync"
    let storage = DispatchQueue(label: "br.com.abencoada.diesel.storage")
    private let worker = OperationQueue()
    private let monitor = NWPathMonitor()
    private var scheduled = false // Access only on storage.

    private init() { worker.maxConcurrentOperationCount = 1 }
    func start() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.taskIdentifier, using: nil) { task in
            let operation = BlockOperation()
            let completion = BackgroundCompletion(task)
            operation.addExecutionBlock { [weak operation] in
                let success = self.upload { operation?.isCancelled ?? true }
                completion.finish(success)
                self.storage.async {
                    if let queue = try? OfflineStore.read(), !queue.records.isEmpty { self.requestBackgroundProcessing() }
                }
            }
            task.expirationHandler = { operation.cancel(); completion.finish(false) }
            self.worker.addOperation(operation)
        }
        monitor.pathUpdateHandler = { path in if path.status == .satisfied { self.schedule() } }
        monitor.start(queue: DispatchQueue(label: "br.com.abencoada.diesel.network"))
    }
    func schedule() {
        storage.async {
            guard let queue = try? OfflineStore.read(), !queue.records.isEmpty else { return }
            // iOS chooses when background processing runs. Foreground resume also retries.
            self.requestBackgroundProcessing()
            guard !self.scheduled else { return }
            self.scheduled = true
            self.worker.addOperation {
                _ = self.upload { false }
                self.storage.async { self.scheduled = false }
            }
        }
    }
    private func requestBackgroundProcessing() {
        let request = BGProcessingTaskRequest(identifier: Self.taskIdentifier)
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: Self.taskIdentifier)
        try? BGTaskScheduler.shared.submit(request)
    }
    @discardableResult private func upload(cancelled: () -> Bool) -> Bool {
        do {
            let snapshot = try storage.sync { try OfflineStore.read() }
            guard !snapshot.records.isEmpty else { return true }
            guard snapshot.state["url"] as? String == Self.server,
                  let token = snapshot.state["token"] as? String,
                  let apikey = snapshot.state["apikey"] as? String else { return false }
            var blocked = Set<String>(), success = true
            for record in snapshot.records {
                if cancelled() { return false }
                let dependencies = OfflineQueue.dependencies(record)
                if record["error"] != nil || !blocked.isDisjoint(with: dependencies) {
                    blocked.formUnion(dependencies); success = false; continue
                }
                // A foreground edit/removal or account change invalidates the snapshot.
                let current = try storage.sync { try OfflineStore.read() }
                guard current.user == snapshot.user else { return false }
                guard current.records.contains(where: { NSDictionary(dictionary: $0).isEqual(to: record) }) else { continue }
                do {
                    let receipt = try send(record, token: token, apikey: apikey, cancelled: cancelled)
                    let received = try storage.sync {
                        var latest = try OfflineStore.read()
                        let result = latest.receive(receipt, for: record, user: snapshot.user)
                        try OfflineStore.write(latest)
                        return result
                    }
                    if !received { blocked.formUnion(dependencies); success = false }
                } catch { blocked.formUnion(dependencies); success = false }
            }
            return success
        } catch { return false }
    }
    private func send(_ record: [String: Any], token: String, apikey: String, cancelled: () -> Bool) throws -> [String: Any] {
        var request = URLRequest(url: URL(string: Self.server + "/rest/v1/rpc/diesel_device_submit")!)
        request.httpMethod = "POST"
        request.timeoutInterval = record["photo"] == nil ? 15 : 45
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(apikey, forHTTPHeaderField: "apikey")
        request.httpBody = try JSONSerialization.data(withJSONObject: ["device_token": token, "payload": record])
        let semaphore = DispatchSemaphore(value: 0)
        var responseData: Data?, response: URLResponse?, requestError: Error?
        let task = URLSession.shared.dataTask(with: request) { data, value, error in
            responseData = data; response = value; requestError = error; semaphore.signal()
        }
        task.resume()
        while semaphore.wait(timeout: .now() + 0.2) == .timedOut {
            if cancelled() { task.cancel(); throw URLError(.cancelled) }
        }
        if let error = requestError { throw error }
        guard (response as? HTTPURLResponse)?.statusCode == 200, let data = responseData,
              let receipt = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw URLError(.badServerResponse) }
        return receipt
    }
}

// Expiration can race completion or happen while waiting behind another upload.
private final class BackgroundCompletion {
    private let task: BGTask
    private let lock = NSLock()
    private var completed = false
    init(_ task: BGTask) { self.task = task }
    func finish(_ success: Bool) {
        lock.lock()
        guard !completed else { lock.unlock(); return }
        completed = true
        lock.unlock()
        task.expirationHandler = nil
        task.setTaskCompleted(success: success)
    }
}
