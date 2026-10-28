import Capacitor
import Foundation

@objc(OfflineSyncPlugin)
public class OfflineSyncPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OfflineSyncPlugin"
    public let jsName = "OfflineSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "configure", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "mirror", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledge", returnType: CAPPluginReturnPromise)
    ]
    @objc func configure(_ call: CAPPluginCall) {
        transact(call) { queue in
            guard let user = call.getString("userId"), !user.isEmpty,
                  let token = call.getString("token"), !token.isEmpty,
                  let url = call.getString("url"), url == OfflineSyncCoordinator.server,
                  let apikey = call.getString("apikey"), !apikey.isEmpty else {
                throw NSError(domain: "OfflineSync", code: 3, userInfo: [NSLocalizedDescriptionKey: "Configuração de envio inválida."])
            }
            try queue.configure(user: user, token: token, url: url, apikey: apikey)
            return [:]
        }
    }
    @objc func mirror(_ call: CAPPluginCall) {
        transact(call) { queue in
            guard call.getString("userId") == queue.user, !queue.user.isEmpty else { return ["ready": false] }
            guard let incoming = call.getArray("queue", [String: Any].self) else {
                throw NSError(domain: "OfflineSync", code: 4, userInfo: [NSLocalizedDescriptionKey: "Fila de envio inválida."])
            }
            queue.mirror(incoming)
            return ["ready": true, "acks": queue.acks, "errors": queue.errors]
        }
    }
    @objc func acknowledge(_ call: CAPPluginCall) {
        transact(call) { queue in
            if call.getString("userId") == queue.user { queue.acknowledge(call.getArray("ids", String.self) ?? []) }
            return [:]
        }
    }
    private func transact(_ call: CAPPluginCall, change: @escaping (inout OfflineQueue) throws -> JSObject) {
        OfflineSyncCoordinator.shared.storage.async {
            do {
                var queue = try OfflineStore.read()
                let result = try change(&queue)
                try OfflineStore.write(queue)
                call.resolve(result)
                OfflineSyncCoordinator.shared.schedule()
            } catch { call.reject(error.localizedDescription) }
        }
    }
}
