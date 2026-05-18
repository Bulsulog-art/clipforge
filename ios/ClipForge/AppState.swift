import Foundation
import SwiftUI

/// Global app navigation state. Driven by deeplinks (push notifications),
/// trend tab "Use this hook" CTAs, and any other cross-tab navigation.
@MainActor
final class AppState: ObservableObject {
    enum Tab: Hashable { case studio, trends, clips, channels, settings }

    @Published var selectedTab: Tab = .studio

    /// When a job detail should be opened (e.g. after tapping a 'clips ready'
    /// push notification), this holds the job id. ProjectsView clears it once
    /// the destination is presented.
    @Published var pendingJobId: String?

    /// When 'Use this hook' is tapped on a Trend card, this carries the niche
    /// (and optional hook text) to prefill NewProjectSheet.
    @Published var pendingNewProject: NewProjectSeed?

    static let shared = AppState()

    private init() {
        NotificationCenter.default.addObserver(
            forName: .clipForgeOpenJob,
            object: nil,
            queue: .main
        ) { [weak self] note in
            Task { @MainActor in
                guard let jobId = note.userInfo?["jobId"] as? String else { return }
                self?.selectedTab = .studio
                self?.pendingJobId = jobId
            }
        }
    }

    func startFromTrend(niche: String, hook: String?) {
        pendingNewProject = NewProjectSeed(niche: niche, hook: hook)
        selectedTab = .studio
    }
}

struct NewProjectSeed: Identifiable {
    var id: UUID = .init()
    var niche: String
    var hook: String?
}
