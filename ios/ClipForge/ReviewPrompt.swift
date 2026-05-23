import Foundation
import StoreKit
import UIKit

/// Drives `SKStoreReviewController.requestReview` at moments of real
/// user delight, not arbitrary launches. Apple caps actual prompt
/// presentations to 3 per user per 365 days regardless of how many
/// times we call the API, so we double-gate to make every request
/// count:
///
///   1. **Per-trigger gate** — each trigger (first-save, fifth-save,
///      first-publish, 7-day-streak) fires at most once via its own
///      UserDefaults sentinel.
///   2. **Global cooldown** — no more than one request across all
///      triggers within a 90-day window. Keeps us well under Apple's
///      365/3 ceiling even if the user sprints through every trigger
///      in a single session.
enum ReviewPrompt {

    private static let SAVED_COUNT_KEY        = "clipforge.review.savedClipCount"
    private static let FIRST_PUBLISH_KEY      = "clipforge.review.firstPublishFired"
    private static let STREAK_7_KEY           = "clipforge.review.streak7Fired"
    private static let LAST_PROMPT_KEY        = "clipforge.review.lastPromptAt"
    private static let COOLDOWN_SECONDS: TimeInterval = 90 * 86_400

    // MARK: - Triggers

    /// Called from SaveToPhotos after a successful library write. Fires the
    /// review prompt on the 1st and 5th save (legacy heuristic — keeps
    /// converting because the user just made a deliberate "I want to keep
    /// this" gesture).
    @MainActor
    static func markSavedClip() {
        let count = UserDefaults.standard.integer(forKey: SAVED_COUNT_KEY) + 1
        UserDefaults.standard.set(count, forKey: SAVED_COUNT_KEY)
        if count == 1 || count == 5 {
            requestReviewIfEligible()
        }
    }

    /// Called from ClipPublishSheet after the publishClip API call returns
    /// successfully. Fires once-ever — the very first publish is the moment
    /// where the user has just verified "yes, this app actually posts for me".
    @MainActor
    static func markFirstPublish() {
        let fired = UserDefaults.standard.bool(forKey: FIRST_PUBLISH_KEY)
        if fired { return }
        UserDefaults.standard.set(true, forKey: FIRST_PUBLISH_KEY)
        requestReviewIfEligible()
    }

    /// Called when StreakService crosses a 7-day milestone. Fires once-ever
    /// at that specific milestone — bigger milestones (14, 30, 365) already
    /// have their own MilestoneBanner + confetti, no need to also ask for
    /// a review.
    @MainActor
    static func markStreakMilestone(days: Int) {
        guard days == 7 else { return }
        let fired = UserDefaults.standard.bool(forKey: STREAK_7_KEY)
        if fired { return }
        UserDefaults.standard.set(true, forKey: STREAK_7_KEY)
        requestReviewIfEligible()
    }

    // MARK: - Common gate

    /// Apply the 90-day cooldown then call into Apple's modern API. Updates
    /// the cooldown sentinel only when we actually issued the request so a
    /// silent cooldown-blocked attempt doesn't waste a quarter.
    @MainActor
    private static func requestReviewIfEligible() {
        let lastAt = UserDefaults.standard.double(forKey: LAST_PROMPT_KEY)
        let now = Date().timeIntervalSince1970
        if now - lastAt < COOLDOWN_SECONDS { return }

        guard let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive })
                as? UIWindowScene else {
            return
        }
        SKStoreReviewController.requestReview(in: scene)
        UserDefaults.standard.set(now, forKey: LAST_PROMPT_KEY)
    }
}
