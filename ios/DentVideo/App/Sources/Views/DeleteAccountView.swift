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
                VStack(alignment: .leading, spacing: 18) {
                    Text(L("delete.body")).font(.body).foregroundStyle(Theme.body).fixedSize(horizontal: false, vertical: true)
                    VStack(alignment: .leading, spacing: 6) {
                        ForEach(["delete.item.videos", "delete.item.clinic", "delete.item.login", "delete.item.billing"], id: \.self) { k in
                            Label(L(k), systemImage: "minus.circle").font(.subheadline).foregroundStyle(Theme.body)
                        }
                    }
                    Text(L("delete.type", word)).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                    TextField(word, text: $typed)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .modifier(FieldStyle())
                        .accessibilityLabel(L("delete.type", word))
                    if let error {
                        Text(error).font(.subheadline).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                    }
                    Button(role: .destructive) {
                        Task {
                            busy = true
                            defer { busy = false }
                            error = await model.deleteAccount(confirm: typed.trimmingCharacters(in: .whitespaces))
                        }
                    } label: {
                        if busy { ProgressView().tint(.white) } else { Text(L("delete.button")) }
                    }
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 50)
                    .background(Theme.danger.opacity(matches && !busy ? 1 : 0.4), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .disabled(!matches || busy)
                }
                .padding(24)
            }
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("settings.delete"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(L("common.cancel")) { dismiss() } } }
        }
    }
}
