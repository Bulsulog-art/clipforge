import SwiftUI

struct MainTabView: View {
    @StateObject private var appState = AppState.shared
    @StateObject private var network = NetworkMonitor.shared

    var body: some View {
        ZStack(alignment: .top) {
            TabView(selection: $appState.selectedTab) {
                ProjectsView()
                    .tabItem { Label("Studio", systemImage: "scissors") }
                    .tag(AppState.Tab.studio)
                TrendsView()
                    .tabItem { Label("Trends", systemImage: "chart.line.uptrend.xyaxis") }
                    .tag(AppState.Tab.trends)
                ClipsFeedView()
                    .tabItem { Label("Clips", systemImage: "play.rectangle") }
                    .tag(AppState.Tab.clips)
                ChannelsView()
                    .tabItem { Label("Channels", systemImage: "link") }
                    .tag(AppState.Tab.channels)
                SettingsView()
                    .tabItem { Label("Settings", systemImage: "gearshape") }
                    .tag(AppState.Tab.settings)
            }
            .environmentObject(appState)

            // Persistent offline banner (only when actually offline).
            if !network.isReachable {
                BannerView(
                    text: "You're offline. We'll retry when you reconnect.",
                    systemImage: "wifi.slash",
                    tint: .orange
                )
                .transition(.move(edge: .top).combined(with: .opacity))
            }

            // Auto-dismissing transient error banner.
            if let msg = appState.transientError {
                BannerView(
                    text: msg,
                    systemImage: "exclamationmark.triangle.fill",
                    tint: .red
                )
                .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.22), value: network.isReachable)
        .animation(.easeInOut(duration: 0.22), value: appState.transientError)
    }
}

private struct BannerView: View {
    let text: String
    let systemImage: String
    let tint: Color

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: systemImage)
            Text(text)
                .font(.footnote.weight(.semibold))
                .lineLimit(2)
                .minimumScaleFactor(0.85)
            Spacer(minLength: 0)
        }
        .foregroundStyle(.white)
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(tint.opacity(0.95))
        .clipShape(.rect(cornerRadius: 12))
        .padding(.horizontal, 12)
        .padding(.top, 4)
        .accessibilityElement(children: .combine)
    }
}
