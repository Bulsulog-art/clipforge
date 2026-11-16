#if DEBUG
import SwiftUI
import UIKit
import DentVideoCore

/// Demo mode for screenshots and UI review: the app runs against an in-process fake API with the
/// fictional "Riverside" clinic, and opens straight on one screen and state. Started only by the
/// launch argument `-DVScreen <name>` (scripts/screens.sh), and compiled only into DEBUG builds:
/// Release builds contain none of this code or data.
@MainActor
enum Demo {
    /// Every screen the screenshot run captures, in order.
    static let screens = [
        "signin", "signin-error", "signin-loading", "forgot",
        "loading", "offline-first", "noplan", "paused", "noclinic", "primer",
        "week", "week-full", "week-empty", "week-generating", "week-delayed", "week-offline", "approve-all",
        "video-review", "video-look", "video-approved", "video-posted", "video-declined", "decline", "post", "post-ready",
        "record", "record-locked", "camera-live", "camera-denied",
        "settings", "settings-bottom", "clinic", "videos", "delete", "signout",
    ]

    static var screen: String? {
        guard let s = UserDefaults.standard.string(forKey: "DVScreen"), !s.isEmpty else { return nil }
        return s
    }

    static let week = "2026-11-16"
    static let lastWeek = "2026-11-09"
    private static var posters: [String: UIImage] = [:]

    static func poster(for id: String) -> UIImage? { posters[id] }

    // MARK: Model

    static func makeModel() -> AppModel? {
        guard let screen else { return nil }
        UIView.setAnimationsEnabled(false)
        let lang = L10n.languageCode
        let c = DemoContent.of(lang)
        let user = AccountUser(id: "demo", email: "hello@riverside.example")
        let profile = ClinicProfile(name: c.clinic, city: c.city, country: c.country, language: lang, services: c.services, tone: "warm", address: "formal", handle: "riversidedental", bookingUrl: "https://riverside.example/book", closingLine: c.closing, narratorVoice: "female")
        let plan: PlanInfo
        switch screen {
        case "noplan": plan = PlanInfo(state: .cancelled, tier: nil, canMake: false, adminPaused: false, recordings: false, renewsAt: nil)
        case "paused": plan = PlanInfo(state: .paused, tier: "practice", canMake: false, adminPaused: true, recordings: true, renewsAt: nil)
        case "record-locked": plan = PlanInfo(state: .active, tier: "starter", canMake: true, adminPaused: false, recordings: false, renewsAt: nil)
        default: plan = PlanInfo(state: .active, tier: "practice", canMake: true, adminPaused: false, recordings: true, renewsAt: nil)
        }
        let clinic = screen == "noclinic" ? nil : Clinic(id: "demo-clinic", profile: profile, logoUrl: nil)
        let me = Me(user: user, clinic: clinic, plan: plan, locale: lang, currentWeek: week)
        let items = Self.items(screen, c)
        renderPosters(items, c)

        let tokens = Tokens(accessToken: "demo", refreshToken: "demo", expiresAt: Int(Date().timeIntervalSince1970) + 86_400 * 365, user: user)
        let uploads = UploadCenter()
        let m = AppModel(store: DemoMemoryStore(tokens), transport: DemoTransport(me: me, items: ItemsResponse(currentWeek: week, items: items)), uploads: uploads)
        m.demoScreen = screen
        m.currentWeek = week

        switch screen {
        case "signin", "signin-error", "signin-loading", "forgot":
            m.phase = .signedOut
            return m
        case "loading":
            m.phase = .signedIn
            m.isRefreshing = true
            return m
        case "offline-first":
            m.phase = .signedIn
            m.isOffline = true
            return m
        default: break
        }
        m.phase = .signedIn
        m.me = me
        m.items = items
        m.lastUpdated = Date()
        if screen == "week-offline" {
            m.isOffline = true
            m.lastUpdated = Date().addingTimeInterval(-2 * 3600)
        }
        if screen == "primer" { m.showNotificationPrimer = true }
        if screen.hasPrefix("record") || screen.hasPrefix("camera") { m.tab = .record }
        if ["settings", "settings-bottom", "clinic", "videos", "delete", "signout"].contains(screen) { m.tab = .settings }
        switch screen {
        case "video-review", "video-declined", "decline": m.openItemID = "d1"
        case "video-look": m.openItemID = "d2"
        case "video-approved", "post", "post-ready": m.openItemID = "d3"
        case "video-posted": m.openItemID = "d4"
        default: break
        }
        if screen == "record" {
            uploads.demoSeed([
                .init(id: UUID(), fileName: "a.mov", title: c.titles[6], bytes: 86_400_000, contentType: "video/quicktime", state: .uploading, progress: 0.42, path: nil, problem: nil, createdAt: Date()),
                .init(id: UUID(), fileName: "b.mov", title: c.titles[0], bytes: 64_100_000, contentType: "video/quicktime", state: .processing, progress: 1, path: "x", problem: nil, createdAt: Date()),
                .init(id: UUID(), fileName: "c.mov", title: c.titles[0], bytes: 71_800_000, contentType: "video/quicktime", state: .failed, progress: 0.3, path: nil, problem: .network, createdAt: Date()),
            ])
        }
        return m
    }

