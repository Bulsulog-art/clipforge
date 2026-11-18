#if DEBUG
import SwiftUI
import UIKit
import DentVideoCore

/// Demo mode for screenshots and UI review: the app runs against an in-process fake API with the
/// fictional "Sample Dental Practice" clinic, and opens straight on one screen and state. Started
/// only by the launch argument `-DVScreen <name>` (scripts/screens.sh), and compiled only into
/// DEBUG builds: Release builds contain none of this code or data.
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
        // In-app purchase (Billing/, Views/PaywallView.swift); "noclinic" is the new clinic form.
        "signup", "signup-code", "verify", "paywall", "paywall-unavailable", "activating", "confirming", "settings-appstore",
        // "See it with your logo" before the plans, and the clinic's own requests.
        "preview-start", "preview", "preview-failed", "topics", "change", "change-sent",
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
        let d = UserDefaults.standard
        if let v = d.string(forKey: "DVFlow") { d.set(v == "1", forKey: "DVFlowSticky") }
        if screen != nil { d.removeObject(forKey: "DVFlowSticky") }
        if DemoFlags.flow { return makeFlowModel() }
        guard let screen else { return nil }
        UIView.setAnimationsEnabled(false)
        let lang = L10n.languageCode
        let c = DemoContent.of(lang)
        let user = DemoServer.user
        let profile = ClinicProfile(name: c.clinic, city: c.city, country: c.country, language: lang, services: c.services, tone: "warm", address: "formal", handle: nil, bookingUrl: "https://sample.example/book", closingLine: c.closing, narratorVoice: "female")
        let plan: PlanInfo
        switch screen {
        case "noplan", "verify", "paywall", "paywall-unavailable", "activating", "confirming", "preview-start", "preview", "preview-failed": plan = PlanInfo(state: .cancelled, tier: nil, canMake: false, adminPaused: false, recordings: false, renewsAt: nil)
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
        let transport = DemoTransport(me: me, items: ItemsResponse(currentWeek: week, items: items))
        let server = transport.server
        switch screen {
        case "noplan": server.plan = "noplan"; server.billingMode = "web"
        case "noclinic": server.plan = "noclinic"
        case "paused": server.plan = "paused"
        case "verify": server.plan = "noplan"; server.billingMode = "none"; server.emailVerified = false
        case "paywall", "paywall-unavailable", "activating", "confirming", "preview-start", "preview": server.plan = "noplan"; server.billingMode = "none"
        case "preview-failed": server.plan = "noplan"; server.billingMode = "none"; server.logoMode = "fail"
        case "settings-appstore": server.billingMode = "apple"
        default: break
        }
        let purchases = DemoPurchases(server: server, available: screen != "paywall-unavailable")
        let m = AppModel(store: DemoMemoryStore(tokens), transport: transport, uploads: uploads, purchases: purchases)
        m.demoScreen = screen
        if screen == "activating" { m.billing.phase = .activating }
        if screen == "confirming" { m.billing.phase = .confirming }
        if screen.hasPrefix("preview") { m.showLogoPreview = true }
        m.currentWeek = week

        switch screen {
        case "signin", "signin-error", "signin-loading", "forgot", "signup", "signup-code":
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
        if ["settings", "settings-bottom", "clinic", "videos", "delete", "signout", "settings-appstore"].contains(screen) { m.tab = .settings }
        switch screen {
        case "video-review", "video-declined", "decline", "change", "change-sent": m.weekPath = ["d1"]
        case "video-look": m.weekPath = ["d2"]
        case "video-approved", "post", "post-ready": m.weekPath = ["d3"]
        case "video-posted": m.weekPath = ["d4"]
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
        var i3 = VideoItem(id: "d3", status: .ready, approval: .approved, title: c.titles[2], weekOf: week, caption: c.captions[2], hashtags: c.tags, thumbUrl: thumb("d3"), slot: Slot(date: "2026-11-18", time: "19:00"), subtitles: true)
        var i4 = VideoItem(id: "d4", status: .ready, approval: .approved, title: c.titles[3], weekOf: week, caption: c.captions[3], hashtags: c.tags, thumbUrl: thumb("d4"), postedAt: "2026-11-16T18:10:00Z", slot: Slot(date: "2026-11-19", time: "12:30"), subtitles: true)
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
        case "change-sent":
            i1.change = ChangeView(status: .queued, at: ISO8601DateFormatter().string(from: Date()))
        default: break
        }
        return [i1, i2, i3, i4, i5, i6, r1]
    }

    // MARK: Flow mode (UI tests)

    /// `-DVFlow 1`: the app starts exactly as in real use (bootstrap, snapshot, refresh, uploads),
    /// against DemoServer instead of dentvideo.com. The other `-DV…` flags shape the server.
    static func makeFlowModel() -> AppModel {
        // Animations stay on here (unlike screenshot mode): the tests drive the app as a person would.
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
        let purchases = DemoPurchases(server: server, available: DemoFlags.store != "missing")
        let m = AppModel(store: store, transport: DemoTransport(server: server), uploads: UploadCenter(), purchases: purchases)
        m.demoScreen = "flow"
        // The real wait is two minutes; the UI tests see the "still confirming" message sooner.
        m.billing.setPollTimeout(8)
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
    /// Flow mode: `-DVFlow 1`, and it stays on for later launches without arguments (a link
    /// opened by the system cold-starts the app with no launch arguments) until a launch with
    /// `-DVFlow 0` or `-DVScreen`. Simulator test runs only; DEBUG builds only.
    static var flow: Bool {
        let d = UserDefaults.standard
        if !(d.string(forKey: "DVScreen") ?? "").isEmpty { return false }
        if let v = d.string(forKey: "DVFlow") { return v == "1" }
        return d.bool(forKey: "DVFlowSticky")
    }
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
    /// Where a clinic without an active plan stands with the server (GET billing):
    /// web (default: a web payment being confirmed, no paywall) | none (never paid: the paywall) | apple (an App Store plan)
    static var billing: String { str("DVBilling", "web") }
    /// The fake App Store: ok | cancel (the sheet closed) | pending (Ask to Buy) | fail | missing (no RevenueCat key)
    static var store: String { str("DVStore", "ok") }
    /// Restore Purchases finds: none | found
    static var restore: String { str("DVRestore", "none") }
    /// The account's address: verified | unverified
    static var email: String { str("DVEmail", "verified") }
    /// After a purchase the webhook: fast (the second poll sees the plan) | never (the app times out)
    static var activation: String { str("DVActivation", "fast") }
    /// POST logo: ok | fail (every upload refused) | failonce (the first refused, a retry works)
    static var logo: String { str("DVLogo", "ok") }
    /// GET preview: ok | fail
    static var preview: String { str("DVPreview", "ok") }
    /// POST items/{id}/change: ok | limit (this week's 3 are used)
    static var change: String { str("DVChange", "ok") }
    /// Topic suggestions: ok | unavailable (the server has nowhere to keep them yet)
    static var topics: String { str("DVTopics", "ok") }
}

/// An in-process stand-in for /api/dentvideo/mobile/v1 with the same shapes and status codes.
/// It keeps state (decisions, posted ticks, the profile) so a refresh shows what was done.
final class DemoServer: @unchecked Sendable {
    static let user = AccountUser(id: "demo", email: "hello@sample.example")
    private let lock = NSLock()
    private var items: [VideoItem]
    private var profile: ClinicProfile
    private let lang: String
    private var deleted = false
    /// The signed-in account (another one after an in-app sign-up).
    private var user = DemoServer.user
    /// active | starter | noplan | trial | paused | noclinic (from -DVPlan; changes with a clinic form or a purchase)
    var plan = DemoFlags.plan
    /// web | none | apple: see DemoFlags.billing.
    var billingMode = DemoFlags.billing
    var emailVerified = DemoFlags.email != "unverified"
    /// A purchase the fake App Store made, waiting for the "webhook" (a later GET billing).
    private var purchasedTier: String?
    private var pollsUntilActive = 0
    private(set) var billingReads = 0
    private let content: DemoContent
    /// The clinic's topic suggestions, newest first (one waiting, one made last week).
    private var topics: [[String: Any]]
    private var changesUsed = 0
    /// POST logo: see DemoFlags.logo (a screenshot can set it).
    var logoMode = DemoFlags.logo
    private var logoUploads = 0

    init(content c: DemoContent, lang: String, items: [VideoItem]) {
        self.items = items
        self.lang = lang
        self.content = c
        self.topics = [
            ["id": "8b1c9d2e-0000-4000-8000-000000000002", "text": c.topics[1], "status": "pending", "reason": NSNull(), "week_of": NSNull()],
            ["id": "8b1c9d2e-0000-4000-8000-000000000001", "text": c.topics[0], "status": "used", "reason": NSNull(), "week_of": Demo.lastWeek],
        ]
        self.profile = ClinicProfile(name: c.clinic, city: c.city, country: c.country, language: lang, services: c.services, tone: "warm", address: "formal", handle: nil, bookingUrl: "https://sample.example/book", closingLine: c.closing, narratorVoice: "female")
    }

    private var hasClinic: Bool { plan != "noclinic" }
    private var planIsLive: Bool { plan == "active" || plan == "starter" }

    private var me: Me {
        let plan: PlanInfo
        switch self.plan {
        case "noplan": plan = PlanInfo(state: .cancelled, tier: nil, canMake: false, adminPaused: false, recordings: false, renewsAt: nil)
        case "trial", "noclinic": plan = PlanInfo(state: .trial, tier: nil, canMake: false, adminPaused: false, recordings: false, renewsAt: nil)
        case "paused": plan = PlanInfo(state: .paused, tier: "practice", canMake: false, adminPaused: true, recordings: true, renewsAt: nil)
        case "starter": plan = PlanInfo(state: .active, tier: "starter", canMake: true, adminPaused: false, recordings: false, renewsAt: nil)
        default: plan = PlanInfo(state: .active, tier: "practice", canMake: true, adminPaused: false, recordings: true, renewsAt: nil)
        }
        let clinic = hasClinic ? Clinic(id: "demo-clinic", profile: profile, logoUrl: nil) : nil
        return Me(user: user, clinic: clinic, plan: plan, locale: lang, currentWeek: Demo.week)
    }

    private func tokens(_ access: String) -> Tokens {
        Tokens(accessToken: access, refreshToken: "r", expiresAt: Int(Date().timeIntervalSince1970) + 3600, user: user)
    }

    // MARK: In-app purchase (docs/DENTVIDEO_IAP_PLAN.md §6, web/src/lib/dentvid/mobile-billing.ts)

    /// The fake App Store took a payment: the plan switches on at a later GET billing, as when
    /// RevenueCat's webhook lands, or never (DVActivation never).
    func storePurchased(tier: String) {
        lock.lock(); defer { lock.unlock() }
        purchasedTier = tier
        pollsUntilActive = DemoFlags.activation == "never" ? Int.max : 1
    }

    private var billing: [String: Any] {
        if purchasedTier != nil {
            if pollsUntilActive <= 0, let t = purchasedTier {
                plan = t == "starter" ? "starter" : "active"
                billingMode = "apple"
                purchasedTier = nil
            } else if pollsUntilActive != Int.max {
                pollsUntilActive -= 1
            }
        }
        let products: [[String: Any]] = [
            ["tier": "starter", "productId": "dentvideo_starter_monthly", "entitlement": "starter"],
            ["tier": "practice", "productId": "dentvideo_practice_monthly", "entitlement": "practice"],
        ]
        let apple = "https://apps.apple.com/account/subscriptions"
        var o: [String: Any] = ["appUserId": user.id, "clinicId": hasClinic ? "demo-clinic" as Any : NSNull() as Any, "products": products, "manageUrl": NSNull(), "manage": NSNull()]
        let unverified: [String] = emailVerified ? [] : ["email_unverified"]
        let tier = plan == "starter" ? "starter" : "practice"
        if !hasClinic {
            o["plan"] = NSNull(); o["status"] = "none"; o["showPaywall"] = false; o["canPurchase"] = false; o["blockers"] = ["clinic"] + unverified
            return o
        }
        o["blockers"] = unverified
        let source: Any = billingMode == "apple" ? "apple" as Any : (billingMode == "web" ? "dodo" as Any : NSNull() as Any)
        if planIsLive {
            o["plan"] = ["state": "active", "tier": tier, "source": source, "renewsAt": "2026-12-16T10:00:00Z", "endsAt": NSNull()] as [String: Any]
            o["status"] = "active"; o["showPaywall"] = false; o["canPurchase"] = false
            o["manage"] = billingMode == "apple" ? "app_store" : "web"
            if billingMode == "apple" { o["manageUrl"] = apple }
        } else if plan == "paused" {
            o["plan"] = ["state": "paused", "tier": tier, "source": source] as [String: Any]
            o["status"] = "admin_paused"; o["showPaywall"] = false; o["canPurchase"] = false
        } else if billingMode == "none" {
            o["plan"] = ["state": plan == "noplan" ? "cancelled" : "trial", "tier": NSNull(), "source": NSNull()] as [String: Any]
            o["status"] = plan == "noplan" ? "ended" : "none"; o["showPaywall"] = true; o["canPurchase"] = emailVerified
        } else {
            // A web payment being confirmed: one plan, one source, so the app sells nothing.
            o["plan"] = ["state": "trial", "tier": NSNull(), "source": "dodo"] as [String: Any]
            o["status"] = "pending"; o["showPaywall"] = false; o["canPurchase"] = false
        }
        return o
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
        // The preview library's plans: public files on the API's origin, no session.
        if path.hasPrefix("/dentvideo/preview/"), path.hasSuffix(".json") {
            let id = URL(fileURLWithPath: path).deletingPathExtension().lastPathComponent
            return (200, Self.json(Self.samplePlan(content, id: id)), [:])
        }
        if path.hasSuffix("/signup") {
            let email = ((body["email"] as? String) ?? "").lowercased()
            // The server's bot brake: a form filled in under 2.5 s (or with no time) is refused.
            guard let ms = body["elapsedMs"] as? Int, ms >= SignupRules.minFillMs else { return (400, Self.json(["error": "We couldn't create the account. Please try again."]), [:]) }
            if email.hasPrefix("taken@") { return (200, Self.json(["ok": true, "existing": true]), [:]) }
            user = AccountUser(id: "new-user", email: email)
            plan = "noclinic"
            billingMode = "none"
            emailVerified = false
            items = []
            deleted = false
            let session = try JSONSerialization.jsonObject(with: try enc.encode(tokens("fresh")))
            return (200, Self.json(["ok": true, "signedIn": true, "session": session] as [String: Any]), [:])
        }
        // Every other route needs a valid session.
        if auth == "Bearer stale" || deleted { return (401, Data(), [:]) }
        if path.hasSuffix("/session/signout") || path.hasSuffix("/devices") { return (200, Self.json(["ok": true]), [:]) }
        if path.hasSuffix("/me") { return (200, try enc.encode(me), [:]) }
        if path.hasSuffix("/billing") {
            billingReads += 1
            return (200, Self.json(billing), [:])
        }
        if path.hasSuffix("/verify-email") {
            if emailVerified { return (200, Self.json(["ok": true, "verified": true, "email": user.email ?? ""]), [:]) }
            if (body["action"] as? String) == "confirm" {
                guard (body["code"] as? String) == "123456" else {
                    return (400, Self.json(["error": "That code doesn't match. 4 tries left.", "reason": "wrong", "attemptsLeft": 4]), [:])
                }
                emailVerified = true
                return (200, Self.json(["ok": true, "verified": true, "email": user.email ?? ""]), [:])
            }
            return (200, Self.json(["ok": true, "email": user.email ?? "", "resendInSec": 60]), [:])
        }
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
            // A new account's first clinic form creates the clinic (no plan yet).
            if plan == "noclinic" { plan = "trial" }
            return (200, Self.json(["id": "demo-clinic"]), [:])
        }
        if path.hasSuffix("/account/delete") {
            deleted = true
            return (200, Self.json(["ok": true]), [:])
        }
        if let answer = requests(r, path: path, body: body) { return answer }
        return (404, Self.json(["error": "Not found"]), [:])
    }
}

