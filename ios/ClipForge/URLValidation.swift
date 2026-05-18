import Foundation

/// Shared source URL validation. NewProjectSheet + any future "paste link" UI.
///
/// Worker accepts youtube.com, youtu.be, and tiktok.com sources. Reject early on
/// the client so we don't burn a queued job + a credit attempt on a malformed URL.
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

    static func isValid(_ raw: String) -> Bool {
        parse(raw) != nil
    }
}
