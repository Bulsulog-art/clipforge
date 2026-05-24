import SwiftUI

/// Top-level container. Renders as a `TabView` on iPhone (compact width)
/// and a `NavigationSplitView` sidebar + detail layout on iPad (regular
/// width). Same view set in both cases — just the chrome around them
/// changes — so every screen we've built keeps working unchanged.
struct MainTabView: View {
    @StateObject private var appState = AppState.shared
    @StateObject private var network = NetworkMonitor.shared
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        ZStack(alignment: .top) {
            if horizontalSizeClass == .regular {
                iPadLayout
            } else {
                phoneLayout
            }

            if !network.isReachable {
                BannerView(
                    text: "You're offline. We'll retry when you reconnect.",
                    systemImage: "wifi.slash",
                    tint: .orange
                )
                .transition(.move(edge: .top).combined(with: .opacity))
            }
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

    // MARK: - Layouts

    /// iPhone & landscape compact: classic 5-tab TabView at the bottom.
    private var phoneLayout: some View {
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

    /// iPad (and other regular-width contexts like Mac Catalyst): sidebar
    /// with the same 5 destinations + a detail pane that swaps based on
    /// selection. NavigationSplitView gives us the standard iPad chrome
    /// (collapsible sidebar, two-pane landscape, sheet-overlay portrait).
    private var iPadLayout: some View {
        NavigationSplitView {
            // List(_:id:selection:rowContent:) — iOS 17 single-selection
            // form, which is the variant that actually compiles on the
            // mobile SDK. The free-form `List(selection: content:)` is
            // a macOS-only init.
            List(SidebarTab.allCases, id: \.self, selection: sidebarSelection) { tab in
                Label(tab.title, systemImage: tab.icon).tag(tab)
            }
            .navigationTitle("ClipForge")
        } detail: {
            // Each detail view already has its own NavigationStack — but
            // we're inside NavigationSplitView's detail column which
            // expects its own navigation root. SwiftUI handles the
            // nesting; the inner pushes still work.
            switch appState.selectedTab {
            case .studio:    ProjectsView()
            case .trends:    TrendsView()
            case .clips:     ClipsFeedView()
            case .channels:  ChannelsView()
            case .settings:  SettingsView()
            }
        }
        .environmentObject(appState)
    }

    /// Bridges the sidebar's optional selection (NavigationSplitView wants
    /// it nullable so the user can deselect) with AppState's non-optional
    /// Tab enum. nil resolves to the current value, never blanks out.
    private var sidebarSelection: Binding<SidebarTab?> {
        Binding(
            get: { SidebarTab(appState.selectedTab) },
            set: { newValue in
                if let v = newValue { appState.selectedTab = v.appStateTab }
            }
        )
    }
}

/// Mirror of AppState.Tab but Hashable + CaseIterable + carrying label
/// metadata for the sidebar.
private enum SidebarTab: Hashable, CaseIterable {
    case studio, trends, clips, channels, settings

    init?(_ tab: AppState.Tab) {
        switch tab {
        case .studio:   self = .studio
        case .trends:   self = .trends
        case .clips:    self = .clips
        case .channels: self = .channels
        case .settings: self = .settings
        }
    }

    var appStateTab: AppState.Tab {
        switch self {
        case .studio:   return .studio
        case .trends:   return .trends
        case .clips:    return .clips
        case .channels: return .channels
        case .settings: return .settings
        }
    }

    var title: String {
        switch self {
        case .studio:   return "Studio"
        case .trends:   return "Trends"
        case .clips:    return "Clips"
        case .channels: return "Channels"
        case .settings: return "Settings"
        }
    }

    var icon: String {
        switch self {
        case .studio:   return "scissors"
        case .trends:   return "chart.line.uptrend.xyaxis"
        case .clips:    return "play.rectangle"
        case .channels: return "link"
        case .settings: return "gearshape"
        }
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
