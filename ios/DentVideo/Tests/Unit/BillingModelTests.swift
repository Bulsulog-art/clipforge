import XCTest
import DentVideoCore
@testable import DentVideo

/// A purchase layer for the model's tests: scripted answers, every call recorded.
@MainActor
final class FakeStore: PurchaseService {
    var isAvailable = true
    var calls: [String] = []
    var outcome: Result<PurchaseOutcome, Error> = .success(.purchased)
    var restoreFinds = false
    var onPurchase: (() -> Void)?

    func logIn(_ appUserID: String) async { calls.append("logIn:\(appUserID)") }
    func logOut() async { calls.append("logOut") }
    func offers(for products: [BillingProduct]) async throws -> [StoreOffer] {
        calls.append("offers")
        // Practice first on purpose: the paywall orders them itself.
        return products.reversed().map { StoreOffer(tier: $0.tier, productId: $0.productId, displayPrice: "€\($0.tier.count)") }
    }
    func purchase(_ offer: StoreOffer) async throws -> PurchaseOutcome {
        calls.append("purchase:\(offer.productId)")
        onPurchase?()
        return try outcome.get()
    }
    func restore(entitlements: Set<String>) async throws -> Bool {
        calls.append("restore:\(entitlements.sorted().joined(separator: ","))")
        if restoreFinds { onPurchase?() }
        return restoreFinds
    }
    func showManageSubscriptions(fallback: URL?) async { calls.append("manage:\(fallback?.absoluteString ?? "-")") }
}

/// GET billing, sequenced: the answer changes after a purchase, as the webhook would make it.
final class BillingServer: @unchecked Sendable {
    private let lock = NSLock()
    private var live = false
    private(set) var reads = 0
    var paywall: [String: Any] = BillingServer.answer()

    static func answer(status: String = "none", showPaywall: Bool = true, canPurchase: Bool = true, blockers: [String] = [], manage: Any = NSNull(), state: String = "trial") -> [String: Any] {
        ["appUserId": "uuid-1", "clinicId": "c1", "plan": ["state": state, "tier": NSNull(), "source": NSNull()], "status": status,
         "showPaywall": showPaywall, "canPurchase": canPurchase, "blockers": blockers, "manage": manage,
         "manageUrl": "https://apps.apple.com/account/subscriptions",
         "products": [["tier": "starter", "productId": "dentvideo_starter_monthly", "entitlement": "starter"],
                      ["tier": "practice", "productId": "dentvideo_practice_monthly", "entitlement": "practice"]]]
    }

    func goLive() { lock.lock(); live = true; lock.unlock() }

    func handle(_ r: URLRequest) -> (Int, Any) {
        lock.lock(); defer { lock.unlock() }
        if r.url!.path.hasSuffix("/billing") {
            reads += 1
            return (200, live ? Self.answer(status: "active", showPaywall: false, canPurchase: false, manage: "app_store", state: "active") : paywall)
        }
        if r.url!.path.hasSuffix("/me") { return (200, Fx.me()) }
        if r.url!.path.hasSuffix("/items") { return (200, Fx.items([])) }
        return (404, ["error": "not found"])
    }
}

@MainActor
final class BillingModelTests: XCTestCase {
    private func setup(_ server: BillingServer, store: FakeStore) -> AppModel {
        let t = ScriptedTransport { r in server.handle(r) }
        return AppModel(store: TestStore(Fx.tokens), transport: t, uploads: UploadCenter(identifier: "test.\(UUID().uuidString)"), purchases: store)
    }

    func testLoadLogsInWithTheServersIdAndLoadsTheOffers() async {
        let server = BillingServer(), store = FakeStore()
        let m = setup(server, store: store)
        await m.billing.load()
        XCTAssertEqual(m.billing.step, .paywall)
        XCTAssertEqual(store.calls, ["logIn:uuid-1", "offers"])
        XCTAssertEqual(m.billing.sortedOffers.map(\.tier), ["starter", "practice"], "Starter first, nothing pre-selected")
        XCTAssertEqual(m.billing.sortedOffers.map(\.displayPrice), ["€7", "€8"], "StoreKit's price as given")
        await m.billing.load()
        XCTAssertEqual(store.calls.filter { $0.hasPrefix("logIn") }.count, 1, "logged in once per account")
    }

    func testNoOffersWithoutPaywall() async {
        let server = BillingServer(), store = FakeStore()
        server.paywall = BillingServer.answer(status: "active", showPaywall: false, canPurchase: false, manage: "web", state: "active")
        let m = setup(server, store: store)
        await m.billing.load()
        XCTAssertEqual(m.billing.step, .noPaywall)
        XCTAssertEqual(m.billing.management, .web)
        XCTAssertFalse(store.calls.contains("offers"))
    }

