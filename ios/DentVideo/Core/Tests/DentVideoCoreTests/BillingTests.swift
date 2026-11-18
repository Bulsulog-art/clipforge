import XCTest
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import DentVideoCore

/// GET billing → what the app shows (docs/DENTVIDEO_IAP_PLAN.md §4, §6), the activation poll after a
/// purchase, sign-up and the email code.
final class BillingTests: XCTestCase {
    /// The server's answer, as web/src/lib/dentvid/mobile-billing.ts builds it.
    static func billing(status: String = "none", showPaywall: Bool = true, canPurchase: Bool = true, blockers: [String] = [], clinicId: Any = "c1",
                        plan: Any = ["state": "trial", "tier": NSNull(), "source": NSNull(), "renewsAt": NSNull(), "endsAt": NSNull()],
                        manage: Any = NSNull(), manageUrl: Any = NSNull()) -> [String: Any] {
        ["appUserId": "11111111-2222-3333-4444-555555555555", "clinicId": clinicId, "plan": plan, "status": status,
         "showPaywall": showPaywall, "canPurchase": canPurchase, "blockers": blockers, "manage": manage, "manageUrl": manageUrl,
         "products": [["tier": "starter", "productId": "dentvideo_starter_monthly", "entitlement": "starter"],
                      ["tier": "practice", "productId": "dentvideo_practice_monthly", "entitlement": "practice"]]]
    }

    static func decode(_ o: [String: Any]) throws -> BillingInfo {
        try JSONDecoder().decode(BillingInfo.self, from: JSONSerialization.data(withJSONObject: o))
    }

    func testDecodesTheServersAnswer() throws {
        let b = try Self.decode(Self.billing(status: "active", showPaywall: false, canPurchase: false,
                                             plan: ["state": "active", "tier": "practice", "source": "apple", "renewsAt": "2026-12-17T10:00:00Z", "endsAt": NSNull()],
                                             manage: "app_store", manageUrl: "https://apps.apple.com/account/subscriptions"))
        XCTAssertEqual(b.appUserId, "11111111-2222-3333-4444-555555555555")
        XCTAssertEqual(b.status, .active)
        XCTAssertEqual(b.manage, .appStore)
        XCTAssertEqual(b.manageUrl?.absoluteString, "https://apps.apple.com/account/subscriptions")
        XCTAssertEqual(b.plan?.source, "apple")
        XCTAssertEqual(b.products.map(\.productId), ["dentvideo_starter_monthly", "dentvideo_practice_monthly"])
        XCTAssertEqual(b.products.map(\.entitlement), ["starter", "practice"])
        XCTAssertTrue(b.isLive)
    }

    func testUnknownValuesNeverBreakTheApp() throws {
        var o = Self.billing(status: "something_new", blockers: ["clinic", "new_blocker"], manage: "somewhere")
        o["products"] = []
        let b = try Self.decode(o)
        XCTAssertEqual(b.status, .unknown)
        XCTAssertEqual(b.blockers, [.clinic, .unknown])
        XCTAssertEqual(b.manage, .unknown)
        XCTAssertEqual(b.products, BillingProduct.defaults, "an empty list falls back to the two plans")
    }

    func testOnlyAnHttpsManageAddressIsKept() throws {
        let b = try Self.decode(Self.billing(manage: "app_store", manageUrl: "javascript:alert(1)"))
        XCTAssertNil(b.manageUrl)
    }

    func testEveryStatusTheServerSends() throws {
        for s in ["none", "active", "ending", "billing_issue", "paused", "pending", "disputed", "admin_paused", "ended"] {
            XCTAssertNotEqual(try Self.decode(Self.billing(status: s)).status, .unknown, s)
        }
    }

    // MARK: Which screen

    func step(_ o: [String: Any], store: Bool = true) throws -> PurchaseStep {
        PurchaseStep.of(try Self.decode(o), storeAvailable: store)
    }

    func testNeverPaidVerifiedClinicSeesThePaywall() throws {
        XCTAssertEqual(try step(Self.billing()), .paywall)
        XCTAssertEqual(try step(Self.billing(status: "ended")), .paywall, "a plan that ended: the paywall again")
    }

    func testNoClinicYetGoesToTheClinicForm() throws {
        // The server's answer for a login without a clinic: no paywall, blockers [clinic, email_unverified].
        let o = Self.billing(showPaywall: false, canPurchase: false, blockers: ["clinic", "email_unverified"], clinicId: NSNull(), plan: NSNull())
        XCTAssertEqual(try step(o), .clinic)
        XCTAssertEqual(try step(o, store: false), .clinic)
    }

    func testUnverifiedEmailAsksForTheCodeBeforeThePaywall() throws {
        let o = Self.billing(canPurchase: false, blockers: ["email_unverified"])
        XCTAssertEqual(try step(o), .verifyEmail)
    }

