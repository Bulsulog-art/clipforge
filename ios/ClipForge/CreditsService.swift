import Foundation
import RevenueCat

/// Local credit balance + Plus-gated consumable IAP for top-up packs.
/// Apple refund-proof: once a pack is consumed, Apple won't refund it.
@MainActor
final class CreditsService: ObservableObject {
    static let shared = CreditsService()

    @Published var balance: Int = 0
    @Published var lifetimePurchased: Int = 0
    @Published var hasPlus: Bool = false
    @Published var loading: Bool = false
    @Published var lastError: String?

    /// Consumable IAP product identifiers (App Store Connect → Monetization → In-App Purchases).
    /// These are only purchasable for Plus subscribers — UI gates this.
    static let creditPacks: [CreditPack] = [
        .init(id: "clipforge_credits_10", credits: 10, price: "$4.99"),
        .init(id: "clipforge_credits_20", credits: 20, price: "$7.99", popular: true),
    ]

    private init() {}

    /// Refresh balance + Plus entitlement.
    func refresh() async {
        guard let userId = SupabaseService.shared.session?.user.id else { return }
        loading = true
        defer { loading = false }

        // Plus entitlement (starter/plus key — same thing)
        if let info = try? await Purchases.shared.customerInfo() {
            let starter = info.entitlements["starter"]?.isActive ?? false
            let plus = info.entitlements["plus"]?.isActive ?? false
            hasPlus = starter || plus
        }

        do {
            struct ProfileRow: Decodable {
                let credits_balance: Int
                let credits_lifetime_purchased: Int
            }
            let row: ProfileRow = try await SupabaseService.shared.client
                .from("profiles")
                .select("credits_balance, credits_lifetime_purchased")
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value
            self.balance = row.credits_balance
            self.lifetimePurchased = row.credits_lifetime_purchased
        } catch {
            self.lastError = error.localizedDescription
        }
    }

    /// Purchase a credit pack. Only callable when user has active Plus entitlement.
    /// RevenueCat → App Store → webhook grants credits in Postgres.
    func purchase(pack: CreditPack) async throws {
        guard hasPlus else { throw CreditsError.requiresPlus }

        loading = true
        defer { loading = false }

        let products = try await Purchases.shared.products([pack.id])
        guard let product = products.first(where: { $0.productIdentifier == pack.id }) else {
            throw CreditsError.productMissing(pack.id)
        }
        let result = try await Purchases.shared.purchase(product: product)
        guard !result.userCancelled else { throw CreditsError.cancelled }

        // Optimistic update — webhook reconciles within a couple seconds
        balance += pack.credits
        lifetimePurchased += pack.credits

        Task {
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            await refresh()
        }
    }

    /// Used by the studio screen before queueing a video.
    func canStartVideo() -> Bool { balance >= 1 }
}

struct CreditPack: Identifiable, Hashable {
    let id: String
    let credits: Int
    let price: String
    var popular: Bool = false
}

enum CreditsError: LocalizedError {
    case productMissing(String)
    case cancelled
    case requiresPlus

    var errorDescription: String? {
        switch self {
        case .productMissing(let id):
            return "Product \(id) not configured in App Store Connect"
        case .cancelled:
            return "Purchase cancelled"
        case .requiresPlus:
            return "Credit packs are available to Plus members only."
        }
    }
}
