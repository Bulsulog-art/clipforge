import Foundation

/// In-process cache for Supabase storage signed URLs.
///
/// Why: scrolling back to a previously-rendered clip in the feed used to
/// hit Supabase every time to mint a fresh signed URL — round-trip latency
/// on cellular often felt like 200–600ms. Signed URLs are valid for 30
/// minutes by default (see ClipForgeAPI.signedURL), so we can safely cache
/// for 25 minutes and reuse them — dramatically smoother scroll-back UX.
///
/// Implemented as an actor so concurrent callers (the feed scrolling fast
/// triggers `task(id:)` overlap) coalesce on the same fetch.
actor SignedURLCache {
    static let shared = SignedURLCache()

    /// 25 minutes — a 5-minute buffer below the 30-minute Supabase ceiling.
    private static let ttl: TimeInterval = 25 * 60

    /// In-flight fetches keyed by cache key — guarantees we only sign each
    /// URL once even when 3 cards request it at the same moment.
    private var inFlight: [String: Task<URL, Error>] = [:]
    private var entries: [String: (url: URL, expiresAt: Date)] = [:]

    /// Get a signed URL, hitting Supabase only when the cache is cold or
    /// the entry has aged past the TTL. Multiple concurrent callers for
    /// the same key share a single network round-trip.
    func signedURL(path: String, bucket: String) async throws -> URL {
        let key = "\(bucket)::\(path)"
        if let entry = entries[key], entry.expiresAt > Date() {
            return entry.url
        }
        if let existing = inFlight[key] {
            return try await existing.value
        }
        let task = Task<URL, Error> { [bucket, path] in
            let url = try await ClipForgeAPI.shared.signedURL(path: path, bucket: bucket)
            return url
        }
        inFlight[key] = task
        defer { inFlight[key] = nil }
        do {
            let url = try await task.value
            entries[key] = (url, Date().addingTimeInterval(Self.ttl))
            return url
        } catch {
            throw error
        }
    }

    /// Wipe the cache. Called on sign-out so a fresh session never reuses
    /// the previous user's signed URLs (defense-in-depth — the URLs would
    /// also have been issued with the prior session and Supabase rotates
    /// the JWT signer on logout anyway).
    func invalidateAll() {
        entries.removeAll()
        for (_, task) in inFlight { task.cancel() }
        inFlight.removeAll()
    }
}
