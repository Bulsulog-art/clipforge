import XCTest
import DentVideoCore
@testable import DentVideo

/// A scripted server for the app's model: one handler per request, every request recorded.
final class ScriptedTransport: HTTPTransport, @unchecked Sendable {
    private let lock = NSLock()
    private var log: [URLRequest] = []
    var handler: @Sendable (URLRequest) throws -> (Int, Any)

    init(_ handler: @escaping @Sendable (URLRequest) throws -> (Int, Any)) { self.handler = handler }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        record(request)
        let (status, body) = try handler(request)
        let data: Data
        if let d = body as? Data { data = d } else { data = try JSONSerialization.data(withJSONObject: body) }
        return (data, HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: nil, headerFields: nil)!)
    }

    private func record(_ r: URLRequest) { lock.lock(); log.append(r); lock.unlock() }

    var requests: [URLRequest] { lock.lock(); defer { lock.unlock() }; return log }
    func last(_ suffix: String) -> URLRequest? { requests.last { $0.url!.path.hasSuffix(suffix) } }
}

final class TestStore: TokenStore, @unchecked Sendable {
    private let lock = NSLock()
    private var t: Tokens?
    init(_ t: Tokens?) { self.t = t }
    func load() -> Tokens? { lock.lock(); defer { lock.unlock() }; return t }
    func save(_ tokens: Tokens?) { lock.lock(); t = tokens; lock.unlock() }
}

enum Fx {
    static let user = AccountUser(id: "u1", email: "a@clinic.example")
    static let tokens = Tokens(accessToken: "a", refreshToken: "r", expiresAt: 4_000_000_000, user: user)
    static let week = "2026-11-16"

    static func me(plan: [String: Any] = ["state": "active", "tier": "practice", "canMake": true, "adminPaused": false, "recordings": true]) -> [String: Any] {
        ["user": ["id": "u1", "email": "a@clinic.example"],
         "clinic": ["id": "c1", "profile": ["name": "Praxis Test", "country": "DE", "language": "de", "services": ["Implantate"]]],
         "plan": plan, "locale": "en", "currentWeek": week]
    }

    static func item(_ id: String, status: String = "ready", approval: String = "pending") -> [String: Any] {
        ["id": id, "kind": "generated", "status": status, "approval": approval, "title": "Video \(id)", "week_of": week, "reasons": [],
         "slot": ["date": "2026-11-17", "time": "12:30"]]
    }

    static func items(_ list: [[String: Any]]) -> [String: Any] { ["currentWeek": week, "items": list] }
}

@MainActor
final class AppModelTests: XCTestCase {
    private func model(_ t: ScriptedTransport, tokens: Tokens? = Fx.tokens) -> AppModel {
        let m = AppModel(store: TestStore(tokens), transport: t, uploads: UploadCenter(identifier: "test.\(UUID().uuidString)"))
        return m
    }

    /// A server with a week of three ready videos; writes answer `write`.
    private func server(write: @escaping @Sendable (URLRequest) throws -> (Int, Any) = { _ in (200, ["ok": true]) }) -> ScriptedTransport {
        ScriptedTransport { r in
            let p = r.url!.path
            if p.hasSuffix("/me") { return (200, Fx.me()) }
            if p.hasSuffix("/items") { return (200, Fx.items([Fx.item("a"), Fx.item("b"), Fx.item("c", status: "flagged")])) }
            return try write(r)
        }
    }

    private func waitUntil(_ condition: @escaping () -> Bool, timeout: TimeInterval = 3) async {
        let end = Date().addingTimeInterval(timeout)
        while !condition() && Date() < end { try? await Task.sleep(for: .milliseconds(20)) }
    }

    func testRefreshLoadsTheWeek() async {
        let m = model(server())
        await m.refresh()
        XCTAssertEqual(m.items.map(\.id), ["a", "b", "c"])
        XCTAssertEqual(m.access, .active(recordings: true))
        XCTAssertFalse(m.isOffline)
        XCTAssertNil(m.notice)
    }

    func testOfflineRefreshIsQuietAndKeepsWhatIsShown() async {
        let t = server()
        let m = model(t)
        await m.refresh()
        t.handler = { _ in throw URLError(.notConnectedToInternet) }
        await m.refresh()
        XCTAssertTrue(m.isOffline)
        XCTAssertNil(m.notice, "offline on refresh is a quiet note, not an error banner")
        XCTAssertEqual(m.items.count, 3)
    }

    func testAGoneSessionSignsOut() async {
        let m = model(ScriptedTransport { _ in (401, [:] as [String: Any]) })
        m.phase = .signedIn
        await m.refresh()
        await waitUntil { m.phase == .signedOut }
        XCTAssertEqual(m.phase, .signedOut)
        XCTAssertNil(m.me)
        XCTAssertTrue(m.items.isEmpty)
    }

