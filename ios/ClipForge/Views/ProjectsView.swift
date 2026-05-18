import SwiftUI

struct ProjectsView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var viewModel = ProjectsViewModel()
    @State private var showNewProject = false
    @State private var showAvatarStudio = false
    @State private var deeplinkJob: VideoJob?
    @State private var seed: NewProjectSeed?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.jobs.isEmpty && !viewModel.loading {
                    emptyState
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
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
