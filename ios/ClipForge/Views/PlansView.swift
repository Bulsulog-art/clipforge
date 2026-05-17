import SwiftUI
import RevenueCat

@MainActor
struct PlansView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @State private var billing: BillingPeriod = .monthly
    @State private var purchasing: String?
    @State private var error: String?

    enum BillingPeriod: String, CaseIterable { case weekly, monthly }

    private let plus = PlanRow(
        tier: "Plus",
        weeklyId: "clipforge_plus_weekly",
        weeklyPrice: "$4.99",
        weeklyCredits: "10 credits / week",
        monthlyId: "clipforge_plus_monthly",
        monthlyPrice: "$14.99",
        monthlyCredits: "40 credits / month",
        features: [
            "No watermark",
            "Animated word-by-word captions",
            "AI Face Swap (2 cr)",
            "AI Translation 15+ languages (2 cr)",
            "Voice clone (5 cr)",
            "Auto-post to TikTok, Reels, Shorts, X",
            "AI-enhanced thumbnails",
            "A/B hook testing",
            "Buy extra credit packs anytime",
            "Cancel anytime",
        ]
    )

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerCard

                    Picker("Billing period", selection: $billing) {
                        Text("Weekly").tag(BillingPeriod.weekly)
                        Text("Monthly · Save 25%").tag(BillingPeriod.monthly)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    planCard(plus)

                    infoCard(
                        title: "Win-back offer",
                        icon: "heart.fill",
                        text: "If you ever start to cancel Plus, we'll automatically offer $12.99/month to keep you on."
                    )

                    infoCard(
                        title: "Plus-only credit packs",
                        icon: "bolt.fill",
                        text: "Run out before the next refill? Plus members can buy +10 for $4.99 or +20 for $7.99 consumable packs — credits never expire."
                    )

                    if let error {
                        Text(error)
                            .font(.callout)
                            .foregroundStyle(.red)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 12))
                    }
                }
                .padding()
            }
            .navigationTitle("Get Plus")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Restore") {
                        Task {
                            try? await RevenueCatService.shared.restore()
                            await credits.refresh()
                        }
                    }
                    .font(.caption)
                }
            }
            .background(Color.appBackground.ignoresSafeArea())
            .task { await credits.refresh() }
        }
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Unlock everything")
                .font(.largeTitle.bold())
            Text("All AI tools. No watermark. Cancel anytime.")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func infoCard(title: String, icon: String, text: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: icon)
                .font(.caption.bold())
                .foregroundStyle(.brand)
            Text(text)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }

    private func planCard(_ plan: PlanRow) -> some View {
        let productId = billing == .weekly ? plan.weeklyId : plan.monthlyId
        let price = billing == .weekly ? plan.weeklyPrice : plan.monthlyPrice
        let creditsLine = billing == .weekly ? plan.weeklyCredits : plan.monthlyCredits
        let suffix = billing == .weekly ? "/wk" : "/mo"

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text(plan.tier).font(.title.bold())
                Spacer()
                HStack(alignment: .firstTextBaseline, spacing: 0) {
                    Text(price).font(.title.bold())
                    Text(suffix).foregroundStyle(.secondary)
                }
            }
            Text(creditsLine).foregroundStyle(.brand).font(.callout.bold())
            VStack(alignment: .leading, spacing: 6) {
                ForEach(plan.features, id: \.self) { f in
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.brand)
                            .font(.caption)
                            .padding(.top, 3)
                        Text(f).font(.callout)
                    }
                }
            }
            Button {
                Task { await purchase(productId: productId) }
            } label: {
                HStack {
                    Spacer()
                    if purchasing == productId { ProgressView().tint(.white) }
                    Text(purchasing == productId ? "Processing…" : "Subscribe")
                        .fontWeight(.semibold)
                    Spacer()
                }
                .padding()
                .background(Color.brand)
                .foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 12))
            }
            .disabled(purchasing != nil)
        }
        .padding()
        .background(Color.brand.opacity(0.08))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.brand, lineWidth: 1.5))
        .clipShape(.rect(cornerRadius: 18))
    }

    private func purchase(productId: String) async {
        purchasing = productId
        defer { purchasing = nil }
        do {
            let products = try await Purchases.shared.products([productId])
            guard let product = products.first(where: { $0.productIdentifier == productId }) else {
                throw NSError(
                    domain: "Plans",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Product missing in App Store Connect"]
                )
            }
            let result = try await Purchases.shared.purchase(product: product)
            if !result.userCancelled {
                await credits.refresh()
                dismiss()
            }
        } catch {
            self.error = (error as NSError).localizedDescription
        }
    }
}

private struct PlanRow {
    let tier: String
    let weeklyId: String
    let weeklyPrice: String
    let weeklyCredits: String
    let monthlyId: String
    let monthlyPrice: String
    let monthlyCredits: String
    let features: [String]
}
