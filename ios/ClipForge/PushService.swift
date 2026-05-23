import Foundation
import SwiftUI
import UserNotifications
import UIKit

/// Manages Apple Push Notification (APNs) registration and token sync with Supabase.
@MainActor
final class PushService: NSObject, ObservableObject {
    static let shared = PushService()

    @Published var permission: UNAuthorizationStatus = .notDetermined
    @Published var deviceToken: String?

    private override init() { super.init() }

    func bootstrap() async {
        UNUserNotificationCenter.current().delegate = self
        await refreshAuthorization()
    }

    func refreshAuthorization() async {
        let s = await UNUserNotificationCenter.current().notificationSettings()
        permission = s.authorizationStatus
    }

    /// Asks the user for permission (call after onboarding / first job completed).
    func requestPermission() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current()
                .requestAuthorization(options: [.alert, .badge, .sound])
            permission = granted ? .authorized : .denied
            if granted { UIApplication.shared.registerForRemoteNotifications() }
            return granted
        } catch {
            return false
        }
    }

    /// Called by AppDelegate when APNs returns a device token.
    func register(deviceToken raw: Data) {
        let token = raw.map { String(format: "%02x", $0) }.joined()
        self.deviceToken = token
        Task { await sync(token: token) }
    }

    func registerFailed(_ error: Error) {
        Telemetry.capture(error, context: ["op": "apns_register"])
    }

    private func sync(token: String) async {
        guard let userId = SupabaseService.shared.session?.user.id else { return }
        // upsert into clipforge.push_tokens (created via migration 00005)
        struct Row: Encodable {
            let user_id: String
            let token: String
            let platform: String
        }
        do {
            try await SupabaseService.shared.client
                .schema("clipforge")
                .from("push_tokens")
                .upsert(Row(user_id: userId.uuidString, token: token, platform: "ios"),
                        onConflict: "user_id,token")
                .execute()
        } catch {
            Telemetry.capture(error, context: ["op": "push_token_sync"])
        }
    }

    /// Remove the current device's push token from the server so a signed-out
    /// account doesn't receive notifications meant for the now-signed-in one.
    /// No-op when offline; server cleanup will catch up via TTL on the token.
    func unregisterToken() async {
        guard let token = deviceToken,
              let userId = SupabaseService.shared.session?.user.id else { return }
        do {
            try await SupabaseService.shared.client
                .schema("clipforge")
                .from("push_tokens")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("token", value: token)
                .execute()
        } catch {
            Telemetry.capture(error, context: ["op": "push_token_unregister"])
        }
    }
}

extension PushService: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler:
            @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show banner + sound even in foreground
        completionHandler([.banner, .sound, .badge])
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // Deeplinks routed via NotificationCenter → AppState picks them up
        // and adjusts selectedTab / pending*Id accordingly. Supported kinds:
        //   • clip pipeline ready  → jobId
        //   • avatar ready         → clipId
        //   • trend match          → kind=trend_match + niche
        let info = response.notification.request.content.userInfo
        var payload: [AnyHashable: Any] = [:]
        if let jobId = info["jobId"] as? String { payload["jobId"] = jobId }
        if let clipId = info["clipId"] as? String { payload["clipId"] = clipId }
        if let kind = info["kind"] as? String, kind == "trend_match" {
            payload["trendNiche"] = info["niche"] as? String ?? ""
        }
        if !payload.isEmpty {
            NotificationCenter.default.post(
                name: .clipForgeOpenJob, object: nil, userInfo: payload
            )
        }
        completionHandler()
    }
}

extension Notification.Name {
    static let clipForgeOpenJob = Notification.Name("clipforge.openJob")
}
