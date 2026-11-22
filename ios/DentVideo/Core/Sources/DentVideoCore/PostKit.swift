import Foundation

/// The networks the post sheet prepares a text for.
public enum PostNetwork: String, CaseIterable, Sendable {
    /// Instagram Reels (and Facebook): the full caption with hashtags.
    case instagram
    /// TikTok and YouTube Shorts: one sentence and three hashtags.
    case short
}

/// "Zero effort from Monday's video to a posted Reel" — the app's half of web/src/lib/dentvid/posting.ts.
public enum PostKit {
    /// The ready-to-paste text. The server's post kit when there is one, else built from the caption
    /// and hashtags exactly as the web does for older videos.
    public static func text(for item: VideoItem, network: PostNetwork) -> String {
        if let post = item.post {
            return network == .instagram ? post.instagram : post.short
        }
        let built = build(caption: item.caption, hashtags: item.hashtags)
        return network == .instagram ? built.instagram : built.short
    }

    /// Instagram allows at most five hashtags on a post or Reel (announced December 2025). The same
    /// number as INSTAGRAM_MAX_HASHTAGS in web/src/lib/dentvid/posting.ts and worker/src/lib/hashtags.ts.
    public static let maxHashtags = 5

    /// The first `max` distinct tags in the order given; case and a leading "#" do not make a tag new.
    public static func capHashtags(_ tags: [String], max: Int = maxHashtags) -> [String] {
        var seen = Set<String>()
        var out: [String] = []
        for tag in tags {
            let key = (tag.hasPrefix("#") ? String(tag.dropFirst()) : tag).lowercased()
            guard !key.isEmpty, seen.insert(key).inserted else { continue }
            out.append(tag)
            if out.count >= max { break }
        }
        return out
    }

    /// Hashtags as the web keeps them: letters, digits and underscore, at most 60, "#" in front.
    public static func cleanHashtags(_ tags: [String]?) -> [String] {
        (tags ?? []).compactMap { raw in
            let bare = raw.hasPrefix("#") ? String(raw.dropFirst()) : raw
            guard !bare.isEmpty, bare.count <= 60,
                  bare.unicodeScalars.allSatisfy({ CharacterSet.letters.contains($0) || CharacterSet.decimalDigits.contains($0) || $0 == "_" || CharacterSet.nonBaseCharacters.contains($0) })
            else { return nil }
            return "#\(bare)"
        }
    }

    public static func build(caption: String?, hashtags: [String]?) -> PostTexts {
        let cap = (caption ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let tags = capHashtags(cleanHashtags(hashtags))
        let instagram = [cap, tags.joined(separator: " ")].filter { !$0.isEmpty }.joined(separator: "\n\n")
        let short = [cap.isEmpty ? "" : leadSentence(cap), tags.prefix(3).joined(separator: " ")].filter { !$0.isEmpty }.joined(separator: "\n")
        return PostTexts(instagram: instagram, short: short)
    }

    /// The first sentence of a text, at most `max` characters (cut at a word, with "…").
    public static func leadSentence(_ text: String, max: Int = 120) -> String {
        let flat = text.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        var sentence = flat
        let chars = Array(flat)
        for (i, ch) in chars.enumerated() {
            if "。！？".contains(ch) { sentence = String(chars[...i]); break }
            if ".!?".contains(ch), i + 1 == chars.count || chars[i + 1] == " " { sentence = String(chars[...i]); break }
        }
        sentence = sentence.trimmingCharacters(in: .whitespaces)
        if sentence.count <= max { return sentence }
        let cut = String(sentence.prefix(max - 1))
        if let space = cut.lastIndex(of: " "), cut.distance(from: cut.startIndex, to: space) > max / 2 {
            return String(cut[..<space]).trimmingCharacters(in: .whitespaces) + "…"
        }
        return cut.trimmingCharacters(in: .whitespaces) + "…"
    }

    /// The moment of a slot on this phone's clock (the dentist is where the clinic is).
    public static func date(of slot: Slot, timeZone: TimeZone = .current) -> Date? {
        let d = slot.date.split(separator: "-").compactMap { Int($0) }
        let t = slot.time.split(separator: ":").compactMap { Int($0) }
        guard d.count == 3, t.count == 2 else { return nil }
        var cal = Calendar(identifier: .gregorian)
        cal.timeZone = timeZone
        return cal.date(from: DateComponents(year: d[0], month: d[1], day: d[2], hour: t[0], minute: t[1]))
    }

    /// "Tue 12:30" / "Sal 12:30" / "火 12:15" — the weekday in the given language, a 24-hour time as the web shows it.
    public static func label(of slot: Slot, locale: Locale) -> String {
        guard let day = WeekBoard.day(slot.date) else { return slot.time }
        let f = DateFormatter()
        f.locale = locale
        f.timeZone = TimeZone(identifier: "UTC")
        f.setLocalizedDateFormatFromTemplate("EEE")
        return "\(f.string(from: day.addingTimeInterval(12 * 3600))) \(slot.time)"
    }
}

/// Handing a saved video to the installed apps. No SDK and no app key: the public URL schemes only.
public enum ShareTarget: String, CaseIterable, Sendable {
    case instagram, tiktok

