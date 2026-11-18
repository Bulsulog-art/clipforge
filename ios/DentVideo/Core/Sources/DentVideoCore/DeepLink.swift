import Foundation

/// Where a link or a notification opens the app: the week, or one video in it.
/// `https://dentvideo.com/app[/video/<id>]` (universal link, also www.) and
/// `dentvideo://app[/video/<id>]`. Anything else is not ours and is ignored.
public enum DeepLink {
    public struct Target: Equatable, Sendable {
        public var itemID: String?
        public init(itemID: String?) { self.itemID = itemID }
    }

    public static func target(_ url: URL) -> Target? {
        let scheme = url.scheme?.lowercased() ?? ""
        let host = url.host?.lowercased() ?? ""
        var parts = url.pathComponents.filter { $0 != "/" }
        switch scheme {
        case "dentvideo":
            // dentvideo://app/video/x: "app" is the host here.
            guard host == "app" || (host.isEmpty && parts.first == "app") else { return nil }
            if host.isEmpty { parts.removeFirst() }
        case "https":
            guard host == "dentvideo.com" || host == "www.dentvideo.com", parts.first == "app" else { return nil }
            parts.removeFirst()
        default:
            return nil
        }
        if parts.count >= 2, parts[0] == "video", !parts[1].isEmpty { return Target(itemID: parts[1]) }
        return Target(itemID: nil)
    }

    /// The video a push or a posting reminder names (`itemID` in its payload).
    public static func itemID(fromNotification info: [AnyHashable: Any]) -> String? {
        guard let id = info["itemID"] as? String, !id.isEmpty else { return nil }
        return id
    }
}
