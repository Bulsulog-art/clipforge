import Foundation
import Observation
import DentVideoCore

/// The plan as GET billing describes it, the App Store's offers, and the purchase itself:
/// buy → poll GET billing until the server shows the plan active (the RevenueCat webhook) →
/// the week. Restore, and Apple's "manage subscription". Owned by AppModel.
@MainActor
@Observable
final class BillingModel {
    enum Phase: Equatable {
        case idle
        /// Apple's sheet is open for this product.
        case purchasing(String)
        case restoring
        /// Paid (or restored); waiting for the server to switch the plan on.
        case activating
        /// Two minutes without the plan active: "we're confirming your purchase; you'll get an email".
        case confirming
        /// Ask to Buy or a bank check: the App Store finishes it later.
        case pending
    }

    var info: BillingInfo?
    var offers: [StoreOffer] = []
    var loading = false
    /// GET billing failed (offline, server): the gate shows a retry.
    var loadError: String?
    /// The App Store's offers could not be loaded.
    var offersError: String?
    var phase: Phase = .idle
    /// A sentence after a refused purchase or restore ("nothing was found to restore").
    var message: String?

    @ObservationIgnored let store: PurchaseService
    @ObservationIgnored private let api: APIClient
    @ObservationIgnored private var loggedInID: String?
    @ObservationIgnored private var pollTimeout: TimeInterval = 120
    /// Called when the plan is live, so the app reloads /me and opens the week.
    @ObservationIgnored var onActive: (() async -> Void)?

    init(api: APIClient, store: PurchaseService) {
        self.api = api
        self.store = store
    }

    #if DEBUG
    /// Demo flow mode: a short wait so the UI tests see the timeout message.
    func setPollTimeout(_ t: TimeInterval) { pollTimeout = t }
    #endif

    var step: PurchaseStep? { info.map { PurchaseStep.of($0, storeAvailable: store.isAvailable) } }
    var management: PlanManagement { PlanManagement.of(info) }

    /// Offers in the order the paywall shows them: Starter, then Practice (no pre-selection).
    var sortedOffers: [StoreOffer] {
        let order = ["starter": 0, "practice": 1]
        return offers.sorted { (order[$0.tier] ?? 9) < (order[$1.tier] ?? 9) }
    }

    // MARK: Loading

    @ObservationIgnored private var loadTask: Task<Void, Never>?

    /// GET billing, then `Purchases.logIn` with the id it names, then the offers when the paywall may
    /// open. Calls made while one is running share it.
    func load() async {
        if let loadTask { return await loadTask.value }
        let task = Task { await fetch() }
        loadTask = task
        await task.value
        loadTask = nil
    }

    private func fetch() async {
        loading = true
        defer { loading = false }
        do {
            let b = try await api.billing()
            info = b
            loadError = nil
            await logIn(b.appUserId)
            if PurchaseStep.of(b, storeAvailable: store.isAvailable) == .paywall, offers.isEmpty { await loadOffers() }
        } catch {
            if info == nil { loadError = describe(error) }
        }
    }

    func loadOffers() async {
        guard let info else { return }
        do {
            offers = try await store.offers(for: info.products)
            offersError = nil
        } catch {
            offersError = L("paywall.error.offers")
        }
    }

    private func logIn(_ id: String) async {
        guard id != loggedInID else { return }
        await store.logIn(id)
        loggedInID = id
    }

    /// Sign-out (or the session ended): forget the plan and log RevenueCat out.
    func reset() async {
        info = nil
        offers = []
        phase = .idle
        message = nil
        loadError = nil
        offersError = nil
        if loggedInID != nil { await store.logOut() }
        loggedInID = nil
    }

    // MARK: Buying

    func purchase(_ offer: StoreOffer) async {
        guard phase == .idle || phase == .pending, info?.canPurchase == true else { return }
        message = nil
        phase = .purchasing(offer.productId)
        do {
            switch try await store.purchase(offer) {
            case .cancelled: phase = .idle
            case .pending: phase = .pending
            case .purchased: await waitForActivation()
            }
        } catch {
            phase = .idle
            message = describe(error)
        }
    }

    func restore() async {
        guard phase == .idle || phase == .pending, let info else { return }
        message = nil
        phase = .restoring
        do {
            if try await store.restore(entitlements: Set(info.products.map(\.entitlement))) {
                await waitForActivation()
            } else {
                phase = .idle
                message = L("paywall.restore.none")
            }
        } catch {
            phase = .idle
            message = describe(error)
        }
    }

    /// Polls GET billing until the server shows the plan active, then opens the week.
    func waitForActivation() async {
        phase = .activating
        let api = self.api
        let result = await ActivationPoll.run(timeout: pollTimeout) { try await api.billing() }
        switch result {
        case let .active(b):
            info = b
            phase = .idle
            await onActive?()
        case .timedOut:
            phase = .confirming
        }
    }

    /// "Check again" on the confirming screen.
    func checkAgain() async {
        await waitForActivation()
    }

    func manageSubscription() async {
        await store.showManageSubscriptions(fallback: info?.manageUrl)
    }

    private func describe(_ error: Error) -> String {
        if let p = error as? PurchaseFailure {
            switch p {
            case let .store(text): return text
            case .unavailable: return L("paywall.error.offers")
            }
        }
        switch error as? APIError {
        case .offline?: return L("error.offline")
        case .rateLimited?: return L("error.tooMany")
        case let .refused(_, message)?: return message ?? L("error.generic")
        default: return L("error.generic")
        }
    }
}