    /// The URLs to try in order. Instagram's library link opens its composer on the saved video
    /// where supported; otherwise the app simply opens and the video is the newest in Photos.
    public func urls(localIdentifier: String?) -> [URL] {
        switch self {
        case .instagram:
            var list: [URL] = []
            if let id = localIdentifier, let enc = id.addingPercentEncoding(withAllowedCharacters: .alphanumerics),
               let u = URL(string: "instagram://library?LocalIdentifier=\(enc)") { list.append(u) }
            list.append(URL(string: "instagram://app")!)
            return list
        case .tiktok:
            return [URL(string: "tiktok://")!, URL(string: "snssdk1233://")!]
        }
    }

    /// LSApplicationQueriesSchemes the app must declare for canOpenURL.
    public static let querySchemes = ["instagram", "tiktok", "snssdk1233"]
}

/// What the app accepts as a recording, the same limits as the web (storage-quota.ts).
public enum UploadRules {
    public static let maxBytes: Int64 = 500 * 1024 * 1024
    public static let contentTypes = ["video/mp4", "video/quicktime", "video/webm", "video/x-m4v"]

    public enum Problem: Equatable, Sendable { case empty, tooLarge, type }

    public static func contentType(forExtension ext: String) -> String? {
        switch ext.lowercased() {
        case "mov": return "video/quicktime"
        case "mp4": return "video/mp4"
        case "m4v": return "video/x-m4v"
        case "webm": return "video/webm"
        default: return nil
        }
    }

    public static func check(size: Int64, contentType: String?) -> Problem? {
        guard let contentType, contentTypes.contains(contentType.lowercased()) else { return .type }
        if size <= 0 { return .empty }
        if size > maxBytes { return .tooLarge }
        return nil
    }
}

/// What the app shows for an account, from /me. Never a price, never a way to buy.
public enum AccessState: Equatable, Sendable {
    /// The week loop is open.
    case active(recordings: Bool)
    /// Signed in, no clinic described yet (that happens on the web).
    case noClinic
    /// No active plan right now: a neutral screen with sign-out and account deletion only.
    case noPlan
    /// Paused by DentVideo: the support address.
    case paused

    public static func of(_ me: Me) -> AccessState {
        guard me.clinic != nil, let plan = me.plan else { return me.clinic == nil ? .noClinic : .noPlan }
        if plan.adminPaused { return .paused }
        if plan.canMake { return .active(recordings: plan.recordings) }
        // A cancelled plan that is still paid up keeps its library; anything else is "no active plan".
        return .noPlan
    }
}
