import SwiftUI
import AuthenticationServices
import CryptoKit

struct LoginView: View {
    @State private var email = ""
    @State private var sending = false
    @State private var sent = false
    @State private var error: String?
    // Nonce generated per-attempt; Apple requires hashed-then-raw round trip.
    @State private var currentNonce: String?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.appBackground, Color.brand.opacity(0.12)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            ).ignoresSafeArea()

            VStack(spacing: 20) {
                Spacer()

                HStack(spacing: 8) {
                    Image(systemName: "scissors")
                        .foregroundStyle(.brand)
                    Text("ClipForge").font(.title.bold())
                }

                Text("One long video. 100+ viral clips.")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Spacer()

                VStack(spacing: 12) {
                    SignInWithAppleButton(.signIn) { req in
                        let nonce = Self.randomNonce()
                        currentNonce = nonce
                        req.requestedScopes = [.email, .fullName]
                        req.nonce = Self.sha256(nonce)
                    } onCompletion: { result in
                        Task { await handleApple(result) }
                    }
                    .signInWithAppleButtonStyle(.white)
                    .frame(height: 50)
                    .clipShape(.rect(cornerRadius: 12))

                    HStack { Rectangle().frame(height: 1).foregroundStyle(.white.opacity(0.1))
                        Text("or").font(.footnote).foregroundStyle(.secondary)
                        Rectangle().frame(height: 1).foregroundStyle(.white.opacity(0.1)) }

                    TextField("you@studio.com", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textContentType(.emailAddress)
                        .submitLabel(.send)
                        .onSubmit { Task { await sendMagicLink() } }
                        .onChange(of: email) { _, _ in
                            // user is editing — reset the success badge
                            if sent { sent = false }
                            if error != nil { error = nil }
                        }
                        .padding()
                        .background(Color.cardBackground)
                        .clipShape(.rect(cornerRadius: 12))

                    Button {
                        Task { await sendMagicLink() }
                    } label: {
                        HStack {
                            if sending { ProgressView().tint(.white) }
                            Text(sent ? "Check your email" : "Send magic link")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.brand)
                        .foregroundStyle(.white)
                        .clipShape(.rect(cornerRadius: 12))
                    }
                    .disabled(sending || !Self.isValidEmail(email))
                }
                .padding(.horizontal, 24)

                if let error {
                    Text(error).font(.footnote).foregroundStyle(.red)
                }

                Spacer()
            }
        }
    }

    private func sendMagicLink() async {
        sending = true
        defer { sending = false }
        do {
            try await SupabaseService.shared.signInWithMagicLink(email: email)
            sent = true
        } catch let e {
            error = e.localizedDescription
        }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .failure(let e):
            // ASAuthorizationError.canceled is normal (user dismissed); don't show
            if (e as NSError).code != ASAuthorizationError.canceled.rawValue {
                error = e.localizedDescription
            }
            return
        case .success(let auth):
            guard let cred = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = cred.identityToken,
                  let token = String(data: tokenData, encoding: .utf8) else {
                error = "Apple didn't return an identity token. Try again or use email."
                return
            }
            guard let nonce = currentNonce else {
                error = "Sign-in expired. Try again."
                return
            }
            do {
                try await SupabaseService.shared.signInWithApple(idToken: token, nonce: nonce)
            } catch let e {
                error = e.localizedDescription
            }
        }
    }

    // MARK: - Helpers

    static func isValidEmail(_ s: String) -> Bool {
        let trimmed = s.trimmingCharacters(in: .whitespacesAndNewlines)
        // RFC-lite: local@domain.tld, no spaces, has @ and at least one dot in domain
        guard let at = trimmed.firstIndex(of: "@"),
              at != trimmed.startIndex,
              trimmed.distance(from: at, to: trimmed.endIndex) >= 5 else { return false }
        let domain = trimmed[trimmed.index(after: at)...]
        return domain.contains(".") && !domain.hasSuffix(".") && !trimmed.contains(" ")
    }

    static func randomNonce(length: Int = 32) -> String {
        precondition(length > 0)
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length
        while remaining > 0 {
            var randoms = [UInt8](repeating: 0, count: 16)
            let status = SecRandomCopyBytes(kSecRandomDefault, randoms.count, &randoms)
            if status != errSecSuccess { break }
            for r in randoms where remaining > 0 {
                if Int(r) < charset.count {
                    result.append(charset[Int(r)])
                    remaining -= 1
                }
            }
        }
        return result
    }

    static func sha256(_ input: String) -> String {
        let data = Data(input.utf8)
        let hash = SHA256.hash(data: data)
        return hash.map { String(format: "%02x", $0) }.joined()
    }
}
