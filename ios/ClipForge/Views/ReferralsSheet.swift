import SwiftUI

/// Referrals screen — shows the user's invite code, lets them share it,
/// and accepts a friend's code in a small editor. Both actions grant +5
/// credits to each party (capped at 20 redemptions per inviter).
@MainActor
struct ReferralsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var info: ClipForgeAPI.ReferralInfo?
    @State private var loading = true
    @State private var loadError: String?

    @State private var redeemCode: String = ""
    @State private var redeeming = false
    @State private var redeemError: String?
    @State private var redeemSuccess = false

    /// Promo-code editor state — separate from referral redeem so a
    /// failed redeem on one doesn't blank the other.
    @State private var promoCode: String = ""
    @State private var promoBusy = false
    @State private var promoError: String?
    @State private var promoCreditsGranted: Int = 0

    @State private var showShareSheet = false
    @State private var shareItems: [Any] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    headerCard
                    if let info {
                        codeCard(info)
                        redeemCard
                        promoCard
                    } else if loading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 30)
                    } else if let err = loadError {
                        Text(err)
                            .font(.callout)
                            .foregroundStyle(.red)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 12))
                    }
                    footnote
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Invite friends")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { await load() }
            .sheet(isPresented: $showShareSheet) {
                if !shareItems.isEmpty {
                    ShareSheet(items: shareItems)
                }
            }
        }
    }

    // MARK: - Sections

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Refer a friend, get 5 credits", systemImage: "gift.fill")
                .font(.caption.weight(.bold))
                .foregroundStyle(.brand)
            Text("You both get 5 credits when they redeem your code on signup.")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func codeCard(_ info: ClipForgeAPI.ReferralInfo) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("YOUR CODE")
                .font(.caption2.weight(.bold))
                .tracking(1.2)
                .foregroundStyle(.secondary)
            HStack {
                Text(info.code)
                    .font(.system(.title, design: .monospaced).weight(.heavy))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                    .background(
                        LinearGradient(
                            colors: [.brand, .brandGlow],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(.rect(cornerRadius: 14))
                Spacer()
                Button {
                    UIPasteboard.general.string = info.code
                    Task { await Haptics.notify(.success) }
                } label: {
                    Label("Copy", systemImage: "doc.on.doc")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.cardBackground)
                        .foregroundStyle(.primary)
                        .clipShape(.capsule)
                        .overlay(Capsule().stroke(Color.secondary.opacity(0.3), lineWidth: 0.8))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Copy referral code")
            }

            Button {
                Task { await Haptics.impact(.medium) }
                shareItems = [shareMessage(for: info.code)]
                showShareSheet = true
            } label: {
                HStack {
                    Image(systemName: "square.and.arrow.up")
                    Text("Share with friends")
                        .fontWeight(.semibold)
                    Spacer()
                    Image(systemName: "chevron.right")
                        .font(.caption)
                        .opacity(0.7)
                }
                .padding()
                .background(Color.brand)
                .foregroundStyle(.white)
                .clipShape(.rect(cornerRadius: 12))
            }
            .buttonStyle(.plain)

            HStack(spacing: 12) {
                statBubble(value: "\(info.invitedCount)", label: "Invited")
                statBubble(value: "\(info.invitedCount * info.creditsPerRedemption)", label: "Credits earned")
                statBubble(value: "\(info.inviteCap)", label: "Cap")
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 16))
    }

    private func statBubble(value: String, label: String) -> some View {
        VStack(spacing: 2) {
            Text(value)
                .font(.callout.weight(.bold))
                .monospacedDigit()
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color.appBackground)
        .clipShape(.rect(cornerRadius: 10))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value)")
    }

    private var redeemCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Got a friend's code?")
                .font(.callout.weight(.semibold))
            HStack {
                TextField("Paste code", text: $redeemCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.cardBackground)
                    .clipShape(.rect(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
                Button {
                    Task { await redeem() }
                } label: {
                    HStack {
                        if redeeming { ProgressView().tint(.white) }
                        Text(redeeming ? "Applying…" : "Redeem")
                            .fontWeight(.semibold)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(canRedeem ? Color.brand : Color.gray.opacity(0.5))
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
                }
                .buttonStyle(.plain)
                .disabled(!canRedeem)
            }
            if let err = redeemError {
                Text(err)
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
            if redeemSuccess {
                Label("+5 credits added to your balance", systemImage: "checkmark.seal.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.green)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground.opacity(0.55))
        .clipShape(.rect(cornerRadius: 14))
    }

    private var canRedeem: Bool {
        !redeeming && redeemCode.trimmingCharacters(in: .whitespacesAndNewlines).count >= 4
    }

    /// Promo codes are admin-issued (PR campaigns, partner deals, support
    /// recovery). Separate field from referral so a user can redeem one
    /// of each.
    private var promoCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Got a promo code?")
                .font(.callout.weight(.semibold))
            HStack {
                TextField("Paste promo code", text: $promoCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.cardBackground)
                    .clipShape(.rect(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .stroke(Color.white.opacity(0.08), lineWidth: 1)
                    )
                Button {
                    Task { await redeemPromo() }
                } label: {
                    HStack {
                        if promoBusy { ProgressView().tint(.white) }
                        Text(promoBusy ? "Applying…" : "Redeem")
                            .fontWeight(.semibold)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(canRedeemPromo ? Color.purple : Color.gray.opacity(0.5))
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
                }
                .buttonStyle(.plain)
                .disabled(!canRedeemPromo)
            }
            if let err = promoError {
                Text(err).font(.caption2).foregroundStyle(.red)
            }
            if promoCreditsGranted > 0 {
                Label("+\(promoCreditsGranted) credits added to your balance",
                      systemImage: "checkmark.seal.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.green)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground.opacity(0.55))
        .clipShape(.rect(cornerRadius: 14))
    }

    private var canRedeemPromo: Bool {
        !promoBusy && promoCode.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3
    }

    private func redeemPromo() async {
        let code = promoCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
        guard !code.isEmpty else { return }
        promoBusy = true
        promoError = nil
        defer { promoBusy = false }
        do {
            let granted = try await ClipForgeAPI.shared.redeemPromoCode(code)
            promoCreditsGranted = granted
            promoCode = ""
            await Haptics.notify(.success)
            await CreditsService.shared.refresh()
        } catch {
            promoError = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private var footnote: some View {
        Text("Each user can redeem one referral code. Inviters max out at 20 redemptions (100 credits). Self-referrals don't count.")
            .font(.caption2)
            .foregroundStyle(.tertiary)
    }

    // MARK: - Behaviour

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            info = try await ClipForgeAPI.shared.fetchReferralInfo()
            loadError = nil
        } catch {
            loadError = error.localizedDescription
        }
    }

    private func redeem() async {
        let code = redeemCode
            .trimmingCharacters(in: .whitespacesAndNewlines)
            .uppercased()
        guard !code.isEmpty else { return }
        redeeming = true
        redeemError = nil
        defer { redeeming = false }
        do {
            try await ClipForgeAPI.shared.applyReferralCode(code)
            redeemSuccess = true
            redeemCode = ""
            await Haptics.notify(.success)
            await CreditsService.shared.refresh()
            // Refresh stats to show the redemption (server reports the inviter
            // side; this won't change the invitee's screen but keeps state fresh)
            await load()
        } catch {
            redeemError = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func shareMessage(for code: String) -> String {
        "Cut a viral clip in 60 seconds with ClipForge — use my code \(code) on signup and we both get 5 free credits.\n\nhttps://clipforge.bulsulabs.xyz"
    }
}
