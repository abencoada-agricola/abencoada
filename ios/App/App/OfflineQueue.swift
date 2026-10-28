import Foundation

/// Shared state rules, independent of Capacitor and background scheduling.
struct OfflineQueue {
    var state: [String: Any]
    var user: String { state["userId"] as? String ?? "" }
    var records: [[String: Any]] { state["queue"] as? [[String: Any]] ?? [] }
    var acks: [[String: Any]] { state["acks"] as? [[String: Any]] ?? [] }
    var errors: [[String: Any]] { state["errors"] as? [[String: Any]] ?? [] }

    mutating func configure(user: String, token: String, url: String, apikey: String) throws {
        guard user == self.user || (records.isEmpty && acks.isEmpty) else {
            throw NSError(domain: "OfflineSync", code: 1, userInfo: [NSLocalizedDescriptionKey: "Há registros pendentes de outra conta."])
        }
        if user != self.user { state = [:] }
        state.merge(["userId": user, "token": token, "url": url, "apikey": apikey]) { _, new in new }
    }
    mutating func mirror(_ incoming: [[String: Any]]) {
        let sent = Set(acks.compactMap { $0["id"] as? String })
        state["queue"] = incoming.filter { !sent.contains($0["id"] as? String ?? "") }
        state["errors"] = errors.filter { error in
            guard let text = error["record"] as? String, let data = text.data(using: .utf8),
                  let original = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return false }
            return incoming.contains { NSDictionary(dictionary: $0).isEqual(to: original) }
        }
    }
    static func dependencies(_ record: [String: Any]) -> Set<String> {
        var result = Set<String>()
        if let local = record["localCode"], let material = record["materialCode"] {
            result.insert("local:\(local):\(material)")
        }
        if let fleet = record["fleet"] {
            result.insert("\(record["kind"] as? String == "checklist" ? "checklist" : "fleet"):\(fleet)")
        }
        if record["kind"] as? String == "transfer", let destination = record["destination"], let material = record["materialCode"] {
            result.insert("local:\(destination):\(material)")
        }
        return result
    }
    mutating func receive(_ receipt: [String: Any], for record: [String: Any], user: String) -> Bool {
        guard user == self.user, let id = record["id"] as? String,
              records.contains(where: { NSDictionary(dictionary: $0).isEqual(to: record) }) else { return false }
        if let message = receipt["error"] as? String {
            var failures = errors.filter { $0["id"] as? String != id }
            let data = try? JSONSerialization.data(withJSONObject: record, options: [.sortedKeys])
            failures.append(["id": id, "message": message, "data": receipt,
                             "record": String(data: data ?? Data(), encoding: .utf8) ?? "null"])
            state["errors"] = failures
            return false
        }
        guard receipt["id"] as? String == id else { return false }
        var ack: [String: Any] = ["id": id, "userId": user]
        if let meter = receipt["recorderEnd"] as? NSNumber { ack["recorderEnd"] = meter }
        state["queue"] = records.filter { $0["id"] as? String != id }
        state["acks"] = acks.filter { $0["id"] as? String != id } + [ack]
        state["errors"] = errors.filter { $0["id"] as? String != id }
        return true
    }
    mutating func acknowledge(_ ids: [String]) {
        state["acks"] = acks.filter { !ids.contains($0["id"] as? String ?? "") }
    }
}
