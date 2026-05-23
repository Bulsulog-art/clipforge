import SwiftUI
import AVKit
import AVFoundation

/// Premium video player used in fullscreen (ClipPlayerView) and in-feed
/// (ClipsFeedView). Wraps an AVPlayerLayer-backed UIView so we can fully
/// own the controls UX instead of inheriting Apple's stock chrome.
///
/// Public surface:
///   • `mode`               — .fullscreen draws full chrome (close button,
///                            scrubber + time, mute, tap-to-pause).
///                            .feed shows only the hook overlay + tap-to-pause.
///   • `isVisible`          — feed callers pass `true` only for the card on
///                            screen; off-screen cards auto-pause to save CPU.
///   • `onClose`            — fullscreen-only dismiss hook.
///   • `trailingTopAction`  — fullscreen-only extra button (e.g. "Publish")
///                            rendered next to the share button.
@MainActor
struct ClipVideoPlayer: View {
    enum Mode { case fullscreen, feed }

    let clip: Clip
    var mode: Mode = .fullscreen
    var isVisible: Bool = true
    var onClose: (() -> Void)? = nil
    var trailingTopActions: [TrailingAction] = []

    /// Customisable top-right buttons. Up to two render comfortably. The
    /// first one is highlighted (gradient pill), subsequent ones use the
    /// muted chrome style.
    struct TrailingAction {
        let label: String
        let systemImage: String
        let highlighted: Bool
        let action: () -> Void

        init(
            label: String,
            systemImage: String,
            highlighted: Bool = false,
            action: @escaping () -> Void
        ) {
            self.label = label
            self.systemImage = systemImage
            self.highlighted = highlighted
            self.action = action
        }
    }

    @State private var player: AVPlayer?
    @State private var loading = true
    @State private var loadError: String?
    @State private var isPlaying = true
    @State private var muted = false
    @State private var currentTime: Double = 0
    @State private var duration: Double = 0
    @State private var controlsVisible = true
    @State private var scrubbing = false
    @State private var hideTask: Task<Void, Never>?
    @State private var timeObserverToken: Any?

    var body: some View {
        ZStack(alignment: .bottom) {
            background

            if let player {
                AVPlayerLayerView(player: player, gravity: .resizeAspectFill)
                    .ignoresSafeArea()
                    .onTapGesture { toggleControls() }
            } else if let err = loadError {
                errorOverlay(err)
            } else if loading {
                ProgressView().tint(.white)
            }

            // Hook + caption — appears on both modes, anchored bottom-leading.
            hookOverlay

            if mode == .fullscreen && controlsVisible {
                fullscreenControls
                    .transition(.opacity)
            }

            if mode == .feed && !isPlaying {
                // Big play icon overlay when paused in the feed
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(.white.opacity(0.85))
                    .shadow(color: .black.opacity(0.4), radius: 6)
                    .transition(.scale.combined(with: .opacity))
            }
        }
        .task(id: clip.id) { await loadStream() }
        .onChange(of: isVisible) { _, visible in
            visible ? player?.play() : player?.pause()
            isPlaying = visible
        }
        .onDisappear { teardown() }
    }

    // MARK: - Hook + caption overlay

