import Foundation
import Supabase

@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient
    @Published var session: Session?
    /// Becomes true after the first auth state event arrives (token restore done).
    /// RootView uses this to avoid flashing LoginView for already-signed-in users.
    @Published private(set) var isRestoring: Bool = true

    private init() {
        // Route PostgREST queries to the `clipforge` schema (rather than the
        // default `public`) so every `.from("profiles")` call hits the right
        // table without needing per-call schema overrides.
        client = SupabaseClient(
            supabaseURL: Secrets.supabaseURL,
            supabaseKey: Secrets.supabaseAnonKey,
            options: SupabaseClientOptions(
                db: SupabaseClientOptions.DatabaseOptions(schema: "clipforge")
            )
        )
        Task { await observeAuth() }
    }

    func observeAuth() async {
        for await change in client.auth.authStateChanges {
            self.session = change.session
            // Any auth state callback means restore finished (signed-in OR signed-out).
            if isRestoring { isRestoring = false }
            // Mirror identity to telemetry so crash reports are user-scoped.
            if let s = change.session {
                Telemetry.identify(userId: s.user.id.uuidString, email: s.user.email)
                // Newly-bound session — pull profile + credits + RC entitlement.
                Task { await CreditsService.shared.refresh() }
            } else {
                Telemetry.clearUser()
            }
        }
    }

    func signInWithMagicLink(email: String) async throws {
        try await client.auth.signInWithOTP(
            email: email,
            redirectTo: URL(string: "clipforge://auth/callback")
        )
    }

    func signInWithApple(idToken: String, nonce: String) async throws {
        try await client.auth.signInWithIdToken(
            credentials: .init(provider: .apple, idToken: idToken, nonce: nonce)
        )
    }

    /// Email + password sign-in. Exposed so App Review (and any user who
    /// prefers a password) has a non-SIWA path. The reviewer demo account
    /// (appreviewer@bulsulabs.xyz) authenticates through this flow.
    func signInWithPassword(email: String, password: String) async throws {
        try await client.auth.signIn(email: email, password: password)
    }

    func signOut() async throws { try await client.auth.signOut() }
}
