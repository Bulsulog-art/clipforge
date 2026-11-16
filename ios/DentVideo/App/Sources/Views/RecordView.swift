import SwiftUI
import UIKit
import AVKit
import DentVideoCore

/// The practice plan: the filming cards of the clinic's videos, recording with the card on screen,
/// and the uploads on their way. Accounts whose plan has no own recordings see a neutral note.
struct RecordView: View {
    @Environment(AppModel.self) private var model
    @State private var recordingCard: CardChoice?

    struct CardChoice: Identifiable, Hashable {
        let id: String
        let title: String
        let card: ShootCard?
    }

    private var canRecord: Bool { model.me?.plan?.recordings ?? false }

    /// The newest five cards, one per title.
    private var cards: [CardChoice] {
        var seen = Set<String>()
        return model.items.compactMap { i -> CardChoice? in
            guard let c = i.shootCard, seen.insert(i.title).inserted else { return nil }
            return CardChoice(id: i.id, title: i.title, card: c)
        }
        .prefix(5)
        .map { $0 }
    }

    private var clips: [LibraryItem] { model.items.filter { $0.kind == .recording } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text(L("record.title"))
                        .font(Theme.display(.largeTitle))
                        .foregroundStyle(Theme.ink)
                        .accessibilityAddTraits(.isHeader)
                    if !canRecord {
                        MessageView(icon: "video.slash", title: L("record.notIncluded.title"), message: L("record.notIncluded.body")) { EmptyView() }
                            .frame(maxWidth: .infinity)
                            .dvCard()
                    } else {
                        Text(L("record.intro")).font(.body).foregroundStyle(Theme.body).fixedSize(horizontal: false, vertical: true)
                        uploads
                        if cards.isEmpty {
                            Text(L("record.noCards")).font(.subheadline).foregroundStyle(Theme.muted)
                        }
                        ForEach(cards) { c in CardView(choice: c) { recordingCard = c } }
                        Button { recordingCard = CardChoice(id: "free", title: L("record.free"), card: nil) } label: {
                            Label(L("record.free"), systemImage: "video")
                        }
                        .buttonStyle(.dvSecondary)
                        if !clips.isEmpty { finished }
                    }
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.vertical, 12)
                .frame(maxWidth: 700)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.paper.ignoresSafeArea())
            .refreshable { await model.refresh() }
            .navigationDestination(for: String.self) { VideoDetailView(itemID: $0) }
            .fullScreenCover(item: $recordingCard) { c in CameraScreen(choice: c) }
        }
    }

    @ViewBuilder private var uploads: some View {
        let list = model.uploads.active
        if !list.isEmpty {
            VStack(alignment: .leading, spacing: 10) {
                Text(L("record.uploads")).font(.headline).foregroundStyle(Theme.ink)
                ForEach(list) { e in UploadRow(entry: e) }
            }
            .padding(16)
            .dvCard()
        }
    }

    private var finished: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(L("record.clips")).font(Theme.display(.title3)).foregroundStyle(Theme.ink).accessibilityAddTraits(.isHeader)
            ForEach(clips) { item in
                NavigationLink(value: item.id) { VideoCard(item: item, compact: true) }.buttonStyle(.plain)
            }
        }
        .padding(.top, 8)
    }
}

/// One filming card: what to say, in order.
struct CardView: View {
    let choice: RecordView.CardChoice
    let record: () -> Void
    @State private var open = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Button { withAnimation(.snappy) { open.toggle() } } label: {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(choice.title).font(.headline).foregroundStyle(Theme.ink).multilineTextAlignment(.leading)
                        if let m = choice.card?.minutes { Text(L("record.minutes", Int(m.rounded()))).font(.footnote).foregroundStyle(Theme.muted) }
                    }
                    Spacer()
                    Image(systemName: "chevron.down").rotationEffect(.degrees(open ? 180 : 0)).foregroundStyle(Theme.muted)
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityValue(open ? L("common.expanded") : L("common.collapsed"))
            if open, let card = choice.card { CardText(card: card) }
            Button(action: record) { Label(L("record.start"), systemImage: "record.circle") }
                .buttonStyle(.dvPrimary)
        }
        .padding(16)
        .dvCard()
    }
}

