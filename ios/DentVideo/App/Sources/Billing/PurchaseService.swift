import Foundation
import DentVideoCore

/// A plan as the App Store offers it on this phone: the name and the price come from StoreKit
/// (through RevenueCat), in the storefront's currency and format. The app never writes a price itself.
struct StoreOffer: Identifiable, Equatable, Sendable {
    var id: String { productId }
    let tier: String
    let productId: String
    /// StoreKit's localized price ("49,99 €", "$49.99", "1.499,99 TL").
    let displayPrice: String
}

enum PurchaseOutcome: Equatable, Sendable {
    /// The App Store took the payment; the server switches the plan on when RevenueCat tells it.
    case purchased
    /// The clinic closed Apple's sheet: nothing happened.
    case cancelled
    /// Waiting for approval (Ask to Buy, a bank check): the App Store finishes it later.
    case pending
}

enum PurchaseFailure: Error, Equatable {
    /// The product is not loaded (offerings failed or the plan is missing from the offering).
    case unavailable
    /// The App Store or RevenueCat refused, with the system's own sentence.
    case store(String)
}

/// The purchase layer: RevenueCat in the app, a fake in demo flow mode (UI tests), and nothing
/// when this build has no RevenueCat key (the paywall then says "not available yet").
@MainActor
protocol PurchaseService: AnyObject {
    /// False when there is no key: the paywall shows a calm "not available yet" and never crashes.
    var isAvailable: Bool { get }
    /// `Purchases.logIn(<Liman user id>)`: the id GET billing names (`appUserId`).
    func logIn(_ appUserID: String) async
    /// `Purchases.logOut()` on sign-out.
    func logOut() async
    /// The offering's packages for these product ids, with StoreKit's prices.
    func offers(for products: [BillingProduct]) async throws -> [StoreOffer]
    func purchase(_ offer: StoreOffer) async throws -> PurchaseOutcome
    /// Restores the App Store's purchases for this Apple ID. True when a DentVideo plan was found.
    func restore(entitlements: Set<String>) async throws -> Bool
    /// Apple's own "manage subscription" sheet (falls back to the App Store page).
    func showManageSubscriptions(fallback: URL?) async
}

/// No RevenueCat key in this build (Config `REVENUECAT_PUBLIC_KEY` empty): nothing can be bought.
@MainActor
final class UnavailablePurchases: PurchaseService {
    var isAvailable: Bool { false }
    func logIn(_ appUserID: String) async {}
    func logOut() async {}
    func offers(for products: [BillingProduct]) async throws -> [StoreOffer] { throw PurchaseFailure.unavailable }
    func purchase(_ offer: StoreOffer) async throws -> PurchaseOutcome { throw PurchaseFailure.unavailable }
    func restore(entitlements: Set<String>) async throws -> Bool { throw PurchaseFailure.unavailable }
    func showManageSubscriptions(fallback: URL?) async { await ManageSubscriptions.show(fallback: fallback) }
}

enum PurchaseServices {
    /// RevenueCat when the build carries its public SDK key, else the "not available" layer.
    @MainActor static func make() -> PurchaseService {
        guard let key = Config.revenueCatKey else { return UnavailablePurchases() }
        return RevenueCatPurchases(apiKey: key)
    }
}
