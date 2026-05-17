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

    private let plans: [PlanRow] = [
        PlanRow(
            tier: "Plus",
            weeklyId: "clipforge_plus_weekly",
            weeklyPrice: "$4.99",
            weeklyCredits: "10 credits / week",
            monthlyId: "clipforge_plus_monthly",
            monthlyPrice: "$12.99",
            monthlyCredits: "35 credits / month",
            highlight: true,
            features: [
                "No watermark",
                "Animated word-by-word captions",
                "AI Face Swap (2 cr)",
                "Connect TikTok, Reels, Shorts",
                "Cancel anytime",
            ]
        ),
        PlanRow(
            tier: "Pro",
            weeklyId: "clipforge_pro_weekly",
            weeklyPrice: "$7.99",
            weeklyCredits: "25 credits / week",
            monthlyId: "clipforge_pro_monthly",
            monthlyPrice: "$19.99",
            monthlyCredits: "100 credits / month",
            highlight: false,
            features: [
                "Everything in Plus",
                "AI-enhanced Mr.Beast thumbnails",
                "Auto-post + scheduling",
                "AI translation 15+ languages",
                "Voice clone (5 cr)",
                "A/B hook testing",
            ]
        ),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    Picker("Billing period", selection: $billing) {
                        ForEach(BillingPeriod.allCases, id: \.self) { p in
                            Text(p == .weekly ? "Weekly" : "Monthly · Save 35%")
                                .tag(p)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    ForEach(plans, id: \.tier) { plan in
                        planCard(plan)
                    }

                    Text("About to cancel? Existing Plus subscribers get $9.99/mo as a win-back offer.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    Text("Or buy one-time credit packs — see the paywall.")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    if let error {
                        Text(error)
                            .font(.callout).foregroundStyle(.red)
                            .padding().background(Color.red.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 12))
                    }
                }
                .padding()
            }
            .navigationTitle("Choose plan")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Restore") {
                        Task { try? await credits.refresh() }
                    }
                    .font(.caption)
                }
            }
            .background(Color.appBackground.ignoresSafeArea())
            .task { await credits.refresh() }
        }
    }

    private func planCard(_ plan: PlanRow) -> some View {
        let productId = billing == .weekly ? plan.weeklyId : plan.monthlyId
        let price = billing == .weekly ? plan.weeklyPrice : plan.monthlyPrice
        let credits = billing == .weekly ? plan.weeklyCredits : plan.monthlyCredits
        let suffix = billing == .weekly ? "/wk" : "/mo"

        return VStack(alignment: .leading, spacing: 12) {
            if plan.highlight {
                Text("MOST POPULAR")
                    .font(.caption2.bold())
                    .padding(.horizontal, 8).padding(.vertical, 4)
                    .background(Color.brand)
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
            }
            HStack(alignment: .firstTextBaseline) {
                Text(plan.tier).font(.title.bold())
                Spacer()
                HStack(alignment: .firstTextBaseline, spacing: 0) {
                    Text(price).font(.title.bold())
                    Text(suffix).foregroundStyle(.secondary)
                }
            }
            Text(credits).foregroundStyle(.brand).font(.callout.bold())
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
                .background(plan.highlight ? Color.brand : Color.cardBackground)
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(plan.highlight ? .clear : Color.white.opacity(0.2), lineWidth: 1))
                .foregroundStyle(plan.highlight ? .white : .primary)
                .clipShape(.rect(cornerRadius: 12))
            }
            .disabled(purchasing != nil)
        }
        .padding()
        .background(plan.highlight ? Color.brand.opacity(0.08) : Color.cardBackground)
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(plan.highlight ? Color.brand : .clear, lineWidth: 1.5))
        .clipShape(.rect(cornerRadius: 18))
    }

    private func purchase(productId: String) async {
        purchasing = productId
        defer { purchasing = nil }
        do {
            let products = try await Purchases.shared.products([productId])
            guard let product = products.first(where: { $0.productIdentifier == productId }) else {
                throw NSError(domain: "Plans", code: 1, userInfo: [NSLocalizedDescriptionKey: "Product missing in App Store Connect"])
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
    let highlight: Bool
    let features: [String]
}
