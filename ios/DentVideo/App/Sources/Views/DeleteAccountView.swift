import SwiftUI
import UIKit

/// Account deletion inside the app (App Store guideline 5.1.1(v)): the same server deletion as on
/// the web — subscription, videos, files, clinic and login. Confirmed, as on the web, by typing
/// the clinic's name (or the account's email when there is no clinic).
struct DeleteAccountView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var typed = ""
    @State private var busy = false
    @State private var error: String?

    private var word: String {
        let name = model.me?.clinic?.profile.name.trimmingCharacters(in: .whitespaces) ?? ""
        return name.isEmpty ? (model.me?.user.email ?? "") : name
    }

    /// The server's rule (lib/dentvid/account.ts confirmMatches): case, outer and repeated spaces ignored.
    static func normalized(_ s: String) -> String {
        s.precomposedStringWithCompatibilityMapping.split(whereSeparator: \.isWhitespace).joined(separator: " ").lowercased()
    }

    private var matches: Bool {
        let t = Self.normalized(typed)
        return !t.isEmpty && (t == Self.normalized(word) || t == Self.normalized(model.me?.user.email ?? ""))
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s5) {
                    Label {
                        Text(L("delete.body")).font(.body.weight(.medium)).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                    } icon: {
                        Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(Theme.danger)
                    }
                    VStack(alignment: .leading, spacing: Theme.s3) {
                        ForEach(["delete.item.videos", "delete.item.clinic", "delete.item.login", "delete.item.billing"], id: \.self) { k in
                            Label {
                                Text(L(k)).fixedSize(horizontal: false, vertical: true)
                            } icon: {
                                Image(systemName: "minus.circle.fill").foregroundStyle(Theme.danger.opacity(0.8))
                            }
                            .font(.subheadline)
                            .foregroundStyle(Theme.body)
                        }
                    }
                    .padding(Theme.s4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .dvCard()
                    Text(L("delete.type", word)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                    TextField(word, text: $typed)
                        .accessibilityIdentifier("delete.field")
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .modifier(FieldStyle())
                        .accessibilityLabel(L("delete.type", word))
                    if let error {
                        Text(error).font(.subheadline).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("delete.error")
                    }
                    Button(role: .destructive) {
                        Task {
                            busy = true
                            defer { busy = false }
                            error = await model.deleteAccount(confirm: typed.trimmingCharacters(in: .whitespaces))
                        }
                    } label: {
                        if busy { ProgressView().tint(Theme.onFill) } else { Text(L("delete.button")) }
                    }
                    .buttonStyle(.dvDestructive)
                    .accessibilityIdentifier("delete.submit")
                    .disabled(!matches || busy)
                }
                .padding(Theme.s5)
                .readableWidth(560)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("settings.delete"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(L("common.cancel")) { dismiss() }.accessibilityIdentifier("delete.cancel") } }
        }
        .presentationBackground(Theme.paper)
    }
}