    func testServerErrorShowsAMessage() async {
        let m = model(ScriptedTransport { _ in (500, Data()) })
        await m.refresh()
        XCTAssertEqual(m.notice?.text, L("error.generic"))
        XCTAssertTrue(m.notice?.isError ?? false)
    }

    func testApproveIsOptimisticAndSent() async throws {
        let t = server()
        let m = model(t)
        await m.refresh()
        await m.approve(m.items[0])
        XCTAssertEqual(m.items[0].approval, .approved)
        let body = try XCTUnwrap(t.last("/items/a")?.httpBody)
        XCTAssertEqual(try JSONSerialization.jsonObject(with: body) as? [String: String], ["approval": "approved"])
    }

    func testRefusedApproveRollsBackWithTheServersSentence() async {
        let m = model(server { _ in (409, ["error": "This video can no longer be changed."]) })
        await m.refresh()
        await m.approve(m.items[0])
        XCTAssertEqual(m.items[0].approval, .pending)
        XCTAssertEqual(m.notice?.text, "This video can no longer be changed.")
    }

    func testDeclineSendsTheNoteAndUndoGoesBack() async throws {
        let t = server()
        let m = model(t)
        await m.refresh()
        await m.decline(m.items[1], note: "Too fast")
        XCTAssertEqual(m.items[1].approval, .rejected)
        let body = try XCTUnwrap(t.last("/items/b")?.httpBody)
        XCTAssertEqual(try JSONSerialization.jsonObject(with: body) as? [String: String], ["approval": "rejected", "note": "Too fast"])
        await m.undoDecision(m.items[1])
        XCTAssertEqual(m.items[1].approval, .pending)
    }

    func testApproveAllKeepsOnlyWhatTheServerApproved() async {
        // Two ready candidates; the server approves only "a" (b was decided elsewhere meanwhile).
        let m = model(server { r in
            if r.url!.path.hasSuffix("approve-week") { return (200, ["ok": true, "approved": 1, "ids": ["a"]] as [String: Any]) }
            return (200, ["ok": true] as [String: Any])
        })
        await m.refresh()
        let n = await m.approveAllReady(week: Fx.week)
        XCTAssertEqual(n, 1)
        XCTAssertEqual(m.items.first { $0.id == "a" }?.approval, .approved)
        XCTAssertEqual(m.items.first { $0.id == "b" }?.approval, .pending)
        XCTAssertEqual(m.items.first { $0.id == "c" }?.approval, .pending, "flagged videos are never approved in bulk")
    }

    func testApproveAllFailureRollsEverythingBack() async {
        let m = model(server { _ in throw URLError(.timedOut) })
        await m.refresh()
        let n = await m.approveAllReady(week: Fx.week)
        XCTAssertEqual(n, 0)
        XCTAssertTrue(m.items.allSatisfy { $0.approval == .pending })
        XCTAssertEqual(m.notice?.text, L("error.offline"))
    }

    func testPostedTick() async {
        let m = model(server())
        await m.refresh()
        await m.approve(m.items[0])
        await m.setPosted(m.items[0], true)
        XCTAssertTrue(m.items[0].isPosted)
        await m.setPosted(m.items[0], false)
        XCTAssertFalse(m.items[0].isPosted)
    }

    func testSaveProfile() async {
        let m = model(server())
        await m.refresh()
        var p = m.me!.clinic!.profile
        p.city = "  Köln "
        let ok = await m.saveProfile(p)
        XCTAssertTrue(ok)
        XCTAssertEqual(m.me?.clinic?.profile.city, "Köln")
        XCTAssertEqual(m.notice?.isError, false)
    }

    func testSaveProfileRefusedShowsTheReason() async {
        let m = model(server { _ in (400, ["error": "This closing line is not allowed.", "code": "closing_line"]) })
        await m.refresh()
        let ok = await m.saveProfile(m.me!.clinic!.profile)
        XCTAssertFalse(ok)
        XCTAssertEqual(m.notice?.text, "This closing line is not allowed.")
    }

    func testDeleteAccount() async {
        let refused = model(server { _ in (409, ["error": "Cancel the subscription first."]) })
        await refused.refresh()
        let msg = await refused.deleteAccount(confirm: "Praxis Test")
        XCTAssertEqual(msg, "Cancel the subscription first.")
        XCTAssertNotEqual(refused.phase, .signedOut)

        let m = model(server())
        m.phase = .signedIn
        await m.refresh()
        let none = await m.deleteAccount(confirm: "Praxis Test")
        XCTAssertNil(none)
        XCTAssertEqual(m.phase, .signedOut)
        XCTAssertNil(m.me)
    }

