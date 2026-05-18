import SwiftUI
import AVKit

struct ClipsFeedView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var vm = ClipsFeedViewModel()
    @State private var scrollPosition: String?

    var body: some View {
        NavigationStack {
            GeometryReader { proxy in
                Group {
                    if vm.loading && vm.clips.isEmpty {
                        loadingState
                    } else if vm.clips.isEmpty {
                        emptyState
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 0) {
                                ForEach(vm.clips) { clip in
                                    ClipCard(clip: clip, isVisible: scrollPosition == clip.id)
                                        .frame(width: proxy.size.width, height: proxy.size.height)
                                        .id(clip.id)
                                }
                            }
                            .scrollTargetLayout()
                        }
                        .scrollTargetBehavior(.paging)
                        .scrollPosition(id: $scrollPosition)
                        .ignoresSafeArea(edges: .bottom)
                        .refreshable { await vm.load() }
                    }
                }
            }
            .task { await vm.load() }
            .navigationBarHidden(true)
            .onChange(of: appState.pendingClipId) { _, newId in
                guard let newId else { return }
                Task { await openDeeplinkClip(id: newId) }
            }
        }
    }

    private var loadingState: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Loading your clips…").foregroundStyle(.secondary).font(.footnote)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "play.rectangle.on.rectangle")
                .font(.system(size: 50))
                .foregroundStyle(.brand)
            Text("No clips yet")
                .font(.title3.bold())
            Text("Create a project in the Studio tab — your finished clips will appear here.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .minimumScaleFactor(0.9)
            Button("Go to Studio") {
                appState.selectedTab = .studio
            }
            .buttonStyle(.borderedProminent)
            .tint(.brand)
            .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func openDeeplinkClip(id: String) async {
        if !vm.clips.contains(where: { $0.id == id }) {
            await vm.load()
        }
        if vm.clips.contains(where: { $0.id == id }) {
            withAnimation(.easeInOut) { scrollPosition = id }
        }
        appState.pendingClipId = nil
    }
}

private struct ClipCard: View {
    let clip: Clip
    let isVisible: Bool
    @State private var player: AVPlayer?
    @State private var loadError = false

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            if let player {
                VideoPlayer(player: player)
                    .onAppear { player.play() }
                    .onDisappear { player.pause() }
            } else if loadError {
                fallbackCard(systemImage: "wifi.exclamationmark",
                             text: "Couldn't load this clip. Pull to refresh.")
            } else {
                fallbackCard(systemImage: "film.stack", text: "Loading…")
            }

            LinearGradient(
                colors: [.clear, .black.opacity(0.7)],
                startPoint: .center, endPoint: .bottom
            ).allowsHitTesting(false)

            VStack(alignment: .leading, spacing: 6) {
                if let hook = clip.hook, !hook.isEmpty {
                    Text(hook)
                        .font(.title3.bold())
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                }
                if let caption = clip.caption, !caption.isEmpty {
                    Text(caption)
                        .font(.callout)
                        .lineLimit(3)
                        .minimumScaleFactor(0.9)
                }
                if clip.sourceKind == "avatar" {
                    Label("AI Avatar", systemImage: "person.wave.2.fill")
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.brand.opacity(0.85))
                        .clipShape(.capsule)
                        .padding(.top, 4)
                }
            }
            .padding(20)
            .foregroundStyle(.white)
        }
        .task(id: clip.id) { await loadStream() }
        .onDisappear { releasePlayer() }
    }

    private func fallbackCard(systemImage: String, text: String) -> some View {
        ZStack {
            Color.cardBackground
            VStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.system(size: 40))
                    .foregroundStyle(.tertiary)
                Text(text)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func loadStream() async {
        guard let path = clip.storagePath else { loadError = true; return }
        do {
            let signed = try await ClipForgeAPI.shared.signedURL(
                path: path, bucket: "clipforge-videos-rendered"
            )
            // Build asset on background, hand to player on main.
            let item = AVPlayerItem(url: signed)
            await MainActor.run {
                let p = AVPlayer(playerItem: item)
                p.actionAtItemEnd = .none
                NotificationCenter.default.addObserver(
                    forName: .AVPlayerItemDidPlayToEndTime,
                    object: item,
                    queue: .main
                ) { _ in
                    p.seek(to: .zero); p.play()
                }
                player = p
            }
        } catch {
            await MainActor.run { loadError = true }
        }
    }

    /// Release the player + drop the AVAsset cache when the card scrolls away.
    /// Prevents memory accumulation in long feeds (50+ clips).
    private func releasePlayer() {
        guard let p = player else { return }
        p.pause()
        p.replaceCurrentItem(with: nil)
        player = nil
    }
}
