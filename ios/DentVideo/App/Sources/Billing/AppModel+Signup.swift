import Foundation
import DentVideoCore

/// Sign-up in the app (docs/DENTVIDEO_IAP_PLAN.md §6): account → 6-digit code → clinic → paywall.
extension AppModel {
    /// Creates the account. On `.signedIn` the session is already in the Keychain, but the app stays
    /// on the sign-up screen for the email code; `enterApp()` opens the account after it.
    func signUp(email: String, password: String, elapsedMs: Int) async throws -> SignupOutcome {
        try await api.signUp(email: email, password: password, elapsedMs: elapsedMs)
    }

    /// After the code (or "later"): the signed-in app, which shows the clinic form, the paywall or the week.
    func enterApp() async {
        guard phase != .signedIn else { return }
        phase = .signedIn
        uploads.attach(api)
        await refresh()
        await billing.load()
    }

    /// Saves the clinic form of a new account, then reloads the account (it then has a clinic).
    /// Answers nil on success, else the sentence to show under the form.
    func createClinic(_ profile: ClinicProfile) async -> String? {
        do {
            try await api.saveClinic(profile)
            // The moment the clinic is set up: show its look before the plans.
            showLogoPreview = true
            await refresh()
            await billing.load()
            return nil
        } catch {
            if case APIError.unauthorized? = error as? APIError { handle(error); return nil }
            return message(for: error)
        }
    }
}
