import Foundation
import StoreKit
import UIKit

/// Decides when to fire `SKStoreReviewController.requestReview`. We only get
/// 3 prompts per user per 365 days from Apple, so we'd better fire them at
/// real-success moments, not arbitrary launches.
///
/// Heuristic — fire on the user's first **save-to-photos** that lands after
/// they've successfully completed at least one render. That's the magic
/// moment: they have a clip they're happy with AND just made a deliberate
/// "I want to keep this" gesture. Conversion is much higher than on launch.
enum ReviewPrompt {

    private static let SAVED_COUNT_KEY = "clipforge.review.savedClipCount"
    private static let LAST_PROMPT_KEY = "clipforge.review.lastPromptAt"

    /// Record that the user just saved a clip. Calls into Apple's review
    /// prompt on the right boundary (1st + 5th save).
    @MainActor
    static func markSavedClip() {
        let defaults = UserDefaults.standard
        let count = defaults.integer(forKey: SAVED_COUNT_KEY) + 1
        defaults.set(count, forKey: SAVED_COUNT_KEY)

        // Threshold gates — only ask at the 1st and 5th save, and never more
        // often than once per 30 days.
        let isFirstSave = count == 1
        let isFifthSave = count == 5
        guard isFirstSave || isFifthSave else { return }

        let lastAt = defaults.double(forKey: LAST_PROMPT_KEY)
        let now = Date().timeIntervalSince1970
        if now - lastAt < 30 * 86_400 { return }

        // Apple's modern API targets a window scene
        guard let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive })
                as? UIWindowScene else {
            return
        }
        SKStoreReviewController.requestReview(in: scene)
        defaults.set(now, forKey: LAST_PROMPT_KEY)
    }
}
