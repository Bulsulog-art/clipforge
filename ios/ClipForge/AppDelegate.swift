import UIKit

/// AppDelegate adapter so PushService can receive APNs callbacks.
/// SwiftUI app uses @UIApplicationDelegateAdaptor for this.
final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // BGTaskScheduler.register MUST happen synchronously inside
        // didFinishLaunchingWithOptions or iOS crashes the process with
        // "All launch handlers must be registered before application
        // finishes launching." Do this BEFORE the async bootstrap so we
        // never miss the launch window.
        BackgroundRefresh.registerAndSchedule()

        Task { @MainActor in
            await PushService.shared.bootstrap()
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
