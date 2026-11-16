import SwiftUI
import UIKit
import DentVideoCore

/// The coloured chip on a video card: what state it is in, in words (never colour alone).
struct StateChip: View {
    let state: WeekBoard.CardState

    var body: some View {
        Label(L(Self.key(state)), systemImage: Self.icon(state))
            .font(.caption.weight(.semibold))
            .labelStyle(.titleAndIcon)
            .fixedSize(horizontal: false, vertical: true)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .foregroundStyle(foreground)
            .background(background, in: Capsule())
            .accessibilityElement(children: .combine)
    }

    static func key(_ s: WeekBoard.CardState) -> String {
        switch s {
        case .making: return "state.making"
        case .review: return "state.review"
        case .look: return "state.look"
        case .approved: return "state.approved"
        case .posted: return "state.posted"
        case .declined: return "state.declined"
        case .failed: return "state.failed"
        case .notMade: return "state.notMade"
        }
    }

    static func icon(_ s: WeekBoard.CardState) -> String {
        switch s {
        case .making: return "hourglass"
        case .review: return "eye"
        case .look: return "exclamationmark.bubble"
        case .approved: return "checkmark.circle.fill"
        case .posted: return "paperplane.fill"
        case .declined: return "xmark.circle"
        case .failed: return "clock.badge.exclamationmark"
        case .notMade: return "minus.circle"
        }
    }

    private var foreground: Color {
        switch state {
        case .approved, .posted: return Theme.onFill
        case .look: return Theme.amber
        case .failed: return Theme.danger
        case .review: return Theme.teal
        default: return Theme.body
        }
    }

    private var background: Color {
        switch state {
        case .approved, .posted: return Theme.teal
        case .look: return Theme.amberSoft
        case .review: return Theme.teal.opacity(0.12)
        case .failed: return Theme.danger.opacity(0.1)
        default: return Theme.sand
        }
    }
}

/// A calm full-width message with an icon: empty states, "no active plan", errors.
struct MessageView<Actions: View>: View {
    let icon: String
    let title: String
    let message: String
    @ViewBuilder var actions: () -> Actions
    @ScaledMetric(relativeTo: .title) private var iconSize: CGFloat = 30
    @ScaledMetric(relativeTo: .title) private var badge: CGFloat = 68

    var body: some View {
        VStack(spacing: Theme.s4) {
            Image(systemName: icon)
                .font(.system(size: iconSize, weight: .regular))
                .foregroundStyle(Theme.teal)
                .frame(width: badge, height: badge)
                .background(Theme.teal.opacity(0.1), in: Circle())
                .accessibilityHidden(true)
            Text(title)
                .font(Theme.display(.title2))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .accessibilityAddTraits(.isHeader)
            Text(message)
                .font(.body)
                .foregroundStyle(Theme.body)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
            VStack(spacing: Theme.s3) { actions() }.padding(.top, Theme.s2)
        }
        .padding(.horizontal, Theme.s5)
        .padding(.vertical, Theme.s6)
        .frame(maxWidth: 520)
    }
}

/// Posters keyed by video id (signed URLs change every hour, the picture does not): memory first,
/// then the Caches folder, then the network. Lists scroll without refetching.
actor PosterStore {
    static let shared = PosterStore()
    private let memory = NSCache<NSString, UIImage>()
    private var inFlight: [String: Task<UIImage?, Never>] = [:]
    private let dir: URL = {
        let u = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("posters", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        return u
    }()

    init() { memory.countLimit = 120 }

    func image(id: String, url: URL) async -> UIImage? {
        if let m = memory.object(forKey: id as NSString) { return m }
        let file = dir.appendingPathComponent(VideoCache.fileName(for: id) + ".jpg")
        if let data = try? Data(contentsOf: file), let img = UIImage(data: data) {
            store(img, id)
            return img
        }
        if let t = inFlight[id] { return await t.value }
        let task = Task<UIImage?, Never> {
            guard let (data, r) = try? await URLSession.shared.data(from: url),
                  (r as? HTTPURLResponse).map({ (200..<300).contains($0.statusCode) }) ?? false,
                  let img = UIImage(data: data) else { return nil }
            // Decode off the main thread so the first frame on screen is not a hitch.
            let ready = await img.byPreparingForDisplay() ?? img
            try? data.write(to: file, options: .atomic)
            return ready
        }
        inFlight[id] = task
        let img = await task.value
        inFlight[id] = nil
        if let img { store(img, id) }
        return img
    }

    private func store(_ img: UIImage, _ id: String) {
        memory.setObject(img, forKey: id as NSString)
        Task { @MainActor in PosterMemory.shared.setObject(img, forKey: id as NSString) }
    }
}

/// A main-thread mirror so a poster already seen draws in the first frame, without a flash.
@MainActor enum PosterMemory {
    static let shared: NSCache<NSString, UIImage> = {
        let c = NSCache<NSString, UIImage>()
        c.countLimit = 120
        return c
    }()
}

/// A video's poster: cached image, or a calm teal placeholder while it loads.
struct Poster: View {
    let id: String
    let url: URL?
    var working = false
    var delayed = false
    @State private var image: UIImage?

    init(id: String, url: URL?, working: Bool = false, delayed: Bool = false) {
        self.id = id
        self.url = url
        self.working = working
        self.delayed = delayed
        _image = State(initialValue: Self.ready(id))
    }

    /// What can be drawn in the very first frame.
    static func ready(_ id: String) -> UIImage? {
        #if DEBUG
        if let demo = Demo.poster(for: id) { return demo }
        #endif
        return PosterMemory.shared.object(forKey: id as NSString)
    }

    var body: some View {
        ZStack {
            LinearGradient(colors: [Theme.teal.opacity(0.22), Theme.teal.opacity(0.08)], startPoint: .top, endPoint: .bottom)
                .background(Theme.sand)
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
                    .transition(.opacity)
            } else {
                Image(systemName: working ? "hourglass" : delayed ? "clock" : "play.fill")
                    .font(.title3)
                    .foregroundStyle(Theme.teal.opacity(0.7))
            }
        }
        .clipped()
        .accessibilityHidden(true)
        .task(id: id) {
            if let c = Self.ready(id) { image = c; return }
            guard let url else { return }
            let loaded = await PosterStore.shared.image(id: id, url: url)
            withAnimation(.easeOut(duration: 0.2)) { image = loaded }
        }
    }
}

