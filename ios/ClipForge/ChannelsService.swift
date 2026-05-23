import Foundation
import AuthenticationServices
import UIKit

/// Manages the user's connected social channels (TikTok, Instagram, YouTube).
///
/// The OAuth dance lives entirely on our backend — iOS just opens the right
/// `/api/auth/<platform>` URL through `ASWebAuthenticationSession` with a
/// `clipforge://` return scheme. When the callback redirects back, we know
/// the row landed in `social_accounts` and we refresh.
///
/// Auto-publishing is also server-side: iOS POSTs the platform list to
/// `/api/clips/:id/publish` and polls the `publishes` table for status.
@MainActor
final class ChannelsService: NSObject, ObservableObject {
    static let shared = ChannelsService()

    @Published private(set) var channels: [ClipForgeAPI.Channel] = []
    @Published private(set) var loading = false
    @Published private(set) var connecting: Platform?
    @Published var lastError: String?

    /// Supported platforms — extend here when we add new OAuth integrations.
    enum Platform: String, CaseIterable, Identifiable {
        case tiktok, instagram, youtube
        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .tiktok:    return "TikTok"
            case .instagram: return "Instagram Reels"
            case .youtube:   return "YouTube Shorts"
            }
        }

        var sfSymbol: String {
            switch self {
            case .tiktok:    return "music.note"
            case .instagram: return "camera.fill"
            case .youtube:   return "play.rectangle.fill"
            }
        }

        /// Brand accent for cards/buttons. Kept light so we match our dark theme.
        var accent: (red: Double, green: Double, blue: Double) {
            switch self {
            case .tiktok:    return (0.13, 0.94, 0.92)  // cyan
            case .instagram: return (0.91, 0.30, 0.55)  // pink
            case .youtube:   return (0.99, 0.10, 0.10)  // red
            }
        }

        var marketingTagline: String {
            switch self {
            case .tiktok:    return "Auto-publish vertical clips directly to your TikTok feed."
            case .instagram: return "Drop Reels into your Instagram — captions and #hashtags ready."
            case .youtube:   return "Upload Shorts under 60s with title and hashtags pre-filled."
            }
        }
    }

    private override init() { super.init() }

    // MARK: - Read

    /// Refresh the connected channels list. Safe to call repeatedly.
    func refresh() async {
        loading = true
        defer { loading = false }
        do {
            self.channels = try await ClipForgeAPI.shared.listChannels()
            self.lastError = nil
        } catch {
            self.lastError = error.localizedDescription
            Telemetry.capture(error, context: ["op": "channels_refresh"])
        }
    }

    /// Snapshot lookup — does the user have this platform connected?
    func isConnected(_ p: Platform) -> Bool {
        channels.contains { $0.platform == p.rawValue }
    }

    func account(for p: Platform) -> ClipForgeAPI.Channel? {
        channels.first { $0.platform == p.rawValue }
    }

    var connectedPlatforms: [Platform] {
        Platform.allCases.filter { isConnected($0) }
    }

    // MARK: - Connect (OAuth via ASWebAuthenticationSession)

    /// Run the OAuth flow for a platform. Opens our backend OAuth start URL
    /// in a system-managed in-app browser, waits for the `clipforge://oauth/...`
    /// callback, then refreshes the channel list.
    ///
    /// Throws when the user cancels (we treat that as a no-op).
    func connect(_ platform: Platform) async {
        connecting = platform
        defer { connecting = nil }

        let callback = "clipforge://oauth/\(platform.rawValue)"
        var components = URLComponents(url: Secrets.apiBaseURL, resolvingAgainstBaseURL: false)!
        components.path = "/api/auth/\(platform.rawValue)"
        components.queryItems = [URLQueryItem(name: "returnTo", value: callback)]

        guard let startURL = components.url else {
            lastError = "Could not build OAuth URL"
            return
        }

        do {
            let returned = try await startSession(url: startURL, callbackScheme: "clipforge")
            // Read query items for an "error" param. Web callbacks set
            // ?error=... on failure paths (no IG business account, expired
            // state, etc.) so we can surface a useful message.
            if let comps = URLComponents(url: returned, resolvingAgainstBaseURL: false),
               let err = comps.queryItems?.first(where: { $0.name == "error" })?.value {
                lastError = friendlyOAuthError(err, platform: platform)
                await Haptics.notify(.error)
                return
            }
            await Haptics.notify(.success)
            await refresh()
        } catch ASWebAuthenticationSessionError.canceledLogin {
            // User dismissed — silent
        } catch {
            lastError = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    // MARK: - Disconnect

    func disconnect(_ channel: ClipForgeAPI.Channel) async {
        do {
            try await ClipForgeAPI.shared.disconnectChannel(id: channel.id)
            await refresh()
            await Haptics.notify(.success)
        } catch {
            lastError = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    // MARK: - Internals

    /// Wraps ASWebAuthenticationSession in async/await. Apple's API still uses
    /// completion handlers and a window anchor we have to provide via the
    /// `presentationContextProvider` delegate (see extension below).
    private func startSession(url: URL, callbackScheme: String) async throws -> URL {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<URL, Swift.Error>) in
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: callbackScheme
            ) { callbackURL, error in
                if let error { cont.resume(throwing: error); return }
                guard let callbackURL else {
                    cont.resume(throwing: ClipForgeAPI.Error.network)
                    return
                }
                cont.resume(returning: callbackURL)
            }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false  // share cookies with system browser → faster re-auth
            if !session.start() {
                cont.resume(throwing: ClipForgeAPI.Error.network)
            }
        }
    }

    private func friendlyOAuthError(_ raw: String, platform: Platform) -> String {
        switch raw {
        case "ig_no_business_account":
            return "Your Instagram account isn't connected to a Professional/Business profile. Switch your IG to Professional in the Instagram app, link it to a Facebook Page, then try again."
        case "ig_config_missing":
            return "Instagram isn't configured on our server yet. Please contact support."
        case "ig_token", "instagram_oauth":
            return "Instagram connection didn't complete. Please try again."
        case "yt_no_channel":
            return "We couldn't find a YouTube channel on your Google account. Create one at youtube.com first."
        case "yt_config_missing":
            return "YouTube isn't configured on our server yet. Please contact support."
        case "yt_token", "youtube_oauth":
            return "YouTube connection didn't complete. Please try again."
        case "tiktok_oauth", "tiktok_token":
            return "TikTok connection didn't complete. Please try again."
        default:
            return "Connection to \(platform.displayName) failed: \(raw)"
        }
    }
}

// MARK: - ASWebAuthenticationPresentationContextProviding

extension ChannelsService: ASWebAuthenticationPresentationContextProviding {
    nonisolated func presentationAnchor(
        for session: ASWebAuthenticationSession
    ) -> ASPresentationAnchor {
        // ASWebAuthenticationSession needs a window to anchor its sheet to.
        // Find the foremost scene's key window; bail to a fresh window if
        // we're called before one exists (shouldn't happen in our flow).
        MainActor.assumeIsolated {
            let scenes = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .filter { $0.activationState == .foregroundActive }
            return scenes.first?.keyWindow ?? UIWindow()
        }
    }
}
