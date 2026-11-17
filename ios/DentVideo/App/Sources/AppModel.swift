import Foundation
import Observation
import SwiftUI
import DentVideoCore

/// The app's state: the session, the clinic, this week's videos, and every action on them.
/// Writes are optimistic (the card changes at once) and roll back with a message if refused.
@MainActor
@Observable
final class AppModel {
    enum Phase: Equatable { case launching, signedOut, signedIn }
    enum Tab: Hashable { case week, record, settings }

    struct Notice: Identifiable, Equatable {
        let id = UUID()
        let text: String
        var isError = true
    }

    var phase: Phase = .launching
    var me: Me?
    var items: [VideoItem] = []
    var currentWeek: String = WeekBoard.deliveryWeek()
    var isRefreshing = false
    var isOffline = false
    var lastUpdated: Date?
    var notice: Notice?
    var tab: Tab = .week
    /// A video to open (from a push, a reminder or a universal link).
    /// The week tab's navigation path (video ids). Owned here, not by the week view, so a link
    /// or notification can open a video whatever tab is showing and whether or not the week
    /// view has been updated since: iOS 18 did not push a path set from the week view's own
    /// change handlers after a tab switch.
    var weekPath: [String] = []
    /// Ask for notifications after the first sign-in, with our explanation first.
    var showNotificationPrimer = false

    @ObservationIgnored let api: APIClient
    @ObservationIgnored private let store: TokenStore
    @ObservationIgnored private let snapshots: SnapshotStore
    let uploads: UploadCenter
    @ObservationIgnored var deviceToken: String?
    #if DEBUG
    /// The screen a demo launch opens on (Demo.swift); nil in normal use.
    @ObservationIgnored var demoScreen: String?
    #endif
    @ObservationIgnored private var refreshTask: Task<Void, Never>?

    init(store: TokenStore = KeychainTokenStore(), transport: HTTPTransport = URLSessionTransport(), uploads: UploadCenter? = nil) {
        self.store = store
        self.api = APIClient(baseURL: Config.apiBaseURL, transport: transport, store: store, languageCode: L10n.languageCode)
        let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        self.snapshots = SnapshotStore(url: support.appendingPathComponent("snapshot.json"))
        self.uploads = uploads ?? UploadCenter()
    }

    var access: AccessState? { me.map(AccessState.of) }

    /// True only in a DEBUG demo launch (screenshots) showing one of these screens. Always false in Release.
    func isDemo(_ names: String...) -> Bool {
        #if DEBUG
        if let s = demoScreen { return names.contains(s) }
        #endif
        return false
    }

    #if DEBUG
    /// Demo flow mode: the last link received, for debugRouting.
    @ObservationIgnored var debugLastLink: String = "-"
    var debugRouting: String {
        "phase=\(phase) tab=\(tab) path=\(weekPath) items=\(items.count) refreshing=\(isRefreshing) link=\(debugLastLink)"
    }
    #endif

    var isDemoMode: Bool {
        #if DEBUG
        return demoScreen != nil
        #else
        return false
        #endif
    }
    var locale: Locale { L10n.locale }

    // MARK: Session

    func bootstrap() async {
        guard let t = store.load() else {
            phase = .signedOut
            return
        }
        if let snap = snapshots.load(for: t.user.id) { apply(snap.me, snap.items, at: snap.savedAt) }
        phase = .signedIn
        uploads.attach(api)
        await refresh()
        await Notifications.registerIfAllowed()
    }

    func signIn(email: String, password: String) async throws {
        _ = try await api.signIn(email: email, password: password)
        phase = .signedIn
        uploads.attach(api)
        await refresh()
        if !Prefs.askedForNotifications { showNotificationPrimer = true } else { await Notifications.registerIfAllowed() }
    }

    func signOut() async {
        await api.signOut(deviceToken: deviceToken)
        await clearLocal()
    }

    private func clearLocal() async {
        snapshots.clear()
        uploads.reset()
        await VideoCache.shared.clearAll()
        await Notifications.clearAll()
        Prefs.clear()
        me = nil
        weekPath = []
        items = []
        notice = nil
        tab = .week
        phase = .signedOut
    }

    // MARK: Loading

    func refresh() async {
        if let refreshTask { return await refreshTask.value }
        let task = Task { await load() }
        refreshTask = task
        await task.value
        refreshTask = nil
    }

    private func load() async {
        isRefreshing = true
        defer { isRefreshing = false }
        do {
            async let meCall = api.me()
            async let itemsCall = api.items()
            let (me, items) = try await (meCall, itemsCall)
            apply(me, items, at: Date())
            isOffline = false
            snapshots.save(Snapshot(me: me, items: items, savedAt: Date()))
            await afterLoad()
        } catch {
            handle(error, quietOffline: true)
        }
    }

    private func apply(_ me: Me, _ r: ItemsResponse, at date: Date) {
        self.me = me
        self.items = r.items
        self.currentWeek = r.currentWeek
        self.lastUpdated = date
    }

    /// Keep approved videos on the phone and the reminders in step with the week.
    private func afterLoad() async {
        let approved = items.filter { $0.approval == .approved && $0.videoUrl != nil && $0.kind == .generated }
        await VideoCache.shared.prune(keeping: Set(items.filter { $0.approval != .rejected }.map(\.id)))
        for i in approved.prefix(10) {
            if let u = i.videoUrl { _ = try? await VideoCache.shared.file(for: i.id, from: u) }
        }
        await Notifications.scheduleReminders(for: items)
    }

    // MARK: Decisions

