import Foundation

/// Sign-up, the 6-digit email code and the plan (docs/DENTVIDEO_IAP_PLAN.md §6).
extension APIClient {
    /// POST signup { email, password, elapsedMs, locale }. A session in the answer is kept (Keychain)
    /// at once: the email code that follows needs it.
    public func signUp(email: String, password: String, elapsedMs: Int) async throws -> SignupOutcome {
        struct Body: Encodable { let email: String; let password: String; let elapsedMs: Int; let locale: String }
        let body = Body(email: email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), password: password, elapsedMs: max(0, elapsedMs), locale: languageCode)
        let answer: SignupAnswer = try await send("signup", method: "POST", body: body, auth: false)
        let outcome = SignupOutcome.of(answer)
        if case let .signedIn(tokens) = outcome { store.save(tokens) }
        return outcome
    }

    public enum VerifyAction: Sendable { case send, confirm(code: String) }

    /// POST verify-email: `send` emails a code (once a minute; a code already waiting is not re-sent
    /// with `onlyIfNone`), `confirm` checks one. A wrong code is `APIError.refused` with the
    /// server's sentence ("That code doesn't match. 4 tries left.").
    public func verifyEmail(_ action: VerifyAction, onlyIfNone: Bool = false) async throws -> VerifyEmailAnswer {
        switch action {
        case .send:
            struct Body: Encodable { let action = "send"; let onlyIfNone: Bool; let locale: String }
            return try await send("verify-email", method: "POST", body: Body(onlyIfNone: onlyIfNone, locale: languageCode))
        case let .confirm(code):
            struct Body: Encodable { let action = "confirm"; let code: String }
            return try await send("verify-email", method: "POST", body: Body(code: SignupRules.code(code)))
        }
    }

    /// GET billing: the plan, where it is managed and whether the paywall may open. Never a price.
    public func billing() async throws -> BillingInfo { try await send("billing") }
}
