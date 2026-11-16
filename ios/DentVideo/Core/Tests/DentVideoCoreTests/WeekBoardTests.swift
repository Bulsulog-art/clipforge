import XCTest
@testable import DentVideoCore

final class WeekBoardTests: XCTestCase {
    func date(_ s: String) -> Date { ISO8601DateFormatter().date(from: s)! }

    func testWeekOfIsMondayUTC() {
        XCTAssertEqual(WeekBoard.weekOf(date("2026-11-16T00:00:00Z")), "2026-11-16") // Monday
        XCTAssertEqual(WeekBoard.weekOf(date("2026-11-22T23:59:59Z")), "2026-11-16") // Sunday
        XCTAssertEqual(WeekBoard.weekOf(date("2026-11-23T00:00:00Z")), "2026-11-23")
        XCTAssertEqual(WeekBoard.weekOf(date("2027-01-01T12:00:00Z")), "2026-12-28") // across the year
    }

    func testDeliveryWeekSwitchesSaturdayEvening() {
        // Same rule as web/src/lib/dentvid/week.ts: from Saturday 18:00 UTC, the coming Monday's week.
        XCTAssertEqual(WeekBoard.deliveryWeek(date("2026-11-21T17:59:00Z")), "2026-11-16")
        XCTAssertEqual(WeekBoard.deliveryWeek(date("2026-11-21T18:00:00Z")), "2026-11-23")
        XCTAssertEqual(WeekBoard.deliveryWeek(date("2026-11-16T07:00:00Z")), "2026-11-16")
    }

    func makeItem(_ id: String, _ status: ItemStatus, _ approval: Approval, week: String = "2026-11-16", posted: Bool = false, slot: Slot? = nil) -> VideoItem {
        VideoItem(id: id, status: status, approval: approval, title: id, weekOf: week, postedAt: posted ? "2026-11-17T10:00:00Z" : nil, slot: slot)
    }

    func testCardStates() {
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .queued, .pending)), .making)
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .working, .pending)), .making)
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .ready, .pending)), .review)
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .flagged, .pending)), .look)
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .ready, .approved)), .approved)
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .ready, .approved, posted: true)), .posted)
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .flagged, .rejected)), .declined)
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .failed, .pending)), .failed)
        XCTAssertEqual(WeekBoard.state(of: makeItem("a", .rejected, .pending)), .notMade)
    }

    func testApproveAllTakesOnlyReadyUndecidedOfThatWeek() {
        let items: [VideoItem] = [
            makeItem("ready", .ready, .pending),
            makeItem("flagged", .flagged, .pending),
            makeItem("done", .ready, .approved),
            makeItem("declined", .ready, .rejected),
            makeItem("working", .working, .pending),
            makeItem("lastweek", .ready, .pending, week: "2026-11-09"),
        ]
        XCTAssertEqual(WeekBoard.approveAllCandidates(items, week: "2026-11-16").map(\.id), ["ready"])
    }

    func testProgress() {
        let items: [VideoItem] = [
            makeItem("a", .ready, .approved, posted: true),
            makeItem("b", .ready, .approved),
            makeItem("c", .flagged, .pending),
            makeItem("d", .ready, .rejected),
            makeItem("e", .working, .pending),
        ]
        XCTAssertEqual(WeekBoard.progress(items, week: "2026-11-16"), .init(total: 3, approved: 2, posted: 1, waiting: 1))
    }

    func testSectionsNewestWeekFirstInPostingOrder() {
        let items: [VideoItem] = [
            makeItem("old", .ready, .approved, week: "2026-11-09"),
            makeItem("wed", .ready, .pending, slot: Slot(date: "2026-11-18", time: "12:30")),
            makeItem("mon", .ready, .pending, slot: Slot(date: "2026-11-16", time: "19:00")),
            makeItem("none", .working, .pending),
        ]
        let s = WeekBoard.sections(items)
        XCTAssertEqual(s.map(\.week), ["2026-11-16", "2026-11-09"])
        XCTAssertEqual(s[0].items.map(\.id), ["mon", "wed", "none"])
    }

    func testUpcomingPostsAreApprovedUnpostedWithASlot() {
        let items: [VideoItem] = [
            makeItem("b", .ready, .approved, slot: Slot(date: "2026-11-18", time: "12:30")),
            makeItem("a", .ready, .approved, slot: Slot(date: "2026-11-16", time: "19:00")),
            makeItem("posted", .ready, .approved, posted: true, slot: Slot(date: "2026-11-17", time: "12:30")),
            makeItem("pending", .ready, .pending, slot: Slot(date: "2026-11-17", time: "12:30")),
        ]
        XCTAssertEqual(WeekBoard.upcomingPosts(items).map(\.id), ["a", "b"])
    }
}
