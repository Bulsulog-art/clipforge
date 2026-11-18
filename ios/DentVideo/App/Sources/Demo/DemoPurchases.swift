#if DEBUG
import Foundation
import DentVideoCore

/// The demo's App Store (screenshots and UI tests): no network, no StoreKit, no RevenueCat.
/// Prices are sample StoreKit-style prices for the simulator's region, only in DEBUG builds;
/// the real app shows StoreKit's own. A purchase tells DemoServer, which switches the plan on at
/// a later GET billing, as RevenueCat's webhook does. `-DVStore`, `-DVRestore` shape it.
@MainActor
final class DemoPurchases: PurchaseService {
    private let server: DemoServer
    private let available: Bool
    private(set) var loggedIn: String?

    init(server: DemoServer, available: Bool) {
        self.server = server
        self.available = available
    }

    var isAvailable: Bool { available }

    func logIn(_ appUserID: String) async { loggedIn = appUserID }
    func logOut() async { loggedIn = nil }

    func offers(for products: [BillingProduct]) async throws -> [StoreOffer] {
        guard available else { throw PurchaseFailure.unavailable }
        try? await Task.sleep(for: .milliseconds(200))
        return products.map { StoreOffer(tier: $0.tier, productId: $0.productId, displayPrice: Self.samplePrice($0.tier)) }
    }

    func purchase(_ offer: StoreOffer) async throws -> PurchaseOutcome {
        try? await Task.sleep(for: .milliseconds(400))
        switch DemoFlags.store {
        case "cancel": return .cancelled
        case "pending": return .pending
        case "fail": throw PurchaseFailure.store("The App Store couldn't complete the purchase. Nothing was charged.")
        default:
            server.storePurchased(tier: offer.tier)
            return .purchased
        }
    }

    func restore(entitlements: Set<String>) async throws -> Bool {
        try? await Task.sleep(for: .milliseconds(400))
        guard DemoFlags.restore == "found" else { return false }
        server.storePurchased(tier: "practice")
        return true
    }

    func showManageSubscriptions(fallback: URL?) async {}

    /// A storefront-style price in the simulator's currency (USD, EUR, TRY …): demo only.
    static func samplePrice(_ tier: String) -> String {
        let f = NumberFormatter()
        f.numberStyle = .currency
        f.locale = Locale.current
        let code = Locale.current.currency?.identifier ?? "USD"
        let amount: Double
        switch code {
        case "TRY": amount = tier == "practice" ? 2499.99 : 1499.99
        case "JPY": amount = tier == "practice" ? 12000 : 7500
        case "PLN": amount = tier == "practice" ? 329.99 : 199.99
        default: amount = tier == "practice" ? 79.99 : 49.99
        }
        return f.string(from: NSNumber(value: amount)) ?? "\(amount)"
    }
}
#endif
