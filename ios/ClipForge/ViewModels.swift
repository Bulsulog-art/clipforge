import Foundation

@MainActor
final class ProjectsViewModel: ObservableObject {
    @Published var jobs: [VideoJob] = []
    @Published var error: String?
    @Published var loading: Bool = false

    func load() async {
        loading = true
        defer { loading = false }
        do {
            jobs = try await ClipForgeAPI.shared.fetchJobs()
            error = nil
        } catch {
            self.error = error.localizedDescription
            // Don't flash a toast on initial empty + offline — banner handles it
            if !jobs.isEmpty {
                AppState.shared.flashError("Couldn't refresh projects.")
            }
        }
    }
    func refresh() { Task { await load() } }
}

@MainActor
final class JobDetailViewModel: ObservableObject {
    @Published var clips: [Clip] = []
    @Published var loading: Bool = false
    @Published var error: String?

    func load(jobId: String) async {
        loading = true
        defer { loading = false }
        do {
            clips = try await ClipForgeAPI.shared.fetchClips(jobId: jobId)
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

@MainActor
final class ClipsFeedViewModel: ObservableObject {
    @Published var clips: [Clip] = []
    @Published var loading: Bool = false
    func load() async {
        loading = true
        defer { loading = false }
        do {
            clips = try await ClipForgeAPI.shared.fetchAllClips()
        } catch {
            // Don't clobber prior clips on transient error — show what we have
            if clips.isEmpty {
                AppState.shared.flashError("Couldn't refresh clips: \(error.localizedDescription)")
            }
        }
    }
}
