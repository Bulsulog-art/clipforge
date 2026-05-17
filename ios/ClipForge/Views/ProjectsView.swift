import SwiftUI

struct ProjectsView: View {
    @StateObject private var viewModel = ProjectsViewModel()
    @State private var showNewProject = false

    var body: some View {
        NavigationStack {
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
            .navigationTitle("Studio")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showNewProject = true } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.brand)
                    }
                }
            }
            .sheet(isPresented: $showNewProject) {
                NewProjectSheet { viewModel.refresh() }
            }
            .task { await viewModel.load() }
            .refreshable { await viewModel.load() }
        }
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
