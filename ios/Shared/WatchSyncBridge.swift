import Foundation
#if canImport(WatchConnectivity)
import WatchConnectivity
#endif
#if canImport(WidgetKit)
import WidgetKit
#endif

/// Mirrors `SharedAppState` between the paired iPhone and Apple Watch.
///
/// • iPhone activates a WCSession and ships the latest snapshot via
///   `updateApplicationContext` every time `SharedAppState.save()` runs.
/// • Watch listens for that context, writes it into the watch-side
///   App Group UserDefaults (so the watch widget's TimelineProvider can
///   read it without any iPhone round-trip), and nudges `WidgetCenter`
///   to reload complication timelines.
///
/// `updateApplicationContext` (not `sendMessage`) is the right tool here:
///   - delivered even when the counterpart app isn't running
///   - automatically coalesced — we only ever care about the latest snapshot
///   - cheap power-wise
///
/// We intentionally don't expose this on watchOS-side as a "push" API —
/// the watch is a read-only mirror in this app. Server writes (and any
/// resulting state changes) always originate on iPhone.
final class WatchSyncBridge: NSObject {
    static let shared = WatchSyncBridge()

    private override init() {
        super.init()
        #if canImport(WatchConnectivity)
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        session.delegate = self
        session.activate()
        #endif
    }

    /// Push the latest snapshot to the paired counterpart. Safe to call
    /// from anywhere — silently no-ops on unsupported platforms (iPad,
    /// macOS) and when the session hasn't activated yet. The next
    /// `save()` will retry; the watch always has its last-written
    /// snapshot on disk regardless.
    func push(_ state: SharedAppState) {
        #if canImport(WatchConnectivity)
        guard WCSession.isSupported() else { return }
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        guard let data = try? JSONEncoder().encode(state) else { return }
        do {
            try session.updateApplicationContext(["state": data])
        } catch {
            // Drop quietly — coalescing means a stale failed update
            // gets replaced by the next successful one anyway.
        }
        #endif
    }
}

#if canImport(WatchConnectivity)
extension WatchSyncBridge: WCSessionDelegate {
    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        // On activation the OS may already have a pending context for
        // us (delivered while the app was asleep). Drain it.
        if let data = session.receivedApplicationContext["state"] as? Data,
           let state = try? JSONDecoder().decode(SharedAppState.self, from: data) {
            persistFromCounterpart(state)
        }
    }

    func session(_ session: WCSession,
                 didReceiveApplicationContext applicationContext: [String: Any]) {
        guard let data = applicationContext["state"] as? Data,
              let state = try? JSONDecoder().decode(SharedAppState.self, from: data)
        else { return }
        persistFromCounterpart(state)
    }

    #if os(iOS)
    // iOS-only stubs that WCSessionDelegate requires. They fire when
    // the user pairs/unpairs the watch — re-activate so future updates
    // keep flowing.
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
    #endif

    /// Watch-side persistence: write the incoming snapshot to the watch
    /// App Group UserDefaults and bump widget timelines. iPhone-side: we
    /// don't echo state from watch → phone in this app, so nothing to do.
    private func persistFromCounterpart(_ state: SharedAppState) {
        #if os(watchOS)
        SharedAppState.writeRaw(state)
        #endif
    }
}
#endif
