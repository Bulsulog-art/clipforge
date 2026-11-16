import Foundation

// The shapes of /api/dentvideo/mobile/v1 (web/src/lib/dentvid/mobile.ts). Every enum decodes an
// unknown value to `.unknown` instead of failing, so a new server state never breaks the app.

/// The token set kept in the Keychain. `expiresAt` is Unix seconds.
public struct Tokens: Codable, Sendable, Equatable {
    public var accessToken: String
    public var refreshToken: String
    public var expiresAt: Int
    public var user: AccountUser

    public init(accessToken: String, refreshToken: String, expiresAt: Int, user: AccountUser) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.user = user
    }

    /// True when the access token expires within `margin` seconds.
    public func expiresSoon(now: Date = Date(), margin: TimeInterval = 60) -> Bool {
        Double(expiresAt) - now.timeIntervalSince1970 < margin
    }
}

public struct AccountUser: Codable, Sendable, Equatable {
    public var id: String
    public var email: String?
    public init(id: String, email: String?) {
        self.id = id
        self.email = email
    }
}

public struct Me: Codable, Sendable, Equatable {
    public var user: AccountUser
    public var clinic: Clinic?
    public var plan: PlanInfo?
    public var locale: String
    public var currentWeek: String

    public init(user: AccountUser, clinic: Clinic?, plan: PlanInfo?, locale: String, currentWeek: String) {
        self.user = user
        self.clinic = clinic
        self.plan = plan
        self.locale = locale
        self.currentWeek = currentWeek
    }
}

public struct Clinic: Codable, Sendable, Equatable {
    public var id: String
    public var profile: ClinicProfile
    public var logoUrl: URL?

    public init(id: String, profile: ClinicProfile, logoUrl: URL?) {
        self.id = id
        self.profile = profile
        self.logoUrl = logoUrl
    }
}

/// Exactly the keys the server's profile schema accepts (web/src/lib/dentvid/profile.ts).
public struct ClinicProfile: Codable, Sendable, Equatable {
    public var name: String
    public var city: String?
    public var country: String
    public var language: String
    public var services: [String]
    public var tone: String?
    public var address: String?
    public var handle: String?
    public var bookingUrl: String?
    public var brandColor: String?
    public var closingLine: String?
    public var narratorVoice: String?

    public init(name: String, city: String? = nil, country: String, language: String, services: [String], tone: String? = nil, address: String? = nil, handle: String? = nil, bookingUrl: String? = nil, brandColor: String? = nil, closingLine: String? = nil, narratorVoice: String? = nil) {
        self.name = name
        self.city = city
        self.country = country
        self.language = language
        self.services = services
        self.tone = tone
        self.address = address
        self.handle = handle
        self.bookingUrl = bookingUrl
        self.brandColor = brandColor
        self.closingLine = closingLine
        self.narratorVoice = narratorVoice
    }

    /// The video languages a clinic can choose (the app's interface has eight; videos also come in Italian and Portuguese).
    public static let videoLanguages = ["en", "de", "es", "fr", "it", "pt", "tr", "ja", "ar", "pl"]
    public static let narratorVoices = ["female", "male"]

    /// Empty optional text is sent as "absent", never as "" (the server refuses empty strings).
    public func cleaned() -> ClinicProfile {
        func opt(_ s: String?) -> String? {
            let t = s?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return t.isEmpty ? nil : t
        }
        var p = self
        p.name = name.trimmingCharacters(in: .whitespacesAndNewlines)
        p.city = opt(city)
        p.handle = opt(handle).map { $0.hasPrefix("@") ? String($0.dropFirst()) : $0 }
        p.bookingUrl = opt(bookingUrl)
        p.closingLine = opt(closingLine)
        p.services = services.map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        return p
    }
}

public enum PlanState: String, Codable, Sendable {
    case trial, active, paused, cancelled, unknown

