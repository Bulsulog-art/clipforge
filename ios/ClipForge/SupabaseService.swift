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
        client = SupabaseClient(supabaseURL: Secrets.supabaseURL, supabaseKey: Secrets.supabaseAnonKey)
        Task { await observeAuth() }
    }

    func observeAuth() async {
        for await change in client.auth.authStateChanges {
            self.session = change.session
            // Any auth state callback means restore finished (signed-in OR signed-out).
            if isRestoring { isRestoring = false }
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

    func signOut() async throws { try await client.auth.signOut() }
}
