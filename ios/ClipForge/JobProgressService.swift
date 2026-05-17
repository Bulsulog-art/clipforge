import Foundation

/// Polls the Supabase REST API for the current job state on a 3-6s cadence.
/// (Supabase Realtime is enabled and could replace this; polling is the
///  bullet-proof fallback that always works.)
@MainActor
final class JobProgressService: ObservableObject {
    @Published var status: String = "queued"
    @Published var progress: Int = 0
    @Published var clipsReady: Int = 0
    @Published var error: String?
    @Published var jobReady: Bool = false

    private var task: Task<Void, Never>?
    private var currentJobId: String?

    func start(jobId: String, initialStatus: String, initialProgress: Int) {
        currentJobId = jobId
        status = initialStatus
        progress = initialProgress
        jobReady = (initialStatus == "ready")
        if jobReady { Task { await reloadClipsCount() } }

        task?.cancel()
        task = Task { [weak self] in
            // tighter cadence early, relax once ready
            while !Task.isCancelled {
                await self?.poll()
                let s = self?.status ?? ""
                let delay: UInt64 = (s == "ready" || s == "failed") ? 30_000_000_000 : 3_000_000_000
                try? await Task.sleep(nanoseconds: delay)
            }
        }
    }

    func stop() {
        task?.cancel()
        task = nil
        currentJobId = nil
    }

    private func poll() async {
        guard let jobId = currentJobId else { return }
        struct Row: Decodable {
            let status: String
            let progress: Int
            let error_message: String?
        }
        let client = SupabaseService.shared.client
        do {
            let row: Row = try await client
                .from("video_jobs")
                .select("status, progress, error_message")
                .eq("id", value: jobId)
                .single()
                .execute()
                .value
            status = row.status
            progress = row.progress
            if let e = row.error_message, !e.isEmpty { error = e }
            if status == "ready" && !jobReady {
                jobReady = true
                await reloadClipsCount()
            }
        } catch {
            // silent — next tick will retry
        }
    }

    private func reloadClipsCount() async {
        guard let jobId = currentJobId else { return }
        let client = SupabaseService.shared.client
        do {
            let res = try await client
                .from("clips")
                .select("id", head: true, count: .exact)
                .eq("job_id", value: jobId)
                .eq("status", value: "ready")
                .execute()
            if let count = res.count { clipsReady = count }
        } catch {
            // ignore
        }
    }
}
