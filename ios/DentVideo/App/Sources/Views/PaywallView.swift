import SwiftUI
import UIKit
import DentVideoCore

/// A signed-in clinic without an active plan. GET billing decides (PurchaseStep): the email code,
/// the plans (only when the server says `showPaywall`), a calm "not available yet" when this build
/// cannot sell, or the neutral account screen (a web payment being confirmed, a dispute…).
struct PurchaseGateView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        let billing = model.billing
        Group {
            switch billing.phase {
            case .activating:
                ActivatingView()
            case .confirming:
                ConfirmingView()
            default:
                if model.showLogoPreview, let step = billing.step, step == .paywall || step == .verifyEmail {
                    // A new clinic sees its own look first ("See it with your logo"), then the plans.
                    LogoPreviewView(continueLabel: step == .paywall ? L("preview.continue") : L("preview.next")) {
                        model.showLogoPreview = false
                    }
                } else {
                    switch billing.step {
                    case nil:
                        if let error = billing.loadError, !billing.loading {
                            NavigationStack {
                                MessageView(icon: "wifi.slash", title: L("offline.title"), message: error) {
                                    Button(L("common.retry")) { Task { await billing.load() } }.buttonStyle(.dvPrimary)
                                    Button(L("settings.signOut")) { Task { await model.signOut() } }.buttonStyle(.dvSecondary)
                                }
                                .frame(maxWidth: .infinity, maxHeight: .infinity)
                                .background(Theme.paper.ignoresSafeArea())
                            }
                        } else {
                            Theme.paper.ignoresSafeArea().overlay(ProgressView().accessibilityLabel(L("common.loading")))
                        }
                    case .clinic?:
                        ClinicSetupView()
                    case .verifyEmail?:
                        NavigationStack {
                            ScrollView {
                                EmailCodeView(email: model.me?.user.email ?? "", sendFirst: true) { await billing.load() }
                                    .padding(.horizontal, 28)
                                    .padding(.vertical, Theme.s6)
                                    .frame(maxWidth: 480)
                                    .frame(maxWidth: .infinity)
                            }
                            .scrollDismissesKeyboard(.interactively)
                            .background(Theme.paper.ignoresSafeArea())
                            .toolbar {
                                ToolbarItem(placement: .cancellationAction) {
                                    Button(L("settings.signOut")) { Task { await model.signOut() } }
                                }
                            }
                        }
                    case .paywall?:
                        PaywallView()
                    case .notAvailable?:
                        NotAvailableView()
                    case .noPaywall?:
                        AccountStatusView(kind: .noPlan)
                    }
                }
            }
        }
        .task { await billing.load() }
    }
}

/// Starter and Practice, each with what it includes (the web's plan copy) and StoreKit's price.
/// Nothing is pre-selected and both plans look alike; no countdown, no discount, no trial.
/// The disclosures App Store guideline 3.1.2 asks for sit right above the buttons' end:
/// auto-renewal, how to cancel, Terms and Privacy, and Restore Purchases.
struct PaywallView: View {
    @Environment(AppModel.self) private var model
    @State private var deleting = false
    @State private var previewing = false

    var body: some View {
        let billing = model.billing
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: Theme.s5) {
                    VStack(alignment: .leading, spacing: Theme.s2) {
                        Text(L("paywall.title"))
                            .font(Theme.display(.largeTitle))
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityAddTraits(.isHeader)
                            .accessibilityIdentifier("paywall.title")
                        Text(L("paywall.lead"))
                            .font(.body)
                            .foregroundStyle(Theme.body)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    if billing.offers.isEmpty {
                        if billing.offersError != nil {
                            VStack(spacing: Theme.s3) {
                                ErrorBox(text: L("paywall.error.offers"), id: "paywall.offersError")
                                Button(L("common.retry")) { Task { await billing.loadOffers() } }.buttonStyle(.dvSecondary)
                            }
                        } else {
                            ProgressView().frame(maxWidth: .infinity, minHeight: 160).accessibilityLabel(L("common.loading"))
                        }
                    } else {
                        ForEach(billing.sortedOffers) { offer in
                            PlanCard(offer: offer)
                        }
                    }

                    // Alongside the plans: the clinic's own look on the sample videos.
                    PreviewCard { previewing = true }

                    if let message = billing.message { ErrorBox(text: message, id: "paywall.message") }
                    if billing.phase == .pending {
                        Label(L("paywall.pending"), systemImage: "hourglass")
                            .font(.subheadline)
                            .foregroundStyle(Theme.body)
                            .padding(Theme.s3)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(Theme.sand, in: RoundedRectangle(cornerRadius: Theme.radiusSmall, style: .continuous))
                            .fixedSize(horizontal: false, vertical: true)
                            .accessibilityIdentifier("paywall.pending")
                    }

                    Text(L("paywall.terms"))
                        .font(.footnote)
                        .foregroundStyle(Theme.muted)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityIdentifier("paywall.terms")

                    VStack(spacing: Theme.s1) {
                        Button {
                            Task { await billing.restore() }
                        } label: {
                            if billing.phase == .restoring { ProgressView() } else { Text(L("paywall.restore")) }
                        }
                        .buttonStyle(.dvQuiet)
                        .disabled(billing.phase != .idle && billing.phase != .pending)
                        .accessibilityLabel(L("paywall.restore"))
                        .accessibilityIdentifier("paywall.restore")
                        LegalLinks()
                    }
                    .frame(maxWidth: .infinity)

                    AccountFooter(deleting: $deleting)
                }
                .padding(.horizontal, Theme.gutter)
                .padding(.vertical, Theme.s5)
                .readableWidth(560)
            }
            .refreshable { await billing.load() }
            .background(Theme.paper.ignoresSafeArea())
            .sheet(isPresented: $deleting) { DeleteAccountView() }
            .sheet(isPresented: $previewing) {
                LogoPreviewView(continueLabel: L("preview.continue"), closable: true) { previewing = false }
                    .presentationBackground(Theme.paper)
            }
        }
    }
}

