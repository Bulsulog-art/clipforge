import Foundation
import UIKit
@preconcurrency import UserNotifications
import DentVideoCore

/// Push (the server's "your week is ready") and local posting reminders.
@MainActor
enum Notifications {
    static func status() async -> UNAuthorizationStatus {
        await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    }

    /// Ask iOS once; then register for remote notifications so the server can reach this phone.
    @discardableResult
    static func requestAndRegister() async -> Bool {
        Prefs.askedForNotifications = true
        let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])) ?? false
        if granted { UIApplication.shared.registerForRemoteNotifications() }
        return granted
    }

    /// Re-register on every launch when allowed (tokens can change).
    static func registerIfAllowed() async {
        let s = await status()
        if s == .authorized || s == .provisional || s == .ephemeral { UIApplication.shared.registerForRemoteNotifications() }
    }

    static let reminderPrefix = "post-"

    /// One reminder per approved, unposted video, at its suggested time (or the chosen time on that day).
    static func scheduleReminders(for items: [VideoItem], now: Date = Date()) async {
        let center = UNUserNotificationCenter.current()
        let pending = await center.pendingNotificationRequests().map(\.identifier).filter { $0.hasPrefix(reminderPrefix) }
        center.removePendingNotificationRequests(withIdentifiers: pending)
        guard Prefs.postReminders, await status() == .authorized else { return }
        for item in WeekBoard.upcomingPosts(items).prefix(20) {
            guard var slot = item.slot else { continue }
            if let m = Prefs.reminderMinutes { slot.time = String(format: "%02d:%02d", m / 60, m % 60) }
            guard let when = PostKit.date(of: slot), when > now else { continue }
            let content = UNMutableNotificationContent()
            content.title = L("reminder.title")
            content.body = L("reminder.body", item.title)
            content.sound = .default
            content.threadIdentifier = "dentvideo-post"
            content.userInfo = ["itemID": item.id, "kind": "post_reminder"]
            let parts = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: when)
            let request = UNNotificationRequest(identifier: reminderPrefix + item.id, content: content, trigger: UNCalendarNotificationTrigger(dateMatching: parts, repeats: false))
            try? await center.add(request)
        }
    }

    /// The async badge call: a completion closure written here would inherit the main actor and
    /// be called on UserNotifications' own queue, which Swift 6 stops with a crash (seen on every
    /// sign-out, account deletion and revoked session on iOS 18 when built with Xcode 16).
    static func clearAll() async {
        let c = UNUserNotificationCenter.current()
        c.removeAllPendingNotificationRequests()
        c.removeAllDeliveredNotifications()
        try? await c.setBadgeCount(0)
    }
}
