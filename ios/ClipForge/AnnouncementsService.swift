import Foundation
import UIKit

/// Fetches in-app announcements ("what's new" cards, maintenance notices,
/// promo callouts) from /api/announcements and stores them as @Published
/// so Studio can render one at the top. Dismissals are client-only via
/// UserDefaults — once you swipe an id away it stays gone.
@MainActor
final class AnnouncementsService: ObservableObject {
    static let shared = AnnouncementsService()

    @Published private(set) var items: [Announcement] = []

    private static let dismissedKey = "clipforge.announcements.dismissedIds"

    struct Announcement: Identifiable, Decodable, Hashable {
        let id: String
        let title: String
        let body: String
        let ctaText: String?
        let ctaUrl: String?
    }

    private init() {}

    func refresh() async {
        guard let token = SupabaseService.shared.session?.accessToken else { return }
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/announcements"))
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(appVersion(), forHTTPHeaderField: "X-App-Version")
        do {
            let (data, resp) = try await URLSession.shared.data(for: req)
            guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
                return
            }
            struct Resp: Decodable { let announcements: [Announcement] }
            let all = (try? JSONDecoder().decode(Resp.self, from: data).announcements) ?? []
            let dismissed = dismissedIds()
            self.items = all.filter { !dismissed.contains($0.id) }
        } catch {
            // Silent — banner just won't appear if the fetch failed.
        }
    }

    func dismiss(_ id: String) {
        var s = dismissedIds()
        s.insert(id)
        UserDefaults.standard.set(Array(s), forKey: Self.dismissedKey)
        items.removeAll { $0.id == id }
    }

    // MARK: - Helpers

    private func dismissedIds() -> Set<String> {
        let arr = UserDefaults.standard.array(forKey: Self.dismissedKey) as? [String] ?? []
        return Set(arr)
    }

    private func appVersion() -> String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "\(v).\(b)"
    }
}
