import Foundation
import UIKit

/// Reads server-resolved feature flags from /api/flags. Flags arrive as a
/// flat { key: bool } map — the server does all the heavy lifting (tier
/// gates, rollout %, version gates) so iOS doesn't need to know the
/// conditions.
///
/// Refresh cadence:
///   • On launch (RootView wires this)
///   • Every 15min while active
///   • On foreground transition (didBecomeActiveNotification)
///
/// Cached to UserDefaults so a fresh launch with no network falls back to
/// last-known state instead of "everything off". Hits the network at most
/// once per refresh window.
@MainActor
final class FeatureFlagsService: ObservableObject {
    static let shared = FeatureFlagsService()

    @Published private(set) var flags: [String: Bool] = [:]
    private static let cacheKey = "clipforge.featureFlags.v1"
    private static let refreshIntervalSec: TimeInterval = 15 * 60
    private var refreshTimer: Timer?
    private var inFlight: Task<Void, Never>?

    private init() {
        restoreFromCache()
        startTimer()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleForeground),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    // MARK: - Public

    /// Resolve a flag. Defaults to `false` for unknown keys so an
    /// uncommitted/typo'd flag never lights up a half-built feature.
    func isEnabled(_ key: String) -> Bool {
        flags[key] ?? false
    }

    /// Force a refresh. Idempotent — concurrent callers coalesce on the
    /// existing in-flight task.
    func refresh() async {
        if let existing = inFlight { await existing.value; return }
        let task = Task { await self.doRefresh() }
        inFlight = task
        await task.value
        inFlight = nil
    }

    // MARK: - Internals

    private func startTimer() {
        refreshTimer?.invalidate()
        refreshTimer = Timer.scheduledTimer(
            withTimeInterval: Self.refreshIntervalSec,
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor in await self?.refresh() }
        }
        if let t = refreshTimer { RunLoop.current.add(t, forMode: .common) }
    }

    @objc private func handleForeground() {
        Task { @MainActor in await refresh() }
    }

    private func doRefresh() async {
        guard let token = SupabaseService.shared.session?.accessToken else { return }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/flags"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(appVersion(), forHTTPHeaderField: "X-App-Version")
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                return
            }
            struct Resp: Decodable { let flags: [String: Bool] }
            let parsed = try JSONDecoder().decode(Resp.self, from: data)
            self.flags = parsed.flags
            persistToCache(parsed.flags)
        } catch {
            // Silent — UI uses stale cached flags until the next tick
        }
    }

    private func persistToCache(_ flags: [String: Bool]) {
        if let data = try? JSONEncoder().encode(flags) {
            UserDefaults.standard.set(data, forKey: Self.cacheKey)
        }
    }

    private func restoreFromCache() {
        guard let data = UserDefaults.standard.data(forKey: Self.cacheKey),
              let cached = try? JSONDecoder().decode([String: Bool].self, from: data) else {
            return
        }
        self.flags = cached
    }

    private func appVersion() -> String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "\(v).\(b)"
    }
}
