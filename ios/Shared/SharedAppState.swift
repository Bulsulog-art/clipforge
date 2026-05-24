import Foundation

/// Cross-process state shared between the main ClipForge app and any
/// extensions (widget, notification service, future Apple Watch). Backed
/// by App Group UserDefaults so reads/writes are durable, instant, and
/// don't require an XPC round-trip.
///
/// The widget reads this from a timeline provider — never makes network
/// calls itself (Supabase SDK would blow the 30MB extension memory cap).
/// The main app writes whenever ProjectsView loads or a new clip lands.
struct SharedAppState: Codable, Equatable {
    /// Active jobs (anything not in ready/failed). Drives the "X rendering"
    /// pill in the widget.
    var activeJobs: Int

    /// Ready clips this week. Quick-glance social proof for the user.
    var readyThisWeek: Int

    /// Current daily streak in days. Shown with a flame icon when > 0.
    var streak: Int

    /// Headline hook from today's pick (truncated to 120 chars when stored).
    /// Empty when no pick has been fetched yet.
    var todaysPickHook: String

    /// Niche string for the pick — surfaces a tiny pill in the medium widget.
    var todaysPickNiche: String

    /// Timestamp of last write — widgets render "Updated 2m ago" footer.
    var updatedAt: Date

    static let empty = SharedAppState(
        activeJobs: 0,
        readyThisWeek: 0,
        streak: 0,
        todaysPickHook: "",
        todaysPickNiche: "",
        updatedAt: .distantPast
    )

    // MARK: - Storage

    /// Must match the App Group on both ClipForge.entitlements and
    /// ClipForgeWidgets.entitlements. Hard-coded so an accidental rename
    /// here loses widget state visibly (rather than silently shadow-defaults).
    private static let suiteName = "group.com.bulsulabs.clipforge"
    private static let key = "clipforge.shared.state.v1"

    private static var defaults: UserDefaults? {
        UserDefaults(suiteName: suiteName)
    }

    /// Read the latest snapshot. Returns `.empty` if no write has happened
    /// yet (first launch, fresh install) so callers always have a value.
    static func load() -> SharedAppState {
        guard let data = defaults?.data(forKey: key),
              let state = try? JSONDecoder().decode(SharedAppState.self, from: data) else {
            return .empty
        }
        return state
    }

    /// Persist + nudge WidgetCenter so the home-screen widget refreshes
    /// at the next system opportunity (Apple throttles to ~once per 5–15min
    /// for free-text widget kinds, but we should still call it). On iOS
    /// we also forward the snapshot to the paired Apple Watch via the
    /// bridge — the watch keeps its own App Group copy + reloads its
    /// complication timelines.
    static func save(_ state: SharedAppState) {
        writeRaw(state)
        #if os(iOS)
        WatchSyncBridge.shared.push(state)
        #endif
    }

    /// Bare-bones write path used by both `save()` (iPhone) and the
    /// WatchConnectivity bridge (watchOS, when an inbound context lands).
    /// Persists to App Group UserDefaults and reloads widget timelines.
    /// Doesn't push to the watch — the iPhone-only branch in `save()` is
    /// what triggers the bridge, so we avoid a state echo loop here.
    static func writeRaw(_ state: SharedAppState) {
        guard let data = try? JSONEncoder().encode(state) else { return }
        defaults?.set(data, forKey: key)

        #if canImport(WidgetKit)
        WidgetCenter.shared.reloadAllTimelines()
        #endif
    }
}

#if canImport(WidgetKit)
import WidgetKit
#endif
