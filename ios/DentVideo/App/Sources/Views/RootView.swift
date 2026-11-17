import SwiftUI
import UIKit
import DentVideoCore

struct RootView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        Group {
            switch model.phase {
            case .launching:
                Theme.paper.ignoresSafeArea().overlay(ProgressView().accessibilityLabel(L("common.loading")))
            case .signedOut:
                SignInView()
            case .signedIn:
                signedIn
            }
        }
        .background(Theme.paper.ignoresSafeArea())
        .task { if model.phase == .launching { await model.bootstrap() } }
        .noticeOverlay()
        // Still screenshots only; the UI tests run with the app's normal animations.
        .transaction { if model.isDemoMode && !model.isDemo("flow") { $0.disablesAnimations = true } }
    }

    @ViewBuilder private var signedIn: some View {
        switch model.access {
        case nil:
            // First start without a saved snapshot: loading, or offline with a retry.
            if model.isRefreshing {
                NavigationStack {
                    ScrollView { SkeletonWeek() }
                        .scrollDisabled(true)
                        .background(Theme.paper.ignoresSafeArea())
                        .navigationTitle(L("week.title"))
                }
            } else {
                MessageView(icon: "wifi.slash", title: L("offline.title"), message: L("offline.body")) {
                    Button(L("common.retry")) { Task { await model.refresh() } }.buttonStyle(.dvPrimary)
                    Button(L("settings.signOut")) { Task { await model.signOut() } }.buttonStyle(.dvSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        case .active?:
            MainTabs()
        case .noPlan?:
            AccountStatusView(kind: .noPlan)
        case .paused?:
            AccountStatusView(kind: .paused)
        case .noClinic?:
            AccountStatusView(kind: .noClinic)
        }
    }
}

struct MainTabs: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        @Bindable var model = model
        TabView(selection: $model.tab) {
            WeekView()
                .tabItem { Label(L("tab.week"), systemImage: "play.rectangle.on.rectangle") }
                .tag(AppModel.Tab.week)
            RecordView()
                .tabItem { Label(L("tab.record"), systemImage: "video.badge.plus") }
                .tag(AppModel.Tab.record)
            SettingsView()
                .tabItem { Label(L("tab.settings"), systemImage: "gearshape") }
                .tag(AppModel.Tab.settings)
        }
        .sheet(isPresented: $model.showNotificationPrimer) { NotificationPrimer() }
        .sensoryFeedback(.selection, trigger: model.tab)
    }
}

/// Our explanation before iOS asks: what the notifications are for, so the answer is informed.
struct NotificationPrimer: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        MessageView(icon: "bell.badge", title: L("primer.title"), message: L("primer.body")) {
            Button(L("primer.allow")) {
                Task {
                    await Notifications.requestAndRegister()
                    dismiss()
                }
            }
            .buttonStyle(.dvPrimary)
            Button(L("primer.later")) {
                Prefs.askedForNotifications = true
                dismiss()
            }
            .buttonStyle(.dvSecondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.paper.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationBackground(Theme.paper)
    }
}

/// No active plan / paused / no clinic: a neutral account screen. No price, no way to buy, no
/// link or wording that points to buying (App Store guideline 3.1.3). Sign-out and deletion stay
/// available.
struct AccountStatusView: View {
    enum Kind { case noPlan, paused, noClinic }
    let kind: Kind
    @Environment(AppModel.self) private var model
    @State private var deleting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.s5) {
                    MessageView(icon: icon, title: title, message: message) {
                        if kind == .paused, let mail = URL(string: "mailto:\(Config.supportEmail)") {
                            Link(L("access.contact"), destination: mail).buttonStyle(.dvPrimary)
                        }
                        Button(L("common.retry")) { Task { await model.refresh() } }
                            .buttonStyle(.dvSecondary)
                    }
                    VStack(spacing: Theme.s1) {
                        if let name = model.me?.clinic?.profile.name {
                            Text(name).font(.subheadline.weight(.semibold)).foregroundStyle(Theme.ink)
                        }
                        if let email = model.me?.user.email {
                            Text(L("settings.signedInAs", email)).font(.footnote).foregroundStyle(Theme.muted)
                        }
                    }
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, Theme.gutter)
                    VStack(spacing: Theme.s2) {
                        Button(L("settings.signOut")) { Task { await model.signOut() } }.buttonStyle(.dvSecondary)
                        Button(L("settings.delete"), role: .destructive) { deleting = true }
                            .buttonStyle(.dvQuiet)
                    }
                    .frame(maxWidth: 520)
                    .padding(.horizontal, Theme.gutter)
                }
                .padding(.vertical, Theme.s6)
                .frame(maxWidth: .infinity)
            }
            .refreshable { await model.refresh() }
            .background(Theme.paper.ignoresSafeArea())
            .sheet(isPresented: $deleting) { DeleteAccountView() }
        }
    }

    private var icon: String {
        switch kind {
        case .noPlan: return "pause.circle"
        case .paused: return "pause.circle"
        case .noClinic: return "building.2"
        }
    }

    private var title: String {
        switch kind {
        case .noPlan: return L("access.noPlan.title")
        case .paused: return L("access.paused.title")
        case .noClinic: return L("access.noClinic.title")
        }
    }

    private var message: String {
        switch kind {
        case .noPlan: return L("access.noPlan.body")
        case .paused: return L("access.paused.body", Config.supportEmail)
        case .noClinic: return L("access.noClinic.body")
        }
    }
}

#Preview("Week") {
    RootView().environment(AppModel.preview())
}

#Preview("No active plan") {
    RootView().environment(AppModel.preview(plan: PlanInfo(state: .cancelled, tier: nil, canMake: false, adminPaused: false, recordings: false, renewsAt: nil)))
}
