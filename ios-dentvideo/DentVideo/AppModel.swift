import Foundation
import SwiftUI

@MainActor
@Observable
final class AppModel {
    enum Phase: Equatable { case launching, signedOut, signedIn }

    var phase: Phase = .launching
    private(set) var backend: Backend?
    var clinic: Clinic?
    var weeks: [Week] = []
    var loading = false
    var error: String?

    var isDemo: Bool { backend?.isDemo ?? false }

    /// The newest week, the one the dentist is asked to review.
    var currentWeek: Week? { weeks.first }
    var pastWeeks: [Week] { Array(weeks.dropFirst()) }

    func launch() async {
        if ProcessInfo.processInfo.arguments.contains("-demo") {
            await enterDemo()
            return
        }
        if await LiveBackend.shared.restore() {
            backend = LiveBackend.shared
            phase = .signedIn
            // refresh() signs out by itself if the stored login no longer works.
            await refresh()
        } else {
            phase = .signedOut
        }
    }

    func signIn(email: String, password: String) async throws {
        try await LiveBackend.shared.signIn(email: email, password: password)
        backend = LiveBackend.shared
        phase = .signedIn
        await refresh()
    }

    func enterDemo() async {
        backend = DemoBackend()
        phase = .signedIn
        await refresh()
    }

    func refresh() async {
        guard let backend else { return }
        loading = true
        defer { loading = false }
        do {
            clinic = try await backend.clinic()
            weeks = Week.group(try await backend.items())
            error = nil
        } catch {
            // The login no longer works (account deleted on the web, token revoked): back to sign-in.
            if (error as? BackendError) == .signedOut, !isDemo {
                await signOut()
                return
            }
            self.error = (error as? BackendError)?.message ?? BackendError.generic.message
        }
    }

    func item(_ id: String) -> VideoItem? {
        weeks.lazy.flatMap(\.items).first { $0.id == id }
    }

    private func replace(_ item: VideoItem) {
        for w in weeks.indices {
            if let i = weeks[w].items.firstIndex(where: { $0.id == item.id }) { weeks[w].items[i] = item }
        }
    }

    /// Optimistic: the card changes at once and goes back if the server says no.
    func decide(_ id: String, _ approval: VideoItem.Approval, note: String? = nil) async {
        guard let backend, var item = item(id), item.canDecide else { return }
        let before = item
        item.approval = approval
        item.approvalNote = note
        replace(item)
        do {
            try await backend.decide(id, approval: approval, note: note)
        } catch {
            replace(before)
            self.error = (error as? BackendError)?.message ?? BackendError.generic.message
        }
    }

    func approveAll(in week: Week) async {
        for item in week.items where item.stage == .needsReview {
            await decide(item.id, .approved)
        }
    }

    func setPosted(_ id: String, _ posted: Bool) async {
        guard let backend, var item = item(id), item.approval == .approved else { return }
        let before = item
        item.postedAt = posted ? Date() : nil
        replace(item)
        do { try await backend.setPosted(id, posted: posted) } catch {
            replace(before)
            self.error = (error as? BackendError)?.message ?? BackendError.generic.message
        }
    }

    func signOut() async {
        await backend?.signOut()
        backend = nil
        clinic = nil
        weeks = []
        error = nil
        phase = .signedOut
    }

    func deleteAccount(confirm: String) async throws {
        try await backend?.deleteAccount(confirm: confirm)
        await signOut()
    }
}
