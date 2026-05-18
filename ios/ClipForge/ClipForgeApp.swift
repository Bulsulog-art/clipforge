import SwiftUI
import RevenueCat

@main
struct ClipForgeApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    init() {
        Purchases.logLevel = .info
        Purchases.configure(
            with: Configuration.Builder(withAPIKey: Secrets.revenueCatIOSKey)
                .with(appUserID: nil) // anonymous; assigned after Supabase login
                .build()
        )
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
                .tint(.brand)
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        // Returning from background — catch up on any webhook-driven
                        // balance changes (Plus purchase, credit pack, refund).
                        Task { await CreditsService.shared.refresh() }
                        Task { await PushService.shared.refreshAuthorization() }
                    }
                }
        }
    }
}