/// "See it with your logo" on the plans: a card that opens the preview.
struct PreviewCard: View {
    @Environment(AppModel.self) private var model
    let open: () -> Void

    var body: some View {
        let profile = model.me?.clinic?.profile
        Button(action: open) {
            HStack(spacing: Theme.s3) {
                ZStack(alignment: .topTrailing) {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color(rgb: PreviewLook.parse(profile?.brandColor) ?? PreviewLook.parse(PreviewLook.defaultColor) ?? RGB(0.06, 0.36, 0.36)))
                        .frame(width: 44, height: 78)
                    LogoChip(logo: nil, name: profile?.name ?? "", color: profile?.brandColor ?? PreviewLook.defaultColor, size: 20)
                        .padding(4)
                }
                .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: Theme.s1) {
                    Text(L("preview.title")).font(.headline).foregroundStyle(Theme.ink)
                    Text(L("preview.card")).font(.subheadline).foregroundStyle(Theme.body)
                }
                .multilineTextAlignment(.leading)
                .fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: "play.circle.fill").font(.title2).foregroundStyle(Theme.teal).accessibilityHidden(true)
            }
            .padding(Theme.s4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .dvCard()
            .contentShape(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
        .accessibilityIdentifier("paywall.preview")
    }
}

/// One plan: name, StoreKit's price per month, what it includes, and its own button.
struct PlanCard: View {
    @Environment(AppModel.self) private var model
    let offer: StoreOffer

    private var name: String { offer.tier == "practice" ? "Practice" : "Starter" }

    var body: some View {
        let billing = model.billing
        let buying = billing.phase == .purchasing(offer.productId)
        VStack(alignment: .leading, spacing: Theme.s3) {
            VStack(alignment: .leading, spacing: Theme.s1) {
                Text(name)
                    .font(Theme.display(.title2))
                    .foregroundStyle(Theme.ink)
                    .accessibilityAddTraits(.isHeader)
                Text(L("paywall.perMonth", offer.displayPrice))
                    .font(.headline)
                    .foregroundStyle(Theme.teal)
                    .accessibilityIdentifier("paywall.price.\(offer.tier)")
                Text(Self.blurb(offer.tier))
                    .font(.subheadline)
                    .foregroundStyle(Theme.body)
                    .fixedSize(horizontal: false, vertical: true)
            }
            VStack(alignment: .leading, spacing: Theme.s2) {
                ForEach(Self.features(offer.tier), id: \.self) { feature in
                    Label {
                        Text(feature)
                            .font(.subheadline)
                            .foregroundStyle(Theme.ink)
                            .fixedSize(horizontal: false, vertical: true)
                    } icon: {
                        Image(systemName: "checkmark").font(.subheadline.weight(.semibold)).foregroundStyle(Theme.teal)
                    }
                }
            }
            Button {
                Task { await billing.purchase(offer) }
            } label: {
                if buying { ProgressView().tint(Theme.onFill) } else { Text(L("paywall.subscribe", name)) }
            }
            .buttonStyle(.dvPrimary)
            .disabled((billing.phase != .idle && billing.phase != .pending) || billing.info?.canPurchase != true)
            .accessibilityLabel(L("paywall.subscribe", name))
            .accessibilityValue(L("paywall.perMonth", offer.displayPrice))
            .accessibilityIdentifier("paywall.buy.\(offer.tier)")
        }
        .padding(Theme.s5)
        .frame(maxWidth: .infinity, alignment: .leading)
        .dvCard()
    }

