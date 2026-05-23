import SwiftUI

struct SettingsView: View {
    @StateObject private var rc = RevenueCatService.shared
    @StateObject private var credits = CreditsService.shared
    @State private var showPlans = false
    @State private var showCreditPaywall = false
    @State private var showCancelFlow = false
    @State private var showSignOutConfirm = false
    @State private var showDeleteConfirm = false
    @State private var deleting = false
    @State private var showFeedback = false

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
                        Label("Choose plan (weekly · monthly · yearly)", systemImage: "creditcard")
                    }
                    Button {
                        showCreditPaywall = true
                    } label: {
                        Label("Buy credits (Booster · Power · Pro)", systemImage: "bolt.fill")
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
                    Button {
                        showFeedback = true
                    } label: {
                        Label("Send feedback", systemImage: "bubble.left.and.bubble.right.fill")
                    }
                    Link(destination: URL(string: "https://clipforge.bulsulabs.xyz/legal/terms")!) {
                        Label("Terms of Service", systemImage: "doc.text")
                    }
                    Link(destination: URL(string: "https://clipforge.bulsulabs.xyz/legal/privacy")!) {
                        Label("Privacy Policy", systemImage: "lock.shield")
                    }
                    Link(destination: URL(string: "mailto:hello@clipforge.bulsulabs.xyz?subject=ClipForge%20support")!) {
                        Label("Email support", systemImage: "envelope")
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
                        showSignOutConfirm = true
                    }
                    Button("Delete account", role: .destructive) {
                        showDeleteConfirm = true
                    }
                } footer: {
                    Text("Deleting your account is permanent. Your subscription is tied to your Apple ID — manage it in Settings → Apple ID → Subscriptions.")
                        .font(.caption2)
                }
            }
            .navigationTitle("Settings")
            .sheet(isPresented: $showPlans) { PlansView() }
            .sheet(isPresented: $showCreditPaywall) { CreditsPaywallView() }
            .sheet(isPresented: $showCancelFlow) { CancelFlowView() }
            .sheet(isPresented: $showFeedback) { FeedbackSheet() }
            .task { await credits.refresh() }
            .confirmationDialog(
                "Sign out?",
                isPresented: $showSignOutConfirm,
                titleVisibility: .visible
            ) {
                Button("Sign out", role: .destructive) {
                    Task { await performSignOut() }
                }
                Button("Cancel", role: .cancel) {}
            }
            .alert(
                "Delete account permanently?",
                isPresented: $showDeleteConfirm
            ) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task { await performDeleteAccount() }
                }
            } message: {
                Text("All your clips, projects, and credits will be erased. This cannot be undone. Active App Store subscriptions are managed separately via Apple ID settings.")
            }
            .overlay {
                if deleting {
                    ZStack {
                        Color.black.opacity(0.55).ignoresSafeArea()
                        VStack(spacing: 12) {
                            ProgressView().controlSize(.large).tint(.white)
                            Text("Deleting your account…")
                                .foregroundStyle(.white)
                                .font(.callout)
                        }
                    }
                }
            }
        }
    }

    private func performSignOut() async {
        // Drop the user's push token first so we don't keep pinging a stale account
        await PushService.shared.unregisterToken()
        await RevenueCatService.shared.logOut()
        try? await SupabaseService.shared.signOut()
        // Wipe the in-memory signed-URL cache so a re-sign-in as a different
        // user can't accidentally hit the previous user's pre-signed paths.
        await SignedURLCache.shared.invalidateAll()
    }

    private func performDeleteAccount() async {
        deleting = true
        defer { deleting = false }
        do {
            await PushService.shared.unregisterToken()
            try await ClipForgeAPI.shared.deleteAccount()
            await RevenueCatService.shared.logOut()
            // Server has already invalidated the session — local cleanup
            try? await SupabaseService.shared.signOut()
            await SignedURLCache.shared.invalidateAll()
        } catch {
            AppState.shared.flashError("Couldn't delete account: \(error.localizedDescription)")
        }
    }

    private var appVersionLine: String {
        let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
        let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
        return "\(v) (\(b))"
    }

    /// Resolve the human-readable plan label from RevenueCat entitlements.
    /// We rebranded "Starter" → "Plus" in the 2026-05 pricing refresh but the
    /// RC entitlement key stayed `starter` to preserve existing subscriber
    /// records — translate it for display only.
    private var planLabel: String {
        if rc.customerInfo?.entitlements["agency"]?.isActive == true { return "Plus Agency" }
        if rc.customerInfo?.entitlements["pro"]?.isActive == true { return "Plus Pro" }
        if rc.customerInfo?.entitlements["starter"]?.isActive == true ||
           rc.customerInfo?.entitlements["plus"]?.isActive == true {
            // Suffix the period if we can read it from the active product id.
            if let pid = rc.activeProductId {
                if pid.contains("yearly")  { return "Plus · Yearly" }
                if pid.contains("monthly") { return "Plus · Monthly" }
                if pid.contains("weekly")  { return "Plus · Weekly" }
            }
            return "Plus"
        }
        return "Free"
    }
}
