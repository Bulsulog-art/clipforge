import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            ProjectsView()
                .tabItem { Label("Studio", systemImage: "scissors") }
            TrendsView()
                .tabItem { Label("Trends", systemImage: "chart.line.uptrend.xyaxis") }
            ClipsFeedView()
                .tabItem { Label("Clips", systemImage: "play.rectangle") }
            ChannelsView()
                .tabItem { Label("Channels", systemImage: "link") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}
