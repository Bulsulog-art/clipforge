import SwiftUI
import RevenueCat

@main
struct ClipForgeApp: App {
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
        }
    }
}
