import SwiftUI
import UIKit
import AVKit
import DentVideoCore

/// One video: watch it, read the software-check notes, approve or decline, then post.
/// The decision (or "Post") stays in a bar at the bottom, so it is one thumb away however
/// tall the player is.
struct VideoDetailView: View {
    let itemID: String
    @Environment(AppModel.self) private var model
    @State private var declining = false
    @State private var posting = false
    @State private var busy = false
    @State private var approvedTick = 0
    @Environment(\.dynamicTypeSize) private var type

    private var item: VideoItem? { model.items.first { $0.id == itemID } }

    var body: some View {
        Group {
            if let item {
                content(item)
            } else {
                MessageView(icon: "film", title: L("video.gone.title"), message: L("video.gone.body")) { EmptyView() }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .background(Theme.paper.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        // The decision bar takes the bottom; the tabs come back with the back button.
        .toolbar(.hidden, for: .tabBar)
        .sensoryFeedback(.success, trigger: approvedTick)
        .task {
            guard model.isDemoMode else { return }
            try? await Task.sleep(for: .milliseconds(400))
            if model.isDemo("decline") { declining = true }
            if model.isDemo("post", "post-ready") { posting = true }
        }
    }

    private func content(_ item: VideoItem) -> some View {
        let state = WeekBoard.state(of: item)
        return ScrollView {
            VStack(alignment: .leading, spacing: Theme.s5) {
                PlayerCard(item: item)
                VStack(alignment: .leading, spacing: Theme.s3) {
                    StateChip(state: state).accessibilityIdentifier("video.state")
                    Text(item.title)
                        .font(Theme.display(.title))
                        .foregroundStyle(Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    if let s = slotText(item.slot), state != .declined, state != .notMade, state != .failed {
                        Label(L("video.postOn", s), systemImage: "calendar").font(.subheadline).foregroundStyle(Theme.body)
                    }
                }
                notes(item, state: state)
                if state == .approved || state == .posted { postedToggle(item) }
                if let caption = item.post?.instagram ?? item.caption, !caption.isEmpty, state != .notMade, state != .failed {
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        Text(L("video.caption")).font(.footnote.weight(.semibold)).foregroundStyle(Theme.muted).textCase(.uppercase)
                        Text(caption).font(.body).foregroundStyle(Theme.body).textSelection(.enabled)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(Theme.s4)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .dvCard()
                }
                if state == .approved || state == .posted || state == .declined {
                    Button(L("video.undo")) { run { await model.undoDecision(item) } }
                        .buttonStyle(.dvQuiet)
                        .accessibilityIdentifier("video.undo")
                        .frame(maxWidth: .infinity)
                        .disabled(busy)
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.top, Theme.s2)
            .padding(.bottom, Theme.s5)
            .readableWidth(640)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) { actionBar(item, state: state) }
        .sheet(isPresented: $declining) { DeclineSheet(item: item) }
        .sheet(isPresented: $posting) { PostSheet(item: item, startReady: model.isDemo("post-ready")) }
    }

    @ViewBuilder private func notes(_ item: VideoItem, state: WeekBoard.CardState) -> some View {
        switch state {
        case .look:
            VStack(alignment: .leading, spacing: Theme.s2) {
                Label(L("video.look.title"), systemImage: "exclamationmark.bubble.fill").font(.headline).foregroundStyle(Theme.amber)
                ForEach(item.reasons, id: \.self) { r in
                    Text(reasonText(r)).font(.subheadline).foregroundStyle(Theme.ink).fixedSize(horizontal: false, vertical: true)
                }
                Text(L("video.look.note")).font(.footnote).foregroundStyle(Theme.body)
            }
            .padding(Theme.s4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.amberSoft, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        case .review, .approved, .posted:
            Label(L("video.checked"), systemImage: "checkmark.shield.fill")
                .font(.subheadline)
                .foregroundStyle(Theme.teal)
                .fixedSize(horizontal: false, vertical: true)
        case .making:
            note(L("video.making"), icon: "hourglass")
        case .failed:
            note(L("video.failed"), icon: "clock.badge.exclamationmark")
        case .notMade:
            VStack(alignment: .leading, spacing: 6) {
                ForEach(item.reasons, id: \.self) { r in Text(reasonText(r)).font(.subheadline).foregroundStyle(Theme.body) }
            }
        case .declined:
            EmptyView()
        }
    }

    private func note(_ text: String, icon: String) -> some View {
        Label(text, systemImage: icon)
            .font(.subheadline)
            .foregroundStyle(Theme.body)
            .padding(Theme.s4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.sand, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
    }

    private func postedToggle(_ item: VideoItem) -> some View {
        Toggle(isOn: Binding(get: { item.isPosted }, set: { v in run { await model.setPosted(item, v) } })) {
            Label(L("video.markPosted"), systemImage: "paperplane").font(.body).foregroundStyle(Theme.ink)
        }
        .tint(Theme.teal)
        .accessibilityIdentifier("video.posted")
        .padding(.horizontal, Theme.s4)
        .frame(minHeight: 56)
        .dvCard()
        .disabled(busy)
    }

    /// The one primary action of this state, pinned above the home indicator.
    @ViewBuilder private func actionBar(_ item: VideoItem, state: WeekBoard.CardState) -> some View {
        switch state {
        case .review, .look:
            bar {
                // Side by side; stacked (approve on top) at the largest text sizes.
                let layout = type.isAccessibilitySize ? AnyLayout(VStackLayout(spacing: Theme.s2)) : AnyLayout(HStackLayout(spacing: Theme.s3))
                layout {
                    if type.isAccessibilitySize { approveButton(item) }
                    Button { declining = true } label: { Label(L("video.decline"), systemImage: "xmark") }
                        .buttonStyle(.dvSecondary)
                        .accessibilityIdentifier("video.decline")
                    if !type.isAccessibilitySize { approveButton(item) }
                }
            }
        case .approved, .posted:
            bar {
                Button { posting = true } label: { Label(L("video.post"), systemImage: "square.and.arrow.up") }
                    .buttonStyle(.dvPrimary)
                    .accessibilityIdentifier("video.post")
            }
        default:
            EmptyView()
        }
    }

    private func approveButton(_ item: VideoItem) -> some View {
        Button {
            run {
                await model.approve(item)
                if model.items.first(where: { $0.id == item.id })?.approval == .approved { approvedTick += 1 }
            }
        } label: { Label(L("video.approve"), systemImage: "checkmark") }
            .buttonStyle(.dvPrimary)
            .accessibilityIdentifier("video.approve")
    }

    private func bar<C: View>(@ViewBuilder _ content: () -> C) -> some View {
        content()
            .disabled(busy)
            .padding(.horizontal, Theme.gutter)
            .padding(.top, Theme.s3)
            .padding(.bottom, Theme.s2)
            .readableWidth(640)
            .background(.bar)
            .overlay(alignment: .top) { Rectangle().fill(Theme.line).frame(height: 0.5) }
    }

    private func run(_ work: @escaping @MainActor () async -> Void) {
        Task {
            busy = true
            await work()
            busy = false
        }
    }
}

/// The player: the cached file when the phone has it, else the signed stream. The poster shows
/// until the first frame is ready, so the card never flashes black.
struct PlayerCard: View {
    let item: VideoItem
    @State private var player: AVPlayer?
    @State private var ready = false

    var body: some View {
        ZStack {
            Color.black
            if let player {
                PlayerController(player: player)
                    .opacity(ready ? 1 : 0)
            }
            if !ready {
                Poster(id: item.id, url: item.thumbUrl, working: item.status == .working || item.status == .queued)
                    .overlay {
                        if player != nil { ProgressView().tint(.white).controlSize(.large) }
                    }
            }
        }
        .aspectRatio(9 / 16, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        .shadow(color: Color.black.opacity(0.12), radius: 18, y: 8)
        .frame(maxHeight: 460)
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(L("video.player", item.title))
        .task(id: item.id) {
            let url = VideoCache.shared.localURL(for: item.id) ?? item.videoUrl
            guard let url else { return }
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            let asset = AVURLAsset(url: url)
            let p = AVPlayer(playerItem: AVPlayerItem(asset: asset))
            p.automaticallyWaitsToMinimizeStalling = url.isFileURL == false
            player = p
            // Wait for a playable first frame, then fade the poster away.
            for _ in 0..<200 {
                let status = p.currentItem?.status ?? .unknown
                if status == .readyToPlay {
                    withAnimation(.easeOut(duration: 0.2)) { ready = true }
                    return
                }
                if status == .failed { break }
                try? await Task.sleep(for: .milliseconds(50))
                if Task.isCancelled { return }
            }
            // Failed or very slow: show the player anyway, its own controls explain.
            ready = true
        }
        .onDisappear { player?.pause() }
    }
}

/// AVPlayerViewController: the system controls, full screen and Picture in Picture.
struct PlayerController: UIViewControllerRepresentable {
    let player: AVPlayer
    func makeUIViewController(context: Context) -> AVPlayerViewController {
        let c = AVPlayerViewController()
        c.player = player
        c.videoGravity = .resizeAspect
        c.allowsPictureInPicturePlayback = false
        return c
    }
    func updateUIViewController(_ c: AVPlayerViewController, context: Context) {
        if c.player !== player { c.player = player }
    }
}

/// Decline with an optional note for the DentVideo team (500 characters, as on the web).
struct DeclineSheet: View {
    let item: VideoItem
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var note = ""
    @State private var busy = false
    @FocusState private var focused: Bool

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s4) {
                    Text(L("decline.body")).font(.body).foregroundStyle(Theme.body).fixedSize(horizontal: false, vertical: true)
                    TextField(L("decline.placeholder"), text: $note, axis: .vertical)
                        .lineLimit(3...6)
                        .focused($focused)
                        .accessibilityIdentifier("decline.note")
                        .padding(14)
                        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous).strokeBorder(focused ? Theme.teal : Theme.line))
                        .onChange(of: note) { _, v in if v.count > 500 { note = String(v.prefix(500)) } }
                    Button {
                        Task {
                            busy = true
                            await model.decline(item, note: note)
                            busy = false
                            dismiss()
                        }
                    } label: {
                        if busy { ProgressView().tint(Theme.onFill) } else { Text(L("video.decline")) }
                    }
                    .buttonStyle(.dvPrimary)
                    .disabled(busy)
                    .accessibilityIdentifier("decline.submit")
                }
                .padding(Theme.s5)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("decline.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(L("common.cancel")) { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(Theme.paper)
    }
}

#Preview {
    NavigationStack { VideoDetailView(itemID: "p2") }.environment(AppModel.preview())
}
