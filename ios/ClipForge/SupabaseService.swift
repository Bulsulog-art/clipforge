import Foundation
import Supabase

@MainActor
final class SupabaseService: ObservableObject {
    static let shared = SupabaseService()

    let client: SupabaseClient
    @Published var session: Session?

    private init() {
        client = SupabaseClient(supabaseURL: Secrets.supabaseURL, supabaseKey: Secrets.supabaseAnonKey)
        Task { await observeAuth() }
    }

    func observeAuth() async {
        for await change in client.auth.authStateChanges {
            self.session = change.session
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
