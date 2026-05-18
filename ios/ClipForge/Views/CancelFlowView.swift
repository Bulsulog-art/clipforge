import SwiftUI
import RevenueCat
import StoreKit

/// Soft cancel flow: shows the $12.99/mo win-back promotional offer before
/// sending the user to Apple's subscription management screen.
@MainActor
struct CancelFlowView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var redeeming = false
    @State private var error: String?
    @State private var redeemed = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(spacing: 8) {
                        Image(systemName: "heart.fill")
                            .font(.system(size: 50))
                            .foregroundStyle(.brand)
                            .padding(.top, 10)
                        Text("Wait — keep going for less")
                            .font(.title.bold())
                            .multilineTextAlignment(.center)
                        Text("We don't want to lose you. Stay on Plus for $12.99/mo instead of $14.99.")
                            .multilineTextAlignment(.center)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal)
                    }

                    VStack(spacing: 10) {
                        offerCard(
                            price: "$12.99",
                            label: "per month for 3 months",
                            highlight: true
                        )
                        Text("Then renews at $14.99 unless you cancel.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    .background(Color.cardBackground)
                    .clipShape(.rect(cornerRadius: 16))

                    Button {
                        Task { await redeem() }
                    } label: {
                        HStack {
                            if redeeming { ProgressView().tint(.white) }
                            Text(redeemed ? "Offer applied ✓" : "Keep Plus for $12.99")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(redeemed ? Color.green : Color.brand)
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                    }
                    .disabled(redeeming || redeemed)

                    Button("No thanks, continue to cancel") {
                        openManageSubscriptions()
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)

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
            .navigationTitle("Cancel")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .background(Color.appBackground.ignoresSafeArea())
        }
    }

    private func offerCard(price: String, label: String, highlight: Bool) -> some View {
        VStack(spacing: 4) {
            Text(price).font(.system(size: 48, weight: .bold))
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

    /// Redeems the promotional offer "plus_retention_1299" created in App Store Connect.
    /// Requires that the offer is configured for `clipforge_plus_monthly` and the user
    /// is eligible (existing subscriber).
    private func redeem() async {
        redeeming = true
        defer { redeeming = false }
        do {
            let offerings = try await Purchases.shared.offerings()
            guard
                let monthly = offerings.current?.monthly
                    ?? offerings.current?.availablePackages.first(where: {
                        $0.storeProduct.productIdentifier == "clipforge_plus_monthly"
                    })
            else {
                throw NSError(
                    domain: "Cancel",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Monthly package not found"]
                )
            }

            let product = monthly.storeProduct
            // Pick the promotional offer with id "plus_retention_1299"
            let promo = product.discounts.first(where: { $0.offerIdentifier == "plus_retention_1299" })
                ?? product.discounts.first

            guard let promo else {
                throw NSError(
                    domain: "Cancel",
                    code: 2,
                    userInfo: [NSLocalizedDescriptionKey:
                        "No promotional offer configured. Add 'plus_retention_1299' on App Store Connect."]
                )
            }

            let signedOffer = try await Purchases.shared.getPromotionalOffer(
                forProductDiscount: promo,
                product: product
            )
            _ = try await Purchases.shared.purchase(package: monthly, promotionalOffer: signedOffer)
            redeemed = true
            // small delay so the user sees the success then we close
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            dismiss()
        } catch {
            self.error = (error as NSError).localizedDescription
        }
    }

    private func openManageSubscriptions() {
        Task { @MainActor in
            // iOS 15+ system sheet
            if let windowScene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene {
                try? await AppStore.showManageSubscriptions(in: windowScene)
            }
            dismiss()
        }
    }
}