    func testMissingKeyIsNotAvailableAndNeverAsksTheStore() async {
        let server = BillingServer(), store = FakeStore()
        store.isAvailable = false
        let m = setup(server, store: store)
        await m.billing.load()
        XCTAssertEqual(m.billing.step, .notAvailable)
        XCTAssertFalse(store.calls.contains("offers"))
    }

    func testUnavailableLayerRefusesQuietly() async {
        let u = UnavailablePurchases()
        XCTAssertFalse(u.isAvailable)
        do {
            _ = try await u.purchase(StoreOffer(tier: "starter", productId: "dentvideo_starter_monthly", displayPrice: "x"))
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(error as? PurchaseFailure, .unavailable)
        }
    }

    func testPurchaseWaitsForTheServerThenOpensTheWeek() async {
        let server = BillingServer(), store = FakeStore()
        store.onPurchase = { server.goLive() }
        let m = setup(server, store: store)
        await m.billing.load()
        let practice = m.billing.sortedOffers[1]
        await m.billing.purchase(practice)
        XCTAssertEqual(store.calls.last, "purchase:dentvideo_practice_monthly")
        XCTAssertEqual(m.billing.phase, .idle)
        XCTAssertTrue(m.billing.info?.isLive ?? false)
        XCTAssertEqual(m.billing.management, .appStore)
        XCTAssertEqual(m.access, .active(recordings: true), "the account was reloaded")
    }

    func testPurchaseThatNeverActivatesSaysWeAreConfirming() async {
        let server = BillingServer(), store = FakeStore()
        let m = setup(server, store: store)
        m.billing.setPollTimeout(1)
        await m.billing.load()
        await m.billing.purchase(m.billing.sortedOffers[0])
        XCTAssertEqual(m.billing.phase, .confirming)
        server.goLive()
        await m.billing.checkAgain()
        XCTAssertEqual(m.billing.phase, .idle)
        XCTAssertTrue(m.billing.info?.isLive ?? false)
    }

    func testCancelledAndPendingAndFailedPurchases() async {
        let server = BillingServer(), store = FakeStore()
        let m = setup(server, store: store)
        await m.billing.load()
        let offer = m.billing.sortedOffers[0]

        store.outcome = .success(.cancelled)
        await m.billing.purchase(offer)
        XCTAssertEqual(m.billing.phase, .idle)
        XCTAssertNil(m.billing.message, "closing Apple's sheet is not an error")
        XCTAssertEqual(server.reads, 1, "no polling after a cancel")

        store.outcome = .success(.pending)
        await m.billing.purchase(offer)
        XCTAssertEqual(m.billing.phase, .pending)

        store.outcome = .failure(PurchaseFailure.store("Payment declined."))
        await m.billing.purchase(offer)
        XCTAssertEqual(m.billing.phase, .idle)
        XCTAssertEqual(m.billing.message, "Payment declined.")
    }

    func testNoPurchaseWhileTheServerSaysNo() async {
        let server = BillingServer(), store = FakeStore()
        server.paywall = BillingServer.answer(canPurchase: false, blockers: ["email_unverified"])
        let m = setup(server, store: store)
        await m.billing.load()
        XCTAssertEqual(m.billing.step, .verifyEmail)
        await m.billing.purchase(StoreOffer(tier: "starter", productId: "dentvideo_starter_monthly", displayPrice: "x"))
        XCTAssertFalse(store.calls.contains { $0.hasPrefix("purchase") })
    }

    func testRestore() async {
        let server = BillingServer(), store = FakeStore()
        let m = setup(server, store: store)
        await m.billing.load()
        await m.billing.restore()
        XCTAssertEqual(store.calls.last, "restore:practice,starter")
        XCTAssertEqual(m.billing.message, L("paywall.restore.none"))
        XCTAssertEqual(m.billing.phase, .idle)

        store.restoreFinds = true
        store.onPurchase = { server.goLive() }
        await m.billing.restore()
        XCTAssertNil(m.billing.message)
        XCTAssertTrue(m.billing.info?.isLive ?? false)
    }

    func testSignOutLogsRevenueCatOut() async {
        let server = BillingServer(), store = FakeStore()
        let m = setup(server, store: store)
        await m.billing.load()
        await m.signOut()
        XCTAssertEqual(store.calls.last, "logOut")
        XCTAssertNil(m.billing.info)
        XCTAssertTrue(m.billing.offers.isEmpty)
    }

    func testManageSubscriptionUsesApplesPage() async {
        let server = BillingServer(), store = FakeStore()
        server.paywall = BillingServer.answer(status: "active", showPaywall: false, canPurchase: false, manage: "app_store", state: "active")
        let m = setup(server, store: store)
        await m.billing.load()
        XCTAssertEqual(m.billing.management, .appStore)
        await m.billing.manageSubscription()
        XCTAssertEqual(store.calls.last, "manage:https://apps.apple.com/account/subscriptions")
    }
}