extension DemoServer {
    private static func any(_ s: String?) -> Any { s.map { $0 as Any } ?? NSNull() }

    /// The logo preview, topic suggestions, change requests and subtitle files, with the shapes
    /// and status codes of the real routes (web/src/lib/dentvid/clinic-requests.ts, mobile/v1/logo).
    /// Called with the lock held.
    fileprivate func requests(_ r: URLRequest, path: String, body: [String: Any]) -> (Int, Data, [String: String])? {
        let method = r.httpMethod ?? "GET"
        if path.hasSuffix("/preview") {
            if DemoFlags.preview == "fail" { return (500, Data(), [:]) }
            guard plan != "noclinic" else { return (409, Self.json(["error": "Set up your clinic first.", "code": "no_clinic"]), [:]) }
            let video = ["en", "de", "es", "fr", "tr", "ja", "ar", "pl"].contains(profile.language) ? profile.language : "en"
            let samples: [[String: Any]] = [
                ["id": "demo-floss", "title": content.titles[2], "service": content.services[0], "seconds": 16, "planPath": "/dentvideo/preview/\(video)/demo-floss.json", "audioPath": NSNull()],
                ["id": "demo-sensitive", "title": content.titles[5], "service": content.services[0], "seconds": 15, "planPath": "/dentvideo/preview/\(video)/demo-sensitive.json", "audioPath": NSNull()],
            ]
            let clinic: [String: Any] = ["name": profile.name, "handle": Self.any(profile.handle.map { "@\($0)" }), "brandColor": Self.any(profile.brandColor.map { "#\($0)" }), "logoUrl": NSNull()]
            return (200, Self.json(["language": video, "controlsSide": video == "ar" ? "right" : "left", "clinic": clinic, "placeholders": ["name": "{name}", "handle": "{handle}"], "samples": samples, "servicesWithoutSample": [String]()] as [String: Any]), [:])
        }
        if path.hasSuffix("/logo"), method == "POST" {
            guard plan != "noclinic" else { return (409, Self.json(["error": "Set up your clinic first.", "code": "no_clinic"]), [:]) }
            logoUploads += 1
            if logoMode == "fail" || (logoMode == "failonce" && logoUploads == 1) { return (503, Self.json(["error": "Could not start."]), [:]) }
            return (200, Self.json(["path": "demo/logo-\(logoUploads).png", "contentType": r.value(forHTTPHeaderField: "Content-Type") ?? "image/png", "logoUrl": NSNull()] as [String: Any]), [:])
        }
        if path.hasSuffix("/topic-requests") {
            if DemoFlags.topics == "unavailable" {
                return method == "POST" ? (503, Self.json(["error": L("topics.error.unavailable"), "code": "unavailable"]), [:]) : (200, Self.json(["topics": [Any](), "available": false] as [String: Any]), [:])
            }
            if method == "POST" {
                let text = RequestRules.clean(body["text"] as? String ?? "")
                guard RequestRules.canSendTopic(text) else { return (400, Self.json(["error": "Please write between 3 and 140 characters.", "code": "length"]), [:]) }
                if topics.filter({ ($0["status"] as? String) == "pending" }).count >= RequestRules.pendingTopicsMax {
                    return (409, Self.json(["error": L("topics.error.tooManyPending"), "code": "too_many_pending"]), [:])
                }
                let row: [String: Any] = ["id": UUID().uuidString.lowercased(), "text": text, "status": "pending", "reason": NSNull(), "week_of": NSNull()]
                topics.insert(row, at: 0)
                return (200, Self.json(["ok": true, "topic": row] as [String: Any]), [:])
            }
            return (200, Self.json(["topics": topics, "available": true] as [String: Any]), [:])
        }
        if method == "DELETE", path.contains("/topic-requests/") {
            let id = r.url?.lastPathComponent ?? ""
            guard let i = topics.firstIndex(where: { ($0["id"] as? String) == id && ($0["status"] as? String) == "pending" }) else { return (404, Self.json(["error": "not found"]), [:]) }
            topics.remove(at: i)
            return (200, Self.json(["ok": true]), [:])
        }
        if path.hasSuffix("/change"), method == "POST" {
            let id = r.url?.deletingLastPathComponent().lastPathComponent ?? ""
            guard let i = items.firstIndex(where: { $0.id == id }) else { return (404, Self.json(["error": "not found", "code": "not_found"]), [:]) }
            let note = RequestRules.clean(body["note"] as? String ?? "")
            guard RequestRules.canSendNote(note) else { return (400, Self.json(["error": "Please write between 3 and 300 characters.", "code": "length"]), [:]) }
            if DemoFlags.change == "limit" || changesUsed >= RequestRules.changesPerWeek {
                return (429, Self.json(["error": L("change.error.limit"), "code": "limit", "left": 0] as [String: Any]), [:])
            }
            changesUsed += 1
            let at = ISO8601DateFormatter().string(from: Date())
            items[i].change = ChangeView(status: .queued, at: at)
            let change: [String: Any] = ["id": UUID().uuidString.lowercased(), "item_id": id, "status": "queued", "reason": NSNull(), "created_at": at]
            return (200, Self.json(["ok": true, "change": change, "left": RequestRules.changesPerWeek - changesUsed] as [String: Any]), [:])
        }
        if path.hasSuffix("/subtitles") {
            let id = r.url?.deletingLastPathComponent().lastPathComponent ?? ""
            guard let item = items.first(where: { $0.id == id }), item.subtitles else { return (404, Self.json(["error": "not found"]), [:]) }
            let srt = "1\n00:00:00,000 --> 00:00:03,000\n\(item.title)\n\n2\n00:00:03,000 --> 00:00:08,000\n\(item.caption ?? item.title)\n"
            return (200, Data(srt.utf8), ["Content-Type": "application/x-subrip; charset=utf-8"])
        }
        return nil
    }