    public init(from decoder: Decoder) throws {
        self = PlanState(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

/// The plan as the app shows it: a state and a name. The server never sends an amount and the
/// app never shows one (App Store guideline 3.1.3).
public struct PlanInfo: Codable, Sendable, Equatable {
    public var state: PlanState
    public var tier: String?
    public var canMake: Bool
    public var adminPaused: Bool
    public var recordings: Bool
    public var renewsAt: String?

    public init(state: PlanState, tier: String?, canMake: Bool, adminPaused: Bool, recordings: Bool, renewsAt: String?) {
        self.state = state
        self.tier = tier
        self.canMake = canMake
        self.adminPaused = adminPaused
        self.recordings = recordings
        self.renewsAt = renewsAt
    }
}

public enum ItemKind: String, Codable, Sendable {
    case generated, recording, unknown
    public init(from decoder: Decoder) throws {
        self = ItemKind(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

public enum ItemStatus: String, Codable, Sendable {
    case queued, working, ready, flagged, rejected, failed, unknown
    public init(from decoder: Decoder) throws {
        self = ItemStatus(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

public enum Approval: String, Codable, Sendable {
    case pending, approved, rejected, unknown
    public init(from decoder: Decoder) throws {
        self = Approval(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

/// Why a video needs a look (or was not made): codes only, shown in the app's language.
/// Keep in step with web/src/lib/dentvid/reasons.ts CLINIC_REASONS.
public enum ReviewReason: String, Codable, Sendable, CaseIterable {
    case pause, audio, technical, wording, opening, skipped, unavailable, generic

    public init(from decoder: Decoder) throws {
        self = ReviewReason(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .generic
    }
}

public struct PostTexts: Codable, Sendable, Equatable {
    public var instagram: String
    public var short: String
    public init(instagram: String, short: String) {
        self.instagram = instagram
        self.short = short
    }
}

/// A suggested posting moment: the day (YYYY-MM-DD) and the clinic's local clock time (HH:mm).
public struct Slot: Codable, Sendable, Equatable, Hashable {
    public var date: String
    public var time: String
    public init(date: String, time: String) {
        self.date = date
        self.time = time
    }
}

/// The filming card the worker writes for a video (what to say on camera).
public struct ShootCard: Codable, Sendable, Equatable, Hashable {
    public var opening: String
    public var points: [String]
    public var closing: String
    public var avoid: [String]?
    public var setup: [String]?
    public var minutes: Double?

    public init(opening: String, points: [String], closing: String, avoid: [String]? = nil, setup: [String]? = nil, minutes: Double? = nil) {
        self.opening = opening
        self.points = points
        self.closing = closing
        self.avoid = avoid
        self.setup = setup
        self.minutes = minutes
    }
}

public struct VideoItem: Codable, Sendable, Equatable, Identifiable {
    public var id: String
    public var kind: ItemKind
    public var status: ItemStatus
    public var approval: Approval
    public var title: String
    public var weekOf: String
    public var caption: String?
    public var hashtags: [String]?
    public var reasons: [ReviewReason]
    public var videoUrl: URL?
    public var thumbUrl: URL?
    public var post: PostTexts?
    /// When the clinic ticked it as posted; nil = not posted (or not stored on this database).
    public var postedAt: String?
    public var slot: Slot?
    public var shootCard: ShootCard?

    enum CodingKeys: String, CodingKey {
        case id, kind, status, approval, title, caption, hashtags, reasons, videoUrl, thumbUrl, post, postedAt, slot, shootCard
        case weekOf = "week_of"
    }

    public init(id: String, kind: ItemKind = .generated, status: ItemStatus, approval: Approval, title: String, weekOf: String, caption: String? = nil, hashtags: [String]? = nil, reasons: [ReviewReason] = [], videoUrl: URL? = nil, thumbUrl: URL? = nil, post: PostTexts? = nil, postedAt: String? = nil, slot: Slot? = nil, shootCard: ShootCard? = nil) {
        self.id = id
        self.kind = kind
        self.status = status
        self.approval = approval
        self.title = title
        self.weekOf = weekOf
        self.caption = caption
        self.hashtags = hashtags
        self.reasons = reasons
        self.videoUrl = videoUrl
        self.thumbUrl = thumbUrl
        self.post = post
        self.postedAt = postedAt
        self.slot = slot
        self.shootCard = shootCard
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        id = try c.decode(String.self, forKey: .id)
        kind = try c.decodeIfPresent(ItemKind.self, forKey: .kind) ?? .generated
        status = try c.decode(ItemStatus.self, forKey: .status)
        approval = try c.decode(Approval.self, forKey: .approval)
        title = try c.decodeIfPresent(String.self, forKey: .title) ?? ""
        weekOf = try c.decode(String.self, forKey: .weekOf)
        caption = try c.decodeIfPresent(String.self, forKey: .caption)
        hashtags = try c.decodeIfPresent([String].self, forKey: .hashtags)
        reasons = try c.decodeIfPresent([ReviewReason].self, forKey: .reasons) ?? []
        videoUrl = Self.webURL(try? c.decodeIfPresent(String.self, forKey: .videoUrl))
        thumbUrl = Self.webURL(try? c.decodeIfPresent(String.self, forKey: .thumbUrl))
        post = try c.decodeIfPresent(PostTexts.self, forKey: .post)
        postedAt = try c.decodeIfPresent(String.self, forKey: .postedAt)
        slot = try c.decodeIfPresent(Slot.self, forKey: .slot)
        shootCard = try? c.decodeIfPresent(ShootCard.self, forKey: .shootCard)
    }

    public var isPosted: Bool { postedAt != nil }

    /// Only an https address with a host is a media URL; anything else is dropped.
    static func webURL(_ s: String?) -> URL? {
        guard let s, let u = URL(string: s), u.scheme?.lowercased() == "https", let host = u.host, !host.isEmpty else { return nil }
        return u
    }
}

public struct ItemsResponse: Codable, Sendable, Equatable {
    public var currentWeek: String
    public var items: [VideoItem]
    public init(currentWeek: String, items: [VideoItem]) {
        self.currentWeek = currentWeek
        self.items = items
    }
}

public struct UploadTicket: Codable, Sendable, Equatable {
    public var path: String
    public var uploadUrl: URL
    public var contentType: String
}

/// The error body every route answers with.
public struct APIErrorBody: Codable, Sendable, Equatable {
    public var error: String?
    public var code: String?
    public var needsPlan: Bool?
}
