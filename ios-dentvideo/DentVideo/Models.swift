import Foundation

/// One video in a clinic's week, as the app shows it.
struct VideoItem: Identifiable, Equatable, Hashable {
    enum Status: String { case queued, working, ready, flagged, rejected, failed }
    enum Approval: String { case pending, approved, rejected }

    let id: String
    let title: String
    let weekOf: String          // yyyy-MM-dd, the Monday of the delivery week
    var status: Status
    var approval: Approval
    var approvalNote: String?
    let caption: String?
    let hashtags: [String]
    var postedAt: Date?
    let videoURL: URL?
    let thumbURL: URL?

    /// What the dentist sees on the card: one state, one action.
    enum Stage: Equatable { case making, needsReview, approved, changesRequested, unavailable }

    var stage: Stage {
        switch status {
        case .queued, .working: return .making
        case .failed, .rejected: return .unavailable
        case .ready, .flagged:
            guard videoURL != nil else { return .making }
            switch approval {
            case .pending: return .needsReview
            case .approved: return .approved
            case .rejected: return .changesRequested
            }
        }
    }

    /// Only a finished video can be decided on (the server enforces the same).
    var canDecide: Bool { status == .ready || status == .flagged }

    /// The text to paste under the post: caption, then hashtags.
    var postText: String {
        let tags = hashtags.map { $0.hasPrefix("#") ? $0 : "#\($0)" }.joined(separator: " ")
        return [caption ?? "", tags].filter { !$0.isEmpty }.joined(separator: "\n\n")
    }
}

/// The signed-in clinic.
struct Clinic: Equatable {
    let name: String
    let email: String
    /// "trial" until the clinic's subscription is active. The app never sells:
    /// it only says whether videos are being made.
    let active: Bool
    let paused: Bool
}

/// Weeks, newest first, each with its videos in a stable order.
struct Week: Identifiable, Equatable {
    let weekOf: String
    var items: [VideoItem]
    var id: String { weekOf }

    var needsReview: Int { items.filter { $0.stage == .needsReview }.count }
    var approved: Int { items.filter { $0.stage == .approved }.count }

    static func group(_ items: [VideoItem]) -> [Week] {
        let byWeek = Dictionary(grouping: items, by: \.weekOf)
        return byWeek.keys.sorted(by: >).map { key in
            Week(weekOf: key, items: byWeek[key]!.sorted { $0.title < $1.title })
        }
    }
}

enum WeekLabel {
    private static let parser: DateFormatter = {
        let f = DateFormatter()
        f.calendar = Calendar(identifier: .gregorian)
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateFormat = "yyyy-MM-dd"
        return f
    }()

    static func date(_ weekOf: String) -> Date? { parser.date(from: weekOf) }

    /// "Week of 9 November" in the device's language.
    static func title(_ weekOf: String, locale: Locale = .current) -> String {
        guard let d = date(weekOf) else { return weekOf }
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = TimeZone(identifier: "UTC")
        f.setLocalizedDateFormatFromTemplate("d MMMM")
        return String(localized: "Week of \(f.string(from: d))")
    }
}
