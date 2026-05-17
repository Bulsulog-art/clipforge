import SwiftUI

struct CreditsPaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @State private var purchasing: String?
    @State private var error: String?

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

                    VStack(spacing: 12) {
                        ForEach(CreditsService.creditPacks) { pack in
                            packCard(pack)
                        }
                    }

                    HStack(spacing: 8) {
                        Image(systemName: "shield.checkered")
                            .foregroundStyle(.brand)
                        Text("Credits never expire. No subscription. Refund-safe.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    .background(Color.cardBackground)
                    .clipShape(.rect(cornerRadius: 14))

                    Text("Or get a monthly plan with auto-refilled credits — see Settings → Plans.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .frame(maxWidth: .infinity)
                }
                .padding()
            }
            .navigationTitle("Buy credits")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
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

    private func packCard(_ pack: CreditPack) -> some View {
        Button {
            Task { await purchase(pack) }
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 8) {
                        Text("\(pack.credits)")
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
        } catch let e {
            error = e.localizedDescription
        }
    }
}
