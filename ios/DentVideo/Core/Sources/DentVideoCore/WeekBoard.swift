import Foundation

/// The week logic, the same rules as the web (web/src/lib/dentvid/week.ts, components/dentvid/library.tsx).
public enum WeekBoard {
    static let utc: Calendar = {
        var c = Calendar(identifier: .gregorian)
        c.timeZone = TimeZone(identifier: "UTC")!
        return c
    }()

    /// Monday (UTC) of the week a date falls in, as YYYY-MM-DD.
    public static func weekOf(_ date: Date) -> String {
        let weekday = utc.component(.weekday, from: date) // Sunday = 1
        let back = (weekday + 5) % 7 // Monday = 0
        let monday = utc.date(byAdding: .day, value: -back, to: utc.startOfDay(for: date))!
        return dayString(monday)
    }

    /// The week being delivered: from Saturday 18:00 UTC on, the coming Monday's (weekOf(now + 30 h)).
    public static func deliveryWeek(_ now: Date = Date()) -> String {
        weekOf(now.addingTimeInterval(30 * 3600))
    }

    public static func dayString(_ d: Date) -> String {
        let c = utc.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year!, c.month!, c.day!)
    }

    public static func day(_ s: String) -> Date? {
        let p = s.split(separator: "-").compactMap { Int($0) }
        guard p.count == 3 else { return nil }
        return utc.date(from: DateComponents(year: p[0], month: p[1], day: p[2]))
    }

    /// What a card says about a video.
    public enum CardState: String, Sendable, CaseIterable {
        case making, review, look, approved, posted, declined, failed, notMade
    }

    public static func state(of i: LibraryItem) -> CardState {
        switch i.status {
        case .queued, .working, .unknown: return .making
        case .failed: return .failed
        case .rejected: return .notMade
        case .ready, .flagged:
            switch i.approval {
            case .approved: return i.isPosted ? .posted : .approved
            case .rejected: return .declined
            case .pending, .unknown: return i.status == .flagged ? .look : .review
            }
        }
    }

    /// Ready (not flagged), undecided videos of a week: what "Approve all ready" approves.
    public static func approveAllCandidates(_ items: [LibraryItem], week: String) -> [LibraryItem] {
        items.filter { $0.weekOf == week && $0.status == .ready && $0.approval == .pending }
    }

    public struct Progress: Equatable, Sendable {
        public var total: Int
        public var approved: Int
        public var posted: Int
        public var waiting: Int
    }

    /// Finished videos of a week and how far the dentist is with them (declined ones do not count).
    public static func progress(_ items: [LibraryItem], week: String) -> Progress {
        let made = items.filter { $0.weekOf == week && ($0.status == .ready || $0.status == .flagged) && $0.approval != .rejected }
        let approved = made.filter { $0.approval == .approved }
        return Progress(total: made.count, approved: approved.count, posted: approved.filter(\.isPosted).count, waiting: made.count - approved.count)
    }

    public struct Section: Equatable, Sendable, Identifiable {
        public var week: String
        public var items: [LibraryItem]
        public var id: String { week }
    }

    /// Weeks newest first; within a week, the posting order (by slot, then title).
    public static func sections(_ items: [LibraryItem]) -> [Section] {
        let byWeek = Dictionary(grouping: items, by: \.weekOf)
        return byWeek.keys.sorted(by: >).map { w in
            Section(week: w, items: byWeek[w]!.sorted { a, b in
                switch (a.slot, b.slot) {
                case let (x?, y?) where x != y: return (x.date, x.time) < (y.date, y.time)
                case (_?, nil): return true
                case (nil, _?): return false
                default: return a.title < b.title
                }
            })
        }
    }

    /// The next approved, unposted video with a slot at or after `now` (the reminders' list).
    public static func upcomingPosts(_ items: [LibraryItem]) -> [LibraryItem] {
        items.filter { $0.approval == .approved && !$0.isPosted && $0.slot != nil && $0.kind == .generated }
            .sorted { ($0.slot!.date, $0.slot!.time) < ($1.slot!.date, $1.slot!.time) }
    }
}
