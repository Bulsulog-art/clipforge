import Foundation

/// Features the app only shows once they work in production.
enum FeatureGates {
    /// Posting to TikTok / Instagram / YouTube / X. Off: none of the platform
    /// OAuth apps is configured on the server and no account has ever been
    /// connected (checked 2026-11-16), so the Channels tab and every "Publish"
    /// button would sell a Plus feature that cannot work. Clips are saved or
    /// shared from the share sheet instead.
    static let socialPublishing = false
}
