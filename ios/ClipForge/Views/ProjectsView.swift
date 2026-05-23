import SwiftUI

struct ProjectsView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ProjectsViewModel()
    @StateObject private var credits = CreditsService.shared
    @StateObject private var rc = RevenueCatService.shared
    @StateObject private var dailyPick = DailyPickService.shared
    @StateObject private var streak = StreakService.shared
    @StateObject private var advisor = CreditAdvisor.shared
    @State private var fireMilestoneConfetti = false
    @State private var milestoneToast: Int?
    @Environment(\.scenePhase) private var scenePhase
    @State private var showNewProject = false
    @State private var showAvatarStudio = false
    @State private var showUploadSheet = false
    @State private var showPlans = false
    @State private var showCreditPaywall = false
    @State private var deeplinkJob: VideoJob?
    @State private var seed: NewProjectSeed?
    @State private var dismissedNudge: Bool = UserDefaults.standard.bool(forKey: "clipforge.nudgeDismissed")

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.loading && viewModel.jobs.isEmpty {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(0..<4, id: \.self) { _ in ProjectRowSkeleton() }
                        }
                        .padding()
                    }
                    .disabled(true)
                } else if viewModel.jobs.isEmpty {
                    emptyState
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            if shouldShowNudge {
                                FreeTierNudge(
                                    onUpgradeTap: { showPlans = true },
                                    onDismiss: {
                                        withAnimation {
                                            dismissedNudge = true
                                            UserDefaults.standard.set(true, forKey: "clipforge.nudgeDismissed")
                                        }
                                    }
                                )
                            }
                            if let rec = advisor.recommendation {
                                CreditAdvisorBanner(
                                    recommendation: rec,
                                    onAction: {
                                        Task { await Haptics.impact(.medium) }
                                        switch rec.target {
                                        case .plansSheet:     showPlans = true
                                        case .creditsPaywall: showCreditPaywall = true
                                        }
                                    },
                                    onDismiss: {
                                        Task { await Haptics.impact(.light) }
                                        advisor.dismiss()
                                    }
                                )
                            }
                            if shouldShowDailyPick, let pick = dailyPick.pick {
                                DailyPickCard(pick: pick) {
                                    Task { await Haptics.impact(.medium) }
                                    appState.startFromTrend(niche: pick.niche, hook: pick.hook)
                                }
                            }
                            if shouldShowMetrics {
                                StudioMetricsCard(jobs: viewModel.jobs, streak: streak.current)
                            }
                            ForEach(viewModel.jobs) { job in
                                NavigationLink(destination: JobDetailView(job: job)) {
                                    JobRow(job: job)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Studio")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        Task { await Haptics.impact(.light) }
                        showPlans = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "bolt.fill")
                                .font(.caption.weight(.bold))
                            Text("\(credits.balance)")
                                .font(.callout.weight(.semibold))
                                .monospacedDigit()
                        }
                        .foregroundStyle(.brand)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 5)
                        .background(Color.brand.opacity(0.15))
                        .clipShape(.capsule)
                    }
                    .accessibilityLabel("\(credits.balance) credits — tap to view plans")
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button {
                            showNewProject = true
                        } label: {
                            Label("Clip from URL · 1 cr", systemImage: "link")
                        }
                        Button {
                            showUploadSheet = true
                        } label: {
                            Label("Upload your video · 1 cr", systemImage: "square.and.arrow.up")
                        }
                        Button {
                            showAvatarStudio = true
                        } label: {
                            Label("AI Avatar · 5 cr", systemImage: "person.wave.2.fill")
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.brand)
                    }
                    .accessibilityLabel("Create new project")
                    .accessibilityHint("Opens a menu to clip from URL, upload a video, or generate an AI avatar")
                }
            }
            .sheet(isPresented: $showNewProject, onDismiss: { seed = nil }) {
                NewProjectSheet(seed: seed) { viewModel.refresh() }
            }
            .sheet(isPresented: $showAvatarStudio) {
                AvatarStudioView { viewModel.refresh() }
            }
            .sheet(isPresented: $showUploadSheet) {
                UploadVideoSheet { viewModel.refresh() }
            }
            .sheet(isPresented: $showPlans) { PlansView() }
            .sheet(isPresented: $showCreditPaywall) { CreditsPaywallView() }
            .navigationDestination(item: $deeplinkJob) { job in
                JobDetailView(job: job)
            }
            .task {
                AnalyticsService.shared.track("studio_viewed")
                await viewModel.load()
                if let lastNiche = viewModel.jobs.first?.niche, !lastNiche.isEmpty {
                    DailyPickService.rememberNiche(lastNiche)
                }
                streak.reconcile(with: viewModel.jobs)
                await dailyPick.refresh()
                publishWidgetState()
            }
            .refreshable {
                await viewModel.load()
                streak.reconcile(with: viewModel.jobs)
                await dailyPick.refresh()
                publishWidgetState()
            }
            .onChange(of: viewModel.jobs.map(\.status)) { _, _ in
                // Polls update job statuses; re-reconcile so a freshly-ready
                // clip bumps the streak the moment it lands.
                streak.reconcile(with: viewModel.jobs)
                publishWidgetState()
            }
            .onChange(of: dailyPick.pick) { _, _ in
                publishWidgetState()
            }
            .onChange(of: credits.balance) { _, _ in
                advisor.update(
                    currentBalance: credits.balance,
                    tier: advisorTier,
                    plusProductId: rc.activeProductId
                )
            }
            .onChange(of: streak.pendingMilestone) { _, milestone in
                guard let m = milestone else { return }
                Task { @MainActor in
                    await Haptics.notify(.success)
                    milestoneToast = m
                    fireMilestoneConfetti = true
                    try? await Task.sleep(nanoseconds: 1_800_000_000)
                    fireMilestoneConfetti = false
                    try? await Task.sleep(nanoseconds: 2_400_000_000)
                    milestoneToast = nil
                    streak.pendingMilestone = nil
                }
            }
            .overlay(alignment: .top) {
                if let m = milestoneToast {
                    MilestoneBanner(days: m)
                        .padding(.top, 8)
                        .padding(.horizontal, 16)
                        .transition(.move(edge: .top).combined(with: .opacity))
                }
            }
            .animation(.spring, value: milestoneToast)
            .confettiOverlay(trigger: fireMilestoneConfetti, count: 120, duration: 1.8)
            .onChange(of: appState.pendingJobId) { _, newId in
                guard let id = newId else { return }
                Task { await openDeeplinkJob(id: id) }
            }
            .onChange(of: appState.pendingNewProject?.id) { _, _ in
                guard let s = appState.pendingNewProject else { return }
                seed = s
                showNewProject = true
                appState.pendingNewProject = nil
            }
            .onChange(of: scenePhase) { _, phase in
                switch phase {
                case .active:
                    // Returning to foreground — refresh once and resume polling
                    Task { await viewModel.load() }
                case .background, .inactive:
                    viewModel.stopPolling()
                @unknown default:
                    break
                }
            }
            .onChange(of: viewModel.jobs.contains(where: { $0.status == "ready" })) { _, hasReady in
                guard hasReady else { return }
                // First ready clip exists — perfect moment to ask for push permission
                // so future renders can notify the user. Once, ever.
                if !UserDefaults.standard.bool(forKey: "clipforge.pushAskedAfterFirstReady"),
                   PushService.shared.permission == .notDetermined {
                    Task {
                        _ = await PushService.shared.requestPermission()
                        UserDefaults.standard.set(true, forKey: "clipforge.pushAskedAfterFirstReady")
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 22) {
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [Color.brand.opacity(0.55), Color.brand.opacity(0.0)],
                            center: .center, startRadius: 4, endRadius: 90
                        )
                    )
                    .frame(width: 180, height: 180)
                    .blur(radius: 6)
                ZStack {
                    Circle()
                        .stroke(Color.brand.opacity(0.35), lineWidth: 1)
                        .frame(width: 130, height: 130)
                    Image(systemName: "wand.and.stars")
                        .font(.system(size: 52, weight: .bold))
                        .foregroundStyle(
                            LinearGradient(
                                colors: [.brand, .brandGlow],
                                startPoint: .top, endPoint: .bottom
                            )
                        )
                }
            }

            VStack(spacing: 10) {
                Text("Your studio is ready")
                    .font(.title.bold())
                    .minimumScaleFactor(0.85)
                Text("Paste a YouTube link, pick a niche, and ClipForge cuts the viral moments — captions, hook overlay and a Mr.Beast thumbnail included.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .font(.callout)
                    .padding(.horizontal, 24)
                    .minimumScaleFactor(0.9)
            }

            VStack(spacing: 12) {
                Button {
                    Task { await Haptics.impact(.medium) }
                    showNewProject = true
                } label: {
                    Label("Generate clips · 1 credit", systemImage: "sparkles")
                        .fontWeight(.semibold)
                        .padding(.horizontal, 24).padding(.vertical, 14)
                        .frame(maxWidth: 320)
                        .background(
                            LinearGradient(
                                colors: [.brand, .brandGlow],
                                startPoint: .leading, endPoint: .trailing
                            )
                        )
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                        .shadow(color: Color.brand.opacity(0.35), radius: 14, y: 6)
                }

                Button {
                    appState.selectedTab = .trends
                } label: {
                    Text("Or browse trending hooks →")
                        .font(.footnote)
                        .foregroundStyle(.brand)
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding()
    }

    private func openDeeplinkJob(id: String) async {
        await viewModel.load()
        if let job = viewModel.jobs.first(where: { $0.id == id }) {
            deeplinkJob = job
        }
        appState.pendingJobId = nil
    }

    /// Show the upgrade nudge only when:
    ///   - user is on free tier (no active Plus / Pro)
    ///   - has at least one ready clip set (proved the value)
    ///   - has burned through their free credit (balance = 0)
    ///   - hasn't manually dismissed
    private var shouldShowNudge: Bool {
        !rc.hasAnyPaid
            && !dismissedNudge
            && credits.balance == 0
            && viewModel.jobs.contains(where: { $0.status == "ready" })
    }

    /// Show the Today's pick hero card unless the user has 3+ in-flight jobs
    /// — past that point the screen is busy enough that an inspirational
    /// prompt becomes noise.
    private var shouldShowDailyPick: Bool {
        let inFlight = viewModel.jobs.filter { $0.status != "ready" && $0.status != "failed" }.count
        return inFlight < 3
    }

    /// Show the metrics strip once the user has at least one job in their
    /// history — otherwise the empty zeros look hollow.
    private var shouldShowMetrics: Bool {
        !viewModel.jobs.isEmpty
    }

    /// Map RevenueCat's active product id onto the CreditAdvisor.Tier
    /// enum. Anything we don't recognise falls back to .free, which means
    /// CreditAdvisor stays quiet for that user (the FreeTierNudge handles
    /// the free-tier upsell separately).
    private var advisorTier: CreditAdvisor.Tier {
        guard rc.hasAnyPaid, let pid = rc.activeProductId else { return .free }
        if pid.contains("yearly")  { return .yearly  }
        if pid.contains("monthly") { return .monthly }
        if pid.contains("weekly")  { return .weekly  }
        return .free
    }

    /// Push the latest in-memory metrics to the App Group so the home-screen
    /// widget can render fresh state. Cheap (UserDefaults write + WidgetKit
    /// reload nudge) so we call it on every meaningful change.
    private func publishWidgetState() {
        let cutoff = Date().addingTimeInterval(-7 * 24 * 60 * 60)
        let formatter = ISO8601DateFormatter()
        let weeklyReady = viewModel.jobs.filter { job in
            guard job.status == "ready",
                  let d = formatter.date(from: job.createdAt) else { return false }
            return d >= cutoff
        }.count
        let active = viewModel.jobs.filter {
            $0.status != "ready" && $0.status != "failed"
        }.count
        let hook = dailyPick.pick.map { String($0.hook.prefix(120)) } ?? ""
        let niche = dailyPick.pick?.niche ?? ""

        SharedAppState.save(SharedAppState(
            activeJobs: active,
            readyThisWeek: weeklyReady,
            streak: streak.current,
            todaysPickHook: hook,
            todaysPickNiche: niche,
            updatedAt: Date()
        ))
    }
}

/// Inline banner shown at the top of Studio when CreditAdvisor detects the
/// user's burn rate doesn't match their current plan (e.g. Weekly burning
/// 8 credits in 2 days → push Yearly). Tap → upgrade flow. Dismiss →
/// snoozed for 7 days via CreditAdvisor.dismiss().
private struct CreditAdvisorBanner: View {
    let recommendation: CreditAdvisor.Recommendation
    let onAction: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .foregroundStyle(.brand)
                Text(recommendation.title)
                    .font(.callout.weight(.bold))
                Spacer()
                Button(action: onDismiss) {
                    Image(systemName: "xmark")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.secondary)
                        .padding(6)
                }
                .accessibilityLabel("Dismiss recommendation")
            }
            Text(recommendation.body)
                .font(.caption)
                .foregroundStyle(.secondary)
            Button(action: onAction) {
                HStack(spacing: 6) {
                    Text(recommendation.cta)
                        .font(.caption.weight(.bold))
                    Image(systemName: "arrow.right")
                        .font(.caption2.weight(.bold))
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .background(
                    LinearGradient(
                        colors: [.brand, .brandGlow],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .foregroundStyle(.white)
                .clipShape(.capsule)
            }
            .buttonStyle(.plain)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.brand.opacity(0.35), lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 14))
    }
}