    func testMissingKeyShowsNotAvailableInsteadOfThePaywall() throws {
        XCTAssertEqual(try step(Self.billing(), store: false), .notAvailable)
    }

    func testNoPaywallWhenTheServerSaysSo() throws {
        // Web plan being confirmed, disputed, on hold, cancelled but paid up, paused by DentVideo, live on
        // either channel: never a paywall, whatever the purchase layer.
        for (s, manage) in [("pending", NSNull()), ("disputed", NSNull()), ("paused", "web"), ("ending", "web"), ("admin_paused", NSNull()), ("active", "web"), ("active", "app_store"), ("billing_issue", "app_store")] as [(String, Any)] {
            let o = Self.billing(status: s, showPaywall: false, canPurchase: false, manage: manage)
            XCTAssertEqual(try step(o), .noPaywall, s)
            XCTAssertEqual(try step(o, store: false), .noPaywall, s)
        }
    }

    func testNoPaywallEvenWhenUnverified() throws {
        // A web-managed clinic is never asked for a code just to be told there is nothing to buy.
        let o = Self.billing(status: "pending", showPaywall: false, canPurchase: false, blockers: ["email_unverified"])
        XCTAssertEqual(try step(o), .noPaywall)
    }

    // MARK: Plan screen

    func testPlanManagement() throws {
        XCTAssertEqual(PlanManagement.of(try Self.decode(Self.billing(status: "active", showPaywall: false, manage: "web"))), .web)
        XCTAssertEqual(PlanManagement.of(try Self.decode(Self.billing(status: "active", showPaywall: false, manage: "app_store"))), .appStore)
        XCTAssertEqual(PlanManagement.of(try Self.decode(Self.billing(status: "admin_paused", showPaywall: false))), .none)
        XCTAssertEqual(PlanManagement.of(try Self.decode(Self.billing(status: "active", showPaywall: false, manage: "elsewhere"))), .none)
        XCTAssertEqual(PlanManagement.of(nil), .none)
    }

    // MARK: Activation poll

    final class Clock: @unchecked Sendable {
        private let lock = NSLock()
        private var t = Date(timeIntervalSince1970: 0)
        private(set) var sleeps: [TimeInterval] = []
        var now: Date { lock.lock(); defer { lock.unlock() }; return t }
        func sleep(_ s: TimeInterval) { lock.lock(); t += s; sleeps.append(s); lock.unlock() }
    }

    final class Answers: @unchecked Sendable {
        private let lock = NSLock()
        private var list: [Result<BillingInfo, Error>]
        private(set) var calls = 0
        init(_ l: [Result<BillingInfo, Error>]) { list = l }
        func next() throws -> BillingInfo {
            lock.lock(); defer { lock.unlock() }
            calls += 1
            return try (list.count > 1 ? list.removeFirst() : list[0]).get()
        }
    }

    func testPollStopsAsSoonAsThePlanIsActive() async throws {
        let waiting = try Self.decode(Self.billing())
        let live = try Self.decode(Self.billing(status: "active", showPaywall: false, canPurchase: false, plan: ["state": "active", "tier": "starter", "source": "apple"], manage: "app_store"))
        let clock = Clock()
        let answers = Answers([.success(waiting), .failure(APIError.offline), .success(waiting), .success(live)])
        let r = await ActivationPoll.run(timeout: 120, now: { clock.now }, sleep: { clock.sleep($0) }, fetch: { try answers.next() })
        XCTAssertEqual(r, .active(live))
        XCTAssertEqual(answers.calls, 4, "a failed poll is retried, not fatal")
        XCTAssertEqual(clock.sleeps, [2, 2, 2])
    }

    func testPollGivesUpAfterTheTimeout() async throws {
        let waiting = try Self.decode(Self.billing())
        let clock = Clock()
        let answers = Answers([.success(waiting)])
        let r = await ActivationPoll.run(timeout: 120, now: { clock.now }, sleep: { clock.sleep($0) }, fetch: { try answers.next() })
        XCTAssertEqual(r, .timedOut)
        XCTAssertLessThanOrEqual(clock.sleeps.reduce(0, +), 120)
        XCTAssertGreaterThan(clock.sleeps.reduce(0, +), 110, "waits close to the whole two minutes")
        XCTAssertEqual(Array(clock.sleeps.prefix(6)), [2, 2, 2, 2, 2, 5], "quick at first, then calmer")
    }

    // MARK: Sign-up and code

