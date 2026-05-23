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
        .background(Color.appBackground.ignoresSafeArea())
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
