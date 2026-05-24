import SwiftUI

/// Paired watchOS companion. Read-only mirror of the iPhone Studio:
/// streak, active render queue, today's pick hook. No network calls —
/// the iPhone pushes a fresh `SharedAppState` via `WatchSyncBridge`
/// every time it saves, and the watch persists that snapshot to its
/// App Group so the complication's `TimelineProvider` can render it
/// without a round-trip.
@main
struct ClipForgeWatchApp: App {
    init() {
        // Touch the bridge so WCSession activates immediately on launch.
        // Without this the watch wouldn't pick up the iPhone's context
        // until the user explicitly opened the app and triggered a
        // first state load.
        _ = WatchSyncBridge.shared
    }

    var body: some Scene {
        WindowGroup {
            WatchHomeView()
        }
    }
}