    @ViewBuilder
    private var hookOverlay: some View {
        if let hook = clip.hook, !hook.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                if mode == .fullscreen {
                    Spacer(minLength: 0)
                }
                Text(hook)
                    .font((mode == .fullscreen ? Font.title3 : Font.title3).bold())
                    .foregroundStyle(.white)
                    .multilineTextAlignment(.leading)
                    .lineLimit(mode == .fullscreen ? 3 : 2)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.black.opacity(0.45))
                    .clipShape(.rect(cornerRadius: 12))
                if mode == .feed, let cap = clip.caption, !cap.isEmpty {
                    Text(cap)
                        .font(.callout)
                        .foregroundStyle(.white.opacity(0.92))
                        .lineLimit(3)
                        .padding(.horizontal, 4)
                }
                if clip.sourceKind == "avatar" {
                    Label("AI Avatar", systemImage: "person.wave.2.fill")
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.brand.opacity(0.85))
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, mode == .fullscreen ? 20 : 18)
            .padding(.bottom, mode == .fullscreen ? 110 : 40)
        }
    }

    // MARK: - Fullscreen chrome

    private var fullscreenControls: some View {
        VStack {
            // Top row — close, optional trailing action (e.g. Publish), mute
            HStack(spacing: 10) {
                if let onClose {
                    chromeButton(systemImage: "xmark", accessibility: "Close") { onClose() }
                }
                Spacer()
                ForEach(trailingTopActions.indices, id: \.self) { idx in
                    let act = trailingTopActions[idx]
                    if act.highlighted {
                        Button(action: {
                            act.action()
                            Task { await Haptics.impact(.medium) }
                        }) {
                            Label(act.label, systemImage: act.systemImage)
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
                                .shadow(color: .brand.opacity(0.55), radius: 8)
                        }
                        .buttonStyle(.plain)
                    } else {
                        chromeButton(
                            systemImage: act.systemImage,
                            accessibility: act.label,
                            action: act.action
                        )
                    }
                }
                chromeButton(
                    systemImage: muted ? "speaker.slash.fill" : "speaker.wave.2.fill",
                    accessibility: muted ? "Unmute" : "Mute"
                ) {
                    muted.toggle()
                    player?.isMuted = muted
                    bumpAutoHide()
                }
            }
            .padding(.horizontal, 14)
            .padding(.top, 6)

            Spacer()

            // Centre play/pause indicator (only when paused — playing state
            // hides the icon for a clean view)
            if !isPlaying {
                Image(systemName: "play.circle.fill")
                    .font(.system(size: 70))
                    .foregroundStyle(.white.opacity(0.9))
                    .shadow(color: .black.opacity(0.4), radius: 8)
                    .transition(.scale.combined(with: .opacity))
                Spacer()
            }

            // Bottom scrubber
            scrubber
                .padding(.horizontal, 18)
                .padding(.bottom, 40)
        }
        .background(
            LinearGradient(
                colors: [.black.opacity(0.45), .clear, .black.opacity(0.55)],
                startPoint: .top,
                endPoint: .bottom
            )
            .allowsHitTesting(false)
        )
    }

    private var scrubber: some View {
        VStack(spacing: 6) {
            // Track + thumb
            GeometryReader { geo in
                let progress = duration > 0 ? min(max(currentTime / duration, 0), 1) : 0
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Color.white.opacity(0.25))
                        .frame(height: 4)
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [.brand, .brandGlow],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(width: geo.size.width * progress, height: 4)
                    Circle()
                        .fill(Color.white)
                        .frame(width: scrubbing ? 16 : 12, height: scrubbing ? 16 : 12)
                        .shadow(color: .brand.opacity(0.5), radius: scrubbing ? 8 : 4)
                        .offset(x: max(0, geo.size.width * progress - (scrubbing ? 8 : 6)))
                        .animation(.easeOut(duration: 0.12), value: scrubbing)
                }
                .frame(height: 22)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            scrubbing = true
                            let pct = min(max(value.location.x / geo.size.width, 0), 1)
                            currentTime = duration * pct
                            bumpAutoHide()
                        }
                        .onEnded { _ in
                            seek(to: currentTime)
                            scrubbing = false
                            bumpAutoHide()
                        }
                )
            }
            .frame(height: 22)

            HStack {
                Text(formatTime(currentTime))
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.white.opacity(0.8))
                Spacer()
                Text("-\(formatTime(max(0, duration - currentTime)))")
                    .font(.caption2.monospacedDigit())
                    .foregroundStyle(.white.opacity(0.8))
            }
        }
    }

    private func chromeButton(
        systemImage: String,
        accessibility: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: {
            action()
            Task { await Haptics.impact(.light) }
        }) {
            Image(systemName: systemImage)
                .font(.callout.weight(.bold))
                .frame(width: 36, height: 36)
                .background(.black.opacity(0.45))
                .foregroundStyle(.white)
                .clipShape(Circle())
                .overlay(Circle().stroke(.white.opacity(0.15), lineWidth: 0.5))
        }
        .accessibilityLabel(accessibility)
    }

    // MARK: - Background / states

    private var background: some View {
        Color.black.ignoresSafeArea()
    }

    private func errorOverlay(_ message: String) -> some View {
        VStack(spacing: 14) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 42))
                .foregroundStyle(.yellow)
            Text("Couldn't load this clip.")
                .font(.callout.weight(.semibold))
                .foregroundStyle(.white)
            Text(message)
                .font(.caption2)
                .foregroundStyle(.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 28)
        }
    }

    // MARK: - AVPlayer lifecycle

    private func loadStream() async {
        guard let path = clip.storagePath else {
            loadError = "Clip not rendered yet"
            loading = false
            return
        }
        do {
            // Cached signed URLs: scrolling back to a previously-viewed card
            // becomes instant instead of paying the Supabase round-trip again.
            // SignedURLCache also coalesces concurrent requests for the same
            // key so a fast scroll doesn't burst the storage API.
            let url = try await SignedURLCache.shared.signedURL(
                path: path,
                bucket: "clipforge-videos-rendered"
            )
            let item = AVPlayerItem(url: url)
            // Cap the forward buffer at 8 seconds. Default is "system-chosen"
            // which on cellular can buffer 30–60s eagerly — multiplied across
            // 5–10 visible feed cards that's a lot of unnecessary RAM. 8s is
            // enough to hide a brief network stall while keeping each
            // AVPlayerItem's footprint small.
            item.preferredForwardBufferDuration = 8
            let p = AVPlayer(playerItem: item)
            // Don't aggressively cache the next item — we control loading
            // ourselves via the feed's scrollPosition tracking.
            p.automaticallyWaitsToMinimizeStalling = true
            p.actionAtItemEnd = .none
            p.isMuted = muted
            // Loop endlessly — Reels/TikTok mental model
            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: item,
                queue: .main
            ) { _ in
                p.seek(to: .zero)
                p.play()
            }
            // 0.25s time observer drives the scrubber + time labels.
            // The callback is dispatched on the main queue (passed below), but
            // Swift's sendable-closure check doesn't know that — assume the
            // isolation explicitly so we can touch @MainActor State here.
            let interval = CMTime(seconds: 0.25, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
            let token = p.addPeriodicTimeObserver(forInterval: interval, queue: .main) { time in
                MainActor.assumeIsolated {
                    guard !scrubbing else { return }
                    currentTime = time.seconds.isFinite ? time.seconds : 0
                }
            }
            timeObserverToken = token

            // Resolve duration once it's known (AVAsset is async)
            Task {
                let dur = try? await item.asset.load(.duration)
                let secs = dur.map { CMTimeGetSeconds($0) } ?? 0
                await MainActor.run {
                    duration = secs.isFinite ? secs : 0
                }
            }

            player = p
            loading = false
            if isVisible { p.play(); isPlaying = true }
            if mode == .fullscreen { bumpAutoHide() }
        } catch {
            loadError = error.localizedDescription
            loading = false
        }
    }

    private func teardown() {
        hideTask?.cancel()
        hideTask = nil
        if let token = timeObserverToken {
            player?.removeTimeObserver(token)
            timeObserverToken = nil
        }
        player?.pause()
        player?.replaceCurrentItem(with: nil)
        player = nil
        loading = true
        loadError = nil
    }

    private func toggleControls() {
        if mode == .fullscreen {
            withAnimation(.easeInOut(duration: 0.2)) {
                if controlsVisible {
                    togglePlayback()
                }
                controlsVisible.toggle()
            }
            if controlsVisible { bumpAutoHide() } else { hideTask?.cancel() }
        } else {
            togglePlayback()
        }
        Task { await Haptics.impact(.light) }
    }

    private func togglePlayback() {
        guard let player else { return }
        if isPlaying {
            player.pause()
            isPlaying = false
        } else {
            player.play()
            isPlaying = true
            if mode == .fullscreen { bumpAutoHide() }
        }
    }

    /// Hide chrome 2.5s after the last interaction, but only while playing —
    /// when paused, keep controls visible so the user can resume.
    private func bumpAutoHide() {
        hideTask?.cancel()
        hideTask = Task { @MainActor in
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            if !Task.isCancelled && isPlaying && !scrubbing {
                withAnimation(.easeOut(duration: 0.3)) { controlsVisible = false }
            }
        }
    }

    private func seek(to time: Double) {
        guard let player else { return }
        let cm = CMTime(seconds: time, preferredTimescale: 600)
        player.seek(to: cm, toleranceBefore: .zero, toleranceAfter: .zero)
    }

    private func formatTime(_ seconds: Double) -> String {
        guard seconds.isFinite, seconds >= 0 else { return "0:00" }
        let total = Int(seconds.rounded())
        let m = total / 60
        let s = total % 60
        return String(format: "%d:%02d", m, s)
    }
}

// MARK: - AVPlayerLayer host

/// Bridges AVPlayerLayer into SwiftUI so we can render the video without the
/// stock VideoPlayer's built-in chrome. Setting `videoGravity = .resizeAspectFill`
/// matches TikTok / Reels behaviour (fill the frame, crop sides if needed).
private struct AVPlayerLayerView: UIViewRepresentable {
    let player: AVPlayer
    let gravity: AVLayerVideoGravity

    func makeUIView(context: Context) -> PlayerContainerView {
        let view = PlayerContainerView()
        view.player = player
        view.gravity = gravity
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ view: PlayerContainerView, context: Context) {
        view.player = player
        view.gravity = gravity
    }
}

private final class PlayerContainerView: UIView {
    override static var layerClass: AnyClass { AVPlayerLayer.self }
    private var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    var player: AVPlayer? {
        get { playerLayer.player }
        set { playerLayer.player = newValue }
    }
    var gravity: AVLayerVideoGravity = .resizeAspectFill {
        didSet { playerLayer.videoGravity = gravity }
    }
}
