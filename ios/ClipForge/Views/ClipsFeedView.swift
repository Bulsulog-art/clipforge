import SwiftUI
import AVKit

struct ClipsFeedView: View {
    @StateObject private var vm = ClipsFeedViewModel()

    var body: some View {
        NavigationStack {
            GeometryReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(vm.clips) { clip in
                            ClipCard(clip: clip)
                                .frame(width: proxy.size.width, height: proxy.size.height)
                        }
                    }
                }
                .scrollTargetBehavior(.paging)
                .ignoresSafeArea(edges: .bottom)
            }
            .task { await vm.load() }
            .navigationBarHidden(true)
        }
    }
}

private struct ClipCard: View {
    let clip: Clip
    @State private var player: AVPlayer?

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            if let player {
                VideoPlayer(player: player)
                    .onAppear { player.play() }
                    .onDisappear { player.pause() }
            } else {
                Color.cardBackground
            }
            LinearGradient(
                colors: [.clear, .black.opacity(0.7)],
                startPoint: .center, endPoint: .bottom
            ).allowsHitTesting(false)
            VStack(alignment: .leading, spacing: 6) {
                Text(clip.hook ?? "").font(.title3.bold()).lineLimit(2)
                if let caption = clip.caption { Text(caption).font(.callout).lineLimit(3) }
            }
            .padding(20).foregroundStyle(.white)
        }
        .task { await loadStream() }
    }

    private func loadStream() async {
        guard let path = clip.storagePath else { return }
        if let signed = try? await ClipForgeAPI.shared.signedURL(path: path, bucket: "clipforge-videos-rendered") {
            player = AVPlayer(url: signed)
        }
    }
}
