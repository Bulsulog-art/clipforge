import SwiftUI
import AVKit
import AVFoundation

/// Side-by-side comparison between an original clip and its face-swap
/// derivative. Two players are stacked at identical frames; a draggable
/// vertical divider masks the "after" video to reveal more of it as the
/// user drags right. Both players loop and play in sync.
@MainActor
struct ClipBeforeAfterSheet: View {
    let originalClip: Clip
    let derivative: ClipForgeAPI.Derivative
    @Environment(\.dismiss) private var dismiss

    @State private var originalPlayer: AVPlayer?
    @State private var swappedPlayer: AVPlayer?
    @State private var loading = true
    @State private var error: String?
    @State private var sliderX: CGFloat = 0    // 0 == fully "before", >0 reveals "after"

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if loading {
                ProgressView().tint(.white)
            } else if let error {
                VStack(spacing: 10) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.largeTitle).foregroundStyle(.yellow)
                    Text(error)
                        .foregroundStyle(.white)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                    Button("Close") { dismiss() }
                        .tint(.brand)
                }
            } else {
                comparisonPlayer
                chrome
            }
        }
        .task { await loadStreams() }
        .onDisappear { teardown() }
    }

    // MARK: - Comparison player

    private var comparisonPlayer: some View {
        GeometryReader { geo in
            ZStack(alignment: .topLeading) {
                // Base layer — original ("before")
                playerLayer(player: originalPlayer)
                    .frame(width: geo.size.width, height: geo.size.height)

                // Overlay — face-swap ("after"), masked to the slider area
                playerLayer(player: swappedPlayer)
                    .frame(width: geo.size.width, height: geo.size.height)
                    .mask(
                        Rectangle()
                            .frame(width: max(1, sliderX), height: geo.size.height)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    )
                    .allowsHitTesting(false)

                // Divider line + drag handle
                Group {
                    Rectangle()
                        .fill(Color.white)
                        .frame(width: 2)
                        .offset(x: sliderX - 1)
                        .shadow(color: .black.opacity(0.55), radius: 4)
                    ZStack {
                        Circle()
                            .fill(.white)
                            .frame(width: 42, height: 42)
                            .shadow(color: .black.opacity(0.4), radius: 6)
                        Image(systemName: "arrow.left.and.right")
                            .font(.callout.weight(.bold))
                            .foregroundStyle(.black)
                    }
                    .offset(x: sliderX - 21, y: geo.size.height / 2 - 21)
                }
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            let proposed = min(max(value.location.x, 0), geo.size.width)
                            sliderX = proposed
                        }
                        .onEnded { _ in
                            Task { await Haptics.impact(.light) }
                        }
                )

                // Side labels — "BEFORE" left of the divider, "AFTER" right
                HStack {
                    pill("BEFORE", systemImage: "person.crop.circle")
                        .padding(.leading, 14)
                    Spacer()
                    pill("AFTER", systemImage: "wand.and.stars")
                        .padding(.trailing, 14)
                }
                .padding(.top, 70)
                .frame(width: geo.size.width)
            }
            .onAppear {
                if sliderX == 0 { sliderX = geo.size.width / 2 }
            }
        }
        .ignoresSafeArea()
    }

    private func pill(_ text: String, systemImage: String) -> some View {
        Label(text, systemImage: systemImage)
            .font(.caption.weight(.bold))
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(.black.opacity(0.55))
            .foregroundStyle(.white)
            .clipShape(.capsule)
            .overlay(Capsule().stroke(.white.opacity(0.15), lineWidth: 0.5))
    }

    @ViewBuilder
    private func playerLayer(player: AVPlayer?) -> some View {
        if let p = player {
            ComparisonPlayerLayer(player: p)
        } else {
            Color.black
        }
    }

    // MARK: - Top chrome

    private var chrome: some View {
        VStack {
            HStack {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(.white.opacity(0.85))
                        .shadow(color: .black.opacity(0.5), radius: 6)
                }
                Spacer()
                Label("Drag the divider", systemImage: "hand.draw")
                    .font(.caption2.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.black.opacity(0.55))
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
            }
            .padding(.horizontal, 14)
            .padding(.top, 6)
            Spacer()
        }
    }

    // MARK: - Lifecycle

    private func loadStreams() async {
        guard let originalPath = originalClip.storagePath,
              let swappedPath = derivative.storagePath else {
            error = "This comparison isn't available — the face swap may have failed."
            loading = false
            return
        }
        do {
            let bucket = "clipforge-videos-rendered"
            async let originalSigned = ClipForgeAPI.shared.signedURL(path: originalPath, bucket: bucket)
            async let swappedSigned  = ClipForgeAPI.shared.signedURL(path: swappedPath,  bucket: bucket)
            let (origUrl, swapUrl) = try await (originalSigned, swappedSigned)

            let oItem = AVPlayerItem(url: origUrl)
            let sItem = AVPlayerItem(url: swapUrl)
            let oPlayer = AVPlayer(playerItem: oItem)
            let sPlayer = AVPlayer(playerItem: sItem)
            oPlayer.actionAtItemEnd = .none
            sPlayer.actionAtItemEnd = .none
            // Mute the overlay player so the same audio doesn't double up.
            sPlayer.isMuted = true

            // Keep both players in sync by re-seeking the swap to match the
            // original on every loop. Cheap because the items are short.
            NotificationCenter.default.addObserver(
                forName: .AVPlayerItemDidPlayToEndTime,
                object: oItem,
                queue: .main
            ) { _ in
                oPlayer.seek(to: .zero)
                sPlayer.seek(to: .zero)
                oPlayer.play()
                sPlayer.play()
            }
            // Drift correction every 2s
            let interval = CMTime(seconds: 2, preferredTimescale: 600)
            oPlayer.addPeriodicTimeObserver(forInterval: interval, queue: .main) { time in
                MainActor.assumeIsolated {
                    let drift = abs(CMTimeGetSeconds(sPlayer.currentTime()) - CMTimeGetSeconds(time))
                    if drift > 0.25 {
                        sPlayer.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero)
                    }
                }
            }

            self.originalPlayer = oPlayer
            self.swappedPlayer = sPlayer
            self.loading = false
            oPlayer.play()
            sPlayer.play()
        } catch {
            self.error = error.localizedDescription
            self.loading = false
        }
    }

    private func teardown() {
        originalPlayer?.pause()
        swappedPlayer?.pause()
        originalPlayer?.replaceCurrentItem(with: nil)
        swappedPlayer?.replaceCurrentItem(with: nil)
        originalPlayer = nil
        swappedPlayer = nil
    }
}

// MARK: - AVPlayerLayer host (kept inside this file to avoid bleeding into
// ClipVideoPlayer's private container view).

private struct ComparisonPlayerLayer: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> ComparisonPlayerContainer {
        let view = ComparisonPlayerContainer()
        view.player = player
        view.backgroundColor = .black
        return view
    }

    func updateUIView(_ view: ComparisonPlayerContainer, context: Context) {
        view.player = player
    }
}

private final class ComparisonPlayerContainer: UIView {
    override static var layerClass: AnyClass { AVPlayerLayer.self }
    private var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    var player: AVPlayer? {
        get { playerLayer.player }
        set {
            playerLayer.player = newValue
            playerLayer.videoGravity = .resizeAspectFill
        }
    }
}