    /// A sample's plan in the preview library's shape (web/public/dentvideo/preview/<lang>/<id>.json),
    /// from the demo clinic's checked texts (DemoContent.sample / sample2).
    static func samplePlan(_ c: DemoContent, id: String) -> [String: Any] {
        if id == "demo-sensitive" {
            return ["title": c.titles[5], "scenes": [
                ["kind": "hook", "text": c.sample2[0], "seconds": 3],
                ["kind": "statement", "text": c.sample2[1], "seconds": 4],
                ["kind": "statement", "text": c.sample2[2], "seconds": 5],
                ["kind": "cta", "text": c.sample[6], "handle": "{handle}", "seconds": 3],
            ] as [[String: Any]]]
        }
        return ["title": c.titles[2], "scenes": [
            ["kind": "hook", "text": c.sample[0], "seconds": 3],
            ["kind": "statement", "text": c.sample[1], "emphasis": [String](), "seconds": 4],
            ["kind": "list", "heading": c.sample[2], "items": Array(c.sample[3...5]), "seconds": 6],
            ["kind": "cta", "text": c.sample[6], "handle": "{handle}", "seconds": 3],
        ] as [[String: Any]]]
    }
}

extension Demo {
    /// A sample logo for the demo (no photo library in screenshots or UI tests): a round mark in
    /// a clinic red, so the preview's "From your logo" colour has something to find.
    static func sampleLogo() -> Data {
        let art = ZStack {
            Circle().fill(Color(red: 138 / 255, green: 59 / 255, blue: 74 / 255))
            Text(verbatim: "S")
                .font(.system(size: 130, weight: .bold, design: .serif))
                .foregroundStyle(.white)
        }
        .frame(width: 240, height: 240)
        let r = ImageRenderer(content: art)
        r.scale = 1
        return r.uiImage?.pngData() ?? Data()
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
