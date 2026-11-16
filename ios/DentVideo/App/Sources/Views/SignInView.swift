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
            VStack(alignment: .leading, spacing: 28) {
                VStack(alignment: .leading, spacing: 12) {
                    Image("Mark")
                        .resizable()
                        .frame(width: 56, height: 56)
                        .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
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

                VStack(spacing: 14) {
                    TextField(L("signin.email"), text: $email)
                        .textContentType(.username)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .submitLabel(.next)
                        .focused($field, equals: .email)
                        .onSubmit { field = .password }
                        .modifier(FieldStyle())
                    SecureField(L("signin.password"), text: $password)
                        .textContentType(.password)
                        .submitLabel(.go)
                        .focused($field, equals: .password)
                        .onSubmit { Task { await submit() } }
                        .modifier(FieldStyle())
                }

                if let error {
                    Label(error, systemImage: "exclamationmark.circle")
                        .font(.subheadline)
                        .foregroundStyle(Theme.danger)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.updatesFrequently)
                }

                Button {
                    Task { await submit() }
                } label: {
                    if busy { ProgressView().tint(.white) } else { Text(L("signin.button")) }
                }
                .buttonStyle(.dvPrimary)
                .disabled(!canSubmit)

                Button(L("signin.forgot")) { forgot = true }
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Theme.teal)
                    .frame(minHeight: 44)

                HStack(spacing: 16) {
                    Link(L("legal.privacy"), destination: Config.page("privacy"))
                    Link(L("legal.terms"), destination: Config.page("terms"))
                    // No Help link in the app: the help center answers billing and plan questions
                    // (prices, change plan, update card), which an iOS app may not point to (3.1.3).
                }
                .font(.footnote)
                .foregroundStyle(Theme.muted)
                .frame(maxWidth: .infinity)
                .padding(.top, 12)
            }
            .padding(.horizontal, 28)
            .padding(.vertical, 48)
            .frame(maxWidth: 480)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(Theme.paper.ignoresSafeArea())
        .sheet(isPresented: $forgot) { ForgotPasswordView(prefill: email) }
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
            .frame(minHeight: 52)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.line))
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
            VStack(alignment: .leading, spacing: 18) {
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
                        if busy { ProgressView().tint(.white) } else { Text(L("forgot.button")) }
                    }
                    .buttonStyle(.dvPrimary)
                    .disabled(!prefill.contains("@") || busy)
                } else {
                    Button(L("common.done")) { dismiss() }.buttonStyle(.dvPrimary)
                }
                Spacer()
            }
            .padding(24)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("forgot.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(L("common.close")) { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview { SignInView().environment(AppModel.preview()) }
