import UIKit

/// AppDelegate adapter so PushService can receive APNs callbacks.
/// SwiftUI app uses @UIApplicationDelegateAdaptor for this.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        Task { @MainActor in
            await PushService.shared.bootstrap()
            // Register the BGAppRefreshTask handler + queue the first wake.
            // Subsequent wakes self-rearm at the end of each handler run.
            BackgroundRefresh.registerAndSchedule()
        }
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            PushService.shared.register(deviceToken: deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in
            PushService.shared.registerFailed(error)
        }
    }

    /// iOS hands us a completion handler when it wakes us in the background
    /// to deliver background-URLSession events. We bridge it to UploadService
    /// so the system knows when we've finished processing the events.
    func application(
        _ application: UIApplication,
        handleEventsForBackgroundURLSession identifier: String,
        completionHandler: @escaping () -> Void
    ) {
        Task { @MainActor in
            UploadService.shared.backgroundCompletionHandler = completionHandler
        }
    }
}
