import SwiftUI

@main
struct DentVideoApp: App {
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(model)
                .tint(.dvTeal)
                .task { await model.launch() }
        }
    }
}

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        switch model.phase {
        case .launching:
            ZStack { Color.dvPaper.ignoresSafeArea(); BrandMark(size: 72) }
        case .signedOut:
            SignInView()
        case .signedIn:
            MainView()
        }
    }
}

struct MainView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        TabView {
            NavigationStack { WeekView() }
                .tabItem { Label("This week", systemImage: "play.rectangle.on.rectangle") }
            NavigationStack { LibraryView() }
                .tabItem { Label("Library", systemImage: "square.stack") }
            NavigationStack { AccountView() }
                .tabItem { Label("Account", systemImage: "person.crop.circle") }
        }
    }
}
