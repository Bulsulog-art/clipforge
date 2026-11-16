import SwiftUI
import UIKit
import DentVideoCore

/// Post an approved video from the phone: the video goes to Photos, the text to the clipboard,
/// then one tap opens Instagram, TikTok or the share sheet. Nothing is posted by DentVideo; the
/// clinic posts from its own accounts.
struct PostSheet: View {
    let item: LibraryItem
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var network: Network = .instagram
    @State private var file: URL?
    @State private var assetID: String?
    @State private var step: Step = .idle
    @State private var error: String?

    enum Step: Equatable { case idle, preparing, ready }

    private var text: String { PostKit.text(for: item, network: network) }
    private var current: LibraryItem { model.items.first { $0.id == item.id } ?? item }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Picker(L("post.network"), selection: $network) {
                        Text("Instagram").tag(Network.instagram)
                        Text(L("post.short")).tag(Network.short)
                    }
                    .pickerStyle(.segmented)

                    if let s = slotText(item.slot) {
                        Label(L("post.bestTime", s), systemImage: "clock").font(.subheadline).foregroundStyle(Theme.body)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text(L("post.text")).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.muted)
                        Text(text.isEmpty ? L("post.noText") : text)
                            .font(.body)
                            .foregroundStyle(Theme.ink)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .padding(16)
                    .dvCard()

                    switch step {
                    case .idle:
                        Button { Task { await prepare() } } label: {
                            Label(L("post.prepare"), systemImage: "square.and.arrow.down")
                        }
                        .buttonStyle(.dvPrimary)
                        Text(L("post.prepare.note")).font(.footnote).foregroundStyle(Theme.muted)
                        if let file {
                            // Photos access refused: the share sheet still offers "Save Video" and the apps.
                            ShareLink(item: file, subject: Text(item.title)) { Label(L("post.more"), systemImage: "square.and.arrow.up") }
                                .buttonStyle(.dvSecondary)
                        }
                    case .preparing:
                        HStack(spacing: 12) {
                            ProgressView()
                            Text(L("post.preparing")).foregroundStyle(Theme.body)
                        }
                        .frame(maxWidth: .infinity, minHeight: 50)
                    case .ready:
                        Label(L("post.ready"), systemImage: "checkmark.circle.fill")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(Theme.teal)
                        targets
                    }

                    if let error {
                        Text(error).font(.subheadline).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                    }

                    Divider().padding(.vertical, 4)

                    Toggle(isOn: Binding(get: { current.isPosted }, set: { v in Task { await model.setPosted(current, v) } })) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(L("video.markPosted")).font(.body)
                            Text(L("post.markNote")).font(.footnote).foregroundStyle(Theme.muted)
                        }
                    }
                    .tint(Theme.teal)
                }
                .padding(24)
            }
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("post.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button(L("common.done")) { dismiss() } } }
            .onChange(of: network) { _, _ in
                // The clipboard follows the chosen network once the video is saved.
                if step == .ready { UIPasteboard.general.string = text }
            }
        }
        .presentationDetents([.large])
    }

    @ViewBuilder private var targets: some View {
        VStack(spacing: 10) {
            ForEach(ShareTarget.allCases, id: \.self) { target in
                if installed(target) {
                    Button { open(target) } label: {
                        Label(target == .instagram ? L("post.openInstagram") : L("post.openTikTok"), systemImage: "arrow.up.forward.app")
                    }
                    .buttonStyle(.dvSecondary)
                }
            }
            if let file {
                ShareLink(item: file, subject: Text(item.title)) {
                    Label(L("post.more"), systemImage: "square.and.arrow.up")
                }
                .buttonStyle(.dvSecondary)
            }
        }
    }

    private func installed(_ t: ShareTarget) -> Bool {
        t.urls(localIdentifier: nil).contains { UIApplication.shared.canOpenURL($0) }
    }

    private func open(_ t: ShareTarget) {
        UIPasteboard.general.string = text
        let urls = t.urls(localIdentifier: t == .instagram ? assetID : nil).filter { UIApplication.shared.canOpenURL($0) }
        guard let first = urls.first else { return }
        UIApplication.shared.open(first) { ok in
            if !ok, urls.count > 1 { UIApplication.shared.open(urls[1]) }
        }
    }

    /// Download if needed, save to Photos, copy the text.
    private func prepare() async {
        error = nil
        step = .preparing
        do {
            let local: URL
            if let cached = VideoCache.shared.localURL(for: item.id) {
                local = cached
            } else if let remote = current.videoUrl {
                local = try await VideoCache.shared.file(for: item.id, from: remote)
            } else {
                throw PhotoSaver.Failure.failed
            }
            file = local
            assetID = try await PhotoSaver.saveVideo(at: local)
            UIPasteboard.general.string = text
            step = .ready
            UIAccessibility.post(notification: .announcement, argument: L("post.ready"))
        } catch PhotoSaver.Failure.denied {
            UIPasteboard.general.string = text
            error = L("post.error.photos")
            step = .idle
        } catch {
            self.error = model.isOffline ? L("error.offline") : L("post.error.download")
            step = .idle
        }
    }
}

#Preview { PostSheet(item: PreviewData.items[2]).environment(AppModel.preview()) }
