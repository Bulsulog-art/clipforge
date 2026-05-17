import SwiftUI

struct ChannelsView: View {
    var body: some View {
        NavigationStack {
            List {
                Section("Connect your channels") {
                    ChannelRow(name: "TikTok", icon: "music.note")
                    ChannelRow(name: "Instagram Reels", icon: "camera")
                    ChannelRow(name: "YouTube Shorts", icon: "play.rectangle")
                    ChannelRow(name: "X (Twitter)", icon: "bolt")
                }
            }
            .navigationTitle("Channels")
        }
    }
}

private struct ChannelRow: View {
    let name: String
    let icon: String
    var body: some View {
        HStack {
            Image(systemName: icon).foregroundStyle(.brand)
            Text(name)
            Spacer()
            Button("Connect") { /* open OAuth via Safari */ }
                .buttonStyle(.bordered)
                .tint(.brand)
        }
    }
}
