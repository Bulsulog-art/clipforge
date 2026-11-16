import SwiftUI
@preconcurrency import UserNotifications
import DentVideoCore

@main
struct DentVideoApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(delegate.model)
                .tint(Theme.teal)
                .onOpenURL { delegate.model.handle(url: $0) }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in
                    if let u = a.webpageURL { delegate.model.handle(url: u) }
                }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    @MainActor lazy var model = AppModel()

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        MainActor.assumeIsolated { model.didReceive(deviceToken: deviceToken) }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // No push on this phone (simulator, restrictions): the email still arrives.
    }

    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        guard identifier == UploadCenter.sessionID else { return completionHandler() }
        MainActor.assumeIsolated { model.uploads.backgroundCompletion = completionHandler }
    }

    // Show the banner while the app is open, too.
    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        [.banner, .sound, .list]
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        let info = response.notification.request.content.userInfo
        let itemID = info["itemID"] as? String
        await MainActor.run { model.open(itemID: itemID) }
    }
}

extension AppModel {
    /// dentvideo.com/app links (universal links) and dentvideo:// open the week.
    func handle(url: URL) {
        let host = url.host?.lowercased() ?? ""
        guard url.scheme == "dentvideo" || host == "dentvideo.com" || host == "www.dentvideo.com" else { return }
        let parts = url.pathComponents.filter { $0 != "/" }
        // /app/video/<id> is reserved for a direct video link; anything else under /app opens the week.
        let id = parts.count >= 3 && parts[1] == "video" ? parts[2] : nil
        open(itemID: id)
    }
}
