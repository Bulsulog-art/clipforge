import SwiftUI

struct MainTabView: View {
    @StateObject private var appState = AppState.shared

    var body: some View {
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
    }
}
