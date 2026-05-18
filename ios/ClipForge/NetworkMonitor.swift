import Foundation
import Network
import Combine

/// Observes network reachability so the UI can show an offline banner instead
/// of letting calls silently 0-byte fail. Cheap — one shared NWPathMonitor.
@MainActor
final class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()

    @Published private(set) var isReachable: Bool = true
    @Published private(set) var isExpensive: Bool = false

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "clipforge.network-monitor", qos: .utility)

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                guard let self else { return }
                let reachable = path.status == .satisfied
                if self.isReachable != reachable {
                    self.isReachable = reachable
                    if !reachable {
                        AppState.shared.flashError("Offline — your changes will retry when back online.")
                    }
                }
                self.isExpensive = path.isExpensive
            }
        }
        monitor.start(queue: queue)
    }

    deinit { monitor.cancel() }
}