    /// The web's plan copy (web/src/content/dentvideo-app.ts tiers), in the app's language.
    static func blurb(_ tier: String) -> String {
        tier == "practice" ? L("paywall.practice.blurb") : L("paywall.starter.blurb")
    }

    static func features(_ tier: String) -> [String] {
        tier == "practice"
            ? [L("paywall.practice.f1"), L("paywall.practice.f2"), L("paywall.practice.f3")]
            : [L("paywall.starter.f1"), L("paywall.starter.f2"), L("paywall.starter.f3")]
    }
}

/// Signed-in address, sign-out and deletion: always reachable, also before any plan.
struct AccountFooter: View {
    @Environment(AppModel.self) private var model
    @Binding var deleting: Bool

    var body: some View {
        VStack(spacing: Theme.s2) {
            if let email = model.me?.user.email {
                Text(L("settings.signedInAs", email)).font(.footnote).foregroundStyle(Theme.muted).multilineTextAlignment(.center)
            }
            HStack(spacing: Theme.s4) {
                Button(L("settings.signOut")) { Task { await model.signOut() } }.buttonStyle(.dvQuiet)
                Button(L("settings.delete"), role: .destructive) { deleting = true }.buttonStyle(.dvQuiet)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.top, Theme.s3)
    }
}

/// This build has no RevenueCat key: nothing can be bought yet. Calm, no error, no crash.
struct NotAvailableView: View {
    @Environment(AppModel.self) private var model
    @State private var deleting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: Theme.s5) {
                    MessageView(icon: "clock", title: L("paywall.unavailable.title"), message: L("paywall.unavailable.body", Config.supportEmail)) {
                        Button(L("common.retry")) { Task { await model.billing.load() } }.buttonStyle(.dvSecondary)
                    }
                    AccountFooter(deleting: $deleting).padding(.horizontal, Theme.gutter)
                }
                .padding(.vertical, Theme.s6)
                .frame(maxWidth: .infinity)
            }
            .background(Theme.paper.ignoresSafeArea())
            .sheet(isPresented: $deleting) { DeleteAccountView() }
        }
    }
}

/// Paid; waiting for the server to switch the plan on (the webhook usually lands in seconds).
struct ActivatingView: View {
    var body: some View {
        VStack(spacing: Theme.s4) {
            ProgressView().controlSize(.large).tint(Theme.teal)
            Text(L("paywall.activating.title"))
                .font(Theme.display(.title2))
                .foregroundStyle(Theme.ink)
                .multilineTextAlignment(.center)
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("paywall.activating")
            Text(L("paywall.activating.body"))
                .font(.body)
                .foregroundStyle(Theme.body)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(Theme.s6)
        .frame(maxWidth: 520)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.paper.ignoresSafeArea())
    }
}

/// Two minutes and the plan is still not active: the money is safe, an email follows.
struct ConfirmingView: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        MessageView(icon: "envelope.badge", title: L("paywall.confirming.title"), message: L("paywall.confirming.body")) {
            Button(L("paywall.confirming.retry")) { Task { await model.billing.checkAgain() } }
                .buttonStyle(.dvPrimary)
                .accessibilityIdentifier("paywall.confirming.retry")
            if let mail = URL(string: "mailto:\(Config.supportEmail)") {
                Link(L("access.contact"), destination: mail).buttonStyle(.dvSecondary)
            }
            Button(L("settings.signOut")) { Task { await model.signOut() } }.buttonStyle(.dvQuiet)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Theme.paper.ignoresSafeArea())
    }
}

/// The plan in Settings, under its name and state: where it is managed. A web plan says so with no
/// link and no price (guideline 3.1.1); an App Store plan opens Apple's subscription management.
struct PlanManageRow: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        if model.billing.management == .appStore {
            Button {
                Task { await model.billing.manageSubscription() }
            } label: {
                Label {
                    Text(L("plan.manage")).foregroundStyle(Theme.teal)
                } icon: {
                    Image(systemName: "arrow.up.forward.app").foregroundStyle(Theme.teal)
                }
            }
            .accessibilityIdentifier("plan.manage")
        }
    }
}

struct PlanFooter: View {
    @Environment(AppModel.self) private var model

    var body: some View {
        switch model.billing.management {
        case .web: Text(L("plan.managedWeb")).accessibilityIdentifier("plan.managedWeb")
        case .appStore: Text(L("plan.managedAppStore")).accessibilityIdentifier("plan.managedAppStore")
        case .none: EmptyView()
        }
    }
}
