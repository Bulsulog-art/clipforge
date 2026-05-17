import SwiftUI

struct SettingsView: View {
    @StateObject private var rc = RevenueCatService.shared
    @State private var showPaywall = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    LabeledContent("Email", value: SupabaseService.shared.session?.user.email ?? "—")
                    LabeledContent("Plan", value: planLabel)
                }
                Section {
                    Button("Manage subscription") { showPaywall = true }
                    Button("Restore purchases") { Task { try? await rc.restore() } }
                }
                Section {
                    Button("Sign out", role: .destructive) {
                        Task { try? await SupabaseService.shared.signOut() }
                    }
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showPaywall) { PaywallView() }
        }
    }

    private var planLabel: String {
        if rc.customerInfo?.entitlements["agency"]?.isActive == true { return "Agency" }
        if rc.customerInfo?.entitlements["pro"]?.isActive == true { return "Pro" }
        if rc.customerInfo?.entitlements["starter"]?.isActive == true { return "Starter" }
        return "Free"
    }
}
