import Foundation

enum Secrets {
    // RevenueCat Public iOS API key (Project Settings → API keys)
    static let revenueCatIOSKey = "appl_REPLACE_ME"

    // Supabase
    static let supabaseURL = URL(string: "https://REPLACE.supabase.co")!
    static let supabaseAnonKey = "REPLACE_WITH_ANON_KEY"

    static let apiBaseURL = URL(string: "https://clipforge.bulsulabs.xyz")!

    /// Sentry DSN. Empty string = telemetry disabled (safe default for dev).
    /// Get one from https://sentry.io → Projects → ClipForge iOS → Settings → SDK Setup.
    static let sentryDSN = ""
}
