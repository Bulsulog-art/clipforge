import Foundation

// A clinic's own requests, as the web has them (web/src/lib/dentvid/clinic-requests.ts,
// web/src/content/dentvideo-requests.ts, web/src/components/dentvid/clinic-requests.tsx):
//   - "Suggest a topic for next week": plain text, 3 to 140 characters, at most 5 waiting;
//   - "Ask for a change" on one generated video: a note of 3 to 300 characters, 3 a week;
//   - "Download subtitles (.srt)" next to the video.
// The server decides; the app only keeps its buttons honest (lengths, a change already running).

public enum ChangeStatus: String, Codable, Sendable {
    case queued, working, done, refused, failed, unknown
    public init(from decoder: Decoder) throws {
        self = ChangeStatus(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

public enum ChangeReason: String, Codable, Sendable, CaseIterable {
    case checks
    case noPlan = "no_plan"
    case busy, technical
    case notPossible = "not_possible"
    public init(from decoder: Decoder) throws {
        self = ChangeReason(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .technical
    }
}

/// The latest change request of a video (items[].change), or the row POST change answers.
public struct ChangeView: Codable, Sendable, Equatable {
    public var status: ChangeStatus
    public var reason: ChangeReason?
    /// When it was asked (ISO 8601).
    public var at: String?

    enum CodingKeys: String, CodingKey { case status, reason, at, createdAt = "created_at" }

    public init(status: ChangeStatus, reason: ChangeReason? = nil, at: String? = nil) {
        self.status = status
        self.reason = reason
        self.at = at
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        status = try c.decode(ChangeStatus.self, forKey: .status)
        reason = try? c.decodeIfPresent(ChangeReason.self, forKey: .reason)
        at = (try? c.decodeIfPresent(String.self, forKey: .at)) ?? (try? c.decodeIfPresent(String.self, forKey: .createdAt))
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(status, forKey: .status)
        try c.encodeIfPresent(reason, forKey: .reason)
        try c.encodeIfPresent(at, forKey: .at)
    }
}

public enum TopicStatus: String, Codable, Sendable {
    case pending, used, refused, unknown
    public init(from decoder: Decoder) throws {
        self = TopicStatus(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

public enum TopicRefusal: String, Codable, Sendable, CaseIterable {
    case notOffered = "not_offered"
    case adRules = "ad_rules"
    case clinical, unclear, checks
    public init(from decoder: Decoder) throws {
        self = TopicRefusal(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unclear
    }
}

/// One of the clinic's topic suggestions.
public struct TopicRequest: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var text: String
    public var status: TopicStatus
    public var reason: TopicRefusal?
    /// The Monday of the week it was made for (status used).
    public var weekOf: String?

    enum CodingKeys: String, CodingKey {
        case id, text, status, reason
        case weekOf = "week_of"
    }

    public init(id: String, text: String, status: TopicStatus, reason: TopicRefusal? = nil, weekOf: String? = nil) {
        self.id = id
        self.text = text
        self.status = status
        self.reason = reason
        self.weekOf = weekOf
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        text = try c.decode(String.self, forKey: .text)
        status = try c.decode(TopicStatus.self, forKey: .status)
        reason = try? c.decodeIfPresent(TopicRefusal.self, forKey: .reason)
        weekOf = try? c.decodeIfPresent(String.self, forKey: .weekOf)
    }
}

/// GET topic-requests. `available: false`: the server has nowhere to keep suggestions yet.
public struct TopicsAnswer: Codable, Sendable, Equatable {
    public var topics: [TopicRequest]
    public var available: Bool
    public init(topics: [TopicRequest], available: Bool) {
        self.topics = topics
        self.available = available
    }
}

/// POST topic-requests: the stored suggestion and the server's thank-you sentence.
public struct TopicSent: Codable, Sendable, Equatable {
    public var topic: TopicRequest
    public var message: String?
}

/// POST items/{id}/change: the request and how many are left this week.
public struct ChangeSent: Codable, Sendable, Equatable {
    public var change: ChangeView?
    public var left: Int
}

public enum RequestRules {
    public static let topicMax = 140
    public static let noteMax = 300
    public static let minLength = 3
    /// Change requests a clinic can make per week (the worker's spend guard has the same cap).
    public static let changesPerWeek = 3
    /// Suggestions a clinic can have waiting at once.
    public static let pendingTopicsMax = 5
    /// How long a finished change's outcome stays on the video (the web's CHANGE_NOTE_DAYS).
    public static let changeNoteDays = 7

    /// Whitespace runs as one space, trimmed: what the server stores.
    public static func clean(_ s: String) -> String {
        s.split(whereSeparator: { $0.isWhitespace || $0.isNewline }).joined(separator: " ")
    }

    /// Characters as the server counts them (code points, like JavaScript's [...text]).
    public static func length(_ s: String) -> Int { clean(s).unicodeScalars.count }

    public static func canSendTopic(_ s: String) -> Bool { (minLength...topicMax).contains(length(s)) }
    public static func canSendNote(_ s: String) -> Bool { (minLength...noteMax).contains(length(s)) }

    /// Cut typing at the limit (the web's maxLength), counting as the server does.
    public static func limit(_ s: String, to max: Int) -> String {
        guard s.unicodeScalars.count > max else { return s }
        var out = String.UnicodeScalarView()
        out.append(contentsOf: s.unicodeScalars.prefix(max))
        return String(out)
    }

    public static func waiting(_ topics: [TopicRequest]) -> Int { topics.filter { $0.status == .pending }.count }

    public static func isRunning(_ c: ChangeView?) -> Bool { c?.status == .queued || c?.status == .working }

    /// "Ask for a change" is offered on a finished video the clinic has not decided on, made by
    /// DentVideo (not a clip from a recording), with no change already being made.
    public static func canAskForChange(_ item: VideoItem) -> Bool {
        item.kind == .generated && (item.status == .ready || item.status == .flagged) && item.approval == .pending && !isRunning(item.change)
    }

    /// What the video says about its latest change (the web's ChangeNote).
    public enum ChangeNote: Equatable, Sendable {
        case running(ChangeStatus)
        /// Changed: watch it again before approving.
        case done
        case notChanged(ChangeReason?)
    }

    public static func note(for item: VideoItem, now: Date = Date()) -> ChangeNote? {
        guard let c = item.change else { return nil }
        if isRunning(c) { return .running(c.status) }
        // An outcome is news for a week; a changed video's note goes once it is decided on.
        if let at = c.at.flatMap(date), now.timeIntervalSince(at) > Double(changeNoteDays) * 86_400 { return nil }
        switch c.status {
        case .done: return item.approval == .pending ? .done : nil
        case .refused, .failed: return .notChanged(c.reason)
        default: return nil
        }
    }

    /// An ISO 8601 time as the server writes it, with or without fractional seconds of any length.
    public static func date(_ s: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        if let d = f.date(from: s) { return d }
        let trimmed = s.replacingOccurrences(of: "\\.\\d+", with: "", options: .regularExpression)
        return f.date(from: trimmed)
    }

    /// "dentvideo-how-long-does-whitening-last.srt": the same name as the web's download
    /// (web/src/lib/dentvid/subtitles.ts subtitleFileName, app-ui.ts videoFileName).
    public static func subtitleFileName(_ title: String) -> String {
        let folded = title.replacingOccurrences(of: "ı", with: "i").replacingOccurrences(of: "İ", with: "I").replacingOccurrences(of: "ß", with: "ss")
        var kept = String.UnicodeScalarView()
        for u in folded.decomposedStringWithCanonicalMapping.unicodeScalars where !(0x300...0x36F).contains(u.value) { kept.append(u) }
        var slug = ""
        var dash = false
        for u in String(kept).lowercased().unicodeScalars {
            if (97...122).contains(u.value) || (48...57).contains(u.value) {
                if dash && !slug.isEmpty { slug.append("-") }
                dash = false
                slug.unicodeScalars.append(u)
            } else {
                dash = true
            }
        }
        slug = String(slug.prefix(48))
        while slug.hasSuffix("-") { slug.removeLast() }
        return slug.isEmpty ? "dentvideo.srt" : "dentvideo-\(slug).srt"
    }
}
