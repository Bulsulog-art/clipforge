import Foundation
import SwiftUI

/// Daily-activity streak tracker. A user is "active" on day D if at least
/// one of their video jobs reached `status == "ready"` and was created on
/// day D (we use created_at as a proxy for finished_at because the API
/// doesn't return finished_at separately — render times of 60–120s mean
/// the two are within a minute).
///
/// We pulse the badge with a confetti shower when the user crosses a
/// motivating milestone (3, 7, 14, 30, 60, 90, 180, 365 days) — once per
/// milestone, persisted to UserDefaults so a re-bump doesn't re-confetti.
@MainActor
final class StreakService: ObservableObject {
    static let shared = StreakService()

    @Published private(set) var current: Int = 0
    /// When non-nil, the milestone day count the UI should confetti at next
    /// frame. Caller clears it after consuming.
    @Published var pendingMilestone: Int?

    private static let streakKey = "clipforge.streakDays"
    private static let lastDateKey = "clipforge.streakLastDateISO"   // YYYY-MM-DD
    private static let milestonesKey = "clipforge.streakMilestonesHit"
    private static let milestones: [Int] = [3, 7, 14, 30, 60, 90, 180, 365]

    private init() {
        current = UserDefaults.standard.integer(forKey: Self.streakKey)
        // Compute health: if the last bump was more than 1 day ago, the
        // streak has lapsed — surface 0 so the UI stops claiming success.
        if !isStreakAlive() {
            current = 0
        }
    }

    /// Reconcile the streak against the user's current job list. Called from
    /// ProjectsView every time the jobs list refreshes.
    ///
    /// The contract:
    ///   • If any job reached "ready" today and we haven't bumped today,
    ///     advance the streak (consecutive day if last bump was yesterday,
    ///     otherwise start fresh at 1).
    ///   • If we cross a milestone, queue a confetti notification.
    func reconcile(with jobs: [VideoJob]) {
        guard hasReadyToday(in: jobs) else {
            // No activity today yet — don't bump, but recompute liveness for display.
            if !isStreakAlive() && current != 0 {
                current = 0
            }
            return
        }
        let today = Self.todayKey()
        let lastBump = UserDefaults.standard.string(forKey: Self.lastDateKey)
        if lastBump == today { return }  // already counted today

        let yesterday = Self.dayKey(addingDaysFromToday: -1)
        let newValue: Int
        if lastBump == yesterday {
            newValue = current + 1
        } else {
            // Either fresh start or broken streak — restart at 1.
            newValue = 1
        }

        UserDefaults.standard.set(newValue, forKey: Self.streakKey)
        UserDefaults.standard.set(today, forKey: Self.lastDateKey)
        current = newValue

        // Milestone check
        if Self.milestones.contains(newValue), !milestoneAlreadyCelebrated(newValue) {
            markMilestoneCelebrated(newValue)
            pendingMilestone = newValue
        }
    }

    // MARK: - Internals

    /// "Alive" means the user's last activity was today or yesterday. A
    /// 2-day gap kills the streak (display reverts to 0); the underlying
    /// stored value also resets at the next reconcile().
    private func isStreakAlive() -> Bool {
        guard let last = UserDefaults.standard.string(forKey: Self.lastDateKey) else {
            return false
        }
        return last == Self.todayKey() || last == Self.dayKey(addingDaysFromToday: -1)
    }

    private func hasReadyToday(in jobs: [VideoJob]) -> Bool {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let formatter = ISO8601DateFormatter()
        return jobs.contains { job in
            guard job.status == "ready",
                  let d = formatter.date(from: job.createdAt) else { return false }
            return cal.isDate(d, inSameDayAs: today)
        }
    }

    // MARK: - Day-key helpers (stable across timezones for storage purposes)

    private static func todayKey() -> String {
        dayKey(addingDaysFromToday: 0)
    }

    private static func dayKey(addingDaysFromToday days: Int) -> String {
        let cal = Calendar.current
        let date = cal.date(byAdding: .day, value: days, to: Date()) ?? Date()
        let df = DateFormatter()
        df.dateFormat = "yyyy-MM-dd"
        df.timeZone = TimeZone.current
        return df.string(from: date)
    }

    // MARK: - Milestone tracking

    private func milestoneAlreadyCelebrated(_ day: Int) -> Bool {
        celebrated().contains(day)
    }

    private func markMilestoneCelebrated(_ day: Int) {
        var hit = celebrated()
        hit.insert(day)
        UserDefaults.standard.set(Array(hit), forKey: Self.milestonesKey)
    }

    private func celebrated() -> Set<Int> {
        let arr = UserDefaults.standard.array(forKey: Self.milestonesKey) as? [Int] ?? []
        return Set(arr)
    }
}
