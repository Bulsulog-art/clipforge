import AppIntents
import Foundation

/// App Intents — let users invoke ClipForge from Siri, Spotlight search,
/// and Shortcuts without opening the app. All read from SharedAppState
/// (App Group UserDefaults) so the intent fires instantly without a
/// Supabase round-trip.
///
/// Apple surfaces these via AppShortcutsProvider — iOS auto-suggests
/// the phrases in Spotlight + Siri once the app has been launched once.

/// "Hey Siri, what's my ClipForge streak?"
struct ShowStreakIntent: AppIntent {
    static var title: LocalizedStringResource = "Show streak"
    static var description: IntentDescription? = IntentDescription(
        "Reports your current day-streak in ClipForge."
    )
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some ProvidesDialog {
        let state = SharedAppState.load()
        let dialog: IntentDialog
        if state.streak == 0 {
            dialog = IntentDialog("You haven't started a streak yet. Render a clip today to begin.")
        } else if state.streak == 1 {
            dialog = IntentDialog("You're on a 1-day ClipForge streak. Keep it going!")
        } else {
            dialog = IntentDialog("You're on a \(state.streak)-day ClipForge streak. Keep it alive!")
        }
        return .result(dialog: dialog)
    }
}

/// "Hey Siri, how many ClipForge clips this week?"
struct CountClipsIntent: AppIntent {
    static var title: LocalizedStringResource = "Count clips this week"
    static var description: IntentDescription? = IntentDescription(
        "Tells you how many clips ClipForge has rendered for you in the last 7 days."
    )
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some ProvidesDialog {
        let state = SharedAppState.load()
        let n = state.readyThisWeek
        let dialog: IntentDialog
        switch n {
        case 0:  dialog = IntentDialog("No clips ready this week. Open ClipForge to start a render.")
        case 1:  dialog = IntentDialog("You have 1 clip ready this week.")
        default: dialog = IntentDialog("You have \(n) clips ready this week.")
        }
        return .result(dialog: dialog)
    }
}

/// "Hey Siri, open ClipForge Studio" — launches the app to the Studio tab.
struct OpenStudioIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Studio"
    static var description: IntentDescription? = IntentDescription(
        "Opens ClipForge straight to the Studio tab."
    )
    /// This one DOES open the app so the user can act on the Studio.
    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        // Hand off to the app — once it foregrounds, RootView's existing
        // routing puts the user on Studio. No extra wiring needed because
        // .studio is already AppState's default tab.
        .result()
    }
}

/// Tells iOS which shortcuts to surface in Spotlight + Siri suggestions.
/// Each AppShortcut gets multiple natural-language phrases; users see
/// these as proactive suggestions once the app has been launched.
struct ClipForgeAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: ShowStreakIntent(),
            phrases: [
                "Show my \(.applicationName) streak",
                "What's my \(.applicationName) streak",
            ],
            shortTitle: "Show streak",
            systemImageName: "flame.fill"
        )
        AppShortcut(
            intent: CountClipsIntent(),
            phrases: [
                "How many clips this week in \(.applicationName)",
                "Count my \(.applicationName) clips",
            ],
            shortTitle: "Count clips",
            systemImageName: "scissors"
        )
        AppShortcut(
            intent: OpenStudioIntent(),
            phrases: [
                "Open \(.applicationName) Studio",
                "Take me to the \(.applicationName) Studio",
            ],
            shortTitle: "Open Studio",
            systemImageName: "wand.and.stars"
        )
    }
}
