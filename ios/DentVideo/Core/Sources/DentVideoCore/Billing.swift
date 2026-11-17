import Foundation

// In-app purchase (App Store through RevenueCat): the shapes of GET /mobile/v1/billing and of the
// sign-up and email-code routes, and the pure rules the app follows with them
// (docs/DENTVIDEO_IAP_PLAN.md §3–§6). No price ever comes from the server: StoreKit shows the
// storefront's own localized price for each product id.

/// What the plan screen and the paywall are told about the plan (`status` of GET billing).
public enum BillingStatus: String, Codable, Sendable, CaseIterable {
    /// Never paid: the paywall.
    case none
    case active
    /// Auto-renew off or cancelled, paid until `endsAt`.
    case ending
    /// Apple is retrying the charge.
    case billingIssue = "billing_issue"
    /// A web subscription on hold.
    case paused
    /// A web payment being confirmed.
    case pending
    case disputed
    case adminPaused = "admin_paused"
    /// A plan that ended: the paywall again.
    case ended
    case unknown

    public init(from decoder: Decoder) throws {
        self = BillingStatus(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

/// Why a purchase cannot start yet.
public enum BillingBlocker: String, Codable, Sendable {
    /// The clinic form is not saved yet.
    case clinic
    /// The email address is not confirmed with the 6-digit code.
    case emailUnverified = "email_unverified"
    case unknown

    public init(from decoder: Decoder) throws {
        self = BillingBlocker(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

/// Where the plan is changed or cancelled.
public enum BillingManage: String, Codable, Sendable {
    /// Apple's subscription page (the app shows "Manage subscription").
    case appStore = "app_store"
    /// On the web: the app says so, with no link and no price (guideline 3.1.1).
    case web
    case unknown

    public init(from decoder: Decoder) throws {
        self = BillingManage(rawValue: try decoder.singleValueContainer().decode(String.self)) ?? .unknown
    }
}

public struct BillingPlan: Codable, Sendable, Equatable {
    public var state: String
    public var tier: String?
    /// "dodo" (the web) or "apple"; nil = no plan yet.
    public var source: String?
    public var renewsAt: String?
    public var endsAt: String?

    public init(state: String, tier: String? = nil, source: String? = nil, renewsAt: String? = nil, endsAt: String? = nil) {
        self.state = state
        self.tier = tier
        self.source = source
        self.renewsAt = renewsAt
        self.endsAt = endsAt
    }
}

/// One App Store product the app may offer: tier, product id and RevenueCat entitlement. No price.
public struct BillingProduct: Codable, Sendable, Equatable, Hashable {
    public var tier: String
    public var productId: String
    public var entitlement: String

    public init(tier: String, productId: String, entitlement: String) {
        self.tier = tier
        self.productId = productId
        self.entitlement = entitlement
    }

    /// The two plans the app sells, as the server names them (used when an answer lists none).
    public static let defaults = [
        BillingProduct(tier: "starter", productId: "dentvideo_starter_monthly", entitlement: "starter"),
        BillingProduct(tier: "practice", productId: "dentvideo_practice_monthly", entitlement: "practice"),
    ]
}

/// GET /mobile/v1/billing.
public struct BillingInfo: Codable, Sendable, Equatable {
    /// What the app passes to RevenueCat's `Purchases.logIn` (the server names it; the app never builds it).
    public var appUserId: String
    public var clinicId: String?
    public var plan: BillingPlan?
    public var status: BillingStatus
    /// The paywall may be shown: no live subscription in either channel.
    public var showPaywall: Bool
    /// …and a purchase may start now (no blockers).
    public var canPurchase: Bool
    public var blockers: [BillingBlocker]
    public var manage: BillingManage?
    public var manageUrl: URL?
    public var products: [BillingProduct]

    public init(appUserId: String, clinicId: String?, plan: BillingPlan?, status: BillingStatus, showPaywall: Bool, canPurchase: Bool, blockers: [BillingBlocker] = [], manage: BillingManage? = nil, manageUrl: URL? = nil, products: [BillingProduct] = BillingProduct.defaults) {
        self.appUserId = appUserId
        self.clinicId = clinicId
        self.plan = plan
        self.status = status
        self.showPaywall = showPaywall
        self.canPurchase = canPurchase
        self.blockers = blockers
        self.manage = manage
        self.manageUrl = manageUrl
        self.products = products
    }

    enum CodingKeys: String, CodingKey { case appUserId, clinicId, plan, status, showPaywall, canPurchase, blockers, manage, manageUrl, products }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        appUserId = try c.decode(String.self, forKey: .appUserId)
        clinicId = try c.decodeIfPresent(String.self, forKey: .clinicId)
        plan = try c.decodeIfPresent(BillingPlan.self, forKey: .plan)
        status = try c.decodeIfPresent(BillingStatus.self, forKey: .status) ?? .unknown
        showPaywall = try c.decodeIfPresent(Bool.self, forKey: .showPaywall) ?? false
        canPurchase = try c.decodeIfPresent(Bool.self, forKey: .canPurchase) ?? false
        blockers = try c.decodeIfPresent([BillingBlocker].self, forKey: .blockers) ?? []
        manage = try? c.decodeIfPresent(BillingManage.self, forKey: .manage)
        // Only Apple's own https page is ever opened.
        manageUrl = VideoItem.webURL(try? c.decodeIfPresent(String.self, forKey: .manageUrl))
        let listed = (try? c.decodeIfPresent([BillingProduct].self, forKey: .products)) ?? nil
        products = (listed?.isEmpty ?? true) ? BillingProduct.defaults : listed!
    }

    /// The plan is live (the server's word, from the webhook): the app opens the week.
    public var isLive: Bool { plan?.state == "active" }
}

// MARK: - What the app shows

/// The screen for a signed-in account that cannot use the week yet (no plan, or no clinic).
public enum PurchaseStep: Equatable, Sendable {
    /// The clinic details form (the web's start flow, step 2).
    case clinic
    /// The 6-digit code sent to the account's address (the server refuses a purchase before it).
    case verifyEmail
    /// Starter and Practice with StoreKit's prices, restore, terms.
    case paywall
    /// The paywall would open, but this build has no RevenueCat key: a calm "not available yet".
    case notAvailable
    /// No paywall (a web payment being confirmed, a dispute, paused by DentVideo): the neutral
    /// account screen, with no way to buy.
    case noPaywall

    /// Pure: from GET billing and whether the purchase layer is configured.
    public static func of(_ b: BillingInfo, storeAvailable: Bool) -> PurchaseStep {
        if b.clinicId == nil || b.blockers.contains(.clinic) { return .clinic }
        guard b.showPaywall else { return .noPaywall }
        if b.blockers.contains(.emailUnverified) { return .verifyEmail }
        guard storeAvailable else { return .notAvailable }
        return .paywall
    }
}

/// What the plan screen in Settings shows about where the plan is managed.
public enum PlanManagement: Equatable, Sendable {
    /// "Managed on the web": no link, no price (guideline 3.1.1).
    case web
    /// "Manage subscription": Apple's subscription page.
    case appStore
    /// Nothing to manage (no live plan, paused by DentVideo, a payment being confirmed).
    case none

    public static func of(_ b: BillingInfo?) -> PlanManagement {
        switch b?.manage {
        case .appStore?: return .appStore
        case .web?: return .web
        default: return .none
        }
    }
}

// MARK: - After a purchase

public enum ActivationResult: Equatable, Sendable {
    /// The server shows the plan active (the RevenueCat webhook arrived).
    case active(BillingInfo)
    /// Not yet after the waiting time: "we're confirming your purchase; you will get an email".
    case timedOut
}

/// After a purchase the App Store has taken the money, but the plan switches on only when
/// RevenueCat's webhook reaches the server. Poll GET billing until it shows the plan active
/// (usually seconds), at most `timeout`. A failed poll (offline, 500) is retried, never fatal.
public enum ActivationPoll {
    /// Seconds between polls: quick at first, then calmer.
    public static func delay(attempt: Int) -> TimeInterval {
        attempt < 5 ? 2 : 5
    }

    public static func run(timeout: TimeInterval = 120,
                           now: @Sendable () -> Date = { Date() },
                           sleep: @Sendable (TimeInterval) async throws -> Void = { try await Task.sleep(nanoseconds: UInt64($0 * 1_000_000_000)) },
                           fetch: @Sendable () async throws -> BillingInfo) async -> ActivationResult {
        let start = now()
        var attempt = 0
        while true {
            if Task.isCancelled { return .timedOut }
            if let b = try? await fetch(), b.isLive { return .active(b) }
            let wait = delay(attempt: attempt)
            attempt += 1
            if now().timeIntervalSince(start) + wait > timeout { return .timedOut }
            do { try await sleep(wait) } catch { return .timedOut }
        }
    }
}

// MARK: - Sign-up and the email code

/// The sign-up form's local checks (the server checks again).
public enum SignupRules {
    public static let minPassword = 8
    /// The account server (bcrypt) refuses passwords over 72 bytes.
    public static let maxPasswordBytes = 72
    /// The server refuses a form filled in less than this (a bot brake).
    public static let minFillMs = 2_500

    public static func isEmail(_ s: String) -> Bool {
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        guard t.count <= 200, let at = t.firstIndex(of: "@") else { return false }
        let local = t[..<at], domain = t[t.index(after: at)...]
        return !local.isEmpty && domain.contains(".") && !domain.hasPrefix(".") && !domain.hasSuffix(".") && !t.contains(" ") && t.filter { $0 == "@" }.count == 1
    }

    public static func passwordProblem(_ p: String) -> PasswordProblem? {
        if p.count < minPassword { return .tooShort }
        if p.utf8.count > maxPasswordBytes { return .tooLong }
        return nil
    }

    public enum PasswordProblem: Equatable, Sendable { case tooShort, tooLong }

    /// The 6-digit code as typed or pasted ("123 456", "12-34-56", full-width digits): digits only, at most six.
    public static func code(_ typed: String) -> String {
        String(typed.compactMap { c -> Character? in
            guard let v = c.wholeNumberValue, v >= 0, v <= 9 else { return nil }
            return Character(String(v))
        }.prefix(6))
    }
}

/// POST /mobile/v1/signup's answer.
public struct SignupAnswer: Codable, Sendable, Equatable {
    public var ok: Bool?
    public var signedIn: Bool?
    public var existing: Bool?
    public var session: Tokens?
}

public enum SignupOutcome: Equatable, Sendable {
    /// A new account (or an existing one this password opens), signed in: next, the 6-digit code.
    case signedIn(Tokens)
    /// The address already has an account and the password did not open it: sign in, or use the
    /// reset link the server emailed. Never says more (no account enumeration).
    case existingAccount
    /// Created, but the server could not open the session: sign in with the same email and password.
    case createdSignInNeeded

    public static func of(_ a: SignupAnswer) -> SignupOutcome {
        if let s = a.session { return .signedIn(s) }
        if a.existing == true { return .existingAccount }
        return .createdSignInNeeded
    }
}

/// POST /mobile/v1/verify-email's answer.
public struct VerifyEmailAnswer: Codable, Sendable, Equatable {
    public var ok: Bool?
    public var verified: Bool?
    public var email: String?
    public var pending: Bool?
    public var resendInSec: Int?
}
