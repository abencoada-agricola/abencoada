import Foundation

@main struct OfflineQueueTests {
    static func main() throws {
        var queue = OfflineQueue(state: [:])
        try queue.configure(user: "operator", token: "lease", url: "https://example.com", apikey: "public")
        let refuel: [String: Any] = ["id": "r1", "kind": "refuel", "fleet": "123", "localCode": "1", "materialCode": "9", "liters": 20]
        queue.mirror([refuel])
        do {
            try queue.configure(user: "other", token: "other", url: "https://example.com", apikey: "public")
            fatalError("Account switch discarded pending records")
        } catch { }
        assert(queue.user == "operator" && queue.records.count == 1)
        assert(!queue.receive(["id": "wrong"], for: refuel, user: "operator"))
        assert(!queue.receive(["id": "r1"], for: refuel, user: "other"))
        assert(queue.records.count == 1 && queue.acks.isEmpty)
        assert(!queue.receive(["error": "Leitura inválida", "status": 422], for: refuel, user: "operator"))
        assert(queue.records.count == 1 && queue.errors.count == 1)
        var correction = refuel; correction["liters"] = 30
        queue.mirror([correction])
        assert(queue.errors.isEmpty && queue.records.count == 1)
        assert(!queue.receive(["id": "r1"], for: refuel, user: "operator"), "Stale upload must not remove an edited record")
        assert(queue.receive(["id": "r1", "recorderEnd": 1234.5], for: correction, user: "operator"))
        assert(queue.records.isEmpty && queue.acks.count == 1)
        assert(queue.acks[0]["recorderEnd"] as? Double == 1234.5)
        queue.mirror([correction])
        assert(queue.records.isEmpty, "An unacknowledged receipt must prevent re-upload")
        do {
            try queue.configure(user: "other", token: "other", url: "https://example.com", apikey: "public")
            fatalError("Account switch discarded unacknowledged receipt")
        } catch { }
        // A process restart keeps both receipts and failed records.
        let data = try JSONSerialization.data(withJSONObject: queue.state)
        queue = OfflineQueue(state: try JSONSerialization.jsonObject(with: data) as! [String: Any])
        assert(queue.acks.count == 1)
        queue.acknowledge(["unknown"]); assert(queue.acks.count == 1)
        queue.acknowledge(["r1"]); assert(queue.acks.isEmpty)
        try queue.configure(user: "other", token: "other", url: "https://example.com", apikey: "public")
        assert(queue.user == "other" && queue.errors.isEmpty)
        let refuelDependencies = OfflineQueue.dependencies(refuel)
        assert(refuelDependencies == ["fleet:123", "local:1:9"])
        let checklist: [String: Any] = ["kind": "checklist", "fleet": "123"]
        assert(OfflineQueue.dependencies(checklist).isDisjoint(with: refuelDependencies))
        let transfer: [String: Any] = ["kind": "transfer", "localCode": "1", "materialCode": "9", "destination": "2"]
        assert(OfflineQueue.dependencies(transfer) == ["local:1:9", "local:2:9"])
        assert(!OfflineQueue.dependencies(transfer).isDisjoint(with: refuelDependencies))
        let occurrence: [String: Any] = ["id": "photo1", "kind": "occurrence", "notes": "OCORRÊNCIA", "photo": "data:image/jpeg;base64,/9j/AA=="]
        assert(OfflineQueue.dependencies(occurrence).isEmpty)
        queue.mirror([occurrence])
        let restart = OfflineQueue(state: try JSONSerialization.jsonObject(with: JSONSerialization.data(withJSONObject: queue.state)) as! [String: Any])
        assert(NSDictionary(dictionary: restart.records[0]).isEqual(to: occurrence))
        assert(!queue.receive(["error": "Sessão expirada", "status": 401], for: occurrence, user: "other"))
        assert(queue.records.count == 1 && queue.errors.count == 1)
        try queue.configure(user: "other", token: "renewed", url: "https://example.com", apikey: "public")
        assert(queue.records.count == 1, "Lease renewal must preserve the queue")
        assert(queue.receive(["id": "photo1"], for: occurrence, user: "other"))
        assert(queue.errors.isEmpty && queue.acks.count == 1)
        print("iOS offline queue: account isolation, edits, retries, errors, receipts, photos, restart and dependencies passed.")
    }
}
