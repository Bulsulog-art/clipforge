import Foundation

/// "Today's pick" — pre-fetches the single highest-signal trending hook for
/// the user's preferred niche and caches it in UserDefaults for 6h so the
/// Studio screen feels alive without hammering the API.
///
/// Niche selection priority:
///   1. last-used niche from a finished job (most signal about user taste)
///   2. saved preference (UserDefaults `clipforge.preferredNiche`)
///   3. "motivation" — the broadest default
///
/// Cache strategy: we serialize `DailyPick` to UserDefaults under a key that
/// embeds the day-of-year. A new fire on day N gives the user a fresh pick
/// without needing a network round-trip; failed fetches gracefully fall back
/// to the prior pick if it's still within 24h.
@MainActor
final class DailyPickService: ObservableObject {
    static let shared = DailyPickService()

    @Published private(set) var pick: DailyPick?
    @Published private(set) var loading = false
    @Published private(set) var lastError: String?

    private static let preferredNicheKey = "clipforge.preferredNiche"
    private static let cacheKey = "clipforge.dailyPick.cache.v1"

    /// Cache TTL — 6h gives us 4 fresh picks per day, enough to feel curated
    /// without being chatty. Trend snapshots themselves refresh every 24h
    /// server-side, so anything tighter is wasted.
    private static let cacheTTL: TimeInterval = 6 * 60 * 60

    private init() { restoreFromCache() }

    /// Refresh today's pick. Cheap when the cache is warm — only hits the
    /// network if the cache TTL has expired or the niche changed.
    /// Pass a fresh niche to override (e.g. when the user picks a different
    /// niche in the Trends tab).
    func refresh(preferredNiche override: String? = nil) async {
        let niche = override ?? Self.loadPreferredNiche()
        if let cached = pick,
           cached.niche == niche,
           Date().timeIntervalSince(cached.fetchedAt) < Self.cacheTTL {
            return
        }
        loading = true
        defer { loading = false }
        do {
            let snap = try await ClipForgeAPI.shared.fetchTrends(niche: niche)
            guard let first = snap.items.first else {
                self.pick = nil
                self.lastError = nil
                return
            }
            let dp = DailyPick(
                niche: niche,
                hook: (first["hook"] as? String) ?? "",
                title: (first["title"] as? String) ?? "",
                whyItWorks: first["why_it_works"] as? String,
                platform: first["platform"] as? String,
                fetchedAt: Date()
            )
            self.pick = dp
            self.lastError = nil
            persist(dp)
        } catch {
            // Keep the previously cached pick visible if it's still recent —
            // a flaky network shouldn't blank the Studio hero.
            self.lastError = error.localizedDescription
            if let p = pick, Date().timeIntervalSince(p.fetchedAt) > 24 * 60 * 60 {
                self.pick = nil
            }
        }
    }

    /// Save the niche the user last engaged with so subsequent picks track
    /// their taste. Called from places like NewProjectSheet on submit.
    static func rememberNiche(_ niche: String) {
        UserDefaults.standard.set(niche, forKey: preferredNicheKey)
    }

    private static func loadPreferredNiche() -> String {
        UserDefaults.standard.string(forKey: preferredNicheKey) ?? "motivation"
    }

    private func persist(_ pick: DailyPick) {
        if let data = try? JSONEncoder().encode(pick) {
            UserDefaults.standard.set(data, forKey: Self.cacheKey)
        }
    }

    private func restoreFromCache() {
        guard let data = UserDefaults.standard.data(forKey: Self.cacheKey),
              let cached = try? JSONDecoder().decode(DailyPick.self, from: data) else {
            return
        }
        // Restore even stale picks — `refresh()` will replace them, and
        // showing yesterday's pick beats a blank state on cold launch.
        self.pick = cached
    }
}

/// Minimal serializable shape that powers the Studio hero card.
struct DailyPick: Codable, Equatable {
    let niche: String
    let hook: String
    let title: String
    let whyItWorks: String?
    let platform: String?
    let fetchedAt: Date
}
