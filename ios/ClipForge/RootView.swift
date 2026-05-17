import SwiftUI

struct RootView: View {
    @StateObject private var supabase = SupabaseService.shared
    @State private var didBindRevenueCat = false

    var body: some View {
        Group {
            if supabase.session == nil {
                LoginView()
            } else {
                MainTabView()
            }
        }
        .onChange(of: supabase.session?.user.id) { _, newId in
            guard let newId, !didBindRevenueCat else { return }
            didBindRevenueCat = true
            Task { await RevenueCatService.shared.identify(userId: newId.uuidString) }
        }
        .background(Color.appBackground.ignoresSafeArea())
    }
}