    func approve(_ item: VideoItem) async {
        await change(item.id, to: { $0.approval = .approved }) { try await self.api.decide(itemID: item.id, approval: .approved) }
        if let u = item.videoUrl { Task { _ = try? await VideoCache.shared.file(for: item.id, from: u) } }
        await Notifications.scheduleReminders(for: items)
    }

    func decline(_ item: VideoItem, note: String?) async {
        await change(item.id, to: { $0.approval = .rejected }) { try await self.api.decide(itemID: item.id, approval: .rejected, note: note) }
        await Notifications.scheduleReminders(for: items)
    }

    /// Back to "waiting for your decision" (the web's undo).
    func undoDecision(_ item: VideoItem) async {
        await change(item.id, to: { $0.approval = .pending; $0.postedAt = nil }) { try await self.api.decide(itemID: item.id, approval: .pending) }
        await Notifications.scheduleReminders(for: items)
    }

    func approveAllReady(week: String) async -> Int {
        let ids = Set(WeekBoard.approveAllCandidates(items, week: week).map(\.id))
        guard !ids.isEmpty else { return 0 }
        let before = items
        for i in items.indices where ids.contains(items[i].id) { items[i].approval = .approved }
        do {
            let done = try await api.approveWeek(week)
            // The server is the truth: anything it did not approve goes back.
            let ok = Set(done)
            for i in items.indices where ids.contains(items[i].id) && !ok.contains(items[i].id) { items[i].approval = before[i].approval }
            await Notifications.scheduleReminders(for: items)
            return ok.count
        } catch {
            items = before
            handle(error)
            return 0
        }
    }

    func setPosted(_ item: VideoItem, _ posted: Bool) async {
        let stamp = ISO8601DateFormatter().string(from: Date())
        await change(item.id, to: { $0.postedAt = posted ? stamp : nil }) { try await self.api.setPosted(itemID: item.id, posted: posted) }
        await Notifications.scheduleReminders(for: items)
    }

    private func change(_ id: String, to mutate: (inout VideoItem) -> Void, call: @escaping () async throws -> Void) async {
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        let before = items[i]
        mutate(&items[i])
        do {
            try await call()
            saveSnapshot()
        } catch {
            if let j = items.firstIndex(where: { $0.id == id }) { items[j] = before }
            handle(error)
        }
    }

    private func saveSnapshot() {
        guard let me else { return }
        snapshots.save(Snapshot(me: me, items: ItemsResponse(currentWeek: currentWeek, items: items), savedAt: lastUpdated ?? Date()))
    }

    // MARK: Settings

    func saveProfile(_ profile: ClinicProfile) async -> Bool {
        do {
            try await api.saveClinic(profile)
            me?.clinic?.profile = profile.cleaned()
            saveSnapshot()
            notice = Notice(text: L("settings.saved"), isError: false)
            return true
        } catch {
            handle(error)
            return false
        }
    }

    /// Answers nil on success, else the sentence to show in the delete sheet.
    func deleteAccount(confirm: String) async -> String? {
        do {
            try await api.deleteAccount(confirm: confirm)
            await clearLocal()
            return nil
        } catch APIError.refused(_, let message) {
            return message ?? L("error.generic")
        } catch {
            return message(for: error)
        }
    }

    // MARK: Push

    func didReceive(deviceToken data: Data) {
        let token = data.map { String(format: "%02x", $0) }.joined()
        deviceToken = token
        Task { await sendDevice() }
    }

    func sendDevice() async {
        guard let token = deviceToken, phase == .signedIn else { return }
        try? await api.registerDevice(.init(token: token, environment: Config.pushEnvironment, locale: L10n.languageCode, readyPush: Prefs.readyPush))
    }

    /// From a notification tap or a link: show the week, and the video when one is named.
    func open(itemID: String?) {
        tab = .week
        Task {
            // The refresh also gives the tab switch time to finish; a video that only arrived
            // with this refresh (a push tap that started the app) is known afterwards.
            await refresh()
            guard let itemID else { weekPath = []; return }
            weekPath = items.contains(where: { $0.id == itemID }) ? [itemID] : []
        }
    }

    // MARK: Errors

    func handle(_ error: Error, quietOffline: Bool = false) {
        if case APIError.unauthorized? = error as? APIError {
            Task { await clearLocal() }
            return
        }
        if case APIError.offline? = error as? APIError {
            isOffline = true
            if quietOffline { return }
        }
        notice = Notice(text: message(for: error))
    }

    func message(for error: Error) -> String {
        switch error as? APIError {
        case .offline?: return L("error.offline")
        case .rateLimited?: return L("error.tooMany")
        case .needsPlan?: return L("error.notInPlan")
        case .paused?: return L("access.paused.body", Config.supportEmail)
        case let .refused(_, message)?: return message ?? L("error.generic")
        case .invalidCredentials?: return L("signin.error.credentials")
        case .notDentVideo?: return L("signin.error.notDentVideo")
        default: return L("error.generic")
        }
    }
}

extension AppModel {
    /// Sample data for SwiftUI previews and screenshots: a German clinic with a ready week.
    static func preview(items: [VideoItem] = PreviewData.items, plan: PlanInfo = PreviewData.plan) -> AppModel {
        let m = AppModel(store: PreviewData.EmptyStore(), transport: PreviewData.OfflineTransport(), uploads: UploadCenter())
        m.phase = .signedIn
        m.me = Me(user: AccountUser(id: "preview", email: "praxis@example.com"), clinic: Clinic(id: "c", profile: PreviewData.profile, logoUrl: nil), plan: plan, locale: "en", currentWeek: PreviewData.week)
        m.items = items
        m.currentWeek = PreviewData.week
        m.lastUpdated = Date()
        return m
    }
}