    static func items(_ screen: String, _ c: DemoContent) -> [VideoItem] {
        func thumb(_ id: String) -> URL { URL(string: "https://demo.invalid/\(id).jpg")! }
        var i1 = VideoItem(id: "d1", status: .ready, approval: .pending, title: c.titles[0], weekOf: week, caption: c.captions[0], hashtags: c.tags, thumbUrl: thumb("d1"), slot: Slot(date: "2026-11-16", time: "19:00"), shootCard: c.card)
        var i2 = VideoItem(id: "d2", status: .flagged, approval: .pending, title: c.titles[1], weekOf: week, caption: c.captions[1], hashtags: c.tags, reasons: [.pause], thumbUrl: thumb("d2"), slot: Slot(date: "2026-11-17", time: "12:30"))
        var i3 = VideoItem(id: "d3", status: .ready, approval: .approved, title: c.titles[2], weekOf: week, caption: c.captions[2], hashtags: c.tags, thumbUrl: thumb("d3"), slot: Slot(date: "2026-11-18", time: "19:00"))
        var i4 = VideoItem(id: "d4", status: .ready, approval: .approved, title: c.titles[3], weekOf: week, caption: c.captions[3], hashtags: c.tags, thumbUrl: thumb("d4"), postedAt: "2026-11-16T18:10:00Z", slot: Slot(date: "2026-11-19", time: "12:30"))
        var i5 = VideoItem(id: "d5", status: .working, approval: .pending, title: c.titles[4], weekOf: week, slot: Slot(date: "2026-11-20", time: "19:00"))
        let i6 = VideoItem(id: "d6", status: .ready, approval: .approved, title: c.titles[5], weekOf: lastWeek, caption: c.captions[3], hashtags: c.tags, thumbUrl: thumb("d6"), postedAt: "2026-11-10T11:00:00Z", slot: Slot(date: "2026-11-10", time: "12:30"))
        let r1 = VideoItem(id: "d7", kind: .recording, status: .ready, approval: .approved, title: c.titles[6], weekOf: lastWeek, caption: c.captions[0], thumbUrl: thumb("d7"), postedAt: "2026-11-12T09:00:00Z", slot: Slot(date: "2026-11-12", time: "09:00"))

        switch screen {
        case "week-full", "approve-all":
            i3.approval = .pending
            i4.approval = .pending
            i4.postedAt = nil
            i5.status = .ready
            i5.thumbUrl = thumb("d5")
            i5.caption = c.captions[2]
        case "week-empty":
            return [i6, r1]
        case "week-generating":
            for i in [0, 1, 2, 3, 4] {
                var x = [i1, i2, i3, i4, i5][i]
                x.status = i < 2 ? .working : .queued
                x.approval = .pending
                x.postedAt = nil
                x.thumbUrl = nil
                x.reasons = []
                if i == 0 { i1 = x } else if i == 1 { i2 = x } else if i == 2 { i3 = x } else if i == 3 { i4 = x } else { i5 = x }
            }
        case "week-delayed":
            i2.status = .failed
            i2.reasons = []
            i3.status = .failed
            i3.approval = .pending
            i3.thumbUrl = nil
        case "video-declined":
            i1.approval = .rejected
        default: break
        }
        return [i1, i2, i3, i4, i5, i6, r1]
    }

    // MARK: Posters

    static let palettes: [(Color, Color)] = [
        (Color(red: 0.06, green: 0.36, blue: 0.36), Color(red: 0.03, green: 0.18, blue: 0.18)),
        (Color(red: 0.55, green: 0.42, blue: 0.29), Color(red: 0.30, green: 0.22, blue: 0.15)),
        (Color(red: 0.18, green: 0.43, blue: 0.56), Color(red: 0.08, green: 0.22, blue: 0.32)),
        (Color(red: 0.42, green: 0.50, blue: 0.32), Color(red: 0.22, green: 0.28, blue: 0.16)),
        (Color(red: 0.52, green: 0.33, blue: 0.40), Color(red: 0.27, green: 0.16, blue: 0.21)),
        (Color(red: 0.24, green: 0.30, blue: 0.29), Color(red: 0.10, green: 0.14, blue: 0.13)),
        (Color(red: 0.10, green: 0.42, blue: 0.40), Color(red: 0.32, green: 0.24, blue: 0.16)),
    ]

