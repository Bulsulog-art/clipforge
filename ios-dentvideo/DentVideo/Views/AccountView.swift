import SwiftUI

/// The clinic, help, sign out, delete account (App Review 5.1.1(v)).
/// No plans or prices: billing is handled on the website.
struct AccountView: View {
    @Environment(AppModel.self) private var model
    @State private var showDelete = false
    @State private var confirm = ""
    @State private var deleting = false
    @State private var deleteError: String?

    var body: some View {
        List {
            Section("Clinic") {
                LabeledContent("Name", value: model.clinic?.name ?? "—")
                if let email = model.clinic?.email, !email.isEmpty {
                    LabeledContent("Login", value: email)
                }
                LabeledContent("Videos", value: status)
            }
            Section("How it works") {
                Label("Every Monday, five short narrated videos with your logo and colours.", systemImage: "calendar")
                Label("Every script is software-checked for accuracy and health-advertising rules before you see it. You decide what is used.", systemImage: "checkmark.shield")
                Label("Approved videos are posted from your own clinic accounts.", systemImage: "square.and.arrow.up")
            }
            .font(.subheadline)
            .foregroundStyle(Color.dvBody)
            Section("Help") {
                Link(destination: URL(string: "mailto:hello@dentvideo.com")!) { Label("hello@dentvideo.com", systemImage: "envelope") }
                Link(destination: Config.siteURL.appendingPathComponent("privacy")) { Label("Privacy policy", systemImage: "hand.raised") }
            }
            Section {
                Button(model.isDemo ? LocalizedStringKey("Leave the sample clinic") : LocalizedStringKey("Sign out")) { Task { await model.signOut() } }
                    .accessibilityIdentifier("signout")
                if !model.isDemo {
                    Button("Delete account", role: .destructive) { confirm = ""; deleteError = nil; showDelete = true }
                        .accessibilityIdentifier("delete-account")
                }
            }
        }
        .navigationTitle("Account")
        .sheet(isPresented: $showDelete) { deleteSheet }
    }

    private var status: String {
        guard let c = model.clinic else { return "—" }
        if model.isDemo { return String(localized: "Sample") }
        if c.paused { return String(localized: "Paused") }
        return c.active ? String(localized: "Active") : String(localized: "Not active")
    }

    private var deleteSheet: some View {
        NavigationStack {
            Form {
                Section {
                    Text("This permanently deletes your clinic, its videos and your login. If your subscription is active, it is cancelled first. This cannot be undone.")
                        .font(.subheadline)
                }
                Section {
                    TextField("Type your clinic name or email", text: $confirm)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .accessibilityIdentifier("delete-confirm")
                } footer: {
                    if let deleteError { Text(deleteError).foregroundStyle(.red) }
                }
                Section {
                    Button(role: .destructive) {
                        Task {
                            deleting = true
                            defer { deleting = false }
                            do { try await model.deleteAccount(confirm: confirm); showDelete = false } catch {
                                deleteError = error.localizedDescription
                            }
                        }
                    } label: {
                        if deleting { ProgressView() } else { Text("Delete my account") }
                    }
                    .disabled(confirm.trimmingCharacters(in: .whitespaces).isEmpty || deleting)
                }
            }
            .navigationTitle("Delete account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showDelete = false } } }
        }
    }
}
