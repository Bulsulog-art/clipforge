import XCTest
@testable import DentVideoCore

final class ModelsTests: XCTestCase {
    func testDecodesMe() throws {
        let me = try JSONDecoder().decode(Me.self, from: fixture("me"))
        XCTAssertEqual(me.clinic?.profile.name, "Praxis Sonne")
        XCTAssertEqual(me.clinic?.profile.narratorVoice, "male")
        XCTAssertEqual(me.plan?.state, .active)
        XCTAssertEqual(me.plan?.recordings, true)
        XCTAssertEqual(AccessState.of(me), .active(recordings: true))
    }

    func testDecodesItemsAndToleratesUnknownValues() throws {
        let r = try JSONDecoder().decode(ItemsResponse.self, from: fixture("items"))
        XCTAssertEqual(r.items.count, 5)
        let a1 = r.items[0]
        XCTAssertEqual(a1.weekOf, "2026-11-16")
        XCTAssertEqual(a1.slot, Slot(date: "2026-11-17", time: "12:30"))
        XCTAssertFalse(a1.isPosted)
        XCTAssertEqual(a1.videoUrl?.host, "liman.example")
        // An unknown reason code reads as the generic sentence, never a crash.
        XCTAssertEqual(r.items[1].reasons, [.pause, .generic])
        XCTAssertEqual(r.items[1].shootCard?.points, ["Eins", "Zwei"])
        XCTAssertTrue(r.items[3].isPosted)
        // An unknown status is "being made"; a broken URL is dropped, not fatal.
        XCTAssertEqual(r.items[4].status, .unknown)
        XCTAssertEqual(WeekBoard.state(of: r.items[4]), .making)
        XCTAssertNil(r.items[4].videoUrl)
        XCTAssertEqual(r.items[4].kind, .recording)
    }

    func testAccessStates() throws {
        var me = try JSONDecoder().decode(Me.self, from: fixture("me"))
        me.plan?.recordings = false
        XCTAssertEqual(AccessState.of(me), .active(recordings: false))
        me.plan?.canMake = false
        me.plan?.state = .trial
        XCTAssertEqual(AccessState.of(me), .noPlan)
        me.plan?.adminPaused = true
        XCTAssertEqual(AccessState.of(me), .paused)
        me.clinic = nil
        me.plan = nil
        XCTAssertEqual(AccessState.of(me), .noClinic)
    }

    func testProfileCleanedForTheServer() {
        let p = ClinicProfile(name: "  Clinic ", city: " ", country: "DE", language: "de", services: ["Implants", "  "], handle: "@clinic", bookingUrl: "", closingLine: "  ")
        let c = p.cleaned()
        XCTAssertEqual(c.name, "Clinic")
        XCTAssertNil(c.city)
        XCTAssertEqual(c.handle, "clinic")
        XCTAssertNil(c.bookingUrl)
        XCTAssertNil(c.closingLine)
        XCTAssertEqual(c.services, ["Implants"])
        // Empty optionals are absent in the JSON, not "".
        let json = String(data: try! JSONEncoder().encode(c), encoding: .utf8)!
        XCTAssertFalse(json.contains("\"city\""))
    }

    func testTokensExpiry() {
        let t = tokens(expiresAt: 1_000)
        XCTAssertTrue(t.expiresSoon(now: Date(timeIntervalSince1970: 950)))
        XCTAssertFalse(t.expiresSoon(now: Date(timeIntervalSince1970: 900)))
    }
}
