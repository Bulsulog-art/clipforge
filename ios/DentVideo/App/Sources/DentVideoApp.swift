import SwiftUI
@preconcurrency import UserNotifications
import DentVideoCore

@main
struct DentVideoApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var delegate

    init() {
        Theme.configureNavigationBars()
    }

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
    @MainActor lazy var model: AppModel = {
        #if DEBUG
        if let demo = Demo.makeModel() { return demo }
        #endif
        return AppModel()
    }()

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
        let itemID = DeepLink.itemID(fromNotification: response.notification.request.content.userInfo)
        await MainActor.run { model.open(itemID: itemID) }
    }
}

extension AppModel {
    /// dentvideo.com/app links (universal links) and dentvideo://app open the week, or the video named.
    func handle(url: URL) {
        guard let target = DeepLink.target(url) else { return }
        open(itemID: target.itemID)
    }
}
