import SwiftUI

/// Channels tab — connect TikTok / Instagram / YouTube via OAuth and
/// configure auto-publish for new clips.
///
/// Backend (`/api/auth/<platform>` + `/api/channels` + `/api/clips/:id/publish`)
/// is fully wired. This view is purely a polished face for that pipeline.
struct ChannelsView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var svc = ChannelsService.shared
    @StateObject private var credits = CreditsService.shared
    @State private var channelToDisconnect: ClipForgeAPI.Channel?
    @State private var animateGradient = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    heroHeader
                    if !credits.hasPlus { plusUpsellCard }
                    ForEach(ChannelsService.Platform.allCases) { platform in
                        channelCard(for: platform)
                    }
                    legalFooter
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Channels")
            .refreshable { await svc.refresh() }
            .task { await svc.refresh() }
            .onAppear {
                // Respect Reduce Motion — hold the hero gradient at its
                // starting palette rather than the 6s perpetual sweep.
                guard !reduceMotion else { return }
                withAnimation(.easeInOut(duration: 6).repeatForever(autoreverses: true)) {
                    animateGradient.toggle()
                }
            }
            .alert(
                "Disconnect \(channelToDisconnect?.platform.capitalized ?? "channel")?",
                isPresented: Binding(
                    get: { channelToDisconnect != nil },
                    set: { if !$0 { channelToDisconnect = nil } }
                )
            ) {
                Button("Cancel", role: .cancel) {}
                Button("Disconnect", role: .destructive) {
                    if let ch = channelToDisconnect {
                        Task { await svc.disconnect(ch); channelToDisconnect = nil }
                    }
                }
            } message: {
                Text("ClipForge will stop publishing to this account. You can reconnect any time.")
            }
        }
    }

    // MARK: - Hero header

    private var heroHeader: some View {
        let count = svc.connectedPlatforms.count
        return VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "antenna.radiowaves.left.and.right")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.white)
                Text("Distribution")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.white.opacity(0.9))
                    .textCase(.uppercase)
                    .tracking(1.2)
            }
            Text(count == 0 ? "Plug ClipForge into your channels."
                             : "You're publishing to \(count) channel\(count == 1 ? "" : "s").")
                .font(.title2.bold())
                .foregroundStyle(.white)
                .multilineTextAlignment(.leading)
            Text(count == 0
                 ? "Connect TikTok, Instagram and YouTube to auto-post every clip the moment a render finishes — no manual upload."
                 : "Every ready clip can be one-tap published from the Clips feed.")
                .font(.callout)
                .foregroundStyle(.white.opacity(0.82))
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            ZStack {
                LinearGradient(
                    colors: animateGradient
                        ? [Color.brand.opacity(0.85), .purple.opacity(0.75), Color.brandGlow.opacity(0.85)]
                        : [Color.brandGlow.opacity(0.85), Color.brand.opacity(0.75), .purple.opacity(0.85)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                LinearGradient(
                    colors: [.black.opacity(0.0), .black.opacity(0.25)],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        )
        .clipShape(.rect(cornerRadius: 18))
        .shadow(color: .brand.opacity(0.35), radius: 14, y: 6)
    }

    private var plusUpsellCard: some View {
        HStack(spacing: 10) {
            Image(systemName: "lock.fill")
                .foregroundStyle(.brand)
            VStack(alignment: .leading, spacing: 2) {
                Text("Auto-publish is a Plus perk.")
                    .font(.callout.weight(.semibold))
                Text("Connect channels anyway — you'll be prompted to upgrade when you post.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 4)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .background(Color.brand.opacity(0.1))
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.brand.opacity(0.4), lineWidth: 1))
        .clipShape(.rect(cornerRadius: 14))
    }

    // MARK: - Channel card

    private func channelCard(for platform: ChannelsService.Platform) -> some View {
        let connected = svc.account(for: platform)
        let isConnecting = svc.connecting == platform
        let needsReconnect = connected?.needsReconnect ?? false
        let accent = Color(red: platform.accent.red, green: platform.accent.green, blue: platform.accent.blue)

        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(accent.opacity(0.18))
                        .frame(width: 44, height: 44)
                    Image(systemName: platform.sfSymbol)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(accent)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(platform.displayName)
                        .font(.callout.weight(.semibold))
                    if let acct = connected {
                        HStack(spacing: 4) {
                            Image(systemName: needsReconnect ? "exclamationmark.circle.fill" : "checkmark.circle.fill")
                                .font(.caption2)
                                .foregroundStyle(needsReconnect ? .orange : .green)
                            Text(needsReconnect ? "Token expiring — reconnect" :
                                 (acct.username.map { "@\($0)" } ?? "Connected"))
                                .font(.caption)
                                .foregroundStyle(needsReconnect ? .orange : .secondary)
                                .lineLimit(1)
                        }
                    } else {
                        Text("Not connected")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                Spacer(minLength: 4)
            }

            Text(platform.marketingTagline)
                .font(.footnote)
                .foregroundStyle(.secondary)

            HStack(spacing: 10) {
                if let acct = connected {
                    Button {
                        channelToDisconnect = acct
                    } label: {
                        Text("Disconnect")
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(Color.cardBackground)
                            .clipShape(.capsule)
                            .overlay(Capsule().stroke(Color.secondary.opacity(0.35), lineWidth: 0.8))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Disconnect \(platform.displayName)")
                    .accessibilityHint("Removes the authorization token so we can no longer post on your behalf")

                    if needsReconnect {
                        Button {
                            Task { await svc.connect(platform) }
                        } label: {
                            Label("Reconnect", systemImage: "arrow.clockwise")
                                .font(.caption.weight(.semibold))
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(accent)
                                .foregroundStyle(.white)
                                .clipShape(.capsule)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel("Reconnect \(platform.displayName)")
                    }
                    Spacer()
                } else {
                    Button {
                        Task { await svc.connect(platform) }
                    } label: {
                        HStack(spacing: 6) {
                            if isConnecting {
                                ProgressView().controlSize(.small).tint(.white)
                            } else {
                                Image(systemName: "link.badge.plus")
                            }
                            Text(isConnecting ? "Connecting…" : "Connect")
                                .fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .background(
                            LinearGradient(
                                colors: [accent, accent.opacity(0.75)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                    }
                    .buttonStyle(.plain)
                    .disabled(isConnecting)
                    .accessibilityLabel(isConnecting ? "Connecting to \(platform.displayName)" : "Connect \(platform.displayName)")
                    .accessibilityHint("Opens a secure OAuth window to authorise auto-publishing")
                }
            }

            if let err = svc.lastError, isConnecting == false, connected == nil {
                // Show last error inside the card the user just tried — never
                // floating, so it's tied to context.
                Text(err)
                    .font(.caption2)
                    .foregroundStyle(.red)
                    .padding(.top, 2)
            }
        }
        .padding(16)
        .background(Color.cardBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .stroke(
                    LinearGradient(
                        colors: connected != nil ? [accent.opacity(0.55), accent.opacity(0.15)]
                                                  : [Color.white.opacity(0.05), Color.white.opacity(0.0)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        )
        .clipShape(.rect(cornerRadius: 18))
    }

    // MARK: - Footer

    private var legalFooter: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("How publishing works", systemImage: "info.circle")
                .font(.caption.weight(.bold))
                .foregroundStyle(.brand)
            Text("ClipForge uses official OAuth from each platform. We never store your password — only a scoped publishing token we can revoke any time. Disconnecting here removes the token immediately and blocks any further posts.")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground.opacity(0.55))
        .clipShape(.rect(cornerRadius: 14))
    }
}
