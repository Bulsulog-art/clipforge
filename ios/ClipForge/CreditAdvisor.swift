import Foundation
import SwiftUI

/// Watches the user's credit-consumption rate and surfaces a one-tap
/// upgrade recommendation when their burn pattern doesn't match their
/// current plan. Pure client-side — no analytics SDK, no backend signal —
/// just `CreditsService.balance` deltas tracked in UserDefaults.
///
/// Examples it covers:
///   Weekly subscriber burning 24 of 30 credits in 2 days → "Yearly saves
///   ~80%". Monthly subscriber on pace for 4×40 = 160 cr/mo → "Yearly is
///   cheaper per credit". Yearly subscriber already burned 50+ this
///   week → "Top up: 40 credits for $4.99".
@MainActor
final class CreditAdvisor: ObservableObject {
    static let shared = CreditAdvisor()

    @Published private(set) var recommendation: Recommendation?

    /// Keys are bucketed by ISO day / week so a stale cache doesn't poison
    /// the recommendation after the calendar rolls over.
    private static let dayKey         = "clipforge.creditAdvisor.day"
    private static let consumedTodayKey = "clipforge.creditAdvisor.consumedToday"
    private static let weekKey        = "clipforge.creditAdvisor.week"
    private static let consumedThisWeekKey = "clipforge.creditAdvisor.consumedThisWeek"
    private static let lastBalanceKey = "clipforge.creditAdvisor.lastBalance"
    private static let lastDismissKey = "clipforge.creditAdvisor.lastDismissAt"
    private static let dedupSeconds: TimeInterval = 7 * 24 * 60 * 60   // 7d snooze on dismiss

    private init() {
        recompute()
    }

    enum Tier { case free, weekly, monthly, yearly }

    struct Recommendation: Equatable {
        let title: String
        let body: String
        let cta: String
        let target: Target

        enum Target: Equatable { case plansSheet, creditsPaywall }
    }

    /// Called by callers (ProjectsView) whenever fresh credit + plan state
    /// is available. Cheap — most of the time it just compares against
    /// stored values and returns without producing a recommendation.
    func update(
        currentBalance: Int,
        tier: Tier,
        plusProductId: String?
    ) {
        // 1) Compute consumption since last seen
        let stored = UserDefaults.standard
        let prevBalance = stored.object(forKey: Self.lastBalanceKey) as? Int
        // Roll buckets if the day/week key has changed.
        rollBucketsIfNeeded()
        if let prev = prevBalance, currentBalance < prev {
            let delta = prev - currentBalance
            let today = (stored.integer(forKey: Self.consumedTodayKey))
            let weekly = (stored.integer(forKey: Self.consumedThisWeekKey))
            stored.set(today + delta, forKey: Self.consumedTodayKey)
            stored.set(weekly + delta, forKey: Self.consumedThisWeekKey)
        }
        stored.set(currentBalance, forKey: Self.lastBalanceKey)

        // 2) Skip if user dismissed recently
        if let last = stored.object(forKey: Self.lastDismissKey) as? Date,
           Date().timeIntervalSince(last) < Self.dedupSeconds {
            recommendation = nil
            return
        }

        recommendation = derive(tier: tier, plusProductId: plusProductId)
    }

    func dismiss() {
        UserDefaults.standard.set(Date(), forKey: Self.lastDismissKey)
        recommendation = nil
    }

    // MARK: - Internals

    private func derive(tier: Tier, plusProductId: String?) -> Recommendation? {
        let weekly = UserDefaults.standard.integer(forKey: Self.consumedThisWeekKey)

        switch tier {
        case .weekly:
            // 70% of 30 cr = 21. If they're burning past that, weekly is a bad fit.
            if weekly >= 21 {
                return Recommendation(
                    title: "You're moving fast 🔥",
                    body: "You've spent \(weekly) credits this week on Plus Weekly. Yearly gives you 1,200 credits and works out to about 82% less per credit.",
                    cta: "See Yearly",
                    target: .plansSheet
                )
            }
        case .monthly:
            // Monthly = 40/mo. 15 in a week ≈ 60+ pace per month → outpacing the plan.
            if weekly >= 15 {
                return Recommendation(
                    title: "Yearly would be cheaper",
                    body: "At this pace you'll outpace Plus Monthly. Yearly drops you from $0.37/credit to $0.12.",
                    cta: "Switch to Yearly",
                    target: .plansSheet
                )
            }
        case .yearly:
            // 1,200/yr ≈ 23/wk. Double that in one week → top-up territory.
            if weekly >= 46 {
                return Recommendation(
                    title: "Big week — going through credits fast",
                    body: "You've spent \(weekly) this week. A top-up adds 40 credits for $4.99 and covers a heavy stretch without touching your renewal.",
                    cta: "Top up credits",
                    target: .creditsPaywall
                )
            }
        case .free:
            // Free users get the existing FreeTierNudge handled in ProjectsView —
            // CreditAdvisor stays quiet so we don't double up.
            return nil
        }
        return nil
    }

    private func rollBucketsIfNeeded() {
        let cal = Calendar.current
        let today = isoDayKey(for: Date(), cal: cal)
        let week = isoWeekKey(for: Date(), cal: cal)
        let stored = UserDefaults.standard

        if stored.string(forKey: Self.dayKey) != today {
            stored.set(today, forKey: Self.dayKey)
            stored.set(0, forKey: Self.consumedTodayKey)
        }
        if stored.string(forKey: Self.weekKey) != week {
            stored.set(week, forKey: Self.weekKey)
            stored.set(0, forKey: Self.consumedThisWeekKey)
        }
    }

    private func recompute() {
        // Snapshot on init so a returning user sees the recommendation
        // immediately if one is due.
        rollBucketsIfNeeded()
    }

    private func isoDayKey(for date: Date, cal: Calendar) -> String {
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.timeZone = TimeZone.current
        return df.string(from: date)
    }

    private func isoWeekKey(for date: Date, cal: Calendar) -> String {
        let comps = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        return "\(comps.yearForWeekOfYear ?? 0)-W\(comps.weekOfYear ?? 0)"
    }
}
