import Foundation

/// Shared source URL validation. NewProjectSheet + any future "paste link" UI.
///
/// The server accepts TikTok links. YouTube links are refused (HTTP 422): YouTube
/// blocks downloads from our servers, so 7 of 8 YouTube jobs failed in the 30
/// days to 2026-11-16. Say so here, before a job is queued, and point at upload.
enum SourceURL {
    enum Kind { case youtube, tiktok, other }

    /// Returns nil if the string is not a usable video source.
    static func parse(_ raw: String) -> (cleaned: String, kind: Kind)? {
        let trimmed = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty,
              let url = URL(string: trimmed),
              let host = url.host?.lowercased() else { return nil }

        // Block obviously non-http schemes (javascript:, file:, etc.)
        guard let scheme = url.scheme?.lowercased(), scheme == "http" || scheme == "https" else {
            return nil
        }

        // YouTube — accepts youtube.com/watch, youtu.be/<id>, music/shorts variants
        if host.contains("youtube.com") || host == "youtu.be" || host.hasSuffix(".youtube.com") {
            return (trimmed, .youtube)
        }

        // TikTok — accepts tiktok.com/@user/video/<id>, vm.tiktok.com/<short>
        if host.contains("tiktok.com") {
            return (trimmed, .tiktok)
        }

        return nil
    }

    /// A link the server will actually import (TikTok only).
    static func isValid(_ raw: String) -> Bool {
        parse(raw)?.kind == .tiktok
    }

    static func isYouTube(_ raw: String) -> Bool {
        parse(raw)?.kind == .youtube
    }
}
