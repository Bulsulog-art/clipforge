import Foundation
import StoreKit
import UIKit
import RevenueCat
import DentVideoCore

/// The App Store through RevenueCat (purchases-ios, pinned in project.yml). Configured once with the
/// public SDK key from Config; anonymous until `logIn` names the Liman user id GET billing returns.
@MainActor
final class RevenueCatPurchases: PurchaseService {
    /// RevenueCat offering with both monthly plans (docs/DENTVIDEO_IAP_PLAN.md §1).
    static let offeringID = "default"
    private var packages: [String: Package] = [:]

    init(apiKey: String) {
        #if DEBUG
        Purchases.logLevel = .info
        #else
        Purchases.logLevel = .warn
        #endif
        if !Purchases.isConfigured { Purchases.configure(withAPIKey: apiKey) }
    }

    var isAvailable: Bool { true }

    func logIn(_ appUserID: String) async {
        guard !appUserID.isEmpty, Purchases.shared.appUserID != appUserID else { return }
        _ = try? await Purchases.shared.logIn(appUserID)
    }

    func logOut() async {
        packages = [:]
        // An anonymous id cannot be logged out (RevenueCat answers with an error); nothing to do then.
        guard !Purchases.shared.isAnonymous else { return }
        _ = try? await Purchases.shared.logOut()
    }

    func offers(for products: [BillingProduct]) async throws -> [StoreOffer] {
        let offerings: Offerings
        do { offerings = try await Purchases.shared.offerings() } catch { throw Self.failure(error) }
        guard let offering = offerings.offering(identifier: Self.offeringID) ?? offerings.current else { throw PurchaseFailure.unavailable }
        var out: [StoreOffer] = []
        for p in products {
            guard let pkg = offering.availablePackages.first(where: { $0.storeProduct.productIdentifier == p.productId }) else { continue }
            packages[p.productId] = pkg
            out.append(StoreOffer(tier: p.tier, productId: p.productId, displayPrice: pkg.storeProduct.localizedPriceString))
        }
        if out.isEmpty { throw PurchaseFailure.unavailable }
        return out
    }

    func purchase(_ offer: StoreOffer) async throws -> PurchaseOutcome {
        guard let pkg = packages[offer.productId] else { throw PurchaseFailure.unavailable }
        do {
            let r = try await Purchases.shared.purchase(package: pkg)
            return r.userCancelled ? .cancelled : .purchased
        } catch {
            if let code = error as? RevenueCat.ErrorCode {
                if code == .purchaseCancelledError { return .cancelled }
                if code == .paymentPendingError { return .pending }
            }
            throw Self.failure(error)
        }
    }

    func restore(entitlements: Set<String>) async throws -> Bool {
        do {
            let info = try await Purchases.shared.restorePurchases()
            return !Set(info.entitlements.active.keys).isDisjoint(with: entitlements)
        } catch {
            throw Self.failure(error)
        }
    }

    func showManageSubscriptions(fallback: URL?) async { await ManageSubscriptions.show(fallback: fallback) }

    private static func failure(_ error: Error) -> PurchaseFailure {
        let text = (error as NSError).localizedDescription
        return text.isEmpty ? .unavailable : .store(text)
    }
}

/// Apple's subscription management: the in-app sheet (StoreKit `showManageSubscriptions`), or the
/// App Store's subscriptions page when the sheet cannot open.
enum ManageSubscriptions {
    @MainActor static func show(fallback: URL?) async {
        if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
            do {
                try await AppStore.showManageSubscriptions(in: scene)
                return
            } catch {}
        }
        if let url = fallback ?? URL(string: "https://apps.apple.com/account/subscriptions") { _ = await UIApplication.shared.open(url) }
    }
}
