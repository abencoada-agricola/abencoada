import Capacitor
import UIKit

class BridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(OfflineSyncPlugin())
        webView?.isOpaque = false
        webView?.backgroundColor = UIColor(red: 25/255, green: 60/255, blue: 43/255, alpha: 1)
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
    }
}
