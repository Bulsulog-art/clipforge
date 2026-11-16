import SwiftUI

/// Sign in with the clinic's DentVideo login. Accounts are created on the
/// website; the app has no sign-up, no plans and no prices (App Review 3.1.3(c)).
struct SignInView: View {
    @Environment(AppModel.self) private var model
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    @FocusState private var focus: Field?
    enum Field { case email, password }

    private var canSubmit: Bool { email.contains("@") && password.count >= 6 && !busy }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 14) {
                    BrandMark(size: 60)
                    Text("DentVideo")
                        .font(.largeTitle.bold())
                        .foregroundStyle(Color.dvInk)
                    Text("Your clinic's weekly patient-education videos. Watch them, approve them, and post them from your own accounts.")
                        .font(.body)
                        .foregroundStyle(Color.dvBody)
                }
                .padding(.top, 40)

                VStack(spacing: 12) {
                    TextField("Clinic email", text: $email)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focus, equals: .email)
                        .submitLabel(.next)
                        .onSubmit { focus = .password }
                        .modifier(FieldStyle())
                    SecureField("Password", text: $password)
                        .textContentType(.password)
                        .focused($focus, equals: .password)
                        .submitLabel(.go)
                        .onSubmit { Task { await submit() } }
                        .modifier(FieldStyle())
                    if let error {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.red)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityIdentifier("signin-error")
                    }
                    Button {
                        Task { await submit() }
                    } label: {
                        if busy { ProgressView().tint(.white) } else { Text("Sign in") }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(!canSubmit)
                    .opacity(canSubmit ? 1 : 0.6)
                    .accessibilityIdentifier("signin-button")

                    Link("Forgot your password?", destination: Config.siteURL.appendingPathComponent("reset"))
                        .font(.footnote.weight(.semibold))
                        .padding(.top, 4)
                }

                VStack(alignment: .leading, spacing: 10) {
                    Text("Just looking?")
                        .font(.headline)
                        .foregroundStyle(Color.dvInk)
                    Text("Open a sample clinic and try the whole app with real sample videos. Nothing is sent anywhere.")
                        .font(.subheadline)
                        .foregroundStyle(Color.dvBody)
                    Button("Explore a sample clinic") { Task { await model.enterDemo() } }
                        .buttonStyle(SecondaryButtonStyle())
                        .accessibilityIdentifier("demo-button")
                }
                .padding(18)
                .background(Color.dvSand, in: .rect(cornerRadius: 18))

                Text("Use the email and password your clinic uses on dentvideo.com.")
                    .font(.footnote)
                    .foregroundStyle(Color.dvMuted)
            }
            .padding(.horizontal, 22)
            .padding(.bottom, 30)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Color.dvPaper.ignoresSafeArea())
    }

    private func submit() async {
        guard canSubmit else { return }
        busy = true
        error = nil
        defer { busy = false }
        do {
            try await model.signIn(email: email, password: password)
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct FieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(.horizontal, 14)
            .frame(minHeight: 50)
            .background(Color.white, in: .rect(cornerRadius: 12))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.dvLine))
            .foregroundStyle(Color.dvInk)
    }
}
