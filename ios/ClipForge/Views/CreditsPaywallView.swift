import SwiftUI
import RevenueCat

/// One-time credit top-up sheet. Plus members see the +10 / +20 packs at their
/// localized App Store price; free users see a Plus upsell.
struct CreditsPaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var rc = RevenueCatService.shared
    @StateObject private var credits = CreditsService.shared
    @State private var purchasing: String?
    @State private var restoring = false
    @State private var error: String?
    @State private var showPlans = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    header

                    if let error {
                        Text(error)
                            .font(.callout)
                            .foregroundStyle(.red)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 12))
                    }

                    if credits.hasPlus {
                        plusContent
                    } else {
                        nonPlusUpsell
                    }

                    legalFooter
                }
                .padding()
            }
            .navigationTitle(credits.hasPlus ? "Top up credits" : "Get more credits")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                if credits.hasPlus {
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
            }
            .sheet(isPresented: $showPlans) { PlansView() }
            .background(Color.appBackground.ignoresSafeArea())
            .task {
                if rc.offerings == nil { await rc.refreshOfferings() }
                await credits.refresh()
            }
        }
    }

    // MARK: - Sections

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Balance")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline) {
                Text("\(credits.balance)")
                    .font(.system(size: 56, weight: .bold))
                    .minimumScaleFactor(0.6)
                Text("credits")
                    .font(.title3)
                    .foregroundStyle(.secondary)
            }
            Text("1 credit ≈ 1 video → up to 10 clips")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
    }

    private var plusContent: some View {
        VStack(spacing: 12) {
            ForEach(CreditsService.creditPacks) { pack in
                packCard(pack)
            }
            HStack(spacing: 8) {
                Image(systemName: "shield.checkered")
                    .foregroundStyle(.brand)
                Text("Credits never expire. Refund-safe consumable.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding()
            .background(Color.cardBackground)
            .clipShape(.rect(cornerRadius: 14))
        }
    }

    private var nonPlusUpsell: some View {
        VStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                Label("Plus members only", systemImage: "lock.fill")
                    .font(.headline)
                    .foregroundStyle(.brand)
                Text("Credit packs are an exclusive perk for Plus subscribers. Start at $4.99/week and you can top up anytime.")
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color.brand.opacity(0.08))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.brand, lineWidth: 1))
            .clipShape(.rect(cornerRadius: 14))

            Button {
                Task { await Haptics.impact(.medium) }
                showPlans = true
            } label: {
                HStack {
                    Image(systemName: "sparkles")
                    Text("See Plus pricing").fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right")
                }
                .padding()
                .background(Color.brand)
                .foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 14))
            }

            VStack(alignment: .leading, spacing: 8) {
                Text("What's in Plus?")
                    .font(.headline)
                ForEach([
                    "Plus weekly — 10 credits",
                    "Plus monthly — 40 credits (save 25%)",
                    "All AI tools, no watermark",
                    "Buy +10 / +20 credit packs any time",
                ], id: \.self) { line in
                    HStack(alignment: .top, spacing: 6) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.brand)
                            .font(.caption)
                            .padding(.top, 3)
                        Text(line).font(.callout)
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color.cardBackground)
            .clipShape(.rect(cornerRadius: 14))
        }
    }

    private func packCard(_ pack: CreditPack) -> some View {
        let pkg = rc.package(productId: pack.id)
        let displayPrice = pkg?.storeProduct.localizedPriceString ?? pack.price
        let pricePerCredit = pkg.map { p in
            (p.storeProduct.price as NSDecimalNumber).doubleValue / Double(pack.credits)
        }

        return Button {
            Task { await performPurchase(pack) }
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("+\(pack.credits)")
                            .font(.title.bold())
                        Text("credits")
                            .foregroundStyle(.secondary)
                    }
                    if pack.popular {
                        Text("Best value")
                            .font(.caption.bold())
                            .foregroundStyle(.brand)
                    } else if let pricePerCredit {
                        Text(String(format: "%.2f / credit", pricePerCredit))
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text(displayPrice)
                        .font(.title3.bold())
                    if purchasing == pack.id {
                        ProgressView().controlSize(.small)
                    }
                }
            }
            .padding()
            .background(pack.popular ? Color.brand.opacity(0.1) : Color.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(pack.popular ? Color.brand : Color.clear, lineWidth: 1.5)
            )
            .clipShape(.rect(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .disabled(purchasing != nil || pkg == nil)
    }

    /// Apple-mandated disclosure for paid IAP. Consumables don't auto-renew so
    /// the language is gentler — we still link ToS + Privacy.
    private var legalFooter: some View {
        VStack(spacing: 8) {
            Text("One-time purchase. Credits never expire. Payment is charged to your Apple ID account.")
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
        .frame(maxWidth: .infinity)
    }

    // MARK: - Actions

    private func performPurchase(_ pack: CreditPack) async {
        await Haptics.impact(.medium)
        purchasing = pack.id
        defer { purchasing = nil }
        do {
            try await credits.purchase(pack: pack)
            await Haptics.notify(.success)
            dismiss()
        } catch CreditsError.cancelled {
            // user just closed Apple sheet — no toast
        } catch CreditsError.requiresPlus {
            await Haptics.notify(.warning)
            showPlans = true
        } catch let e {
            error = e.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func performRestore() async {
        restoring = true
        error = nil
        defer { restoring = false }
        do {
            _ = try await rc.restore()
            await credits.refresh()
            await Haptics.notify(.success)
        } catch let e {
            error = e.localizedDescription
            await Haptics.notify(.error)
        }
    }
}
