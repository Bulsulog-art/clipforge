import Foundation
import Supabase

@MainActor
final class ClipForgeAPI {
    static let shared = ClipForgeAPI()
    private var supabase: SupabaseClient { SupabaseService.shared.client }

    enum Error: Swift.Error { case quotaExceeded, network, unauthorized }

    func fetchJobs() async throws -> [VideoJob] {
        let res: [VideoJob] = try await supabase
            .from("video_jobs")
            .select()
            .order("created_at", ascending: false)
            .limit(100)
            .execute()
            .value
        return res
    }

    func fetchClips(jobId: String) async throws -> [Clip] {
        try await supabase
            .from("clips")
            .select()
            .eq("job_id", value: jobId)
            .order("viral_score", ascending: false)
            .execute()
            .value
    }

    func fetchAllClips() async throws -> [Clip] {
        try await supabase
            .from("clips")
            .select()
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value
    }

    func createJob(sourceUrl: String, niche: String) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/jobs"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONEncoder().encode([
            "sourceType": "youtube",
            "sourceUrl": sourceUrl,
            "niche": niche,
            "language": "en",
        ])
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if http.statusCode == 402 { throw Error.quotaExceeded }
        guard (200..<300).contains(http.statusCode) else { throw Error.network }
    }

    func signedURL(path: String, bucket: String) async throws -> URL {
        let result = try await supabase.storage
            .from(bucket)
            .createSignedURL(path: path, expiresIn: 60 * 30)
        return result
    }
}
