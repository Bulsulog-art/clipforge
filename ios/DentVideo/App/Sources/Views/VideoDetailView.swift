import SwiftUI
import UIKit
import AVKit
import DentVideoCore

/// One video: watch it, read the software-check notes, approve or decline, then post.
struct VideoDetailView: View {
    let itemID: String
    @Environment(AppModel.self) private var model
    @State private var declining = false
    @State private var posting = false
    @State private var busy = false

    private var item: VideoItem? { model.items.first { $0.id == itemID } }

    var body: some View {
        Group {
            if let item {
                content(item)
            } else {
                MessageView(icon: "film", title: L("video.gone.title"), message: L("video.gone.body")) { EmptyView() }
            }
        }
        .background(Theme.paper.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
    }

    private func content(_ item: VideoItem) -> some View {
        let state = WeekBoard.state(of: item)
        return ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                PlayerCard(item: item)
                VStack(alignment: .leading, spacing: 10) {
                    StateChip(state: state)
                    Text(item.title)
                        .font(Theme.display(.title))
                        .foregroundStyle(Theme.ink)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    if let s = slotText(item.slot), state != .declined, state != .notMade {
                        Label(L("video.postOn", s), systemImage: "calendar").font(.subheadline).foregroundStyle(Theme.body)
                    }
                }
                notes(item, state: state)
                actions(item, state: state)
                if let caption = item.post?.instagram ?? item.caption, !caption.isEmpty, state != .notMade, state != .failed {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(L("video.caption")).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.muted)
                        Text(caption).font(.body).foregroundStyle(Theme.body).textSelection(.enabled)
                    }
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .dvCard()
                }
            }
            .padding(.horizontal, Theme.gutter)
            .padding(.bottom, 40)
            .frame(maxWidth: 640)
            .frame(maxWidth: .infinity)
        }
        .sheet(isPresented: $declining) { DeclineSheet(item: item) }
        .sheet(isPresented: $posting) { PostSheet(item: item) }
    }

    @ViewBuilder private func notes(_ item: VideoItem, state: WeekBoard.CardState) -> some View {
        switch state {
        case .look:
            VStack(alignment: .leading, spacing: 8) {
                Label(L("video.look.title"), systemImage: "exclamationmark.bubble").font(.headline).foregroundStyle(Theme.amber)
                ForEach(item.reasons, id: \.self) { r in Text(reasonText(r)).font(.subheadline).foregroundStyle(Theme.body) }
                Text(L("video.look.note")).font(.footnote).foregroundStyle(Theme.muted)
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Theme.amberSoft.opacity(0.6), in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        case .review:
            Label(L("video.checked"), systemImage: "checkmark.shield").font(.subheadline).foregroundStyle(Theme.teal)
        case .making:
            Text(L("video.making")).font(.subheadline).foregroundStyle(Theme.body)
        case .failed:
            Text(L("video.failed")).font(.subheadline).foregroundStyle(Theme.body)
        case .notMade:
            VStack(alignment: .leading, spacing: 6) {
                ForEach(item.reasons, id: \.self) { r in Text(reasonText(r)).font(.subheadline).foregroundStyle(Theme.body) }
            }
        default:
            EmptyView()
        }
    }

    @ViewBuilder private func actions(_ item: VideoItem, state: WeekBoard.CardState) -> some View {
        VStack(spacing: 10) {
            switch state {
            case .review, .look:
                Button { run { await model.approve(item) } } label: { Label(L("video.approve"), systemImage: "checkmark") }
                    .buttonStyle(.dvPrimary)
                Button { declining = true } label: { Label(L("video.decline"), systemImage: "xmark") }
                    .buttonStyle(.dvSecondary)
            case .approved, .posted:
                Button { posting = true } label: { Label(L("video.post"), systemImage: "square.and.arrow.up") }
                    .buttonStyle(.dvPrimary)
                Toggle(isOn: Binding(get: { item.isPosted }, set: { v in run { await model.setPosted(item, v) } })) {
                    Text(L("video.markPosted")).font(.body)
                }
                .tint(Theme.teal)
                .padding(.horizontal, 16)
                .frame(minHeight: 52)
                .dvCard()
                Button(L("video.undo")) { run { await model.undoDecision(item) } }
                    .font(.subheadline)
                    .frame(minHeight: 44)
            case .declined:
                Button(L("video.undo")) { run { await model.undoDecision(item) } }
                    .buttonStyle(.dvSecondary)
            default:
                EmptyView()
            }
        }
        .disabled(busy)
    }

    private func run(_ work: @escaping @MainActor () async -> Void) {
        Task {
            busy = true
            await work()
            busy = false
        }
    }
}

/// The player: the cached file when the phone has it, else the signed stream.
struct PlayerCard: View {
    let item: VideoItem
    @State private var player: AVPlayer?

    var body: some View {
        ZStack {
            Color.black
            if let player {
                PlayerController(player: player)
            } else if item.videoUrl == nil && VideoCache.shared.localURL(for: item.id) == nil {
                Poster(url: item.thumbUrl).overlay {
                    if item.status == .working || item.status == .queued { ProgressView().tint(.white) }
                }
            } else {
                ProgressView().tint(.white)
            }
        }
        .aspectRatio(9 / 16, contentMode: .fit)
        .frame(maxHeight: 560)
        .frame(maxWidth: .infinity)
        .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        .accessibilityElement(children: .contain)
        .accessibilityLabel(L("video.player", item.title))
        .task(id: item.id) {
            if let local = VideoCache.shared.localURL(for: item.id) {
                player = AVPlayer(url: local)
            } else if let remote = item.videoUrl {
                player = AVPlayer(url: remote)
            }
            try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
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

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 16) {
                Text(L("decline.body")).font(.body).foregroundStyle(Theme.body).fixedSize(horizontal: false, vertical: true)
                TextField(L("decline.placeholder"), text: $note, axis: .vertical)
                    .lineLimit(3...6)
                    .padding(14)
                    .background(Theme.card, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.line))
                    .onChange(of: note) { _, v in if v.count > 500 { note = String(v.prefix(500)) } }
                Button(L("video.decline")) {
                    Task {
                        await model.decline(item, note: note)
                        dismiss()
                    }
                }
                .buttonStyle(.dvPrimary)
                Spacer()
            }
            .padding(24)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("decline.title"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button(L("common.cancel")) { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}

#Preview {
    NavigationStack { VideoDetailView(itemID: "p2") }.environment(AppModel.preview())
}
