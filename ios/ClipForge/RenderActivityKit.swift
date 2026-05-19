import Foundation
import ActivityKit

/// Mirror of the ActivityAttributes declared in the widget extension.
/// Swift's ActivityKit requires the exact same struct definition to be
/// linked into BOTH targets — the simplest way (no shared package) is to
/// duplicate the type with identical fields.
public struct RenderActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var stage: String
        public var progress: Int
        public var clipsReady: Int
    }
    public var jobTitle: String
    public var totalClipsExpected: Int
}

/// Thin wrapper around iOS 16.2+ ActivityKit for our render pipeline.
/// One activity per job; identified by jobId so updates from any view can
/// find the right one.
@MainActor
final class RenderActivityKit {

    private static var activities: [String: Activity<RenderActivityAttributes>] = [:]

    static var isAvailable: Bool {
        if #available(iOS 16.2, *) {
            return ActivityAuthorizationInfo().areActivitiesEnabled
        }
        return false
    }

    /// Start a new Live Activity for a freshly created job. The widget
    /// renders on the user's Lock Screen + Dynamic Island until we call
    /// `end(jobId:)`.
    static func start(jobId: String, title: String, expectedClips: Int = 0) {
        guard #available(iOS 16.2, *), isAvailable else { return }
        guard activities[jobId] == nil else { return }
        let attrs = RenderActivityAttributes(
            jobTitle: title.isEmpty ? "ClipForge render" : title,
            totalClipsExpected: expectedClips
        )
        let state = RenderActivityAttributes.ContentState(
            stage: "transcribing",
            progress: 0,
            clipsReady: 0
        )
        do {
            let activity = try Activity<RenderActivityAttributes>.request(
                attributes: attrs,
                content: ActivityContent(state: state, staleDate: Date().addingTimeInterval(15 * 60)),
                pushType: nil
            )
            activities[jobId] = activity
        } catch {
            // If the OS rejects (rate-limit, no permission, etc.) just skip —
            // the in-app progress UI still works.
            print("Live Activity start failed: \(error)")
        }
    }

    /// Push a fresh content state. Throttle on the caller; OS rate-limits
    /// updates to roughly 1/sec.
    static func update(jobId: String, stage: String, progress: Int, clipsReady: Int) {
        guard #available(iOS 16.2, *) else { return }
        guard let activity = activities[jobId] else { return }
        let state = RenderActivityAttributes.ContentState(
            stage: stage,
            progress: max(0, min(100, progress)),
            clipsReady: max(0, clipsReady)
        )
        Task {
            await activity.update(
                ActivityContent(state: state, staleDate: Date().addingTimeInterval(15 * 60))
            )
        }
    }

    /// End the activity. `dismissAfter` controls how long the final state
    /// lingers on screen (Apple recommends 0…4h so users can review).
    static func end(jobId: String, finalStage: String, progress: Int, clipsReady: Int, dismissAfter: TimeInterval = 120) {
        guard #available(iOS 16.2, *) else { return }
        guard let activity = activities[jobId] else { return }
        let state = RenderActivityAttributes.ContentState(
            stage: finalStage,
            progress: progress,
            clipsReady: clipsReady
        )
        Task {
            await activity.end(
                ActivityContent(state: state, staleDate: nil),
                dismissalPolicy: .after(Date().addingTimeInterval(dismissAfter))
            )
            await MainActor.run { activities.removeValue(forKey: jobId) }
        }
    }
}
