import SwiftUI

/// Publishes a batch of clips to a shared set of channels. Each clip keeps
/// its own AI-generated caption (hook + caption + hashtags) — no shared
/// caption editor here because per-clip variety converts better than one
/// duplicate caption blasted across N posts.
///
/// Submits sequentially with per-clip progress so the user knows it's
/// actually working through the queue. Server-side ratelimits (Apple +
/// each platform) hate burst posts, so sequential is also defensive.
@MainActor
struct BulkPublishSheet: View {
    let clips: [Clip]
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var channels = ChannelsService.shared
    @StateObject private var credits = CreditsService.shared

    @State private var selected: Set<ChannelsService.Platform> = []
    @State private var publishing = false
    @State private var completed: Int = 0
    @State private var failures: Int = 0
    @State private var error: String?
    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    headerCard
                    if channels.connectedPlatforms.isEmpty {
                        noChannelsCard
                    } else {
                        channelSelector
                        captionNote
                        if let err = error { errorCard(err) }
                        progressCard
                        submitButton
                    }
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Publish \(clips.count) clips")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(publishing ? "Hide" : "Close") { dismiss() }
                }
            }
            .task {
                await channels.refresh()
                if selected.isEmpty { selected = Set(channels.connectedPlatforms) }
            }
            .sheet(isPresented: $showPaywall) { PlansView() }
        }
    }

    // MARK: - Sections

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Batch publish")
                .font(.title3.bold())
            Text("All \(clips.count) selected clips will go out to the same channels. Each clip uses its own AI-generated caption.")
                .font(.callout)
                .foregroundStyle(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var noChannelsCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "antenna.radiowaves.left.and.right.slash")
                .font(.system(size: 36))
                .foregroundStyle(.textSecondary)
            Text("No channels connected").font(.headline)
            Text("Connect TikTok, Instagram or YouTube in the Channels tab first.")
                .font(.callout)
                .foregroundStyle(.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            Button {
                appState.selectedTab = .channels
                dismiss()
            } label: {
                Label("Go to Channels", systemImage: "arrow.right")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 10)
                    .background(Color.brand)
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
            }
            .buttonStyle(.plain)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 26)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 16))
    }

    private var channelSelector: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("POST TO")
                .font(.caption.weight(.bold))
                .tracking(1.0)
                .foregroundStyle(.textSecondary)
            ForEach(channels.connectedPlatforms) { p in
                channelRow(p)
            }
        }
    }

    private func channelRow(_ p: ChannelsService.Platform) -> some View {
        let isSelected = selected.contains(p)
        let acct = channels.account(for: p)
        let accent = Color(red: p.accent.red, green: p.accent.green, blue: p.accent.blue)
        return Button {
            if isSelected { selected.remove(p) } else { selected.insert(p) }
            Task { await Haptics.impact(.light) }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isSelected ? accent : Color.textSecondary)
                Image(systemName: p.sfSymbol)
                    .frame(width: 26)
                    .foregroundStyle(accent)
                VStack(alignment: .leading, spacing: 1) {
                    Text(p.displayName).font(.callout.weight(.semibold))
                    if let u = acct?.username {
                        Text("@\(u)").font(.caption2).foregroundStyle(.textSecondary)
                    }
                }
                Spacer()
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(isSelected ? accent.opacity(0.12) : Color.cardBackground)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? accent.opacity(0.5) : Color.clear, lineWidth: 1)
            )
            .clipShape(.rect(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }

    private var captionNote: some View {
        HStack(spacing: 8) {
            Image(systemName: "info.circle.fill")
                .foregroundStyle(.brand)
            Text("Each clip publishes with its own hook + caption + #hashtags. Per-platform character limits are handled automatically.")
                .font(.caption)
                .foregroundStyle(.textSecondary)
        }
        .padding(12)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 12))
    }

    @ViewBuilder
    private var progressCard: some View {
        if publishing || completed > 0 || failures > 0 {
            VStack(alignment: .leading, spacing: 6) {
                ProgressView(value: Double(completed + failures), total: Double(clips.count))
                    .tint(.brand)
                HStack {
                    Text("\(completed) of \(clips.count) published")
                        .font(.caption.weight(.semibold))
                    Spacer()
                    if failures > 0 {
                        Text("\(failures) failed")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.red)
                    }
                }
            }
            .padding(12)
            .background(Color.cardBackground)
            .clipShape(.rect(cornerRadius: 12))
        }
    }

    private var submitButton: some View {
        Button {
            Task { await publishAll() }
        } label: {
            HStack {
                if publishing { ProgressView().tint(.white) }
                Image(systemName: publishing ? "" : "paperplane.fill")
                    .opacity(publishing ? 0 : 1)
                Text(publishing
                     ? "Publishing \(completed + failures)/\(clips.count)…"
                     : "Publish \(clips.count) clips to \(selected.count) channel\(selected.count == 1 ? "" : "s")")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    colors: [.brand, .brandGlow],
                    startPoint: .leading, endPoint: .trailing
                )
            )
            .foregroundStyle(.white)
            .clipShape(.rect(cornerRadius: 14))
            .opacity(canPublish ? 1 : 0.45)
        }
        .buttonStyle(.plain)
        .disabled(!canPublish)
    }

    private var canPublish: Bool {
        !publishing && !selected.isEmpty
    }

    private func errorCard(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
            Text(message).font(.callout).foregroundStyle(.red)
            Spacer(minLength: 4)
        }
        .padding(12)
        .background(Color.red.opacity(0.12))
        .clipShape(.rect(cornerRadius: 12))
    }

    // MARK: - Behaviour

    private func publishAll() async {
        guard credits.hasPlus else { showPaywall = true; return }
        publishing = true
        error = nil
        completed = 0
        failures = 0
        defer { publishing = false }

        let platformRaws = selected.map { $0.rawValue }
        let eligibleClips = clips.filter { $0.status == "ready" }
        AnalyticsService.shared.track("bulk_publish_started", props: [
            "clips": eligibleClips.count,
            "platforms": platformRaws,
        ])

        for clip in eligibleClips {
            do {
                _ = try await ClipForgeAPI.shared.publishClip(
                    clipId: clip.id,
                    platforms: platformRaws
                )
                completed += 1
            } catch {
                failures += 1
            }
        }
        // Toast — quick reflection of the result, doesn't auto-dismiss the
        // sheet so the user can re-publish failed clips manually from the
        // history view.
        if failures == 0 {
            await Haptics.notify(.success)
        } else {
            await Haptics.notify(.warning)
        }
    }
}
