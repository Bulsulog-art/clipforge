import Foundation
import Supabase

@MainActor
final class ClipForgeAPI {
    static let shared = ClipForgeAPI()
    private var supabase: SupabaseClient { SupabaseService.shared.client }

    enum Error: Swift.Error { case quotaExceeded, network, unauthorized }

    func fetchJobs() async throws -> [VideoJob] {
        let res: [VideoJob] = try await supabase
            .schema("clipforge")
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
            .schema("clipforge")
            .from("clips")
            .select()
            .eq("job_id", value: jobId)
            .order("viral_score", ascending: false)
            .execute()
            .value
    }

    func fetchAllClips() async throws -> [Clip] {
        try await supabase
            .schema("clipforge")
            .from("clips")
            .select()
            .order("created_at", ascending: false)
            .limit(50)
            .execute()
            .value
    }

    @discardableResult
    func createJob(
        sourceUrl: String,
        niche: String,
        bgMusic: Bool = true,
        bgMusicMood: String? = nil,
        thumbnailStyle: String? = nil
    ) async throws -> String {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/jobs"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        struct CreateJobBody: Encodable {
            let sourceType: String
            let sourceUrl: String
            let niche: String
            let language: String
            let bgMusic: Bool
            let bgMusicMood: String?
            let thumbnailStyle: String?
        }
        req.httpBody = try JSONEncoder().encode(
            CreateJobBody(
                sourceType: "youtube",
                sourceUrl: sourceUrl,
                niche: niche,
                language: "en",
                bgMusic: bgMusic,
                bgMusicMood: bgMusicMood,
                thumbnailStyle: thumbnailStyle
            )
        )
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if http.statusCode == 402 { throw Error.quotaExceeded }
        guard (200..<300).contains(http.statusCode) else { throw Error.network }
        struct Resp: Decodable { let jobId: String }
        return (try? JSONDecoder().decode(Resp.self, from: data).jobId) ?? ""
    }

    func signedURL(path: String, bucket: String) async throws -> URL {
        let result = try await supabase.storage
            .from(bucket)
            .createSignedURL(path: path, expiresIn: 60 * 30)
        return result
    }

    func faceSwap(clipId: String, faceJpeg: Data) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        let url = Secrets.apiBaseURL.appendingPathComponent("/api/clips/\(clipId)/face-swap")
        let boundary = "ClipForge-\(UUID().uuidString)"
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"face\"; filename=\"face.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(faceJpeg)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)

        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        req.httpBody = body

        let (_, resp) = try await URLSession.shared.upload(for: req, from: body)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if http.statusCode == 402 { throw Error.quotaExceeded }
        guard (200..<300).contains(http.statusCode) else { throw Error.network }
    }

    struct TranslateRequest: Codable {
        let targetLanguage: String
        let voiceClone: Bool
    }

    struct TrendSnapshot {
        let generated_at: String?
        let items: [[String: Any]]
    }

    func fetchTrends(niche: String) async throws -> TrendSnapshot {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/trends/\(niche)"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        let generated = json["generated_at"] as? String
        let items = json["items"] as? [[String: Any]] ?? []
        return TrendSnapshot(generated_at: generated, items: items)
    }

    func translate(clipId: String, language: String, voiceClone: Bool) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/clips/\(clipId)/translate"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONEncoder().encode(
            TranslateRequest(targetLanguage: language, voiceClone: voiceClone)
        )
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if http.statusCode == 402 { throw Error.quotaExceeded }
        guard (200..<300).contains(http.statusCode) else { throw Error.network }
    }

    // MARK: - Account

    /// Permanently delete the user's ClipForge account. App Store requirement.
    /// Server cascades the auth.users delete through to every clipforge table
    /// + best-effort storage cleanup.
    func deleteAccount() async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/account"))
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    // MARK: - Channels (social connections + auto-publish)

    struct Channel: Identifiable, Decodable, Hashable {
        let id: String
        let platform: String
        let username: String?
        let displayName: String?
        let connectedAt: String?
        let expiresAt: String?
        let needsReconnect: Bool
    }

    /// List the user's connected social channels. Backend returns sanitized rows
    /// (no tokens). Token health (`needsReconnect`) is computed server-side
    /// from `expires_at` so the UI can prompt re-OAuth before a publish fails.
    func listChannels() async throws -> [Channel] {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/channels"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
        struct Resp: Decodable { let channels: [Channel] }
        return try JSONDecoder().decode(Resp.self, from: data).channels
    }

    /// Revoke + delete a connected channel. Server attempts upstream token
    /// revoke first (best-effort) and always deletes the local row.
    func disconnectChannel(id: String) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/channels/\(id)"))
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    /// Kick off a publish to one or more platforms for a ready clip.
    /// Server enqueues per-platform BullMQ jobs; iOS polls the `publishes`
    /// table via Supabase to track status.
    func publishClip(
        clipId: String,
        platforms: [String],
        scheduleFor: Date? = nil
    ) async throws -> [String] {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/clips/\(clipId)/publish"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        struct Body: Encodable {
            let platforms: [String]
            let scheduleFor: String?
        }
        let scheduleStr = scheduleFor.map { ISO8601DateFormatter().string(from: $0) }
        req.httpBody = try JSONEncoder().encode(Body(platforms: platforms, scheduleFor: scheduleStr))

        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if http.statusCode == 402 { throw Error.quotaExceeded }
        guard (200..<300).contains(http.statusCode) else {
            // Surface "412 — connect channels first" with a structured error so
            // the UI can route the user to the Channels tab.
            if http.statusCode == 412 {
                throw Error.network
            }
            throw Error.network
        }
        struct Resp: Decodable { let publishIds: [String] }
        return (try? JSONDecoder().decode(Resp.self, from: data).publishIds) ?? []
    }

    /// Fetch the publish history for a clip (status per platform).
    /// iOS uses this for the "Posted to ✓" badges in ClipPlayer / ActionsSheet.
    struct PublishRecord: Identifiable, Decodable {
        let id: String
        let platform: String
        let status: String          // pending | publishing | published | failed
        let externalUrl: String?
        let publishedAt: String?
        let errorMessage: String?
    }

    func fetchPublishes(clipId: String) async throws -> [PublishRecord] {
        struct Row: Decodable {
            let id: String
            let platform: String
            let status: String
            let external_url: String?
            let published_at: String?
            let error_message: String?
        }
        let rows: [Row] = try await supabase
            .schema("clipforge")
            .from("publishes")
            .select("id, platform, status, external_url, published_at, error_message")
            .eq("clip_id", value: clipId)
            .order("created_at", ascending: false)
            .execute()
            .value
        return rows.map {
            PublishRecord(
                id: $0.id,
                platform: $0.platform,
                status: $0.status,
                externalUrl: $0.external_url,
                publishedAt: $0.published_at,
                errorMessage: $0.error_message
            )
        }
    }

    // MARK: - Avatar (AI talking-head)

    struct Avatar: Identifiable, Decodable {
        let id: String
        let name: String
        let description: String?
        let persona: String?
        let defaultVoiceId: String?
        let imageUrl: String?
    }

    func fetchAvatars() async throws -> [Avatar] {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/avatars"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
        struct Resp: Decodable { let avatars: [Avatar] }
        return try JSONDecoder().decode(Resp.self, from: data).avatars
    }

    struct CreateAvatarJobBody: Encodable {
        let script: String
        let avatarId: String?
        let customImagePath: String?
        let voiceId: String
        let niche: String
        let bgMusic: Bool
    }

    @discardableResult
    func createAvatarJob(
        script: String,
        avatarId: String?,
        voiceId: String,
        niche: String = "motivation",
        bgMusic: Bool = true
    ) async throws -> String {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/avatar-jobs"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONEncoder().encode(
            CreateAvatarJobBody(
                script: script,
                avatarId: avatarId,
                customImagePath: nil,
                voiceId: voiceId,
                niche: niche,
                bgMusic: bgMusic
            )
        )
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if http.statusCode == 402 { throw Error.quotaExceeded }
        guard (200..<300).contains(http.statusCode) else { throw Error.network }
        struct Resp: Decodable { let avatarJobId: String }
        return try JSONDecoder().decode(Resp.self, from: data).avatarJobId
    }
}
