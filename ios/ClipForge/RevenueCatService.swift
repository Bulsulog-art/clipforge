import Foundation
import UIKit
import RevenueCat
import StoreKit

@MainActor
final class RevenueCatService: ObservableObject {
    static let shared = RevenueCatService()
    @Published var customerInfo: CustomerInfo?
    @Published var offerings: Offerings?
    @Published var offeringsError: String?
    @Published var loadingOfferings: Bool = false

    /// `starter` is the canonical entitlement id; `plus` kept as an alias for
    /// older webhook payloads. Either signals "Plus tier active".
    var hasPlus: Bool {
        let starter = customerInfo?.entitlements["starter"]?.isActive ?? false
        let plus = customerInfo?.entitlements["plus"]?.isActive ?? false
        return starter || plus
    }

    var hasPro: Bool {
        customerInfo?.entitlements["pro"]?.isActive == true
            || customerInfo?.entitlements["agency"]?.isActive == true
    }

    var hasAnyPaid: Bool {
        guard let ents = customerInfo?.entitlements.active else { return false }
        return !ents.isEmpty
    }

    /// Next renewal date for the active Plus entitlement (nil if not subscribed).
    /// Surfaced in the cancel flow so the user knows when their plan renews.
    var plusRenewsAt: Date? {
        let ent = customerInfo?.entitlements["starter"]?.isActive == true
            ? customerInfo?.entitlements["starter"]
            : customerInfo?.entitlements["plus"]
        return ent?.expirationDate
    }

    /// Product id of the currently active Plus subscription (weekly vs monthly).
    /// Used by PlansView to render a "Current plan" badge on the right row.
    var activeProductId: String? {
        customerInfo?.entitlements.active.values.first?.productIdentifier
    }

    func identify(userId: String) async {
        do {
            let (info, _) = try await Purchases.shared.logIn(userId)
            self.customerInfo = info
            await refreshOfferings()
        } catch {
            print("RC identify error: \(error)")
        }
    }

    /// Load offerings with a single retry on failure. Throws nothing — UI
    /// reads `offeringsError` and shows a retry button when set.
    @discardableResult
    func refreshOfferings() async -> Offerings? {
        loadingOfferings = true
        defer { loadingOfferings = false }
        do {
            let result = try await Purchases.shared.offerings()
            self.offerings = result
            self.offeringsError = nil
            return result
        } catch {
            // One retry on transient network errors
            try? await Task.sleep(nanoseconds: 800_000_000)
            do {
                let result = try await Purchases.shared.offerings()
                self.offerings = result
                self.offeringsError = nil
                return result
            } catch {
                self.offeringsError = error.localizedDescription
                return nil
            }
        }
    }

    /// Lookup a Package by product id from the default offering. Returns nil
    /// when the offering hasn't loaded or the product isn't configured.
    func package(productId: String) -> Package? {
        guard let off = offerings?.current ?? offerings?.all.values.first else { return nil }
        return off.availablePackages.first { $0.storeProduct.productIdentifier == productId }
    }

    /// Buy a subscription package. Returns true if the user actually purchased
    /// (false on cancel). Throws on real errors so callers can show a banner.
    @discardableResult
    func purchase(_ package: Package) async throws -> Bool {
        let result = try await Purchases.shared.purchase(package: package)
        self.customerInfo = result.customerInfo
        if !result.userCancelled {
            // Haptic on actual purchase, not on cancellation.
            await Haptics.notify(.success)
        }
        return !result.userCancelled
    }

    /// Redeem the Apple promotional offer attached to clipforge_plus_monthly.
    /// Used by CancelFlowView for the $12.99 win-back.
    func redeemRetentionOffer(offerId: String = "plus_retention_1299") async throws {
        let currentOff: Offering?
        if let cached = offerings?.current {
            currentOff = cached
        } else {
            currentOff = await refreshOfferings()?.current
        }
        guard let off = currentOff else { throw PaywallError.offeringsUnavailable }
        guard let monthly = off.monthly
                ?? off.availablePackages.first(where: {
                    $0.storeProduct.productIdentifier == "clipforge_plus_monthly"
                }) else {
            throw PaywallError.missingProduct("clipforge_plus_monthly")
        }
        let product = monthly.storeProduct
        guard let promo = product.discounts.first(where: { $0.offerIdentifier == offerId })
                ?? product.discounts.first else {
            throw PaywallError.noPromotionalOffer(offerId)
        }
        let signed = try await Purchases.shared.getPromotionalOffer(
            forProductDiscount: promo, product: product
        )
        let result = try await Purchases.shared.purchase(
            package: monthly, promotionalOffer: signed
        )
        self.customerInfo = result.customerInfo
        if !result.userCancelled {
            await Haptics.notify(.success)
        }
    }

    func restore() async throws -> CustomerInfo {
        let info = try await Purchases.shared.restorePurchases()
        self.customerInfo = info
        return info
    }

    /// Detach the RevenueCat user so the next sign-in re-binds cleanly.
    func logOut() async {
        do {
            let info = try await Purchases.shared.logOut()
            self.customerInfo = info
        } catch {
            print("RC logout (likely already anonymous): \(error)")
        }
    }
}

// MARK: - Errors

enum PaywallError: LocalizedError {
    case offeringsUnavailable
    case missingProduct(String)
    case noPromotionalOffer(String)

    var errorDescription: String? {
        switch self {
        case .offeringsUnavailable:
            return "Pricing isn't loaded yet. Check your connection and try again."
        case .missingProduct(let id):
            return "Product '\(id)' is missing from App Store Connect."
        case .noPromotionalOffer(let id):
            return "No promotional offer '\(id)' configured. Add it on App Store Connect."
        }
    }
}

// MARK: - Haptics

enum Haptics {
    /// Light tap on UI button interactions
    @MainActor static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle = .light) async {
        UIImpactFeedbackGenerator(style: style).impactOccurred()
    }
    /// Success / warning / error notification haptic
    @MainActor static func notify(_ type: UINotificationFeedbackGenerator.FeedbackType) async {
        UINotificationFeedbackGenerator().notificationOccurred(type)
    }
}
