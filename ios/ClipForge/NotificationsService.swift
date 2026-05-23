import Foundation
import SwiftUI

/// In-app notifications inbox — synthesises a timeline from existing
/// user-owned data (jobs + publishes) without needing a new server-side
/// notifications table. Users who miss a push (DND, off-device, etc.)
/// can still see what happened.
///
/// Unread tracking: a UserDefaults set of "seen" notification IDs so the
/// bell badge clears on inbox open but the rows themselves stay visible
/// (timeline behaviour, not inbox-zero).
@MainActor
final class NotificationsService: ObservableObject {
    static let shared = NotificationsService()

    @Published private(set) var items: [Item] = []
    @Published private(set) var unreadCount: Int = 0

    private static let seenKey = "clipforge.notifications.seenIds"
    private var seenIds: Set<String> {
        get {
            let arr = UserDefaults.standard.array(forKey: Self.seenKey) as? [String] ?? []
            return Set(arr)
        }
        set { UserDefaults.standard.set(Array(newValue), forKey: Self.seenKey) }
    }

    private init() {}

    /// One synthesised notification. Derived from either a video_jobs row
    /// or a publishes row — never persisted server-side.
    struct Item: Identifiable, Equatable {
        let id: String          // stable, e.g. "job_ready:<uuid>" or "publish:<uuid>"
        let kind: Kind
        let title: String
        let body: String
        let date: Date
        let deepLink: DeepLink?

        // Nested enums need explicit Equatable conformance so the
        // auto-synthesised Item: Equatable can compare these fields.
        enum Kind: Equatable { case jobReady, jobFailed, publishDone, publishFailed }
        enum DeepLink: Equatable {
            case jobId(String), publishHistory, externalURL(URL)
        }
    }

    /// Reload from the user's jobs + publish history. Cheap; both endpoints
    /// return small lists and we already hit them from other surfaces.
    func reload() async {
        async let jobsT = ClipForgeAPI.shared.fetchJobs()
        async let publishesT = ClipForgeAPI.shared.fetchPublishHistory()

        let jobs = (try? await jobsT) ?? []
        let publishes = (try? await publishesT) ?? []
        items = synthesise(jobs: jobs, publishes: publishes)
        recomputeUnread()
    }

    func markAllRead() {
        var s = seenIds
        for item in items { s.insert(item.id) }
        seenIds = s
        recomputeUnread()
    }

    // MARK: - Internals

    private func synthesise(
        jobs: [VideoJob],
        publishes: [ClipForgeAPI.PublishHistoryRow]
    ) -> [Item] {
        let cutoff = Date().addingTimeInterval(-7 * 24 * 60 * 60)   // last 7 days only
        let isoStrict = ISO8601DateFormatter()
        let isoFrac: ISO8601DateFormatter = {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return f
        }()
        func parse(_ s: String?) -> Date? {
            guard let s else { return nil }
            return isoStrict.date(from: s) ?? isoFrac.date(from: s)
        }

        var out: [Item] = []

        // Job events
        for job in jobs {
            guard let created = parse(job.createdAt), created >= cutoff else { continue }
            switch job.status {
            case "ready":
                out.append(Item(
                    id: "job_ready:\(job.id)",
                    kind: .jobReady,
                    title: "Your clips are ready",
                    body: "\(job.title ?? "Untitled") — tap to view your clip set.",
                    date: created,
                    deepLink: .jobId(job.id)
                ))
            case "failed":
                out.append(Item(
                    id: "job_failed:\(job.id)",
                    kind: .jobFailed,
                    title: "Render failed",
                    body: "\(job.title ?? "Untitled") didn't finish. Tap to retry.",
                    date: created,
                    deepLink: .jobId(job.id)
                ))
            default:
                break
            }
        }

        // Publish events
        for pub in publishes {
            if let when = parse(pub.publishedAt), when >= cutoff, pub.status == "published" {
                let platformName = pub.platform.capitalized
                let url = pub.externalUrl.flatMap { URL(string: $0) }
                out.append(Item(
                    id: "publish_done:\(pub.id)",
                    kind: .publishDone,
                    title: "Posted to \(platformName)",
                    body: pub.clipHook ?? "Your clip is live.",
                    date: when,
                    deepLink: url.map { .externalURL($0) } ?? .publishHistory
                ))
            } else if let when = parse(pub.createdAt), when >= cutoff,
                      pub.status == "failed",
                      pub.errorMessage != "Cancelled by user" {
                out.append(Item(
                    id: "publish_failed:\(pub.id)",
                    kind: .publishFailed,
                    title: "Publish to \(pub.platform.capitalized) failed",
                    body: pub.errorMessage ?? "Tap to retry from the Publish history.",
                    date: when,
                    deepLink: .publishHistory
                ))
            }
        }

        return out.sorted { $0.date > $1.date }
    }

    private func recomputeUnread() {
        let seen = seenIds
        unreadCount = items.reduce(0) { $0 + (seen.contains($1.id) ? 0 : 1) }
    }
}
