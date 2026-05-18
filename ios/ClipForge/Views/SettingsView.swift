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
                Section("Support") {
                    Link(destination: URL(string: "https://clipforge.bulsulabs.xyz/legal/terms")!) {
                        Label("Terms of Service", systemImage: "doc.text")
                    }
                    Link(destination: URL(string: "https://clipforge.bulsulabs.xyz/legal/privacy")!) {
                        Label("Privacy Policy", systemImage: "lock.shield")
                    }
                    Link(destination: URL(string: "mailto:hello@clipforge.bulsulabs.xyz?subject=ClipForge%20support")!) {
                        Label("Contact support", systemImage: "envelope")
                    }
                }
                Section("About") {
                    LabeledContent("Version", value: appVersionLine)
                    Link(destination: URL(string: "https://clipforge.bulsulabs.xyz")!) {
                        Label("Visit clipforge.bulsulabs.xyz", systemImage: "globe")
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

    private var appVersionLine: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "\(v) (\(b))"
    }

    private var planLabel: String {
        if rc.customerInfo?.entitlements["agency"]?.isActive == true { return "Agency" }
        if rc.customerInfo?.entitlements["pro"]?.isActive == true { return "Pro" }
        if rc.customerInfo?.entitlements["starter"]?.isActive == true { return "Starter" }
        return "Free"
    }
}
