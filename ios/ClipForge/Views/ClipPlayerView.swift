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
    @State private var localFileURL: URL?
    @State private var sharing = false

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
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.white.opacity(0.85))
                    }
                    Spacer()
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
        }
        .task { await loadStream() }
        .onDisappear { player?.pause() }
        .sheet(isPresented: $showShareSheet) {
            if let url = localFileURL {
                ShareSheet(items: [url])
            }
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

    /// Download the clip to a temp file then present share sheet (TikTok, Instagram, Photos…)
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
            showShareSheet = true
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
