import Foundation

@MainActor
final class ProjectsViewModel: ObservableObject {
    @Published var jobs: [VideoJob] = []
    @Published var error: String?
    @Published var loading: Bool = false

    private var pollingTask: Task<Void, Never>?
    private static let terminalStatuses: Set<String> = ["ready", "failed"]

    deinit { pollingTask?.cancel() }

    func load() async {
        loading = true
        defer { loading = false }
        do {
            jobs = try await ClipForgeAPI.shared.fetchJobs()
            error = nil
            updatePolling()
        } catch {
            self.error = error.localizedDescription
            if !jobs.isEmpty {
                AppState.shared.flashError("Couldn't refresh projects.")
            }
        }
    }

    func refresh() { Task { await load() } }

    /// Start polling at 3s intervals while any job is non-terminal; stop otherwise.
    /// Called automatically after every successful load.
    func updatePolling() {
        let hasInFlight = jobs.contains { !Self.terminalStatuses.contains($0.status) }
        if hasInFlight && pollingTask == nil {
            pollingTask = Task { [weak self] in
                while !Task.isCancelled {
                    try? await Task.sleep(nanoseconds: 3 * 1_000_000_000)
                    guard !Task.isCancelled else { break }
                    await self?.silentRefresh()
                    if let still = self?.jobs.contains(where: { !Self.terminalStatuses.contains($0.status) }),
                       !still { break }
                }
                await MainActor.run { self?.pollingTask = nil }
            }
        } else if !hasInFlight {
            pollingTask?.cancel()
            pollingTask = nil
        }
    }

    /// Refresh without setting `loading` (so we don't bounce the spinner during polling).
    private func silentRefresh() async {
        do {
            jobs = try await ClipForgeAPI.shared.fetchJobs()
        } catch {
            // Quiet — banner / pull-to-refresh will surface persistent failures.
        }
    }

    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }
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