/// Brief celebratory toast shown when the user crosses a streak milestone.
/// Pairs with the confetti overlay; copy includes the day count + a
/// motivating subtitle that escalates with the milestone.
private struct MilestoneBanner: View {
    let days: Int

    private var subtitle: String {
        switch days {
        case 3:   return "3 days in a row — you're cooking."
        case 7:   return "One full week. Algorithm loves consistency."
        case 14:  return "Two weeks straight. Top 5% of creators."
        case 30:  return "30-day streak. This is real momentum."
        case 60:  return "60 days. You're in the long game now."
        case 90:  return "Quarter of a year. Few make it this far."
        case 180: return "Half a year. Officially a content machine."
        case 365: return "365 days. ClipForge royalty."
        default:  return "Keep the streak alive!"
        }
    }

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [.orange, .red],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(width: 40, height: 40)
                Image(systemName: "flame.fill")
                    .font(.callout.weight(.bold))
                    .foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text("\(days)-day streak unlocked")
                    .font(.callout.weight(.bold))
                    .foregroundStyle(.white)
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.85))
                    .lineLimit(2)
            }
            Spacer(minLength: 4)
        }
        .padding(12)
        .background(.black.opacity(0.78))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(.orange.opacity(0.4), lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 14))
        .shadow(color: .orange.opacity(0.45), radius: 14, y: 5)
    }
}

