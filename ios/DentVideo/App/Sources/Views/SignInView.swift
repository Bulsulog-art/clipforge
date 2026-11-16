import SwiftUI
import UIKit
import DentVideoCore

/// Sign in with the clinic's DentVideo account (the same email and password as on the web).
/// No account creation here, and nothing about plans or prices.
struct SignInView: View {
    @Environment(AppModel.self) private var model
    @State private var email = ""
    @State private var password = ""
    @State private var busy = false
    @State private var error: String?
    @State private var forgot = false
    @FocusState private var field: Field?
    enum Field { case email, password }

    private var canSubmit: Bool { email.contains("@") && !password.isEmpty && !busy }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: Theme.s6) {
                VStack(alignment: .leading, spacing: Theme.s3) {
                    Image("Mark")
                        .resizable()
                        .interpolation(.high)
                        .frame(width: 60, height: 60)
                        .clipShape(RoundedRectangle(cornerRadius: 15, style: .continuous))
                        .shadow(color: Color.black.opacity(0.08), radius: 8, y: 4)
                        .padding(.bottom, Theme.s2)
                        .accessibilityHidden(true)
                    Text("DentVideo")
                        .font(Theme.display(.largeTitle))
                        .foregroundStyle(Theme.ink)
                        .accessibilityAddTraits(.isHeader)
                    Text(L("signin.subtitle"))
                        .font(.body)
                        .foregroundStyle(Theme.body)
                        .fixedSize(horizontal: false, vertical: true)
                }

                VStack(spacing: Theme.s3) {
                    TextField(L("signin.email"), text: $email)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.next)
                        .focused($field, equals: .email)
                        .accessibilityIdentifier("signin.email")
                        .onSubmit { field = .password }
                        .modifier(FieldStyle())
                    SecureField(L("signin.password"), text: $password)
                        .textContentType(.password)
                        .submitLabel(.go)
                        .focused($field, equals: .password)
                        .accessibilityIdentifier("signin.password")
                        .onSubmit { Task { await submit() } }
                        .modifier(FieldStyle())
                }

                VStack(alignment: .leading, spacing: Theme.s3) {
                    if let error {
                        Label(error, systemImage: "exclamationmark.circle.fill")
                            .font(.subheadline)
                            .foregroundStyle(Theme.danger)
                            .padding(Theme.s3)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Theme.danger.opacity(0.08), in: RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityAddTraits(.updatesFrequently)
                            .accessibilityIdentifier("signin.error")
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        if busy { ProgressView().tint(Theme.onFill) } else { Text(L("signin.button")) }
                    }
                    .buttonStyle(.dvPrimary)
                    .disabled(!canSubmit && !busy)
                    .allowsHitTesting(!busy)
                    .accessibilityLabel(L("signin.button"))
                    .accessibilityValue(busy ? L("common.loading") : "")
                    .accessibilityIdentifier("signin.submit")

                    Button(L("signin.forgot")) { forgot = true }
                        .buttonStyle(.dvQuiet)
                        .frame(maxWidth: .infinity)
                }

                HStack(spacing: 16) {
                    Link(L("legal.privacy"), destination: Config.page("privacy"))
                    // No Help or Terms link in the app: the help center answers billing questions and
                    // the terms list plans and prices, which an iOS app may not point to (3.1.3).
                    // Privacy stays (5.1.1(i)).
                }
                .font(.footnote)
                .tint(Theme.muted)
                .frame(maxWidth: .infinity, minHeight: 44)
            }
            .padding(.horizontal, 28)
            .padding(.vertical, Theme.s6 + Theme.s4)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.paper.ignoresSafeArea())
        .sheet(isPresented: $forgot) { ForgotPasswordView(prefill: email) }
        .task {
            guard model.isDemoMode else { return }
            if model.isDemo("signin-error", "signin-loading", "forgot") { email = "hello@riverside.example" }
            if model.isDemo("signin-error") { password = "••••••••"; error = L("signin.error.credentials") }
            if model.isDemo("signin-loading") { password = "••••••••"; busy = true }
            if model.isDemo("forgot") {
                try? await Task.sleep(for: .milliseconds(400))
                forgot = true
            }
        }
    }

    private func submit() async {
        guard canSubmit else { return }
        busy = true
        error = nil
        defer { busy = false }
        do {
            try await model.signIn(email: email, password: password)
            password = ""
        } catch {
            self.error = model.message(for: error)
        }
    }
}

struct FieldStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.body)
            .padding(.horizontal, 16)
            .frame(minHeight: 54)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous).strokeBorder(Theme.line))
    }
}

/// The web's "forgot password": we email a link; the new password is chosen on dentvideo.com.
struct ForgotPasswordView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State var prefill: String
    @State private var sent = false
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: Theme.s4) {
                Text(sent ? L("forgot.sent") : L("forgot.body"))
                    .font(.body)
                    .foregroundStyle(Theme.body)
                    .fixedSize(horizontal: false, vertical: true)
                if !sent {
                    TextField(L("signin.email"), text: $prefill)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .modifier(FieldStyle())
                    if let error { Text(error).font(.subheadline).foregroundStyle(Theme.danger) }
                    Button {
                        Task {
                            busy = true
                            defer { busy = false }
                            do {
                                try await model.api.requestPasswordReset(email: prefill)
                                sent = true
                            } catch {
                                self.error = model.message(for: error)
                            }
                        }
                    } label: {
                        if busy { ProgressView().tint(Theme.onFill) } else { Text(L("forgot.button")) }
                    }
                    .buttonStyle(.dvPrimary)
                    .disabled(!prefill.contains("@") || busy)
                } else {
                    Button(L("common.done")) { dismiss() }.buttonStyle(.dvPrimary)
                }
                Spacer()
            }
            .padding(Theme.s5)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("forgot.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(L("common.close")) { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(Theme.paper)
    }
}

#Preview { SignInView().environment(AppModel.preview()) }
