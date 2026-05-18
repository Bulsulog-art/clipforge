import Foundation

enum Secrets {
    // RevenueCat Public iOS API key (Project Settings → API keys).
    // Placeholder until the user pastes the real `appl_…` key. The app still
    // runs — only the paywall pricing card shows a "Couldn't load pricing"
    // retry state until this is filled in.
    static let revenueCatIOSKey = "appl_REPLACE_ME"

    // Supabase — live values for the AuraGlow project.
    static let supabaseURL = URL(string: "https://rgtxjjnalesquhnexfez.supabase.co")!
    static let supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJndHhqam5hbGVzcXVobmV4ZmV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxNzEyMzQsImV4cCI6MjA5MTc0NzIzNH0.0rxQE5pyiSMVQEgyQZeRoMxwJ_VWR-s9XiufM8f1Ino"

    static let apiBaseURL = URL(string: "https://clipforge.bulsulabs.xyz")!

    /// Sentry DSN. Empty string = telemetry disabled (safe default for dev).
    /// Get one from https://sentry.io → Projects → ClipForge iOS → Settings → SDK Setup.
    static let sentryDSN = ""
}
