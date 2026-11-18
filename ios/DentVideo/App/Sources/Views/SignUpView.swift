import SwiftUI
import UIKit
import DentVideoCore

/// Create a DentVideo account in the app: email and password, then the 6-digit code emailed to that
/// address (the web's start flow, steps 1 and the code card). The clinic form and the plans follow
/// once the account is open (RootView). Same look as SignInView.
struct SignUpView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    var prefill = ""

    enum Step: Equatable { case account, code(String) }
    @State private var step: Step = .account
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    /// After an address that already had an account, or a sign-in the server could not open.
    @State private var notice: String?
    /// When the form appeared: the server refuses a form filled in faster than a person can (a bot brake).
    @State private var openedAt = Date()
    @FocusState private var field: Field?
    enum Field { case email, password }

    private var canSubmit: Bool { SignupRules.isEmail(email) && !password.isEmpty && !busy }

    /// `.newPassword` (iOS offers a strong password). In the UI tests' flow mode only, `.password`:
    /// on iOS 18 the "Use Strong Password" sheet takes over the field and swallows typed keys.
    static var passwordContent: UITextContentType {
        #if DEBUG
        if DemoFlags.flow { return .password }
        #endif
        return .newPassword
    }

    var body: some View {
        NavigationStack {
            Group {
                switch step {
                case .account: account
                case let .code(address):
                    ScrollView {
                        EmailCodeView(email: address, sendFirst: false) { await model.enterApp() }
                            .padding(.horizontal, 28)
                            .padding(.vertical, Theme.s6)
                            .frame(maxWidth: 480)
                            .frame(maxWidth: .infinity)
                    }
                    .scrollDismissesKeyboard(.interactively)
                }
            }
            .background(Theme.paper.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    // The code can wait: the account is open, and the code is asked for again before the plans.
                    if case .code = step {
                        Button(L("code.later")) { Task { await model.enterApp() } }
                            .accessibilityIdentifier("code.later")
                    } else {
                        Button(L("common.close")) { dismiss() }
                    }
                }
            }
        }
        .interactiveDismissDisabled(step != .account)
        .presentationBackground(Theme.paper)
        .onAppear {
            openedAt = Date()
            if email.isEmpty { email = prefill }
        }
        .task {
            guard model.isDemoMode, model.isDemo("signup", "signup-code") else { return }
            email = "hello@riverside.example"
            password = "••••••••••"
            if model.isDemo("signup-code") { step = .code(email) }
        }
    }

    private var account: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.s6) {
                VStack(alignment: .leading, spacing: Theme.s3) {
                    Text(L("signup.title"))
                        .font(Theme.display(.largeTitle))
                        .foregroundStyle(Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    Text(L("signup.subtitle"))
                        .font(.body)
                        .foregroundStyle(Theme.body)
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(alignment: .leading, spacing: Theme.s3) {
                    TextField(L("signin.email"), text: $email)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.next)
                        .focused($field, equals: .email)
                        .accessibilityIdentifier("signup.email")
                        .onSubmit { field = .password }
                        .modifier(FieldStyle())
                    SecureField(L("signup.password"), text: $password)
                        .textContentType(Self.passwordContent)
                        .submitLabel(.go)
                        .focused($field, equals: .password)
                        .accessibilityIdentifier("signup.password")
                        .onSubmit { Task { await submit() } }
                        .modifier(FieldStyle())
                    Text(L("signup.password.hint"))
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(alignment: .leading, spacing: Theme.s3) {
                    if let error { ErrorBox(text: error, id: "signup.error") }
                    if let notice {
                        Label(notice, systemImage: "envelope.badge")
                            .font(.subheadline)
                            .foregroundStyle(Theme.body)
                            .padding(Theme.s3)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Theme.sand, in: RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("signup.notice")
                        Button(L("signup.toSignIn")) { dismiss() }
                            .buttonStyle(.dvSecondary)
                            .accessibilityIdentifier("signup.toSignIn")
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        if busy { ProgressView().tint(Theme.onFill) } else { Text(L("signup.button")) }
                    }
                    .buttonStyle(.dvPrimary)
                    .disabled(!canSubmit && !busy)
                    .allowsHitTesting(!busy)
                    .accessibilityLabel(L("signup.button"))
                    .accessibilityValue(busy ? L("common.loading") : "")
                    .accessibilityIdentifier("signup.submit")

                    Text(L("signup.consent"))
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                    LegalLinks()
                }
            }
            .padding(.horizontal, 28)
            .padding(.vertical, Theme.s6)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func submit() async {
        guard canSubmit else { return }
        error = nil
        notice = nil
        switch SignupRules.passwordProblem(password) {
        case .tooShort?: error = L("signup.error.passwordShort"); return
        case .tooLong?: error = L("signup.error.passwordLong"); return
        case nil: break
        }
        busy = true
        defer { busy = false }
        let elapsed = Int(Date().timeIntervalSince(openedAt) * 1000)
        do {
            switch try await model.signUp(email: email, password: password, elapsedMs: elapsed) {
            case .signedIn:
                password = ""
                step = .code(email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased())
            case .existingAccount:
                notice = L("signup.existing")
            case .createdSignInNeeded:
                notice = L("signup.signInNeeded")
            }
        } catch {
            self.error = model.message(for: error)
        }
    }
}

/// The 6-digit code emailed to the account's address. Used right after sign-up and, for an account
/// that skipped it, before the plans (the server refuses a purchase until the address is proven).
struct EmailCodeView: View {
    @Environment(AppModel.self) private var model
    let email: String
    /// Ask the server for a code when the view opens (one already waiting is not re-sent).
    var sendFirst: Bool
    var onVerified: () async -> Void

    @State private var code = ""
    @State private var busy = false
    @State private var error: String?
    @State private var info: String?
    @FocusState private var focused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.s5) {
            VStack(alignment: .leading, spacing: Theme.s3) {
                Image(systemName: "envelope.open")
                    .font(.system(size: 28))
                    .foregroundStyle(Theme.teal)
                    .frame(width: 60, height: 60)
                    .background(Theme.teal.opacity(0.1), in: Circle())
                    .accessibilityHidden(true)
                Text(L("code.title"))
                    .font(Theme.display(.largeTitle))
                    .foregroundStyle(Theme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                    .accessibilityIdentifier("code.title")
                Text(L("code.lead", email))
                    .font(.body)
                    .foregroundStyle(Theme.body)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: Theme.s2) {
                TextField(L("code.label"), text: $code)
                    .textContentType(.oneTimeCode)
                    .keyboardType(.numberPad)
                    .font(.title2.monospacedDigit())
                    .multilineTextAlignment(.center)
                    .focused($focused)
                    .accessibilityLabel(L("code.label"))
                    .accessibilityIdentifier("code.field")
                    .modifier(FieldStyle())
                    .environment(\.layoutDirection, .leftToRight)
                    .onChange(of: code) { _, v in
                        let digits = SignupRules.code(v)
                        if digits != v { code = digits; return }
                        // The sixth digit sends it (the number pad has no return key).
                        if digits.count == 6 && !busy { Task { await confirm() } }
                    }
                Text(L("code.hint"))
                    .font(.footnote)
                    .foregroundStyle(Theme.muted)
                    .fixedSize(horizontal: false, vertical: true)
            }

            VStack(alignment: .leading, spacing: Theme.s3) {
                if let error { ErrorBox(text: error, id: "code.error") }
                if let info {
                    Text(info)
                        .font(.subheadline)
                        .foregroundStyle(Theme.body)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("code.info")
                }
                Button {
                    Task { await confirm() }
                } label: {
                    if busy { ProgressView().tint(Theme.onFill) } else { Text(L("code.button")) }
                }
                .buttonStyle(.dvPrimary)
                .disabled(code.count != 6 || busy)
                .accessibilityLabel(L("code.button"))
                .accessibilityIdentifier("code.submit")

                Button(L("code.resend")) { Task { await resend(onlyIfNone: false) } }
                    .buttonStyle(.dvQuiet)
                    .frame(maxWidth: .infinity)
                    .disabled(busy)
                    .accessibilityIdentifier("code.resend")
            }
        }
        .task {
            if sendFirst { await resend(onlyIfNone: true) }
            focused = !model.isDemoMode
        }
    }

    private func confirm() async {
        busy = true
        error = nil
        defer { busy = false }
        do {
            _ = try await model.api.verifyEmail(.confirm(code: code))
            await onVerified()
        } catch {
            code = ""
            self.error = model.message(for: error)
        }
    }

    private func resend(onlyIfNone: Bool) async {
        error = nil
        do {
            let a = try await model.api.verifyEmail(.send, onlyIfNone: onlyIfNone)
            if a.verified == true { return await onVerified() }
            if !onlyIfNone { info = L("code.resent") }
        } catch {
            self.error = model.message(for: error)
        }
    }
}

/// A calm red box with the server's sentence.
struct ErrorBox: View {
    let text: String
    let id: String

    var body: some View {
        Label(text, systemImage: "exclamationmark.circle.fill")
            .font(.subheadline)
            .foregroundStyle(Theme.danger)
            .padding(Theme.s3)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.danger.opacity(0.08), in: RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
            .fixedSize(horizontal: false, vertical: true)
            .accessibilityAddTraits(.updatesFrequently)
            .accessibilityIdentifier(id)
    }
}

/// Terms and Privacy on dentvideo.com, in the app's language (the paywall needs both: guideline 3.1.2).
struct LegalLinks: View {
    var body: some View {
        HStack(spacing: Theme.s4) {
            Link(L("legal.terms"), destination: Config.page("terms"))
                .accessibilityIdentifier("legal.terms")
            Link(L("legal.privacy"), destination: Config.page("privacy"))
                .accessibilityIdentifier("legal.privacy")
        }
        .font(.footnote.weight(.semibold))
        .tint(Theme.teal)
        .frame(maxWidth: .infinity, minHeight: 44)
    }
}
