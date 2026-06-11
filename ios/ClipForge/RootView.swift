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

/// Animated brand launch. A spring-revealed scissors "snips" in over a soft,
/// breathing brand glow, the wordmark + tagline rise underneath, and three
/// mini clip cards fan out — a 1-second visual of the whole product promise
/// ("one video → clips") the moment the app opens.
private struct LaunchSplashView: View {
    @State private var appear = false
    @State private var pulse = false
    @State private var fan = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [Color.appBackground, Color.brand.opacity(0.18)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            // Breathing brand glow behind the mark.
            Circle()
                .fill(Color.brand.opacity(0.20))
                .frame(width: 300, height: 300)
                .blur(radius: 80)
                .scaleEffect(pulse ? 1.12 : 0.84)
                .opacity(pulse ? 0.9 : 0.5)

            VStack(spacing: 18) {
                ZStack {
                    Image(systemName: "scissors")
                        .font(.system(size: 60, weight: .bold))
                        .foregroundStyle(LinearGradient(colors: [.brand, .brandGlow], startPoint: .top, endPoint: .bottom))
                        .scaleEffect(appear ? 1 : 0.55)
                        .rotationEffect(.degrees(appear ? 0 : -28))
                        .opacity(appear ? 1 : 0)
                        .shadow(color: .brand.opacity(0.45), radius: pulse ? 22 : 8)
                }

                VStack(spacing: 6) {
                    Text("ClipForge")
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .foregroundStyle(.textPrimary)
                    Text("Long videos → viral clips")
                        .font(.subheadline)
                        .foregroundStyle(.textSecondary)
                }
                .opacity(appear ? 1 : 0)
                .offset(y: appear ? 0 : 12)

                // Mini clips fanning out — the "you get a dozen clips" idea.
                HStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { i in
                        RoundedRectangle(cornerRadius: 6)
                            .fill(LinearGradient(colors: [.brand.opacity(0.9), .brandGlow.opacity(0.7)], startPoint: .top, endPoint: .bottom))
                            .frame(width: 26, height: 38)
                            .rotationEffect(.degrees(fan ? Double(i - 1) * 12 : 0))
                            .offset(x: fan ? CGFloat(i - 1) * 10 : 0)
                            .opacity(fan ? 1 : 0)
                    }
                }
                .padding(.top, 4)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.6, dampingFraction: 0.62)) { appear = true }
            withAnimation(.spring(response: 0.7, dampingFraction: 0.7).delay(0.25)) { fan = true }
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) { pulse = true }
        }
    }
}
