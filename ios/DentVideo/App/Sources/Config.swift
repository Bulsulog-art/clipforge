import Foundation

/// Where the app talks to. No keys: the app authenticates with the clinic's own DentVideo login,
/// and the server holds every secret. `DVAPIBaseURL` (Info.plist, from Config/*.xcconfig) lets a
/// developer point a debug build at a staging server.
enum Config {
    static let apiBaseURL: URL = {
        if let s = Bundle.main.object(forInfoDictionaryKey: "DVAPIBaseURL") as? String, let u = URL(string: s), u.scheme == "https" { return u }
        return URL(string: "https://dentvideo.com/api/dentvideo/mobile/v1")!
    }()

    static let site = URL(string: "https://dentvideo.com")!
    static let help = URL(string: "https://dentvideo.com/help")!
    static let supportEmail = "hello@dentvideo.com"

    /// The help, privacy and terms pages in the app's language (the site serves /de/privacy, /tr/help …).
    static func page(_ path: String) -> URL {
        let lang = L10n.languageCode
        return lang == "en" ? site.appendingPathComponent(path) : site.appendingPathComponent(lang).appendingPathComponent(path)
    }

    /// APNs environment of this build: Xcode debug builds talk to the sandbox.
    static var pushEnvironment: String {
        #if DEBUG
        return "development"
        #else
        return "production"
        #endif
    }
}
