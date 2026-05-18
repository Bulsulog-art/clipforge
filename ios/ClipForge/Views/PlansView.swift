import SwiftUI
import RevenueCat

/// Subscription paywall. Uses RevenueCat offerings as the source of truth so
/// prices localize automatically (₺499 in TR, €13.99 in EU, etc.) and
/// promotional intro pricing surfaces if configured.
@MainActor
struct PlansView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var rc = RevenueCatService.shared
    @StateObject private var credits = CreditsService.shared

    @State private var billing: BillingPeriod = .monthly
    @State private var purchasing: String?
    @State private var restoring = false
    @State private var restoreMessage: String?
    @State private var error: String?

    enum BillingPeriod: String, CaseIterable { case weekly, monthly }

    private static let weeklyId = "clipforge_plus_weekly"
    private static let monthlyId = "clipforge_plus_monthly"

    private let features = [
        "No watermark",
        "Animated word-by-word captions",
        "AI Face Swap (2 cr)",
        "AI Translation 15+ languages (2 cr)",
        "Voice clone (5 cr)",
        "AI Avatar — talking head from script (5 cr)",
        "Auto-post to TikTok, Reels, Shorts, X",
        "AI-enhanced thumbnails",
        "Buy extra credit packs anytime",
        "Cancel anytime",
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerCard
                    if rc.hasPlus { currentPlanCard }
                    billingPicker
                    planContent
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
                    legalFooter
                    if let error {
                        Text(error)
                            .font(.callout)
                            .foregroundStyle(.red)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 12))
                    }
                    if let restoreMessage {
                        Text(restoreMessage)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
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
                    Button {
                        Task { await performRestore() }
                    } label: {
                        if restoring {
                            ProgressView().controlSize(.small)
                        } else {
                            Text("Restore").font(.caption)
                        }
                    }
                    .disabled(restoring)
                }
            }
            .background(Color.appBackground.ignoresSafeArea())
            .task {
                if rc.offerings == nil { await rc.refreshOfferings() }
                await credits.refresh()
            }
        }
    }

    // MARK: - Sections

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Unlock everything")
                .font(.largeTitle.bold())
                .minimumScaleFactor(0.8)
            Text("All AI tools. No watermark. Cancel anytime.")
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var currentPlanCard: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.seal.fill")
                .foregroundStyle(.green)
            VStack(alignment: .leading, spacing: 2) {
                Text("You're on Plus")
                    .font(.callout.bold())
                if let renews = rc.plusRenewsAt {
                    Text("Renews \(renews.formatted(date: .abbreviated, time: .omitted))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer()
        }
        .padding()
        .background(Color.green.opacity(0.12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.green.opacity(0.4), lineWidth: 1))
        .clipShape(.rect(cornerRadius: 12))
    }

    private var billingPicker: some View {
        Picker("Billing period", selection: $billing) {
            Text("Weekly").tag(BillingPeriod.weekly)
            Text("Monthly · Save 25%").tag(BillingPeriod.monthly)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)
        .onChange(of: billing) { _, _ in Task { await Haptics.impact(.light) } }
    }

    @ViewBuilder
    private var planContent: some View {
        if rc.loadingOfferings && rc.offerings == nil {
            ProgressView("Loading pricing…")
                .frame(maxWidth: .infinity, minHeight: 180)
                .padding()
                .background(Color.cardBackground)
                .clipShape(.rect(cornerRadius: 18))
        } else if let offerings = rc.offerings {
            planCard(offerings: offerings)
        } else {
            offeringsFailedCard
        }
    }

    private var offeringsFailedCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 36))
                .foregroundStyle(.orange)
            Text("Couldn't load pricing")
                .font(.headline)
            if let err = rc.offeringsError {
                Text(err)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }
            Button("Retry") {
                Task { await rc.refreshOfferings() }
            }
            .buttonStyle(.borderedProminent)
            .tint(.brand)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 18))
    }

    private func planCard(offerings: Offerings) -> some View {
        let productId = billing == .weekly ? Self.weeklyId : Self.monthlyId
        let pkg = rc.package(productId: productId)
        let activeProduct = rc.activeProductId

        return VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .firstTextBaseline) {
                Text("Plus").font(.title.bold())
                if activeProduct == productId {
                    Text("CURRENT")
                        .font(.caption2.bold())
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.green)
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                }
                Spacer()
                if let pkg {
                    HStack(alignment: .firstTextBaseline, spacing: 2) {
                        Text(pkg.storeProduct.localizedPriceString)
                            .font(.title.bold())
                        Text(billing == .weekly ? "/wk" : "/mo")
                            .foregroundStyle(.secondary)
                    }
                } else {
                    Text("—").font(.title.bold()).foregroundStyle(.tertiary)
                }
            }

            if let pkg, let intro = pkg.storeProduct.introductoryDiscount {
                introBadge(intro)
            }

            Text(billing == .weekly ? "10 credits / week" : "40 credits / month")
                .foregroundStyle(.brand)
                .font(.callout.bold())

            VStack(alignment: .leading, spacing: 6) {
                ForEach(features, id: \.self) { f in
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
                Task { await performPurchase(productId: productId) }
            } label: {
                HStack {
                    Spacer()
                    if purchasing == productId { ProgressView().tint(.white) }
                    Text(buttonLabel(productId: productId))
                        .fontWeight(.semibold)
                    Spacer()
                }
                .padding()
                .background(activeProduct == productId ? Color.gray.opacity(0.5) : Color.brand)
                .foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 12))
            }
            .disabled(purchasing != nil || pkg == nil || activeProduct == productId)
        }
        .padding()
        .background(Color.brand.opacity(0.08))
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(Color.brand, lineWidth: 1.5))
        .clipShape(.rect(cornerRadius: 18))
    }

    private func buttonLabel(productId: String) -> String {
        if purchasing == productId { return "Processing…" }
        if rc.activeProductId == productId { return "Current plan" }
        if let pkg = rc.package(productId: productId),
           pkg.storeProduct.introductoryDiscount != nil {
            return "Start free trial"
        }
        return "Subscribe"
    }

    private func introBadge(_ intro: StoreProductDiscount) -> some View {
        HStack(spacing: 6) {
            Image(systemName: "gift.fill").foregroundStyle(.green)
            Text(introCopy(intro))
                .font(.caption.weight(.semibold))
                .foregroundStyle(.green)
        }
    }

    private func introCopy(_ intro: StoreProductDiscount) -> String {
        let period = intro.subscriptionPeriod
        let unit = unitWord(period.unit, count: period.value)
        switch intro.paymentMode {
        case .freeTrial:
            return "\(period.value) \(unit) free trial"
        case .payAsYouGo, .payUpFront:
            return "\(intro.localizedPriceString) for \(period.value) \(unit)"
        }
    }

    private func unitWord(_ unit: SubscriptionPeriod.Unit, count: Int) -> String {
        let base: String
        switch unit {
        case .day: base = "day"
        case .week: base = "week"
        case .month: base = "month"
        case .year: base = "year"
        }
        return count == 1 ? base : "\(base)s"
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

    /// Apple-mandated subscription disclosure + ToS / Privacy links.
    /// App Store reviewers explicitly check for this in subscription paywalls.
    private var legalFooter: some View {
        VStack(spacing: 8) {
            Text("Subscription auto-renews. Cancel any time in Settings → Apple ID → Subscriptions, at least 24 hours before the period ends. Payment is charged to your Apple ID account.")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            HStack(spacing: 14) {
                Link("Terms of Service",
                     destination: URL(string: "https://clipforge.bulsulabs.xyz/legal/terms") ?? URL(string: "https://clipforge.bulsulabs.xyz")!)
                Text("·").foregroundStyle(.tertiary)
                Link("Privacy Policy",
                     destination: URL(string: "https://clipforge.bulsulabs.xyz/legal/privacy") ?? URL(string: "https://clipforge.bulsulabs.xyz")!)
            }
            .font(.caption2.weight(.semibold))
        }
        .padding(.top, 4)
    }

    // MARK: - Actions

    private func performPurchase(productId: String) async {
        guard let pkg = rc.package(productId: productId) else {
            error = PaywallError.missingProduct(productId).errorDescription
            await Haptics.notify(.error)
            return
        }
        await Haptics.impact(.medium)
        purchasing = productId
        defer { purchasing = nil }
        do {
            let didPurchase = try await rc.purchase(pkg)
            if didPurchase {
                await credits.refresh()
                dismiss()
            }
        } catch {
            self.error = (error as NSError).localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func performRestore() async {
        restoring = true
        restoreMessage = nil
        error = nil
        defer { restoring = false }
        do {
            let info = try await rc.restore()
            await credits.refresh()
            if info.entitlements.active.isEmpty {
                restoreMessage = "No active purchases found on this Apple ID."
                await Haptics.notify(.warning)
            } else {
                restoreMessage = "Purchases restored ✓"
                await Haptics.notify(.success)
                try? await Task.sleep(nanoseconds: 1_200_000_000)
                dismiss()
            }
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }
}
