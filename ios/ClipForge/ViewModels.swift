import Foundation

@MainActor
final class ProjectsViewModel: ObservableObject {
    @Published var jobs: [VideoJob] = []
    @Published var error: String?

    func load() async {
        do { jobs = try await ClipForgeAPI.shared.fetchJobs() }
        catch { self.error = error.localizedDescription }
    }
    func refresh() { Task { await load() } }
}

@MainActor
final class JobDetailViewModel: ObservableObject {
    @Published var clips: [Clip] = []
    func load(jobId: String) async {
        clips = (try? await ClipForgeAPI.shared.fetchClips(jobId: jobId)) ?? []
    }
}

@MainActor
final class ClipsFeedViewModel: ObservableObject {
    @Published var clips: [Clip] = []
    func load() async {
        clips = (try? await ClipForgeAPI.shared.fetchAllClips()) ?? []
    }
}
