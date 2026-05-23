import SwiftUI

/// Sheet that lets the user pick which connected channels to publish a clip to,
/// edit the caption, and kick off the backend publish queue.
///
/// Status polling is handled inline — once we enqueue, we re-fetch the
/// `publishes` rows for this clip every 2 seconds until everything is
/// terminal (published/failed). Apple's standard for "you tapped a button,
/// here's what's happening" UX.
@MainActor
struct ClipPublishSheet: View {
    let clip: Clip
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var channels = ChannelsService.shared
    @StateObject private var credits = CreditsService.shared

    @State private var selected: Set<ChannelsService.Platform> = []
    @State private var caption: String = ""
    @State private var publishing = false
    @State private var statuses: [ClipForgeAPI.PublishRecord] = []
    @State private var pollTask: Task<Void, Never>?
    @State private var error: String?
    @State private var showPaywall = false
    /// When false → "Publish now". When true → DatePicker visible, button
    /// label changes to "Schedule for …".
    @State private var scheduleEnabled = false
    @State private var scheduledDate: Date = Date().addingTimeInterval(60 * 60)

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    headerCard
                    if channels.connectedPlatforms.isEmpty {
                        emptyChannelsCard
                    } else {
                        channelSelector
                        captionEditor
                        scheduleSection
                        publishButton
                    }
                    if !statuses.isEmpty { statusList }
                    if let err = error { errorCard(err) }
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Publish")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task {
                await channels.refresh()
                // Default-select every connected platform — opt-out, not opt-in
                if selected.isEmpty {
                    selected = Set(channels.connectedPlatforms)
                }
                caption = defaultCaption(for: clip)
                await loadStatuses()
            }
            .onDisappear { pollTask?.cancel() }
            .sheet(isPresented: $showPaywall) { PlansView() }
        }
    }

    // MARK: - Sections

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Push this clip to your channels.")
                .font(.title3.bold())
            if let hook = clip.hook {
                Text("\"\(hook)\"")
                    .font(.callout.italic())
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
            if let tags = clip.hashtags, !tags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 6) {
                        ForEach(tags.prefix(8), id: \.self) { tag in
                            Text("#" + tag.replacingOccurrences(of: "#", with: ""))
                                .font(.caption.weight(.semibold))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(Color.brand.opacity(0.18))
                                .foregroundStyle(.brand)
                                .clipShape(.capsule)
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var emptyChannelsCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "antenna.radiowaves.left.and.right.slash")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text("No channels connected yet")
                .font(.headline)
            Text("Head over to the Channels tab to connect TikTok, Instagram or YouTube — takes about 30 seconds.")
                .font(.callout)
                .foregroundStyle(.secondary)
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
        .padding(.vertical, 30)
        .padding(.horizontal, 16)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 16))
    }

    private var channelSelector: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Post to")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(1.0)
            VStack(spacing: 8) {
                ForEach(channels.connectedPlatforms) { platform in
                    channelRow(platform)
                }
            }
        }
    }

    private func channelRow(_ p: ChannelsService.Platform) -> some View {
        let accent = Color(red: p.accent.red, green: p.accent.green, blue: p.accent.blue)
        let isSelected = selected.contains(p)
        let acct = channels.account(for: p)
        return Button {
            if isSelected { selected.remove(p) } else { selected.insert(p) }
            Task { await Haptics.impact(.light) }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isSelected ? accent : .secondary)
                Image(systemName: p.sfSymbol)
                    .frame(width: 26)
                    .foregroundStyle(accent)
                VStack(alignment: .leading, spacing: 1) {
                    Text(p.displayName).font(.callout.weight(.semibold))
                    if let u = acct?.username {
                        Text("@\(u)")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }
                Spacer()
                if let s = latestStatus(for: p.rawValue) {
                    statusBadge(s)
                }
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

    private var captionEditor: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Caption")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                    .textCase(.uppercase)
                    .tracking(1.0)
                Spacer()
                Text("\(caption.count) chars")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
            // Use TextEditor for multiline. minHeight gives it room without
            // hijacking the whole sheet.
            TextEditor(text: $caption)
                .scrollContentBackground(.hidden)
                .frame(minHeight: 110)
                .padding(10)
                .background(Color.cardBackground)
                .clipShape(.rect(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )
        }
    }

    private var scheduleSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Toggle(isOn: $scheduleEnabled.animation(.easeInOut(duration: 0.2))) {
                HStack(spacing: 6) {
                    Image(systemName: "calendar.badge.clock")
                        .foregroundStyle(.brand)
                    Text("Schedule for later")
                        .font(.callout.weight(.semibold))
                }
            }
            .tint(.brand)
            if scheduleEnabled {
                // 5-minute floor so a slow tap doesn't immediately fire. 90-day
                // ceiling matches BullMQ delay practical limits.
                DatePicker(
                    "When",
                    selection: $scheduledDate,
                    in: Date().addingTimeInterval(5 * 60)...Date().addingTimeInterval(90 * 24 * 60 * 60),
                    displayedComponents: [.date, .hourAndMinute]
                )
                .datePickerStyle(.compact)
                .tint(.brand)
                .padding(.horizontal, 4)
                Text("Posts will go live at the selected time. You can cancel a scheduled post from the Publish history.")
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(14)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }

    private var publishButton: some View {
        Button {
            Task { await publish() }
        } label: {
            HStack {
                if publishing { ProgressView().tint(.white) }
                Image(systemName: publishing
                      ? ""
                      : (scheduleEnabled ? "calendar.badge.clock" : "paperplane.fill"))
                    .opacity(publishing ? 0 : 1)
                Text(buttonLabel)
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(
                LinearGradient(
                    colors: [.brand, .brandGlow],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundStyle(.white)
            .clipShape(.rect(cornerRadius: 14))
            .opacity(canPublish ? 1 : 0.45)
        }
        .buttonStyle(.plain)
        .disabled(!canPublish)
    }

    private var buttonLabel: String {
        if publishing {
            return scheduleEnabled ? "Scheduling…" : "Publishing…"
        }
        let n = selected.count
        let suffix = "\(n) channel\(n == 1 ? "" : "s")"
        if scheduleEnabled {
            let fmt = DateFormatter()
            fmt.dateStyle = .medium
            fmt.timeStyle = .short
            return "Schedule for \(fmt.string(from: scheduledDate))"
        }
        return "Publish to \(suffix)"
    }

    private var canPublish: Bool {
        !publishing && !selected.isEmpty && clip.status == "ready"
    }

    private var statusList: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recent posts")
                .font(.caption.weight(.bold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(1.0)
            ForEach(statuses) { rec in
                statusRow(rec)
            }
        }
    }

    private func statusRow(_ rec: ClipForgeAPI.PublishRecord) -> some View {
        let icon: String = {
            switch rec.status {
            case "published":  return "checkmark.seal.fill"
            case "failed":     return "exclamationmark.triangle.fill"
            case "publishing": return "arrow.triangle.2.circlepath"
            default:           return "clock"
            }
        }()
        let tint: Color = {
            switch rec.status {
            case "published":  return .green
            case "failed":     return .red
            case "publishing": return .brand
            default:           return .secondary
            }
        }()
        return HStack(alignment: .top, spacing: 10) {
            Image(systemName: icon)
                .foregroundStyle(tint)
                .frame(width: 22)
            VStack(alignment: .leading, spacing: 2) {
                Text("\(rec.platform.capitalized) — \(rec.status.capitalized)")
                    .font(.callout.weight(.semibold))
                if let u = rec.externalUrl, let url = URL(string: u) {
                    Link("Open post", destination: url)
                        .font(.caption2)
                }
                if let m = rec.errorMessage, rec.status == "failed" {
                    Text(m)
                        .font(.caption2)
                        .foregroundStyle(.red)
                        .lineLimit(3)
                }
            }
            Spacer(minLength: 4)
        }
        .padding(12)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 12))
    }

    private func statusBadge(_ rec: ClipForgeAPI.PublishRecord) -> some View {
        Group {
            switch rec.status {
            case "published":
                Text("Posted")
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(Color.green.opacity(0.18))
                    .foregroundStyle(.green)
                    .clipShape(.capsule)
            case "publishing":
                ProgressView().controlSize(.mini).tint(.brand)
            case "failed":
                Text("Failed")
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 8).padding(.vertical, 2)
                    .background(Color.red.opacity(0.18))
                    .foregroundStyle(.red)
                    .clipShape(.capsule)
            default:
                EmptyView()
            }
        }
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

    private func defaultCaption(for clip: Clip) -> String {
        // Compose a tasteful caption: hook → caption → first 3 hashtags
        // Each platform's publisher will trim further if needed (TikTok 2200,
        // IG 2200, YT description 5000).
        var parts: [String] = []
        if let h = clip.hook, !h.isEmpty { parts.append(h) }
        if let c = clip.caption, !c.isEmpty { parts.append(c) }
        if let tags = clip.hashtags, !tags.isEmpty {
            parts.append(tags.prefix(3).map { "#\($0.replacingOccurrences(of: "#", with: ""))" }.joined(separator: " "))
        }
        return parts.joined(separator: "\n\n")
    }

    private func latestStatus(for platform: String) -> ClipForgeAPI.PublishRecord? {
        statuses.first { $0.platform == platform }
    }

    private func publish() async {
        guard credits.hasPlus else { showPaywall = true; return }
        error = nil
        publishing = true
        defer { publishing = false }

        do {
            let platforms = selected.map { $0.rawValue }
            _ = try await ClipForgeAPI.shared.publishClip(
                clipId: clip.id,
                platforms: platforms,
                scheduleFor: scheduleEnabled ? scheduledDate : nil
            )
            AnalyticsService.shared.track("clip_published", props: [
                "platforms": platforms,
                "count": platforms.count,
                "scheduled": scheduleEnabled,
            ])
            // Immediate publishes count as "real proof the app works" — ask
            // for a review here. Scheduled publishes don't trigger because
            // the user hasn't actually seen anything go live yet.
            if !scheduleEnabled {
                ReviewPrompt.markFirstPublish()
            }
            await Haptics.notify(.success)
            await loadStatuses()
            // No need to poll if the post is scheduled — it won't move from
            // `pending` until the BullMQ delay expires. The Publish history
            // view (6.3) is where users track scheduled rows.
            if !scheduleEnabled {
                startPolling()
            }
        } catch ClipForgeAPI.Error.quotaExceeded {
            showPaywall = true
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func loadStatuses() async {
        do {
            self.statuses = try await ClipForgeAPI.shared.fetchPublishes(clipId: clip.id)
        } catch {
            // Non-blocking — UI just won't show history this time
        }
    }

    /// Poll publish status every 2s until everything is terminal or 2 minutes
    /// have passed. The publish queue is fast (~10–30s typical), but TikTok
    /// can take up to 90s while it transcodes.
    private func startPolling() {
        pollTask?.cancel()
        pollTask = Task { @MainActor in
            let start = Date()
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                if Task.isCancelled { return }
                await loadStatuses()
                let allDone = statuses.allSatisfy { $0.status == "published" || $0.status == "failed" }
                if allDone || Date().timeIntervalSince(start) > 120 { return }
            }
        }
    }
}
