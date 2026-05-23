import SwiftUI

struct RootView: View {
    @StateObject private var supabase = SupabaseService.shared
    @State private var didBindRevenueCat = false
    @State private var hasOnboarded = UserDefaults.standard.bool(forKey: "clipforge.onboarded")

    var body: some View {
        Group {
            if !hasOnboarded {
                OnboardingView { hasOnboarded = true }
            } else if supabase.isRestoring {
                // Cold start: token is being restored from Keychain. Show the brand
                // splash so we don't flash LoginView at returning users.
                LaunchSplashView()
                    .transition(.opacity)
            } else if supabase.session == nil {
                LoginView()
                    .transition(.opacity)
            } else {
                MainTabView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.18), value: supabase.isRestoring)
        .animation(.easeInOut(duration: 0.18), value: supabase.session?.user.id)
        .onChange(of: supabase.session?.user.id) { _, newId in
            guard let newId, !didBindRevenueCat else { return }
            didBindRevenueCat = true
            Task {
                await RevenueCatService.shared.identify(userId: newId.uuidString)
                // Refresh feature flags as soon as we have a session — subsequent
                // ticks are handled by the FeatureFlagsService internal timer.
                await FeatureFlagsService.shared.refresh()
            }
        }
        // Universal Links — tapped from Safari, Mail, Messages, etc.
        // The associated-domains entitlement (applinks:clipforge.bulsulabs.xyz)
        // is in project.yml; the AASA file lives at /.well-known/apple-app-
        // site-association on the same host.
        .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
            if let url = activity.webpageURL { handleUniversalLink(url) }
        }
        // clipforge:// scheme — used by ASWebAuthenticationSession (Channels
        // OAuth) and any third-party that wants to deep-link us. Same handler
        // route since both ultimately set AppState pending* fields.
        .onOpenURL { url in handleUniversalLink(url) }
        .background(Color.appBackground.ignoresSafeArea())
    }

    /// Maps an incoming URL onto AppState so the right tab + pending-id is
    /// surfaced. Supports:
    ///   https://clipforge.bulsulabs.xyz/clips/<uuid>  → Clips tab
    ///   https://clipforge.bulsulabs.xyz/jobs/<uuid>   → Studio + open job
    ///   clipforge://oauth/<platform>                  → handled by
    ///       ASWebAuthenticationSession itself, never reaches us
    private func handleUniversalLink(_ url: URL) {
        let parts = url.pathComponents.filter { $0 != "/" }
        guard parts.count >= 2 else { return }
        let kind = parts[0]
        let id = parts[1]
        Task { @MainActor in
            switch kind {
            case "clips":
                AppState.shared.selectedTab = .clips
                AppState.shared.pendingClipId = id
            case "jobs":
                AppState.shared.selectedTab = .studio
                AppState.shared.pendingJobId = id
            default:
                break
            }
        }
    }
}

private struct LaunchSplashView: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.appBackground, Color.brand.opacity(0.18)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            VStack(spacing: 14) {
                Image(systemName: "scissors")
                    .font(.system(size: 56, weight: .bold))
                    .foregroundStyle(.brand)
                Text("ClipForge").font(.title.bold())
                ProgressView()
                    .controlSize(.small)
                    .padding(.top, 6)
            }
        }
    }
}