    func testSignInErrorsAreSentences() async {
        let wrong = model(ScriptedTransport { _ in (401, ["code": "invalid_credentials"]) }, tokens: nil)
        do {
            try await wrong.signIn(email: "a@b.c", password: "x")
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(wrong.message(for: error), L("signin.error.credentials"))
            XCTAssertNotEqual(wrong.phase, .signedIn)
        }
        let other = model(ScriptedTransport { _ in (403, ["code": "not_dentvideo"]) }, tokens: nil)
        do {
            try await other.signIn(email: "a@b.c", password: "x")
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(other.message(for: error), L("signin.error.notDentVideo"))
        }
    }

    func testSignInSuccessLoadsTheWeek() async throws {
        let t = ScriptedTransport { r in
            let p = r.url!.path
            if p.hasSuffix("/session") {
                return (200, ["accessToken": "a", "refreshToken": "r", "expiresAt": 4_000_000_000, "user": ["id": "u1", "email": "a@clinic.example"]])
            }
            if p.hasSuffix("/me") { return (200, Fx.me()) }
            if p.hasSuffix("/items") { return (200, Fx.items([Fx.item("a")])) }
            return (200, ["ok": true])
        }
        let m = model(t, tokens: nil)
        try await m.signIn(email: "A@Clinic.example ", password: "pw")
        XCTAssertEqual(m.phase, .signedIn)
        XCTAssertEqual(m.items.count, 1)
    }

    func testMessages() {
        let m = model(server())
        XCTAssertEqual(m.message(for: APIError.offline), L("error.offline"))
        XCTAssertEqual(m.message(for: APIError.rateLimited(retryAfter: 5)), L("error.tooMany"))
        XCTAssertEqual(m.message(for: APIError.needsPlan), L("error.notInPlan"))
        XCTAssertEqual(m.message(for: APIError.refused(code: nil, message: nil)), L("error.generic"))
        XCTAssertEqual(m.message(for: APIError.server(status: 502)), L("error.generic"))
        XCTAssertEqual(m.message(for: APIError.decoding), L("error.generic"))
        XCTAssertTrue(m.message(for: APIError.paused).contains(Config.supportEmail))
    }

    func testAccessStatesFromThePlan() async {
        func access(_ plan: [String: Any]) async -> AccessState? {
            let meData = try! JSONSerialization.data(withJSONObject: Fx.me(plan: plan))
            let m = model(ScriptedTransport { r in
                if r.url!.path.hasSuffix("/me") { return (200, meData) }
                return (200, Fx.items([]))
            })
            await m.refresh()
            return m.access
        }
        let none = await access(["state": "cancelled", "canMake": false, "adminPaused": false, "recordings": false])
        XCTAssertEqual(none, .noPlan)
        let paused = await access(["state": "paused", "canMake": false, "adminPaused": true, "recordings": true])
        XCTAssertEqual(paused, .paused)
        let starter = await access(["state": "active", "tier": "starter", "canMake": true, "adminPaused": false, "recordings": false])
        XCTAssertEqual(starter, .active(recordings: false))
    }

    func testLinksAndNotificationsOpenTheVideo() async {
        let m = model(server())
        await m.refresh()
        m.tab = .settings
        m.handle(url: URL(string: "dentvideo://app/video/b")!)
        XCTAssertEqual(m.tab, .week)
        XCTAssertEqual(m.openItemID, "b")
        m.openItemID = nil
        m.handle(url: URL(string: "https://dentvideo.com/app/video/c")!)
        XCTAssertEqual(m.openItemID, "c")
        m.openItemID = nil
        m.handle(url: URL(string: "https://example.com/app/video/c")!)
        XCTAssertNil(m.openItemID, "links from other sites are ignored")
        m.open(itemID: DeepLink.itemID(fromNotification: ["itemID": "a", "kind": "post_reminder"]))
        XCTAssertEqual(m.openItemID, "a")
    }

    func testUploadProblems() {
        XCTAssertEqual(UploadCenter.problem(for: APIError.needsPlan), .needsPlan)
        XCTAssertEqual(UploadCenter.problem(for: APIError.refused(code: "quota", message: nil)), .quota)
        XCTAssertEqual(UploadCenter.problem(for: APIError.refused(code: "size", message: nil)), .tooLarge)
        XCTAssertEqual(UploadCenter.problem(for: APIError.offline), .network)
        XCTAssertEqual(UploadCenter.problem(for: APIError.server(status: 500)), .server)
    }

    func testDeleteConfirmationMatchesTheServersRule() {
        XCTAssertEqual(DeleteAccountView.normalized("  Praxis   Sonne "), "praxis sonne")
        XCTAssertEqual(DeleteAccountView.normalized("ＰＲＡＸＩＳ"), "praxis")
    }
}
