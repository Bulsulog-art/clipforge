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

    /// The consumable we sell (App Store Connect → Monetization → In-App Purchases).
    /// Purchasable by Plus subscribers only — the UI gates it and the server
    /// enforces it, because credits alone lift neither the watermark nor the
    /// source-length cap.
    ///
    /// One pack, not three. The previous list named `clipforge_credits_booster`,
    /// `_power` and `_pro` — none of which have ever existed in App Store
    /// Connect, so StoreKit could not resolve them and every top-up in the
    /// shipped app failed at the tap. Three cards also made the choice harder
    /// than the decision deserves: this is a refill, not a plan.
    ///
    /// $4.99 → 40 credits = $0.125/cr. Cheaper than weekly's $0.233/cr so a
    /// yearly member who runs dry is never better off switching to weekly, and
    /// dearer than yearly's $0.042/cr so it never undercuts the plan we most
    /// want people on.
    static let creditPacks: [CreditPack] = [
        .init(id: "clipforge_credits_topup", credits: 40, price: "$4.99"),
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
            // PostgREST uuid eq is case-sensitive at the wire level — lowercase
            // to match Postgres canonical form.
            let row: ProfileRow = try await SupabaseService.shared.client
                .schema("clipforge")
                .from("profiles")
                .select("credits_balance, credits_lifetime_purchased")
                .eq("id", value: userId.uuidString.lowercased())
                .single()
                .execute()
                .value
            self.balance = row.credits_balance
            self.lifetimePurchased = row.credits_lifetime_purchased
            self.lastError = nil
        } catch {
            self.lastError = error.localizedDescription
            Telemetry.capture(error, context: ["op": "credits_refresh"])
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
