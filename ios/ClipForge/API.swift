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

    // MARK: - Promo codes

    /// Redeem an admin-issued promo code (separate from per-user referral
    /// codes). Returns the granted credit count so the UI can show
    /// "+5 credits added". Server side translates RPC error codes to
    /// friendly messages.
    @discardableResult
    func redeemPromoCode(_ code: String) async throws -> Int {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/promo/redeem"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        struct Body: Encodable { let code: String }
        req.httpBody = try JSONEncoder().encode(Body(code: code))
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if !(200..<300).contains(http.statusCode) {
            struct Err: Decodable { let error: String? }
            let msg = (try? JSONDecoder().decode(Err.self, from: data).error)
                ?? "Couldn't redeem this code."
            throw NSError(
                domain: "ClipForgeAPI.Promo",
                code: http.statusCode,
                userInfo: [NSLocalizedDescriptionKey: msg]
            )
        }
        struct Resp: Decodable { let creditsGranted: Int }
        return (try? JSONDecoder().decode(Resp.self, from: data).creditsGranted) ?? 0
    }

    // MARK: - Clip remix

    /// Re-renders a different cut of the source video that produced this
    /// clip. Returns the new job id so the caller can start a Live
    /// Activity + show the user the queued job.
    func remixClip(id: String) async throws -> String {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/clips/\(id)/remix"))
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if http.statusCode == 402 { throw Error.quotaExceeded }
        guard (200..<300).contains(http.statusCode) else { throw Error.network }
        struct Resp: Decodable { let jobId: String }
        return (try? JSONDecoder().decode(Resp.self, from: data).jobId) ?? ""
    }

    // MARK: - Bulk clip actions

    /// Set is_favorite on a batch of clips owned by the caller. Capped
    /// server-side at 200 ids per request.
    func bulkFavoriteClips(ids: [String], favorite: Bool) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/clips/bulk-favorite"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        struct Body: Encodable { let ids: [String]; let favorite: Bool }
        req.httpBody = try JSONEncoder().encode(Body(ids: ids, favorite: favorite))
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    // MARK: - Push notification preferences

    /// Returns the user's per-kind push opt-in map. Missing keys default to
    /// enabled on the worker side, so a fresh user with `{}` gets every push.
    func fetchPushPreferences() async throws -> [String: Bool] {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/push-preferences"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
        struct Resp: Decodable { let preferences: [String: Bool] }
        return (try? JSONDecoder().decode(Resp.self, from: data).preferences) ?? [:]
    }

    /// Patch one or more kinds. Server merges with the existing map so a
    /// partial update doesn't overwrite untouched keys.
    func updatePushPreferences(_ updates: [String: Bool]) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/push-preferences"))
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        struct Body: Encodable { let preferences: [String: Bool] }
        req.httpBody = try JSONEncoder().encode(Body(preferences: updates))
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    // MARK: - Publish history

    struct PublishHistoryRow: Identifiable, Decodable, Hashable {
        let id: String
        let platform: String
        let status: String              // pending | publishing | published | failed
        let scheduledFor: String?
        let publishedAt: String?
        let externalUrl: String?
        let errorMessage: String?
        let caption: String?
        let createdAt: String?
        let clipHook: String?
        let clipThumbnailPath: String?
    }

    /// Fetch the user's last 100 publish rows joined with the originating
    /// clip's hook + thumbnail path for visual context.
    func fetchPublishHistory() async throws -> [PublishHistoryRow] {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/publishes"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
        struct Resp: Decodable { let publishes: [PublishHistoryRow] }
        return try JSONDecoder().decode(Resp.self, from: data).publishes
    }

    /// Cancel a scheduled (status=pending) publish. Removes the BullMQ
    /// delayed job and marks the row as failed with "Cancelled by user".
    func cancelPublish(id: String) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/publishes/\(id)"))
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    /// Re-enqueue a failed publish. Only failed rows are eligible server-side.
    func retryPublish(id: String) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/publishes/\(id)/retry"))
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    // MARK: - Custom branding (Plus feature)

    struct Branding: Decodable {
        let logoPath: String
        let position: String          // "top-left" | "top-right" | "bottom-left" | "bottom-right"
        let opacity: Double
        let updatedAt: String?
        let previewUrl: String?
    }

    /// Read the user's branding row (or nil if none set).
    func fetchBranding() async throws -> Branding? {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/branding"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
        struct Resp: Decodable { let branding: Branding? }
        return (try? JSONDecoder().decode(Resp.self, from: data))?.branding
    }

    /// Upload a logo PNG/JPEG/WebP (≤ 2 MB). Plus tier only — returns
    /// 402 → quotaExceeded if the user is on free.
    func uploadBrandingLogo(imageData: Data, mimeType: String) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        let url = Secrets.apiBaseURL.appendingPathComponent("/api/branding/upload")
        let boundary = "ClipForge-\(UUID().uuidString)"
        let fileExt: String = {
            switch mimeType {
            case "image/jpeg": return "jpg"
            case "image/webp": return "webp"
            default:           return "png"
            }
        }()
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"logo\"; filename=\"logo.\(fileExt)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
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

    /// Patch position / opacity on the existing branding row.
    func updateBranding(position: String?, opacity: Double?) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/branding"))
        req.httpMethod = "PATCH"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        struct Body: Encodable {
            let position: String?
            let opacity: Double?
        }
        req.httpBody = try JSONEncoder().encode(Body(position: position, opacity: opacity))
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    /// Remove the branding row + best-effort delete the logo blob.
    func removeBranding() async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/branding"))
        req.httpMethod = "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    // MARK: - Clip favorites

    /// Star / unstar a clip. POST sets is_favorite=true, DELETE sets false.
    /// RLS on the clips table already scopes the update to the owning user.
    func setClipFavorite(id: String, favorite: Bool) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/clips/\(id)/favorite"))
        req.httpMethod = favorite ? "POST" : "DELETE"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    // MARK: - Account export

    /// Download the user's GDPR data export as a JSON file. The file is
    /// returned with Content-Disposition: attachment; we write it to a
    /// temp path the caller can share / save.
    func exportAccountData() async throws -> URL {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/account/export"))
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
        // Write to temp file so the caller (FeedbackSheet share button)
        // can hand a real fileURL to UIActivityViewController.
        let filename = "clipforge-export-\(ISO8601DateFormatter().string(from: Date()).prefix(10)).json"
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(String(filename))
        try data.write(to: tmp, options: .atomic)
        return tmp
    }

    // MARK: - Referrals

    struct ReferralInfo: Decodable {
        let code: String
        let invitedCount: Int
        let inviteCap: Int
        let creditsPerRedemption: Int
    }

    /// Fetch the user's referral code + redemption stats. Server lazily
    /// issues a code on first call so existing users don't need a backfill.
    func fetchReferralInfo() async throws -> ReferralInfo {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/referrals/me"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
        return try JSONDecoder().decode(ReferralInfo.self, from: data)
    }

    /// Apply a referral code as the invitee. Returns the friendly error
    /// message from the server when the RPC rejects (self-referral,
    /// already-redeemed, etc).
    func applyReferralCode(_ code: String) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/referrals/apply"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        struct Body: Encodable { let code: String }
        req.httpBody = try JSONEncoder().encode(Body(code: code))
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse else { throw Error.network }
        if !(200..<300).contains(http.statusCode) {
            // Surface the friendly server message to the UI
            struct Err: Decodable { let error: String? }
            let serverMessage = (try? JSONDecoder().decode(Err.self, from: data).error) ?? "Couldn't redeem this code."
            throw NSError(
                domain: "ClipForgeAPI.Referral",
                code: http.statusCode,
                userInfo: [NSLocalizedDescriptionKey: serverMessage]
            )
        }
    }

    // MARK: - Feedback

    /// Send an in-app feedback message. Server stores it in clipforge.feedback
    /// (RLS denies SELECTs so other users can't read each other's messages).
    func sendFeedback(
        message: String,
        appVersion: String?,
        osVersion: String?,
        deviceModel: String?
    ) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/feedback"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        struct Body: Encodable {
            let message: String
            let appVersion: String?
            let osVersion: String?
            let deviceModel: String?
        }
        req.httpBody = try JSONEncoder().encode(
            Body(message: message, appVersion: appVersion, osVersion: osVersion, deviceModel: deviceModel)
        )
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    // MARK: - Job retry

    /// Re-queue a failed video job. Server resets status to queued, deletes
    /// any partial clip rows, and re-enqueues the BullMQ ingest job. Credits
    /// were already refunded at fail time, so no extra charge.
    func retryJob(id: String) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw Error.unauthorized
        }
        var req = URLRequest(
            url: Secrets.apiBaseURL.appendingPathComponent("/api/jobs/\(id)/retry")
        )
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw Error.network
        }
    }

    // MARK: - Clip derivatives (face swap / translation)

    /// One face-swap or translation produced from a source clip. Lives in
    /// the `clip_derivatives` table — separate from `clips` so the original
    /// stays intact and the user can compare side-by-side.
    struct Derivative: Identifiable, Decodable, Hashable {
        let id: String
        let sourceClipId: String?
        let kind: String                // "face_swap" | "translation"
        let status: String              // "queued" | "processing" | "ready" | "failed"
        let storagePath: String?
        let targetLanguage: String?
        let createdAt: String?
        let finishedAt: String?
        enum CodingKeys: String, CodingKey {
            case id, kind, status
            case sourceClipId  = "source_clip_id"
            case storagePath   = "storage_path"
            case targetLanguage = "target_language"
            case createdAt     = "created_at"
            case finishedAt    = "finished_at"
        }
    }

    /// Fetch derivatives for a clip. UI uses this to surface a "Compare"
    /// CTA when a face_swap exists, or a language-switcher for translations.
    func fetchDerivatives(forClipId clipId: String) async throws -> [Derivative] {
        try await supabase
            .schema("clipforge")
            .from("clip_derivatives")
            .select("id, source_clip_id, kind, status, storage_path, target_language, created_at, finished_at")
            .eq("source_clip_id", value: clipId)
            .order("created_at", ascending: false)
            .execute()
            .value
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