    func testSignupRules() {
        XCTAssertTrue(SignupRules.isEmail("dr@clinic.example"))
        XCTAssertTrue(SignupRules.isEmail("  dr@clinic.example "))
        for bad in ["", "dr", "dr@", "@clinic.example", "dr@clinic", "dr@@clinic.example", "dr @clinic.example", "dr@.example", "dr@clinic."] {
            XCTAssertFalse(SignupRules.isEmail(bad), bad)
        }
        XCTAssertEqual(SignupRules.passwordProblem("short"), .tooShort)
        XCTAssertNil(SignupRules.passwordProblem("eight ch"))
        XCTAssertEqual(SignupRules.passwordProblem(String(repeating: "ş", count: 40)), .tooLong, "72 bytes, not 72 characters")
        XCTAssertEqual(SignupRules.code("123 456"), "123456")
        XCTAssertEqual(SignupRules.code("12-34-56-78"), "123456")
        XCTAssertEqual(SignupRules.code("１２３４５６"), "123456")
        XCTAssertEqual(SignupRules.code("abc"), "")
    }

    func testSignupKeepsTheSessionAndSendsWhatTheServerNeeds() async throws {
        let store = MemoryTokenStore()
        let t = FakeTransport { r in
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/signup")
            XCTAssertNil(r.value(forHTTPHeaderField: "Authorization"))
            let b = bodyJSON(r)
            XCTAssertEqual(b["email"] as? String, "dr@clinic.example")
            XCTAssertEqual(b["password"] as? String, "a long password")
            XCTAssertEqual(b["elapsedMs"] as? Int, 8_000)
            XCTAssertEqual(b["locale"] as? String, "tr")
            XCTAssertNil(b["website"], "no honeypot from the app")
            return (200, ["ok": true, "signedIn": true, "session": tokenJSON("acc", refresh: "ref")], [:])
        }
        let api = APIClient(baseURL: base, transport: t, store: store, languageCode: "tr")
        let r = try await api.signUp(email: " Dr@Clinic.example ", password: "a long password", elapsedMs: 8_000)
        guard case let .signedIn(tok) = r else { return XCTFail("\(r)") }
        XCTAssertEqual(tok.accessToken, "acc")
        XCTAssertEqual(store.load()?.accessToken, "acc", "kept for the email code")
    }

    func testSignupExistingAccountKeepsNothing() async throws {
        let store = MemoryTokenStore()
        let api = APIClient(baseURL: base, transport: FakeTransport { _ in (200, ["ok": true, "existing": true], [:]) }, store: store)
        let r = try await api.signUp(email: "dr@clinic.example", password: "a long password", elapsedMs: 5_000)
        XCTAssertEqual(r, .existingAccount)
        XCTAssertNil(store.load())
        XCTAssertEqual(SignupOutcome.of(SignupAnswer(ok: true, signedIn: false, existing: nil, session: nil)), .createdSignInNeeded)
    }

    func testSignupRefusalCarriesTheServersSentence() async {
        let api = APIClient(baseURL: base, transport: FakeTransport { _ in (400, ["error": "Too quick."], [:]) }, store: MemoryTokenStore())
        do {
            _ = try await api.signUp(email: "dr@clinic.example", password: "a long password", elapsedMs: 100)
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(error as? APIError, .refused(code: nil, message: "Too quick."))
        }
    }

    func testVerifyEmailSendAndConfirm() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/verify-email")
            XCTAssertEqual(r.value(forHTTPHeaderField: "Authorization"), "Bearer access-1")
            let b = bodyJSON(r)
            if b["action"] as? String == "send" {
                XCTAssertEqual(b["onlyIfNone"] as? Bool, true)
                return (200, ["ok": true, "email": "a@clinic.example", "resendInSec": 60], [:])
            }
            XCTAssertEqual(b["action"] as? String, "confirm")
            if b["code"] as? String == "123456" { return (200, ["ok": true, "verified": true, "email": "a@clinic.example"], [:]) }
            return (400, ["error": "That code doesn't match. 4 tries left.", "reason": "wrong", "attemptsLeft": 4], [:])
        }
        let api = APIClient(baseURL: base, transport: t, store: MemoryTokenStore(tokens()))
        let sent = try await api.verifyEmail(.send, onlyIfNone: true)
        XCTAssertEqual(sent.resendInSec, 60)
        let ok = try await api.verifyEmail(.confirm(code: "123 456"))
        XCTAssertEqual(ok.verified, true)
        do {
            _ = try await api.verifyEmail(.confirm(code: "000000"))
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(error as? APIError, .refused(code: nil, message: "That code doesn't match. 4 tries left."))
        }
    }

    func testBillingIsABearerRead() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/billing")
            XCTAssertEqual(r.httpMethod, "GET")
            XCTAssertEqual(r.value(forHTTPHeaderField: "Authorization"), "Bearer access-1")
            return (200, BillingTests.billing(), [:])
        }
        let b = try await APIClient(baseURL: base, transport: t, store: MemoryTokenStore(tokens())).billing()
        XCTAssertTrue(b.showPaywall)
        XCTAssertTrue(b.canPurchase)
    }
}
