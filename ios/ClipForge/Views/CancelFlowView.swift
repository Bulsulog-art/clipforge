import SwiftUI
import RevenueCat
import StoreKit

/// Soft cancel flow: shows the $12.99/mo win-back promotional offer before
/// sending the user to Apple's subscription management screen.
@MainActor
struct CancelFlowView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var rc = RevenueCatService.shared
    @State private var redeeming = false
    @State private var error: String?
    @State private var redeemed = false

    /// Localized price of the discounted offer, if available.
    private var offerPriceString: String? {
        guard let pkg = rc.package(productId: "clipforge_plus_monthly"),
              let promo = pkg.storeProduct.discounts.first(where: {
                  $0.offerIdentifier == "plus_retention_1299"
              }) ?? pkg.storeProduct.discounts.first else { return nil }
        return promo.localizedPriceString
    }

    private var fullPriceString: String? {
        rc.package(productId: "clipforge_plus_monthly")?.storeProduct.localizedPriceString
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    headerHero
                    currentPlanBlock
                    offerBlock
                    primaryButton
                    secondaryButton
                    legalFooter
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
            .navigationTitle("Manage Plus")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .background(Color.appBackground.ignoresSafeArea())
            .task {
                if rc.offerings == nil { await rc.refreshOfferings() }
            }
        }
    }

    // MARK: - Sections

    private var headerHero: some View {
        VStack(spacing: 8) {
            Image(systemName: "heart.fill")
                .font(.system(size: 50))
                .foregroundStyle(.brand)
                .padding(.top, 10)
            Text("Wait — keep going for less")
                .font(.title.bold())
                .multilineTextAlignment(.center)
                .minimumScaleFactor(0.85)
            Text(persuasionCopy)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
        }
    }

    private var persuasionCopy: String {
        if let offerPriceString, let fullPriceString {
            return "We don't want to lose you. Stay on Plus for \(offerPriceString)/month instead of \(fullPriceString)."
        }
        return "We don't want to lose you. Stay on Plus at a discounted rate for the next 3 months."
    }

    @ViewBuilder
    private var currentPlanBlock: some View {
        if let renews = rc.plusRenewsAt {
            HStack(spacing: 10) {
                Image(systemName: "calendar")
                    .foregroundStyle(.secondary)
                Text("Your plan currently renews \(renews.formatted(date: .abbreviated, time: .omitted)).")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Spacer()
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(.rect(cornerRadius: 12))
        }
    }

    private var offerBlock: some View {
        VStack(spacing: 10) {
            offerCard(
                price: offerPriceString ?? "$12.99",
                label: "per month for 3 months",
                highlight: true
            )
            Text("Then renews at \(fullPriceString ?? "$14.99") unless you cancel.")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 16))
    }

    private var primaryButton: some View {
        Button {
            Task { await redeem() }
        } label: {
            HStack {
                if redeeming { ProgressView().tint(.white) }
                Text(redeemed ? "Offer applied ✓" : "Keep Plus for \(offerPriceString ?? "$12.99")")
                    .fontWeight(.semibold)
                    .minimumScaleFactor(0.9)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(redeemed ? Color.green : Color.brand)
            .foregroundStyle(.white)
            .clipShape(.capsule)
        }
        .disabled(redeeming || redeemed)
    }

    private var secondaryButton: some View {
        Button("No thanks, continue to cancel") {
            Task { await openManageSubscriptions() }
        }
        .font(.caption)
        .foregroundStyle(.secondary)
    }

    private func offerCard(price: String, label: String, highlight: Bool) -> some View {
        VStack(spacing: 4) {
            Text(price)
                .font(.system(size: 48, weight: .bold))
                .minimumScaleFactor(0.7)
            Text(label).font(.callout).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding()
        .background(highlight ? Color.brand.opacity(0.12) : Color.cardBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(highlight ? Color.brand : Color.clear, lineWidth: 1.5)
        )
        .clipShape(.rect(cornerRadius: 12))
    }

    /// Apple-mandated disclosure for subscription paywalls.
    private var legalFooter: some View {
        VStack(spacing: 8) {
            Text("Discounted subscription auto-renews monthly. Cancel any time in Settings → Apple ID → Subscriptions, at least 24 hours before the period ends. Payment is charged to your Apple ID account.")
                .font(.caption2)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            HStack(spacing: 14) {
                Link("Terms",
                     destination: URL(string: "https://clipforge.bulsulabs.xyz/legal/terms") ?? URL(string: "https://clipforge.bulsulabs.xyz")!)
                Text("·").foregroundStyle(.tertiary)
                Link("Privacy",
                     destination: URL(string: "https://clipforge.bulsulabs.xyz/legal/privacy") ?? URL(string: "https://clipforge.bulsulabs.xyz")!)
            }
            .font(.caption2.weight(.semibold))
        }
        .padding(.top, 4)
    }

    // MARK: - Actions

    /// Redeem the App Store Connect promotional offer attached to
    /// `clipforge_plus_monthly`. Surfaces specific error states (no offer
    /// configured, not eligible, network) so we don't show a useless toast.
    private func redeem() async {
        await Haptics.impact(.medium)
        redeeming = true
        error = nil
        defer { redeeming = false }
        do {
            try await rc.redeemRetentionOffer()
            redeemed = true
            // Show the success state briefly, then close.
            try? await Task.sleep(nanoseconds: 1_400_000_000)
            dismiss()
        } catch let e as PaywallError {
            error = e.errorDescription
            await Haptics.notify(.error)
        } catch let e {
            error = e.localizedDescription
            await Haptics.notify(.error)
        }
    }

    /// Opens Apple's native subscription-management sheet so the user can
    /// actually cancel if they decline the offer.
    private func openManageSubscriptions() async {
        if let windowScene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
            do {
                try await AppStore.showManageSubscriptions(in: windowScene)
            } catch {
                AppState.shared.flashError("Couldn't open subscription settings: \(error.localizedDescription)")
            }
        }
        dismiss()
    }
}
