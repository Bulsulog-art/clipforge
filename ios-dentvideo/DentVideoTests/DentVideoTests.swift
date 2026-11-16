import XCTest
@testable import DentVideo

final class ModelTests: XCTestCase {
    private func item(_ id: String, week: String = "2026-11-16", status: VideoItem.Status = .ready,
                      approval: VideoItem.Approval = .pending, video: Bool = true) -> VideoItem {
        VideoItem(id: id, title: id, weekOf: week, status: status, approval: approval, approvalNote: nil,
                  caption: "Caption", hashtags: ["dentist", "#smile"], postedAt: nil,
                  videoURL: video ? URL(string: "https://example.com/\(id).mp4") : nil, thumbURL: nil)
    }

    func testStageShowsOneStatePerVideo() {
        XCTAssertEqual(item("a", status: .working).stage, .making)
        XCTAssertEqual(item("b", status: .ready, video: false).stage, .making, "no file yet is not reviewable")
        XCTAssertEqual(item("c").stage, .needsReview)
        XCTAssertEqual(item("d", status: .flagged).stage, .needsReview)
        XCTAssertEqual(item("e", approval: .approved).stage, .approved)
        XCTAssertEqual(item("f", approval: .rejected).stage, .changesRequested)
        XCTAssertEqual(item("g", status: .failed).stage, .unavailable)
        XCTAssertEqual(item("h", status: .rejected).stage, .unavailable)
    }

    func testOnlyFinishedVideosCanBeDecided() {
        XCTAssertTrue(item("a", status: .ready).canDecide)
        XCTAssertTrue(item("b", status: .flagged).canDecide)
        XCTAssertFalse(item("c", status: .queued).canDecide)
        XCTAssertFalse(item("d", status: .failed).canDecide)
    }

    func testPostTextHasCaptionThenHashtags() {
        XCTAssertEqual(item("a").postText, "Caption\n\n#dentist #smile")
    }

    func testWeeksAreNewestFirst() {
        let weeks = Week.group([item("x", week: "2026-11-02"), item("y", week: "2026-11-16"), item("z", week: "2026-11-09")])
        XCTAssertEqual(weeks.map(\.weekOf), ["2026-11-16", "2026-11-09", "2026-11-02"])
    }

    func testWeekCounts() {
        let w = Week(weekOf: "2026-11-16", items: [item("a"), item("b", approval: .approved), item("c", status: .working)])
        XCTAssertEqual(w.needsReview, 1)
        XCTAssertEqual(w.approved, 1)
    }

    func testDemoWeekStartsOnMondayUTC() {
        let sunday = ISO8601DateFormatter().date(from: "2026-11-22T23:30:00Z")!
        XCTAssertEqual(DemoContent.monday(of: sunday), "2026-11-16")
        let monday = ISO8601DateFormatter().date(from: "2026-11-16T00:10:00Z")!
        XCTAssertEqual(DemoContent.monday(of: monday), "2026-11-16")
    }
}

@MainActor
final class DemoBackendTests: XCTestCase {
    func testSampleClinicUsesTheSiteSamplesInTheDeviceLanguage() async throws {
        let tr = DemoBackend(language: "tr")
        let items = try await tr.items()
        XCTAssertEqual(items.count, 3)
        XCTAssertTrue(items.allSatisfy { $0.videoURL?.absoluteString.hasPrefix("https://dentvideo.com/dentvideo/samples/tr/") == true })
        let name = try await tr.clinic().name
        XCTAssertEqual(name, "Demo Diş Kliniği")
        // An unsupported language falls back to English, never to an empty week.
        let fallback = try await DemoBackend(language: "xx").items()
        XCTAssertEqual(fallback.count, 3)
    }

    func testDecisionsStayOnThePhoneAndFollowTheRules() async throws {
        let demo = DemoBackend(language: "en")
        let id = try await demo.items()[0].id
        try await demo.setPosted(id, posted: true)
        let unposted = try await demo.items()[0]
        XCTAssertNil(unposted.postedAt, "only an approved video can be marked posted")
        try await demo.decide(id, approval: .approved, note: nil)
        try await demo.setPosted(id, posted: true)
        let posted = try await demo.items()[0]
        XCTAssertNotNil(posted.postedAt)
        try await demo.decide(id, approval: .rejected, note: "too long")
        let after = try await demo.items()[0]
        XCTAssertEqual(after.approval, .rejected)
        XCTAssertNil(after.postedAt, "a rejected video is not posted")
    }

    func testAppModelApproveAllApprovesOnlyReviewableVideos() async {
        let model = AppModel()
        await model.enterDemo()
        guard let week = model.currentWeek else { return XCTFail("no week") }
        XCTAssertEqual(week.needsReview, 3)
        await model.approveAll(in: week)
        XCTAssertEqual(model.currentWeek?.approved, 3)
        XCTAssertEqual(model.currentWeek?.needsReview, 0)
        await model.signOut()
        XCTAssertEqual(model.phase, .signedOut)
        XCTAssertTrue(model.weeks.isEmpty)
    }
}
