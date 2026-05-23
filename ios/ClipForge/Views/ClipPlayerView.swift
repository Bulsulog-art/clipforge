import SwiftUI
import AVKit

/// Full-screen vertical clip player with native AVPlayer + share sheet.
/// Used when user taps a thumbnail in JobDetailView / ClipsFeed.
struct ClipPlayerView: View {
    let clip: Clip
    @Environment(\.dismiss) private var dismiss
    @State private var player: AVPlayer?
    @State private var loading = true
    @State private var error: String?
    @State private var showShareSheet = false
    @State private var showPublishSheet = false
    @State private var localFileURL: URL?
    @State private var sharing = false
    @State private var captionCopiedToast = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if let player {
                VideoPlayer(player: player)
                    .ignoresSafeArea()
                    .onAppear {
                        player.play()
                        NotificationCenter.default.addObserver(
                            forName: .AVPlayerItemDidPlayToEndTime,
                            object: player.currentItem,
                            queue: .main
                        ) { _ in
                            player.seek(to: .zero)
                            player.play()
                        }
                    }
            } else if loading {
                ProgressView().tint(.white)
            } else if let error {
                VStack(spacing: 12) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.largeTitle)
                        .foregroundStyle(.yellow)
                    Text(error).foregroundStyle(.white)
                    Button("Close") { dismiss() }
                        .tint(.brand)
                }
            }

            VStack {
                HStack(spacing: 14) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    Spacer()
                    // Publish to channels — primary CTA in the fullscreen player.
                    Button(action: {
                        Task { await Haptics.impact(.medium) }
                        showPublishSheet = true
                    }) {
                        Label("Publish", systemImage: "paperplane.fill")
                            .font(.caption.bold())
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                LinearGradient(
                                    colors: [.brand, .brandGlow],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .foregroundStyle(.white)
                            .clipShape(.capsule)
                            .shadow(color: .brand.opacity(0.6), radius: 6)
                    }
                    .buttonStyle(.plain)

                    Button(action: { Task { await prepareAndShare() } }) {
                        if sharing {
                            ProgressView().tint(.white)
                        } else {
                            Image(systemName: "square.and.arrow.up.circle.fill")
                                .font(.title2)
                                .foregroundStyle(.white.opacity(0.85))
                        }
                    }
                }
                .padding()
                Spacer()
                if let hook = clip.hook {
                    Text(hook)
                        .font(.title3.bold())
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.leading)
                        .padding()
                        .background(.black.opacity(0.5))
                        .clipShape(.rect(cornerRadius: 12))
                        .padding()
                }
            }

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
                    .background(.black.opacity(0.75))
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
                    .padding(.bottom, 110)
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
                }
            }
        }
        .task { await loadStream() }
        .onDisappear { player?.pause() }
        .sheet(isPresented: $showShareSheet) {
            if let url = localFileURL {
                ShareSheet(items: [url])
            }
        }
        .sheet(isPresented: $showPublishSheet) {
            ClipPublishSheet(clip: clip)
        }
    }

    private func loadStream() async {
        guard let path = clip.storagePath else {
            error = "Clip not rendered yet"; loading = false; return
        }
        do {
            let url = try await ClipForgeAPI.shared.signedURL(path: path, bucket: "clipforge-videos-rendered")
            player = AVPlayer(url: url)
            loading = false
        } catch {
            self.error = error.localizedDescription
            loading = false
        }
    }

    /// Download the clip to a temp file then present share sheet (TikTok, Instagram, Photos…).
    /// We also stuff a smart caption (hook + caption + #hashtags) into the
    /// system pasteboard so the user can paste it directly inside whichever
    /// app they choose from the share sheet — most platforms don't accept a
    /// caption via the share-extension protocol for video, so this is the
    /// fastest path to a polished post.
    private func prepareAndShare() async {
        guard let path = clip.storagePath else { return }
        sharing = true
        defer { sharing = false }
        do {
            let url = try await ClipForgeAPI.shared.signedURL(path: path, bucket: "clipforge-videos-rendered")
            let (data, _) = try await URLSession.shared.data(from: url)
            let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("clipforge-\(clip.id).mp4")
            try data.write(to: tmp, options: .atomic)
            localFileURL = tmp

            // Caption to clipboard
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
            self.error = error.localizedDescription
        }
    }

    /// Compose a publish-ready caption from the clip metadata.
    /// Mirrors ClipPublishSheet.defaultCaption so the user gets the same text
    /// regardless of which surface they share from.
    private func composeCaption() -> String {
        var parts: [String] = []
        if let h = clip.hook, !h.isEmpty { parts.append(h) }
        if let c = clip.caption, !c.isEmpty { parts.append(c) }
        if let tags = clip.hashtags, !tags.isEmpty {
            parts.append(tags.prefix(5).map { "#\($0.replacingOccurrences(of: "#", with: ""))" }.joined(separator: " "))
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