/// Compact metrics strip — three glanceable stats with subtle gradient
/// underlay. Powered entirely by the in-memory jobs list so it costs zero
/// network. Refreshes the moment ProjectsView's polling updates the jobs.
private struct StudioMetricsCard: View {
    let jobs: [VideoJob]
    let streak: Int

    private var inFlight: Int {
        jobs.filter { $0.status != "ready" && $0.status != "failed" }.count
    }

    /// "Ready this week" — jobs that finished in the last 7 days. We use
    /// created_at as a proxy for finished_at because the API doesn't return
    /// a separate timestamp. With our 60–120s render times the two are
    /// effectively identical, and any 7d-old job that's still "ready" was
    /// also created in roughly the same week.
    private var readyThisWeek: Int {
        let cutoff = Date().addingTimeInterval(-7 * 24 * 60 * 60)
        let formatter = ISO8601DateFormatter()
        return jobs.filter { job in
            guard job.status == "ready",
                  let d = formatter.date(from: job.createdAt) else { return false }
            return d >= cutoff
        }.count
    }

    var body: some View {
        HStack(spacing: 0) {
            metric(value: "\(inFlight)",
                   label: "Active",
                   icon: "bolt.fill",
                   tint: .brand)
            divider
            metric(value: "\(readyThisWeek)",
                   label: "Ready · 7d",
                   icon: "checkmark.seal.fill",
                   tint: .green)
            divider
            metric(
                value: streak == 0 ? "—" : "\(streak)",
                label: streak == 0 ? "Streak" : "Day streak",
                icon: streak == 0 ? "flame" : "flame.fill",
                tint: streak == 0 ? .secondary : .orange
            )
        }
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity)
        .background(
            LinearGradient(
                colors: [Color.cardBackground, Color.cardBackground.opacity(0.65)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.white.opacity(0.05), lineWidth: 0.6)
        )
        .clipShape(.rect(cornerRadius: 14))
    }