struct CardText: View {
    let card: ShootCard
    var inverted = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            block(L("card.opening"), [card.opening])
            block(L("card.points"), card.points)
            block(L("card.closing"), [card.closing])
            if let a = card.avoid, !a.isEmpty { block(L("card.avoid"), a) }
            if !inverted, let s = card.setup, !s.isEmpty { block(L("card.setup"), s) }
        }
    }

    private func block(_ title: String, _ lines: [String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).font(.caption.weight(.semibold)).textCase(.uppercase).foregroundStyle(inverted ? Color.white.opacity(0.7) : Theme.teal)
            ForEach(lines, id: \.self) { l in
                Text(lines.count > 1 ? "• \(l)" : l).font(.body).foregroundStyle(inverted ? Color.white : Theme.body).fixedSize(horizontal: false, vertical: true)
            }
        }
        .accessibilityElement(children: .combine)
    }
}

struct UploadRow: View {
    let entry: UploadCenter.Entry
    @Environment(AppModel.self) private var model

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(entry.title).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink).lineLimit(2)
                Spacer()
                Text(ByteCountFormatter.string(fromByteCount: entry.bytes, countStyle: .file)).font(.caption).foregroundStyle(Theme.muted)
            }
            switch entry.state {
            case .waiting:
                Text(L("upload.waiting")).font(.footnote).foregroundStyle(Theme.muted)
            case .uploading:
                ProgressView(value: entry.progress).tint(Theme.teal)
                    .accessibilityLabel(L("upload.uploading"))
                    .accessibilityValue(entry.progress.formatted(.percent.precision(.fractionLength(0)).locale(L10n.locale)))
                Text(L("upload.background")).font(.caption).foregroundStyle(Theme.muted)
            case .processing:
                Label(L("upload.processing"), systemImage: "gearshape.2").font(.footnote).foregroundStyle(Theme.body)
            case .done:
                Label(L("upload.done"), systemImage: "checkmark.circle").font(.footnote).foregroundStyle(Theme.teal)
            case .failed:
                Text(L("upload.problem.\(entry.problem?.rawValue ?? "server")")).font(.footnote).foregroundStyle(Theme.danger).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: 16) {
                    if entry.problem != .tooLarge && entry.problem != .type && entry.problem != .needsPlan {
                        Button(L("common.retry")) { model.uploads.retry(entry.id) }.frame(minHeight: 44)
                    }
                    Button(L("upload.remove"), role: .destructive) { model.uploads.remove(entry.id) }.frame(minHeight: 44)
                }
                .font(.subheadline.weight(.semibold))
            }
        }
        .accessibilityElement(children: .contain)
    }
}

