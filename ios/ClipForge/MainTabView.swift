import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            ProjectsView()
                .tabItem { Label("Studio", systemImage: "scissors") }
            ClipsFeedView()
                .tabItem { Label("Clips", systemImage: "play.rectangle") }
            ChannelsView()
                .tabItem { Label("Channels", systemImage: "link") }
            SettingsView()
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
    }
}
