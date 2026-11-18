import Foundation

/// The logo preview before the paywall, and the clinic's own requests (docs/IOS_APP_PLAN.md §3).
extension APIClient {
    // MARK: Preview

    /// GET preview: the samples for the clinic's services and language, and its look.
    public func preview() async throws -> PreviewInfo { try await send("preview") }

    /// One sample's plan, from the preview library on the API's own origin (public, no session).
    public func previewPlan(path: String) async throws -> PreviewPlan {
        guard PreviewInfo.isLibraryPath(path) else { throw APIError.refused(code: "not_found", message: nil) }
        return try await send(path, auth: false)
    }

    /// The narration's address on the API's own origin, or nil (silent sample, or not a library path).
    public nonisolated func previewAudioURL(_ path: String?) -> URL? {
        guard let path, PreviewInfo.isLibraryPath(path) else { return nil }
        return url(for: path)
    }

    /// POST logo: the image bytes (PNG, JPEG or WebP, at most 5 MB). The server stores them and puts
    /// the logo on the clinic; the app never names a path.
    public func uploadLogo(_ data: Data, contentType: String) async throws -> LogoUpload {
        try await send("logo", method: "POST", body: RawBody(data: data, contentType: contentType))
    }

    /// The clinic's profile with a new brand colour ("0F5C5C"), saved like the settings form.
    public func saveBrandColor(_ hex: String, profile: ClinicProfile) async throws -> ClinicProfile {
        var p = profile
        p.brandColor = hex
        try await saveClinic(p)
        return p.cleaned()
    }

    // MARK: Topic suggestions

    /// GET topic-requests: the clinic's suggestions, newest first.
    public func topics() async throws -> TopicsAnswer { try await send("topic-requests") }

    /// POST topic-requests { text }. A refusal (length, links, ad rules, 5 waiting) is
    /// `APIError.refused` with the server's sentence in the clinic's language.
    public func suggestTopic(_ text: String) async throws -> TopicSent {
        try await send("topic-requests", method: "POST", body: ["text": RequestRules.clean(text)])
    }

    /// DELETE topic-requests/{id}: withdraw one still waiting.
    public func withdrawTopic(_ id: String) async throws {
        _ = try await sendRaw("topic-requests/\(Self.pathSafe(id))", method: "DELETE", body: nil)
    }

    // MARK: Changes and subtitles

    /// POST items/{id}/change { note }. The weekly cap is `APIError.refused(code: "limit", …)`.
    public func requestChange(itemID: String, note: String) async throws -> ChangeSent {
        try await send("items/\(Self.pathSafe(itemID))/change", method: "POST", body: ["note": RequestRules.clean(note)])
    }

    /// GET items/{id}/subtitles?format=srt: the file's text (UTF-8). 404 (no subtitles) is
    /// `APIError.refused(code: nil, …)`.
    public func subtitles(itemID: String) async throws -> Data {
        let data = try await sendRaw("items/\(Self.pathSafe(itemID))/subtitles?format=srt", method: "GET", body: nil)
        guard !data.isEmpty, String(data: data, encoding: .utf8) != nil else { throw APIError.decoding }
        return data
    }
}
