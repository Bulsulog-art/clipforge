import BackgroundTasks
import Foundation

/// BGAppRefreshTask wrapper. iOS opportunistically wakes the app while
/// it's backgrounded — at most every ~15 min in practice — to give us a
/// brief window (≤ 30s) to refresh state. We use it for:
///
///   • Reloading NotificationsService so the bell badge is accurate on
///     next foreground.
///   • Republishing the Studio metrics snapshot to the App Group so
///     the home-screen widget keeps ticking even when the user hasn't
///     opened the app today.
///
/// Both calls fit comfortably in the 30s budget — they're a single
/// Supabase fetch each.
@MainActor
enum BackgroundRefresh {
    static let identifier = "com.bulsulabs.clipforge.refresh"

    /// Called once from app launch. Registers the handler and schedules
    /// the first refresh. Subsequent wakes re-register themselves at the
    /// end of each handler.
    static func registerAndSchedule() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: identifier,
            using: nil
        ) { task in
            // The task closure runs on a background queue. Hop to the main
            // actor before touching any of our @MainActor singletons.
            Task { @MainActor in
                await handle(task as! BGAppRefreshTask)
            }
        }
        schedule()
    }

    static func schedule() {
        let req = BGAppRefreshTaskRequest(identifier: identifier)
        // Earliest 15 min from now — iOS may push the actual fire much later.
        req.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        do {
            try BGTaskScheduler.shared.submit(req)
        } catch {
            // App was killed by the user, simulator (no BG tasks), or the
            // entitlement is missing in dev. Silent — we'll re-attempt on
            // next launch.
        }
    }

    /// One wake cycle. Always re-schedules before exiting so the chain
    /// continues. Honour task.expirationHandler so iOS doesn't penalise us.
    private static func handle(_ task: BGAppRefreshTask) async {
        // Reschedule first — even if the work below is cancelled, we want
        // the chain to keep ticking.
        schedule()

        let job = Task {
            await NotificationsService.shared.reload()
            // Re-publish whatever Studio knows. ProjectsView's
            // publishWidgetState is the canonical source; we approximate
            // it here from the same data so the widget stays fresh.
            await republishWidgetSnapshot()
        }
        task.expirationHandler = {
            job.cancel()
            task.setTaskCompleted(success: false)
        }
        _ = await job.value
        task.setTaskCompleted(success: true)
    }

    /// Mirror of ProjectsView.publishWidgetState() but standalone so the
    /// background path doesn't depend on a view being instantiated.
    private static func republishWidgetSnapshot() async {
        guard let jobs = try? await ClipForgeAPI.shared.fetchJobs() else { return }
        let cutoff = Date().addingTimeInterval(-7 * 24 * 60 * 60)
        let formatter = ISO8601DateFormatter()
        let weeklyReady = jobs.filter { job in
            guard job.status == "ready",
                  let d = formatter.date(from: job.createdAt) else { return false }
            return d >= cutoff
        }.count
        let active = jobs.filter { $0.status != "ready" && $0.status != "failed" }.count

        // Refresh the daily pick + streak so the widget doesn't drift.
        await DailyPickService.shared.refresh()
        StreakService.shared.reconcile(with: jobs)

        let pick = DailyPickService.shared.pick
        SharedAppState.save(SharedAppState(
            activeJobs: active,
            readyThisWeek: weeklyReady,
            streak: StreakService.shared.current,
            todaysPickHook: pick.map { String($0.hook.prefix(120)) } ?? "",
            todaysPickNiche: pick?.niche ?? "",
            updatedAt: Date()
        ))
    }
}
