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

    nonisolated static let week = "2026-11-16"
    nonisolated static let lastWeek = "2026-11-09"
    private static var posters: [String: UIImage] = [:]

    static func poster(for id: String) -> UIImage? { posters[id] }

    // MARK: Model

    static func makeModel() -> AppModel? {
        if DemoFlags.flow { return makeFlowModel() }
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

    // MARK: Flow mode (UI tests)

    /// `-DVFlow 1`: the app starts exactly as in real use (bootstrap, snapshot, refresh, uploads),
    /// against DemoServer instead of dentvideo.com. The other `-DV…` flags shape the server.
    static func makeFlowModel() -> AppModel {
        UIView.setAnimationsEnabled(false)
        let store = DemoFileStore()
        if DemoFlags.reset {
            let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            try? FileManager.default.removeItem(at: support.appendingPathComponent("snapshot.json"))
            if let files = try? FileManager.default.contentsOfDirectory(at: UploadCenter.folder, includingPropertiesForKeys: nil) {
                for f in files { try? FileManager.default.removeItem(at: f) }
            }
            Prefs.clear()
            Prefs.askedForNotifications = true
            store.save(nil)
            if DemoFlags.signedIn {
                let access = DemoFlags.session == "ok" ? "fresh" : "stale"
                store.save(Tokens(accessToken: access, refreshToken: "r", expiresAt: Int(Date().timeIntervalSince1970) + 86_400 * 365, user: DemoServer.user))
            }
        }
        let lang = L10n.languageCode
        let c = DemoContent.of(lang)
        let week: String
        switch DemoFlags.week {
        case "full": week = "week-full"
        case "empty": week = "week-empty"
        default: week = "week"
        }
        var items = Self.items(week, c)
        for i in items.indices where items[i].status == .ready {
            items[i].videoUrl = URL(string: "https://demo.invalid/\(items[i].id).mp4")
        }
        renderPosters(items, c)
        let server = DemoServer(content: c, lang: lang, items: items)
        let m = AppModel(store: store, transport: DemoTransport(server: server), uploads: UploadCenter())
        m.demoScreen = "flow"
        return m
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

/// Flow mode's session, kept across launches (a relaunch test needs it) in Caches, never the Keychain.
final class DemoFileStore: TokenStore, @unchecked Sendable {
    private let url = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("demo-session.json")
    private let lock = NSLock()
    func load() -> Tokens? {
        lock.lock(); defer { lock.unlock() }
        return (try? Data(contentsOf: url)).flatMap { try? JSONDecoder().decode(Tokens.self, from: $0) }
    }
    func save(_ tokens: Tokens?) {
        lock.lock(); defer { lock.unlock() }
        if let tokens, let d = try? JSONEncoder().encode(tokens) { try? d.write(to: url) } else { try? FileManager.default.removeItem(at: url) }
    }
}

/// The launch flags of demo mode. Read from the launch arguments (`-DVNet offline` …), which
/// UserDefaults exposes; safe from any thread.
enum DemoFlags {
    private static func str(_ k: String, _ def: String) -> String {
        let v = UserDefaults.standard.string(forKey: k) ?? ""
        return v.isEmpty ? def : v
    }
    static var flow: Bool { UserDefaults.standard.bool(forKey: "DVFlow") }
    static var active: Bool { flow || !(UserDefaults.standard.string(forKey: "DVScreen") ?? "").isEmpty }
    static var reset: Bool { UserDefaults.standard.bool(forKey: "DVReset") }
    static var signedIn: Bool { str("DVSignedIn", "1") == "1" }
    /// ok | offline | error
    static var net: String { str("DVNet", "ok") }
    /// ok | expired (the stored access token is refused once, the refresh works) | revoked (the refresh is refused too)
    static var session: String { str("DVSession", "ok") }
    /// active | noplan | paused | starter | noclinic
    static var plan: String { str("DVPlan", "active") }
    /// normal | full | empty
    static var week: String { str("DVWeek", "normal") }
    /// granted | denied
    static var photos: String { str("DVPhotos", "granted") }
    static var camera: String { str("DVCamera", "granted") }
    /// ok | fail | failonce | hold
    static var upload: String { str("DVUpload", "ok") }
    static var approveFail: Bool { str("DVApproveFail", "0") == "1" }
    static var clinicReject: Bool { str("DVClinicReject", "0") == "1" }
}

/// An in-process stand-in for /api/dentvideo/mobile/v1 with the same shapes and status codes.
/// It keeps state (decisions, posted ticks, the profile) so a refresh shows what was done.
final class DemoServer: @unchecked Sendable {
    static let user = AccountUser(id: "demo", email: "hello@riverside.example")
    private let lock = NSLock()
    private var items: [VideoItem]
    private var profile: ClinicProfile
    private let lang: String
    private var deleted = false

    init(content c: DemoContent, lang: String, items: [VideoItem]) {
        self.items = items
        self.lang = lang
        self.profile = ClinicProfile(name: c.clinic, city: c.city, country: c.country, language: lang, services: c.services, tone: "warm", address: "formal", handle: "riversidedental", bookingUrl: "https://riverside.example/book", closingLine: c.closing, narratorVoice: "female")
    }

    private var me: Me {
        let plan: PlanInfo
        switch DemoFlags.plan {
        case "noplan": plan = PlanInfo(state: .cancelled, tier: nil, canMake: false, adminPaused: false, recordings: false, renewsAt: nil)
        case "paused": plan = PlanInfo(state: .paused, tier: "practice", canMake: false, adminPaused: true, recordings: true, renewsAt: nil)
        case "starter": plan = PlanInfo(state: .active, tier: "starter", canMake: true, adminPaused: false, recordings: false, renewsAt: nil)
        default: plan = PlanInfo(state: .active, tier: "practice", canMake: true, adminPaused: false, recordings: true, renewsAt: nil)
        }
        let clinic = DemoFlags.plan == "noclinic" ? nil : Clinic(id: "demo-clinic", profile: profile, logoUrl: nil)
        return Me(user: Self.user, clinic: clinic, plan: plan, locale: lang, currentWeek: Demo.week)
    }

    private func tokens(_ access: String) -> Tokens {
        Tokens(accessToken: access, refreshToken: "r", expiresAt: Int(Date().timeIntervalSince1970) + 3600, user: Self.user)
    }

    private static func json(_ o: Any) -> Data { (try? JSONSerialization.data(withJSONObject: o)) ?? Data() }

    func handle(_ r: URLRequest) throws -> (Int, Data, [String: String]) {
        switch DemoFlags.net {
        case "offline": throw URLError(.notConnectedToInternet)
        case "error": return (500, Data(), [:])
        default: break
        }
        lock.lock(); defer { lock.unlock() }
        let path = r.url?.path ?? ""
        let body = r.httpBody.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] } ?? [:]
        let enc = JSONEncoder()
        let auth = r.value(forHTTPHeaderField: "Authorization") ?? ""

        if path.hasSuffix("/session") {
            let email = (body["email"] as? String) ?? ""
            if (body["password"] as? String) == "wrong" { return (401, Self.json(["error": "x", "code": "invalid_credentials"]), [:]) }
            if email.hasPrefix("other@") { return (403, Self.json(["code": "not_dentvideo"]), [:]) }
            return (200, try enc.encode(tokens("fresh")), [:])
        }
        if path.hasSuffix("/session/refresh") {
            if DemoFlags.session == "revoked" { return (401, Data(), [:]) }
            return (200, try enc.encode(tokens("fresh")), [:])
        }
        if path.hasSuffix("/password-reset") { return (200, Self.json(["ok": true]), [:]) }
        // Every other route needs a valid session.
        if auth == "Bearer stale" || deleted { return (401, Data(), [:]) }
        if path.hasSuffix("/session/signout") || path.hasSuffix("/devices") { return (200, Self.json(["ok": true]), [:]) }
        if path.hasSuffix("/me") { return (200, try enc.encode(me), [:]) }
        if path.hasSuffix("/items") { return (200, try enc.encode(ItemsResponse(currentWeek: Demo.week, items: items)), [:]) }
        if path.hasSuffix("/approve-week") {
            let week = body["week"] as? String ?? Demo.week
            let ids = WeekBoard.approveAllCandidates(items, week: week).map(\.id)
            for i in items.indices where ids.contains(items[i].id) { items[i].approval = .approved }
            return (200, Self.json(["ok": true, "approved": ids.count, "ids": ids]), [:])
        }
        if r.httpMethod == "PATCH", let id = r.url?.lastPathComponent, let i = items.firstIndex(where: { $0.id == id }) {
            if DemoFlags.approveFail { return (500, Data(), [:]) }
            if let a = body["approval"] as? String, let v = Approval(rawValue: a) {
                items[i].approval = v
                if v != .approved { items[i].postedAt = nil }
            }
            if let p = body["posted"] as? Bool { items[i].postedAt = p ? "2026-11-16T09:00:00Z" : nil }
            return (200, Self.json(["ok": true, "stored": true]), [:])
        }
        if path.hasSuffix("/upload-url") {
            return (200, Self.json(["path": "demo/\(UUID().uuidString).mov", "uploadUrl": "https://demo.invalid/upload", "contentType": "video/quicktime"]), [:])
        }
        if path.hasSuffix("/recording") {
            Thread.sleep(forTimeInterval: 1.5)
            return (200, Self.json(["ok": true]), [:])
        }
        if path.hasSuffix("/clinic") {
            if DemoFlags.clinicReject {
                return (400, Self.json(["error": "This closing line cannot be used under your country's health advertising rules.", "code": "closing_line"]), [:])
            }
            if let p = body["profile"], let d = try? JSONSerialization.data(withJSONObject: p), let np = try? JSONDecoder().decode(ClinicProfile.self, from: d) { profile = np }
            return (200, Self.json(["id": "demo-clinic"]), [:])
        }
        if path.hasSuffix("/account/delete") {
            deleted = true
            return (200, Self.json(["ok": true]), [:])
        }
        return (404, Self.json(["error": "Not found"]), [:])
    }
}

/// HTTPTransport over DemoServer, with a little latency so loading states are real.
struct DemoTransport: HTTPTransport {
    let server: DemoServer

    init(server: DemoServer) { self.server = server }

    /// Screenshot mode: a fixed answer for /me and /items.
    init(me: Me, items: ItemsResponse) {
        let c = DemoContent.of(me.locale)
        self.server = DemoServer(content: c, lang: me.locale, items: items.items)
    }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        try await Task.sleep(for: .milliseconds(150))
        let (status, data, headers) = try server.handle(request)
        let r = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: headers.merging(["Content-Type": "application/json"]) { a, _ in a })!
        return (data, r)
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
