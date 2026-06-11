import SwiftUI
import AuthenticationServices
import CryptoKit

struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    @State private var usePassword = false
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
                    .foregroundStyle(.textSecondary)
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
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 50)
                    .clipShape(.rect(cornerRadius: 12))

                    HStack { Rectangle().frame(height: 1).foregroundStyle(.hairline)
                        Text("or").font(.footnote).foregroundStyle(.textSecondary)
                        Rectangle().frame(height: 1).foregroundStyle(.hairline) }

                    TextField("you@studio.com", text: $email)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()
                        .textContentType(.emailAddress)
                        .submitLabel(usePassword ? .next : .send)
                        .onSubmit { Task { if !usePassword { await sendMagicLink() } } }
                        .onChange(of: email) { _, _ in
                            // user is editing — reset the success badge
                            if sent { sent = false }
                            if error != nil { error = nil }
                        }
                        .padding()
                        .background(Color.cardBackground)
                        .clipShape(.rect(cornerRadius: 12))

                    if usePassword {
                        SecureField("Password", text: $password)
                            .textContentType(.password)
                            .submitLabel(.go)
                            .onSubmit { Task { await signInWithPassword() } }
                            .padding()
                            .background(Color.cardBackground)
                            .clipShape(.rect(cornerRadius: 12))
                    }

                    Button {
                        Task {
                            if usePassword { await signInWithPassword() } else { await sendMagicLink() }
                        }
                    } label: {
                        HStack {
                            if sending { ProgressView().tint(.white) }
                            Text(usePassword
                                 ? "Sign in"
                                 : (sent ? "Check your email" : "Send magic link"))
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.brand)
                        .foregroundStyle(.white)
                        .clipShape(.rect(cornerRadius: 12))
                    }
                    .disabled(
                        sending
                        || !Self.isValidEmail(email)
                        || (usePassword && password.isEmpty)
                    )

                    Button {
                        usePassword.toggle()
                        sent = false
                        error = nil
                    } label: {
                        Text(usePassword ? "Use magic link instead" : "Use password instead")
                            .font(.footnote)
                            .foregroundStyle(.textSecondary)
                    }
                    .padding(.top, 4)
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

    private func signInWithPassword() async {
        sending = true
        defer { sending = false }
        do {
            try await SupabaseService.shared.signInWithPassword(
                email: email.trimmingCharacters(in: .whitespacesAndNewlines),
                password: password
            )
        } catch let e {
            error = e.localizedDescription
        }
    }

    private func handleApple(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .failure(let e):
            let code = (e as NSError).code
            if code == ASAuthorizationError.canceled.rawValue {
                // Genuine user cancellation — don't show anything.
                return
            }
            // Everything else surfaces to the user so they (and App Review)
            // can act on it. `.unknown` (1000) IS a real failure on hardware
            // — only the Simulator-without-iCloud case is benign and that
            // user can simply tap Email/Password instead.
            error = "Sign in with Apple failed: \(e.localizedDescription). You can sign in with email + password instead."
            return
        case .success(let auth):
            guard let cred = auth.credential as? ASAuthorizationAppleIDCredential,
                  let tokenData = cred.identityToken,
                  let token = String(data: tokenData, encoding: .utf8) else {
                error = "Apple didn't return an identity token. Use email + password to sign in."
                return
            }
            guard let nonce = currentNonce else {
                error = "Sign-in expired. Try again."
                return
            }
            do {
                try await SupabaseService.shared.signInWithApple(idToken: token, nonce: nonce)
            } catch let e {
                error = "Apple sign-in finished, but the server rejected the token (\(e.localizedDescription)). Use email + password to sign in."
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