/// A slim, rounded progress bar (the system's linear one is a hairline).
struct WeekProgressBar: View {
    let value: Double
    let total: Double
    var body: some View {
        GeometryReader { g in
            let f = total > 0 ? min(max(value / total, 0), 1) : 0
            ZStack(alignment: .leading) {
                Capsule().fill(Theme.line)
                Capsule().fill(Theme.teal).frame(width: max(f * g.size.width, f > 0 ? 8 : 0))
            }
        }
        .frame(height: 8)
    }
}

/// Placeholder cards while the first week loads (instead of a lone spinner).
struct SkeletonWeek: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var pulse = false

    var body: some View {
        VStack(alignment: .leading, spacing: Theme.s4) {
            RoundedRectangle(cornerRadius: 6).fill(Theme.line).frame(width: 140, height: 14)
            RoundedRectangle(cornerRadius: 8).fill(Theme.line).frame(width: 220, height: 30)
            Capsule().fill(Theme.line).frame(height: 8)
            ForEach(0..<4, id: \.self) { _ in
                HStack(alignment: .top, spacing: Theme.s4) {
                    RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous).fill(Theme.line).frame(width: 78, height: 138)
                    VStack(alignment: .leading, spacing: Theme.s3) {
                        Capsule().fill(Theme.line).frame(width: 110, height: 22)
                        RoundedRectangle(cornerRadius: 6).fill(Theme.line).frame(height: 16)
                        RoundedRectangle(cornerRadius: 6).fill(Theme.line).frame(width: 160, height: 16)
                        RoundedRectangle(cornerRadius: 6).fill(Theme.line).frame(width: 120, height: 12)
                    }
                }
                .padding(14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .dvCard()
            }
        }
        .opacity(pulse ? 0.55 : 1)
        .padding(.horizontal, Theme.gutter)
        .padding(.top, Theme.s2)
        .readableWidth()
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(L("common.loading"))
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 0.9).repeatForever(autoreverses: true)) { pulse = true }
        }
    }
}

/// The sentence for a software-check reason code, in the app's language.
func reasonText(_ r: ReviewReason) -> String { L("reason.\(r.rawValue)") }

/// The suggested posting moment: "Tue 12:30".
func slotText(_ slot: Slot?) -> String? { slot.map { PostKit.label(of: $0, locale: L10n.locale) } }

/// Banner for notices (saved, refused, offline).
struct NoticeBanner: View {
    let notice: AppModel.Notice
    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: notice.isError ? "exclamationmark.circle.fill" : "checkmark.circle.fill").accessibilityHidden(true)
            Text(notice.text).font(.subheadline.weight(.medium)).frame(maxWidth: .infinity, alignment: .leading)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .foregroundStyle(notice.isError ? Theme.danger : Theme.teal)
        .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous).strokeBorder(Theme.line))
        .shadow(color: Color.black.opacity(0.1), radius: 12, y: 6)
        .padding(.horizontal, Theme.gutter)
        .frame(maxWidth: 560)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.updatesFrequently)
    }
}

struct NoticeOverlay: ViewModifier {
    @Environment(AppModel.self) private var model
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func body(content: Content) -> some View {
        content.overlay(alignment: .top) {
            if let n = model.notice {
                NoticeBanner(notice: n)
                    .transition(reduceMotion ? .opacity : .move(edge: .top).combined(with: .opacity))
                    .task(id: n.id) {
                        UIAccessibility.post(notification: .announcement, argument: n.text)
                        try? await Task.sleep(for: .seconds(4))
                        if model.notice?.id == n.id { withAnimation { model.notice = nil } }
                    }
                    .onTapGesture { withAnimation { model.notice = nil } }
            }
        }
        .animation(reduceMotion ? .easeInOut(duration: 0.15) : .snappy, value: model.notice)
    }
}

extension View {
    func noticeOverlay() -> some View { modifier(NoticeOverlay()) }
}

/// withAnimation that respects Reduce Motion.
@MainActor func motion(_ reduce: Bool, _ body: () -> Void) {
    if reduce { body() } else { withAnimation(.snappy, body) }
}
