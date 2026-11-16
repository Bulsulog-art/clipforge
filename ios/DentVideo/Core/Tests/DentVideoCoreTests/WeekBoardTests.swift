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

    func item(_ id: String, _ status: ItemStatus, _ approval: Approval, week: String = "2026-11-16", posted: Bool = false, slot: Slot? = nil) -> LibraryItem {
        LibraryItem(id: id, status: status, approval: approval, title: id, weekOf: week, postedAt: posted ? "2026-11-17T10:00:00Z" : nil, slot: slot)
    }

    func testCardStates() {
        XCTAssertEqual(WeekBoard.state(of: item("a", .queued, .pending)), .making)
        XCTAssertEqual(WeekBoard.state(of: item("a", .working, .pending)), .making)
        XCTAssertEqual(WeekBoard.state(of: item("a", .ready, .pending)), .review)
        XCTAssertEqual(WeekBoard.state(of: item("a", .flagged, .pending)), .look)
        XCTAssertEqual(WeekBoard.state(of: item("a", .ready, .approved)), .approved)
        XCTAssertEqual(WeekBoard.state(of: item("a", .ready, .approved, posted: true)), .posted)
        XCTAssertEqual(WeekBoard.state(of: item("a", .flagged, .rejected)), .declined)
        XCTAssertEqual(WeekBoard.state(of: item("a", .failed, .pending)), .failed)
        XCTAssertEqual(WeekBoard.state(of: item("a", .rejected, .pending)), .notMade)
    }

    func testApproveAllTakesOnlyReadyUndecidedOfThatWeek() {
        let items = [
            item("ready", .ready, .pending),
            item("flagged", .flagged, .pending),
            item("done", .ready, .approved),
            item("declined", .ready, .rejected),
            item("working", .working, .pending),
            item("lastweek", .ready, .pending, week: "2026-11-09"),
        ]
        XCTAssertEqual(WeekBoard.approveAllCandidates(items, week: "2026-11-16").map(\.id), ["ready"])
    }

    func testProgress() {
        let items = [
            item("a", .ready, .approved, posted: true),
            item("b", .ready, .approved),
            item("c", .flagged, .pending),
            item("d", .ready, .rejected),
            item("e", .working, .pending),
        ]
        XCTAssertEqual(WeekBoard.progress(items, week: "2026-11-16"), .init(total: 3, approved: 2, posted: 1, waiting: 1))
    }

    func testSectionsNewestWeekFirstInPostingOrder() {
        let items = [
            item("old", .ready, .approved, week: "2026-11-09"),
            item("wed", .ready, .pending, slot: Slot(date: "2026-11-18", time: "12:30")),
            item("mon", .ready, .pending, slot: Slot(date: "2026-11-16", time: "19:00")),
            item("none", .working, .pending),
        ]
        let s = WeekBoard.sections(items)
        XCTAssertEqual(s.map(\.week), ["2026-11-16", "2026-11-09"])
        XCTAssertEqual(s[0].items.map(\.id), ["mon", "wed", "none"])
    }

    func testUpcomingPostsAreApprovedUnpostedWithASlot() {
        let items = [
            item("b", .ready, .approved, slot: Slot(date: "2026-11-18", time: "12:30")),
            item("a", .ready, .approved, slot: Slot(date: "2026-11-16", time: "19:00")),
            item("posted", .ready, .approved, posted: true, slot: Slot(date: "2026-11-17", time: "12:30")),
            item("pending", .ready, .pending, slot: Slot(date: "2026-11-17", time: "12:30")),
        ]
        XCTAssertEqual(WeekBoard.upcomingPosts(items).map(\.id), ["a", "b"])
    }
}
