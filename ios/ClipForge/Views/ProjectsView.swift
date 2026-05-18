import SwiftUI

struct ProjectsView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ProjectsViewModel()
    @StateObject private var credits = CreditsService.shared
    @StateObject private var rc = RevenueCatService.shared
    @Environment(\.scenePhase) private var scenePhase
    @State private var showNewProject = false
    @State private var showAvatarStudio = false
    @State private var showUploadSheet = false
    @State private var showPlans = false
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
            .navigationDestination(item: $deeplinkJob) { job in
                JobDetailView(job: job)
            }
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
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
