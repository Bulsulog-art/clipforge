import SwiftUI

struct CreditsPaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @State private var purchasing: String?
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
                }
                .padding()
            }
            .navigationTitle(credits.hasPlus ? "Top up credits" : "Get more credits")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .sheet(isPresented: $showPlans) { PlansView() }
            .background(Color.appBackground.ignoresSafeArea())
            .task { await credits.refresh() }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Balance")
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack(alignment: .firstTextBaseline) {
                Text("\(credits.balance)")
                    .font(.system(size: 56, weight: .bold))
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
                    "Plus weekly — $4.99 → 10 credits",
                    "Plus monthly — $14.99 → 40 credits (save 25%)",
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
        Button {
            Task { await purchase(pack) }
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
                    }
                }
                Spacer()
                VStack(spacing: 4) {
                    Text(pack.price)
                        .font(.title3.bold())
                    if purchasing == pack.id {
                        ProgressView().scaleEffect(0.8)
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
        .disabled(purchasing != nil)
    }

    private func purchase(_ pack: CreditPack) async {
        purchasing = pack.id
        defer { purchasing = nil }
        do {
            try await credits.purchase(pack: pack)
            dismiss()
        } catch CreditsError.cancelled {
            // ignore
        } catch CreditsError.requiresPlus {
            showPlans = true
        } catch let e {
            error = e.localizedDescription
        }
    }
}
