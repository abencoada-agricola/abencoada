import Foundation
import CryptoKit
import Security

/// The queue is encrypted at rest; its key survives process restarts in Keychain.
enum OfflineStore {
    private static let keyQuery: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "br.com.abencoada.diesel.offline",
        kSecAttrAccount as String: "queue-key"
    ]
    private static func key() throws -> SymmetricKey {
        var query = keyQuery
        query[kSecReturnData as String] = true
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecSuccess, let data = result as? Data { return SymmetricKey(data: data) }
        guard status == errSecItemNotFound else { throw failure() }
        let key = SymmetricKey(size: .bits256)
        query = keyQuery
        query[kSecValueData as String] = key.withUnsafeBytes { Data($0) }
        query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        guard SecItemAdd(query as CFDictionary, nil) == errSecSuccess else { throw failure() }
        return key
    }
    private static func file() throws -> URL {
        let directory = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
            .appendingPathComponent("OfflineSync", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        var excluded = directory
        var values = URLResourceValues(); values.isExcludedFromBackup = true
        try excluded.setResourceValues(values)
        return directory.appendingPathComponent("queue.aesgcm")
    }
    static func read() throws -> OfflineQueue {
        let url = try file()
        guard FileManager.default.fileExists(atPath: url.path) else { return OfflineQueue(state: [:]) }
        let plaintext = try AES.GCM.open(AES.GCM.SealedBox(combined: Data(contentsOf: url)), using: key())
        guard let state = try JSONSerialization.jsonObject(with: plaintext) as? [String: Any] else { throw failure() }
        return OfflineQueue(state: state)
    }
    static func write(_ queue: OfflineQueue) throws {
        let plaintext = try JSONSerialization.data(withJSONObject: queue.state, options: [.sortedKeys])
        guard let encrypted = try AES.GCM.seal(plaintext, using: key()).combined else { throw failure() }
        try encrypted.write(to: file(), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    private static func failure() -> NSError {
        NSError(domain: "OfflineSync", code: 2, userInfo: [NSLocalizedDescriptionKey: "Não foi possível abrir o armazenamento seguro. Os registros foram preservados."])
    }
}