    private func metric(value: String, label: String, icon: String, tint: Color) -> some View {
        VStack(spacing: 5) {
            HStack(spacing: 5) {
                Image(systemName: icon)
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(tint)
                Text(value)
                    .font(.title3.weight(.bold))
                    .monospacedDigit()
            }
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .tracking(0.3)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label): \(value)")
    }

    private var divider: some View {
        Rectangle()
            .fill(Color.white.opacity(0.08))
            .frame(width: 1, height: 30)
    }
}

/// Studio hero card — Glowly-style "Today's pick" prompt. Powered by
/// DailyPickService (6h-cached top trend for the user's niche). Tapping it
/// jumps the user straight into NewProjectSheet with the hook + niche seeded.
private struct DailyPickCard: View {
    let pick: DailyPick
    let onTap: () -> Void
    @State private var phase: Double = 0

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    Label("TODAY'S PICK", systemImage: "sparkles")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.brand)
                        .tracking(1.4)
                    Spacer()
                    Text(pick.niche.capitalized)
                        .font(.caption2.weight(.bold))
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.brand.opacity(0.16))
                        .foregroundStyle(.brand)
                        .clipShape(.capsule)
                    if let platform = pick.platform {
                        Text(platform.capitalized)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Text("\"\(pick.hook)\"")
                    .font(.title3.bold().italic())
                    .lineLimit(3)
                    .multilineTextAlignment(.leading)
                    .minimumScaleFactor(0.9)
                    .foregroundStyle(.primary)

                if let why = pick.whyItWorks, !why.isEmpty {
                    Text(why)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                HStack(spacing: 8) {
                    Text("Generate clips from this")
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(.white)
                    Image(systemName: "arrow.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 9)
                .background(
                    LinearGradient(
                        colors: [.brand, .brandGlow],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .clipShape(.capsule)
                .padding(.top, 4)
            }
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color.cardBackground)
            .overlay(animatedBorder)
            .clipShape(.rect(cornerRadius: 18))
            .shadow(color: .brand.opacity(0.28), radius: 18, y: 8)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Today's pick: \(pick.hook)")
        .accessibilityHint("Opens a new project pre-filled with this \(pick.niche.capitalized) hook")
        .onAppear {
            withAnimation(.linear(duration: 8).repeatForever(autoreverses: false)) {
                phase = 1
            }
        }
    }

    /// A 1-pt gradient stroke whose hue endpoints orbit around the card —
    /// looks "alive" without being distracting. Cheap to render: a single
    /// AngularGradient is animated by `phase` going 0 → 1 forever.
    private var animatedBorder: some View {
        RoundedRectangle(cornerRadius: 18)
            .stroke(
                AngularGradient(
                    gradient: Gradient(colors: [
                        .brand, .brandGlow, .purple, .brand,
                    ]),
                    center: .center,
                    angle: .degrees(360 * phase)
                ),
                lineWidth: 1.2
            )
    }
}

private struct JobRow: View {
    let job: VideoJob

    private var statusPill: (String, Color) {
        switch job.status {
        case "ready":         return ("Ready",        .green)
        case "failed":        return ("Failed",       .red)
        case "queued":        return ("Queued",       .gray)
        case "transcribing":  return ("Transcribing", .blue)
        case "scoring":       return ("Scoring",      .indigo)
        case "rendering":     return ("Rendering",    .brand)
        default:              return (job.status.capitalized, .secondary)
        }
    }

    private var icon: String {
        switch job.status {
        case "ready":  return "checkmark.circle.fill"
        case "failed": return "exclamationmark.triangle.fill"
        default:       return "wand.and.stars"
        }
    }

    var body: some View {
        let (label, color) = statusPill
        return HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(LinearGradient(
                        colors: [Color.brand.opacity(0.22), Color.brand.opacity(0.08)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    ))
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(.brand)
            }
            .frame(width: 56, height: 56)

            VStack(alignment: .leading, spacing: 4) {
                Text(job.title ?? "Untitled")
                    .fontWeight(.semibold)
                    .lineLimit(1)
                HStack(spacing: 6) {
                    Text(label)
                        .font(.caption2.weight(.semibold))
                        .padding(.horizontal, 7).padding(.vertical, 2)
                        .background(color.opacity(0.18))
                        .foregroundStyle(color)
                        .clipShape(.capsule)
                    if let niche = job.niche {
                        Text(niche.capitalized)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                    if let d = job.durationSeconds, d > 0 {
                        Text("· \(Self.formatDuration(d))")
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }
            }

            Spacer(minLength: 4)

            if job.status != "ready" && job.status != "failed" {
                ZStack {
                    Circle()
                        .stroke(Color.white.opacity(0.08), lineWidth: 3)
                    Circle()
                        .trim(from: 0, to: CGFloat(job.progress) / 100)
                        .stroke(Color.brand, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                        .animation(.easeInOut(duration: 0.4), value: job.progress)
                    Text("\(job.progress)")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.brand)
                }
                .frame(width: 34, height: 34)
            } else if job.status == "ready" {
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(14)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }

    private static func formatDuration(_ sec: Int) -> String {
        let m = sec / 60, s = sec % 60
        return m == 0 ? "\(s)s" : (s == 0 ? "\(m)m" : "\(m):\(String(format: "%02d", s))")
    }
}
