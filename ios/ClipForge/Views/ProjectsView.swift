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
        VStack(spacing: 20) {
            ZStack {
                Circle()
                    .fill(Color.brand.opacity(0.15))
                    .frame(width: 120, height: 120)
                Image(systemName: "scissors")
                    .font(.system(size: 50, weight: .bold))
                    .foregroundStyle(.brand)
            }

            VStack(spacing: 8) {
                Text("Make your first clip set").font(.title2.bold())
                Text("Drop any YouTube link. We'll cut the viral moments,\ncaption them, and post-ready them in minutes.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(.secondary)
                    .font(.callout)
            }

            Button {
                showNewProject = true
            } label: {
                Label("New project", systemImage: "plus.circle.fill")
                    .fontWeight(.semibold)
                    .padding(.horizontal, 24)
                    .padding(.vertical, 12)
                    .background(Color.brand)
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
            }

            Button {
                appState.selectedTab = .trends
            } label: {
                Text("Or browse trending hooks →")
                    .font(.footnote)
                    .foregroundStyle(.brand)
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
    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10)
                .fill(Color.brand.opacity(0.18))
                .frame(width: 56, height: 56)
                .overlay(Image(systemName: "film").foregroundStyle(.brand))
            VStack(alignment: .leading, spacing: 2) {
                Text(job.title ?? "Untitled").fontWeight(.semibold).lineLimit(1)
                Text("\(job.niche ?? "—") · \(job.status)")
                    .font(.caption).foregroundStyle(.secondary)
            }
            Spacer()
            if job.status != "ready" {
                ProgressView(value: Double(job.progress) / 100)
                    .frame(width: 40)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }
}
