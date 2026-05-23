import SwiftUI
import AVKit

/// Fullscreen vertical clip player. The video rendering + auto-hiding scrubber
/// chrome live in `ClipVideoPlayer`; this view layers on Publish, Share and
/// the caption-to-clipboard toast.
struct ClipPlayerView: View {
    let clip: Clip
    @Environment(\.dismiss) private var dismiss
    @State private var showShareSheet = false
    @State private var showPublishSheet = false
    @State private var localFileURL: URL?
    @State private var sharing = false
    @State private var captionCopiedToast = false
    @State private var shareError: String?

    var body: some View {
        ZStack {
            ClipVideoPlayer(
                clip: clip,
                mode: .fullscreen,
                isVisible: true,
                onClose: { dismiss() },
                trailingTopActions: [
                    .init(
                        label: "Publish",
                        systemImage: "paperplane.fill",
                        highlighted: true,
                        action: {
                            showPublishSheet = true
                        }
                    ),
                    .init(
                        label: "Share",
                        systemImage: sharing ? "ellipsis" : "square.and.arrow.up",
                        action: {
                            Task { await prepareAndShare() }
                        }
                    ),
                ]
            )

            if captionCopiedToast {
                VStack {
                    Spacer()
                    HStack(spacing: 8) {
                        Image(systemName: "doc.on.clipboard.fill")
                        Text("Caption copied — paste it after sharing")
                            .font(.footnote.weight(.semibold))
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(.black.opacity(0.78))
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
                    .padding(.bottom, 80)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }

            if let err = shareError {
                VStack {
                    Spacer()
                    Label(err, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(.black.opacity(0.78))
                        .foregroundStyle(.red)
                        .clipShape(.capsule)
                        .padding(.bottom, 80)
                }
            }
        }
        .background(Color.black)
        .ignoresSafeArea()
        .sheet(isPresented: $showShareSheet) {
            if let url = localFileURL {
                ShareSheet(items: [url])
            }
        }
        .sheet(isPresented: $showPublishSheet) {
            ClipPublishSheet(clip: clip)
        }
    }

    /// Download the rendered MP4 to a temp file then present the system share
    /// sheet. We also write a publish-ready caption (hook + caption + #hashtags)
    /// to the system pasteboard so the user can paste it inside whatever
    /// destination app they pick — share-extension share-items can't carry a
    /// caption for video on most platforms, so this is the fastest path.
    private func prepareAndShare() async {
        guard let path = clip.storagePath else { return }
        sharing = true
        defer { sharing = false }
        do {
            let url = try await ClipForgeAPI.shared.signedURL(
                path: path,
                bucket: "clipforge-videos-rendered"
            )
            let (data, _) = try await URLSession.shared.data(from: url)
            let tmp = FileManager.default.temporaryDirectory
                .appendingPathComponent("clipforge-\(clip.id).mp4")
            try data.write(to: tmp, options: .atomic)
            localFileURL = tmp

            let caption = composeCaption()
            if !caption.isEmpty {
                UIPasteboard.general.string = caption
                withAnimation(.spring()) { captionCopiedToast = true }
                Task {
                    try? await Task.sleep(nanoseconds: 2_400_000_000)
                    await MainActor.run {
                        withAnimation(.easeOut) { captionCopiedToast = false }
                    }
                }
            }

            showShareSheet = true
        } catch {
            shareError = error.localizedDescription
            Task {
                try? await Task.sleep(nanoseconds: 3_500_000_000)
                await MainActor.run { shareError = nil }
            }
        }
    }

    private func composeCaption() -> String {
        var parts: [String] = []
        if let h = clip.hook, !h.isEmpty { parts.append(h) }
        if let c = clip.caption, !c.isEmpty { parts.append(c) }
        if let tags = clip.hashtags, !tags.isEmpty {
            parts.append(
                tags.prefix(5)
                    .map { "#\($0.replacingOccurrences(of: "#", with: ""))" }
                    .joined(separator: " ")
            )
        }
        return parts.joined(separator: "\n\n")
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