/// Full-screen camera with the card on screen. After a take: watch it, keep it or record again.
struct CameraScreen: View {
    let choice: RecordView.CardChoice
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    @State private var camera = CameraModel()
    @State private var showCard = true

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            switch camera.access {
            case .unknown:
                ProgressView().tint(.white)
            case .denied:
                MessageView(icon: "video.slash", title: L("camera.denied.title"), message: L("camera.denied.body")) {
                    Button(L("camera.openSettings")) {
                        if let u = URL(string: UIApplication.openSettingsURLString) { UIApplication.shared.open(u) }
                    }
                    .buttonStyle(.dvPrimary)
                    Button(L("common.close")) { dismiss() }.buttonStyle(.dvSecondary)
                }
                .background(Theme.paper, in: RoundedRectangle(cornerRadius: Theme.radius))
                .padding()
            case .granted:
                if let take = camera.take { review(take) } else { live }
            }
        }
        .task { await camera.prepare() }
        .onDisappear {
            camera.shutdown()
            camera.discardTake()
        }
        .statusBarHidden()
    }

    private var live: some View {
        ZStack {
            CameraPreview(session: camera.engine.session).ignoresSafeArea()
                .accessibilityHidden(true)
            VStack(spacing: 12) {
                HStack {
                    Button { dismiss() } label: { Image(systemName: "xmark").font(.title3.weight(.semibold)).frame(width: 44, height: 44) }
                        .accessibilityLabel(L("common.close"))
                        .disabled(camera.isRecording)
                    Spacer()
                    if camera.isRecording {
                        Text(Duration.seconds(camera.elapsed).formatted(.time(pattern: .minuteSecond)))
                            .font(.headline.monospacedDigit())
                            .padding(.horizontal, 12).padding(.vertical, 6)
                            .background(Color.red, in: Capsule())
                            .accessibilityLabel(L("camera.recording"))
                    }
                    Spacer()
                    Button { camera.flip() } label: { Image(systemName: "arrow.triangle.2.circlepath.camera").font(.title3).frame(width: 44, height: 44) }
                        .accessibilityLabel(L("camera.flip"))
                        .disabled(camera.isRecording)
                }
                .foregroundStyle(.white)
                .padding(.horizontal)

                if let card = choice.card {
                    VStack(alignment: .leading, spacing: 8) {
                        Button { withAnimation { showCard.toggle() } } label: {
                            Label(showCard ? L("camera.hideCard") : L("camera.showCard"), systemImage: showCard ? "eye.slash" : "text.alignleft")
                                .font(.footnote.weight(.semibold))
                                .frame(minHeight: 36)
                        }
                        .foregroundStyle(.white)
                        if showCard {
                            ScrollView { CardText(card: card, inverted: true).frame(maxWidth: .infinity, alignment: .leading) }
                                .frame(maxHeight: 260)
                        }
                    }
                    .padding(14)
                    .background(.black.opacity(0.55), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .padding(.horizontal)
                }
                if camera.failed {
                    Text(L("camera.failed")).font(.footnote).foregroundStyle(.white).padding(8).background(.black.opacity(0.6), in: Capsule())
                }
                Spacer()
                Button { camera.toggleRecording() } label: {
                    ZStack {
                        Circle().strokeBorder(.white, lineWidth: 4).frame(width: 78, height: 78)
                        if camera.isRecording {
                            RoundedRectangle(cornerRadius: 6).fill(Color.red).frame(width: 30, height: 30)
                        } else {
                            Circle().fill(Color.red).frame(width: 62, height: 62)
                        }
                    }
                }
                .accessibilityLabel(camera.isRecording ? L("camera.stop") : L("camera.record"))
                .padding(.bottom, 24)
            }
        }
    }

    private func review(_ take: URL) -> some View {
        VStack(spacing: 16) {
            TakePlayer(url: take)
                .clipShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
                .padding(.horizontal)
            Text(L("camera.review")).font(.subheadline).foregroundStyle(.white.opacity(0.8)).multilineTextAlignment(.center).padding(.horizontal)
            HStack(spacing: 12) {
                Button(L("camera.retake")) { camera.discardTake() }.buttonStyle(.dvSecondary)
                Button(L("camera.use")) {
                    model.uploads.enqueue(file: take, title: choice.title)
                    camera.take = nil
                    dismiss()
                }
                .buttonStyle(.dvPrimary)
            }
            .padding(.horizontal)
            .padding(.bottom, 24)
        }
    }
}

/// The take just recorded, played once per take (not rebuilt on every redraw).
struct TakePlayer: View {
    let url: URL
    @State private var player: AVPlayer?
    var body: some View {
        Group { if let player { PlayerController(player: player) } else { Color.black } }
            .task(id: url) {
                let p = AVPlayer(url: url)
                player = p
                p.play()
            }
            .accessibilityLabel(L("camera.review"))
    }
}

#Preview { RecordView().environment(AppModel.preview()) }
