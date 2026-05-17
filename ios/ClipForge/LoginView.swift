import SwiftUI
import AuthenticationServices

struct LoginView: View {
    @State private var email = ""
    @State private var sending = false
    @State private var sent = false
    @State private var error: String?

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
                        req.requestedScopes = [.email, .fullName]
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
                    .disabled(sending || email.isEmpty)
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
        guard case .success(let auth) = result,
              let cred = auth.credential as? ASAuthorizationAppleIDCredential,
              let token = cred.identityToken.flatMap({ String(data: $0, encoding: .utf8) }) else {
            return
        }
        do {
            try await SupabaseService.shared.signInWithApple(idToken: token, nonce: "")
        } catch let e {
            error = e.localizedDescription
        }
    }
}
