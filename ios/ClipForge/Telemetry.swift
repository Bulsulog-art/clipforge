import Foundation
import Sentry

/// Lightweight wrapper around Sentry so call sites don't depend on the SDK.
/// When `Secrets.sentryDSN` is empty (dev / before user sets it up), every
/// call here becomes a no-op + os_log, so we never crash on missing init.
enum Telemetry {

    private static let isEnabled: Bool = {
        !Secrets.sentryDSN.isEmpty
    }()

    /// Call from App.init exactly once. Safe to call without a DSN.
    static func start() {
        guard isEnabled else { return }
        SentrySDK.start { options in
            options.dsn = Secrets.sentryDSN
            options.environment = isDebug ? "debug" : "production"
            options.tracesSampleRate = 0.1
            options.profilesSampleRate = 0.0
            options.attachScreenshot = false
            options.attachStacktrace = true
            options.enableAutoBreadcrumbTracking = true
            options.enableAutoPerformanceTracing = true
            options.maxBreadcrumbs = 50
            // Don't capture cancelled-by-user errors — they pollute the issue feed
            options.beforeSend = { event in
                let msg = event.message?.formatted ?? ""
                if msg.localizedCaseInsensitiveContains("cancelled") { return nil }
                return event
            }
        }
    }

    /// Identify the authenticated user for crash attribution. Safe before login.
    static func identify(userId: String?, email: String?) {
        guard isEnabled else { return }
        let user = User()
        user.userId = userId
        user.email = email
        SentrySDK.setUser(user)
    }

    /// Clear the identified user on sign-out / delete-account.
    static func clearUser() {
        guard isEnabled else { return }
        SentrySDK.setUser(nil)
    }

    /// Capture a Swift error (non-fatal) with optional context.
    static func capture(_ error: Error, context: [String: Any] = [:]) {
        if isEnabled {
            SentrySDK.capture(error: error) { scope in
                if !context.isEmpty { scope.setContext(value: context, key: "extra") }
            }
        } else {
            print("[telemetry] \(error)\n  context=\(context)")
        }
    }

    /// Capture a non-error breadcrumb. Used for diagnostic context.
    static func breadcrumb(_ message: String, category: String = "app", level: SentryLevel = .info) {
        guard isEnabled else { return }
        let b = Breadcrumb(level: level, category: category)
        b.message = message
        SentrySDK.addBreadcrumb(b)
    }

    /// Track a domain-specific named event with structured data.
    /// Wires into Sentry's "log message" channel; in dev prints to console.
    static func event(_ name: String, _ data: [String: Any] = [:]) {
        if isEnabled {
            SentrySDK.capture(message: name) { scope in
                if !data.isEmpty { scope.setContext(value: data, key: "event") }
                scope.setLevel(.info)
            }
        } else {
            print("[event] \(name) \(data)")
        }
    }

    private static var isDebug: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }
}