    static func renderPosters(_ items: [VideoItem], _ c: DemoContent) {
        let rtl = L10n.languageCode == "ar"
        for (n, item) in items.enumerated() where item.thumbUrl != nil {
            let index = Int(item.id.dropFirst()).map { $0 - 1 } ?? n
            let art = DemoPosterArt(title: item.title, clinic: c.clinic, colors: palettes[index % palettes.count])
                .environment(\.layoutDirection, rtl ? .rightToLeft : .leftToRight)
            let r = ImageRenderer(content: art)
            r.scale = 3
            if let img = r.uiImage { posters[item.id] = img }
        }
    }
}

final class DemoMemoryStore: TokenStore, @unchecked Sendable {
    private var tokens: Tokens?
    init(_ t: Tokens) { tokens = t }
    func load() -> Tokens? { tokens }
    func save(_ tokens: Tokens?) { if tokens != nil { self.tokens = tokens } }
}

/// Answers like /api/dentvideo/mobile/v1, from memory. Writes succeed and change nothing.
struct DemoTransport: HTTPTransport {
    let me: Me
    let items: ItemsResponse

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        try await Task.sleep(for: .milliseconds(250))
        let path = request.url?.path ?? ""
        let enc = JSONEncoder()
        let body: Data
        if path.hasSuffix("/me") {
            body = try enc.encode(me)
        } else if path.hasSuffix("/items") {
            body = try enc.encode(items)
        } else if path.hasSuffix("/approve-week") {
            let ids = WeekBoard.approveAllCandidates(items.items, week: items.currentWeek).map(\.id)
            body = try JSONSerialization.data(withJSONObject: ["ok": true, "approved": ids.count, "ids": ids])
        } else {
            body = Data(#"{"ok":true}"#.utf8)
        }
        let r = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: ["Content-Type": "application/json"])!
        return (body, r)
    }
}

/// A poster in the style of a DentVideo video: the clinic's colours, the topic in the serif,
/// the clinic's name, a caption line. Drawn on the phone; no real clinic's video.
struct DemoPosterArt: View {
    let title: String
    let clinic: String
    let colors: (Color, Color)

    var body: some View {
        ZStack(alignment: .topLeading) {
            LinearGradient(colors: [colors.0, colors.1], startPoint: .topLeading, endPoint: .bottomTrailing)
            Circle().fill(.white.opacity(0.07)).frame(width: 300, height: 300).offset(x: 90, y: -60)
            Circle().fill(.white.opacity(0.05)).frame(width: 220, height: 220).offset(x: -80, y: 300)
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 6) {
                    Circle().fill(.white.opacity(0.9)).frame(width: 12, height: 12)
                    Text(clinic).font(.system(size: 11, weight: .semibold)).foregroundStyle(.white.opacity(0.9)).lineLimit(1)
                }
                Spacer()
                Text(title)
                    .font(.system(size: 30, weight: .regular, design: .serif))
                    .foregroundStyle(.white)
                    .lineLimit(5)
                    .minimumScaleFactor(0.6)
                    .fixedSize(horizontal: false, vertical: true)
                RoundedRectangle(cornerRadius: 3).fill(.white.opacity(0.85)).frame(width: 150, height: 6)
                RoundedRectangle(cornerRadius: 3).fill(.white.opacity(0.55)).frame(width: 110, height: 6)
                    .padding(.bottom, 26)
            }
            .padding(20)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .frame(width: 270, height: 480)
    }
}

/// Stands in for the live camera image on the simulator (which has no camera).
struct DemoCameraBackdrop: View {
    var body: some View {
        ZStack {
            LinearGradient(colors: [Color(red: 0.36, green: 0.33, blue: 0.30), Color(red: 0.12, green: 0.12, blue: 0.13)], startPoint: .top, endPoint: .bottom)
            Ellipse().fill(Color(red: 0.72, green: 0.62, blue: 0.54).opacity(0.55)).frame(width: 210, height: 270).offset(y: 40).blur(radius: 18)
            Capsule().fill(Color(red: 0.85, green: 0.86, blue: 0.88).opacity(0.5)).frame(width: 380, height: 300).offset(y: 360).blur(radius: 22)
        }
        .ignoresSafeArea()
    }
}

extension UploadCenter {
    func demoSeed(_ list: [Entry]) { replaceForDemo(list) }
}
#endif
