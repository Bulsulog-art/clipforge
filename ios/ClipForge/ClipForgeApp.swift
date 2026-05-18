import SwiftUI
import RevenueCat

@main
struct ClipForgeApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    init() {
        Telemetry.start()
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
                .onOpenURL { url in
                    Task {
                        // DEBUG-only password deeplink for simulator drives:
                        // clipforge://dev/login?email=…&password=…
                        #if DEBUG
                        if url.host == "dev", url.path == "/login" {
                            let comps = URLComponents(url: url, resolvingAgainstBaseURL: false)
                            let email = comps?.queryItems?.first(where: { $0.name == "email" })?.value
                            let pass = comps?.queryItems?.first(where: { $0.name == "password" })?.value
                            if let email, let pass {
                                do {
                                    try await SupabaseService.shared.client.auth
                                        .signIn(email: email, password: pass)
                                } catch {
                                    Telemetry.capture(error, context: ["op": "dev_password_login"])
                                }
                            }
                            return
                        }
                        #endif
                        // Magic-link callback: clipforge://auth/callback#access_token=...
                        // Hand the URL to Supabase so it can extract + persist the session.
                        do {
                            _ = try await SupabaseService.shared.client.auth.session(from: url)
                        } catch {
                            Telemetry.capture(error, context: ["op": "magic_link_session"])
                        }
                    }
                }
        }
    }
}
