import Foundation
import RevenueCat

/// Local credit balance + IAP credit pack purchasing.
/// Apple refund-proof: credit packs are consumables, can't be refunded once consumed.
@MainActor
final class CreditsService: ObservableObject {
    static let shared = CreditsService()

    @Published var balance: Int = 0
    @Published var lifetimePurchased: Int = 0
    @Published var loading: Bool = false
    @Published var lastError: String?

    /// Consumable IAP product identifiers (App Store Connect → Monetization → In-App Purchases).
    static let creditPacks: [CreditPack] = [
        .init(id: "clipforge_credits_10",  credits: 10,  price: "$1.99",  popular: false),
        .init(id: "clipforge_credits_30",  credits: 30,  price: "$4.99",  popular: false),
        .init(id: "clipforge_credits_100", credits: 100, price: "$14.99", popular: true),
        .init(id: "clipforge_credits_500", credits: 500, price: "$59.99", popular: false),
    ]

    private init() {}

    /// Refresh balance from Supabase profile row.
    func refresh() async {
        guard let userId = SupabaseService.shared.session?.user.id else { return }
        loading = true
        defer { loading = false }
        do {
            struct ProfileRow: Decodable { let credits_balance: Int; let credits_lifetime_purchased: Int }
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

    /// Purchase a credit pack. RevenueCat → App Store → server webhook grants credits.
    /// Apple iade riskine karşı consumable kullanıyoruz.
    func purchase(pack: CreditPack) async throws {
        loading = true
        defer { loading = false }

        let products = try await Purchases.shared.products([pack.id])
        guard let product = products.first(where: { $0.productIdentifier == pack.id }) else {
            throw CreditsError.productMissing(pack.id)
        }
        let result = try await Purchases.shared.purchase(product: product)
        guard !result.userCancelled else { throw CreditsError.cancelled }

        // Optimistic: locally add credits while webhook propagates
        balance += pack.credits
        lifetimePurchased += pack.credits

        // Server-side webhook will reconcile; refresh after 2s
        Task {
            try? await Task.sleep(nanoseconds: 2_500_000_000)
            await refresh()
        }
    }

    /// Pre-flight before queuing a video so we don't waste an Apple receipt + API spend on empty wallet.
    func canStartVideo() -> Bool { balance >= 1 }
}

struct CreditPack: Identifiable, Hashable {
    let id: String
    let credits: Int
    let price: String
    let popular: Bool
}

enum CreditsError: LocalizedError {
    case productMissing(String)
    case cancelled

    var errorDescription: String? {
        switch self {
        case .productMissing(let id): return "Product \(id) not configured in App Store Connect"
        case .cancelled: return "Purchase cancelled"
        }
    }
}
