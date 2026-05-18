import SwiftUI

struct SettingsView: View {
    @StateObject private var rc = RevenueCatService.shared
    @StateObject private var credits = CreditsService.shared
    @State private var showPlans = false
    @State private var showCreditPaywall = false
    @State private var showCancelFlow = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    LabeledContent("Email", value: SupabaseService.shared.session?.user.email ?? "—")
                    LabeledContent("Plan", value: planLabel)
                    LabeledContent("Credits", value: "\(credits.balance)")
                }
                Section("Billing") {
                    Button {
                        showPlans = true
                    } label: {
                        Label("Choose plan (weekly / monthly)", systemImage: "creditcard")
                    }
                    Button {
                        showCreditPaywall = true
                    } label: {
                        Label("Buy credits (one-time)", systemImage: "bolt.fill")
                    }
                    Button("Restore purchases") {
                        Task { try? await rc.restore() }
                    }
                    if credits.hasPlus {
                        Button("Manage / cancel subscription", role: .destructive) {
                            showCancelFlow = true
                        }
                    }
                }
                Section {
                    Button("Sign out", role: .destructive) {
                        Task { try? await SupabaseService.shared.signOut() }
                    }
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showPlans) { PlansView() }
            .sheet(isPresented: $showCreditPaywall) { CreditsPaywallView() }
            .sheet(isPresented: $showCancelFlow) { CancelFlowView() }
            .task { await credits.refresh() }
        }
    }

    private var planLabel: String {
        if rc.customerInfo?.entitlements["agency"]?.isActive == true { return "Agency" }
        if rc.customerInfo?.entitlements["pro"]?.isActive == true { return "Pro" }
        if rc.customerInfo?.entitlements["starter"]?.isActive == true { return "Starter" }
        return "Free"
    }
}
