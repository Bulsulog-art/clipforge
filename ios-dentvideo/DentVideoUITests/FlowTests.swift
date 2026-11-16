import XCTest

/// Walks the app the way a dentist (or App Review) does, in the sample clinic,
/// and keeps a screenshot of each screen (also used for the App Store).
final class FlowTests: XCTestCase {
    override func setUp() { continueAfterFailure = false }

    private func shot(_ app: XCUIApplication, _ name: String) {
        let a = XCTAttachment(screenshot: app.screenshot())
        a.name = name
        a.lifetime = .keepAlways
        add(a)
    }

    func testSignInScreenThenSampleClinicEndToEnd() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(\(lang))", "-AppleLocale", locale]
        app.launch()

        // Sign-in: no sign-up, no prices, a sample clinic for a first look.
        XCTAssertTrue(app.buttons["signin-button"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["signin-button"].isEnabled, "sign in stays off until email and password are filled")
        shot(app, "01-signin")

        app.buttons["demo-button"].tap()
        XCTAssertTrue(app.otherElements["demo-banner"].waitForExistence(timeout: 10) || app.staticTexts["demo-banner"].exists || app.buttons["approve-all"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["approve-all"].waitForExistence(timeout: 10))
        sleep(3) // posters load from dentvideo.com
        shot(app, "02-week")

        // Open the first video, reject it with a note, then approve it after all.
        app.scrollViews.firstMatch.swipeUp()
        let cards = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", needsApprovalLabel))
        XCTAssertGreaterThanOrEqual(cards.count, 3)
        cards.element(boundBy: 0).tap()
        XCTAssertTrue(app.buttons["approve"].waitForExistence(timeout: 10))
        sleep(4) // let the player show a frame
        shot(app, "03-review")

        app.buttons["reject"].tap()
        let note = app.textFields.firstMatch
        XCTAssertTrue(note.waitForExistence(timeout: 5))
        note.tap()
        note.typeText("Shorter please")
        app.buttons["confirm-reject"].tap()
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "Shorter please")).firstMatch.waitForExistence(timeout: 5))
        app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", approveAfterAllLabel)).firstMatch.tap()

        // Approved: save / share / posted tick / copy caption.
        XCTAssertTrue(app.buttons["save"].waitForExistence(timeout: 5))
        XCTAssertTrue(app.buttons["share"].exists)
        app.buttons["copy-caption"].tap()
        let posted = app.switches["posted-toggle"]
        XCTAssertTrue(posted.waitForExistence(timeout: 5))
        shot(app, "04-approved")
        if posted.switches.firstMatch.exists { posted.switches.firstMatch.tap() } else { posted.tap() }

        // Back to the week: approve the rest in one tap.
        app.navigationBars.buttons.element(boundBy: 0).tap()
        XCTAssertTrue(app.buttons["approve-all"].waitForExistence(timeout: 5))
        app.buttons["approve-all"].tap()
        XCTAssertTrue(app.buttons["approve-all"].waitForNonExistence(timeout: 5))
        app.scrollViews.firstMatch.swipeDown()
        shot(app, "05-all-approved")

        // Library and account.
        app.tabBars.buttons.element(boundBy: 1).tap()
        sleep(2)
        shot(app, "06-library")
        app.tabBars.buttons.element(boundBy: 2).tap()
        XCTAssertTrue(app.buttons["signout"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["delete-account"].exists, "the sample clinic has no account to delete")
        shot(app, "07-account")
        app.buttons["signout"].tap()
        XCTAssertTrue(app.buttons["signin-button"].waitForExistence(timeout: 5))
    }

    func testWrongPasswordSaysSoWithoutCrashing() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)"]
        app.launch()
        let email = app.textFields.firstMatch
        XCTAssertTrue(email.waitForExistence(timeout: 10))
        email.tap(); email.typeText("nobody@example.invalid")
        let pw = app.secureTextFields.firstMatch
        pw.tap(); pw.typeText("not-a-real-password")
        app.buttons["signin-button"].tap()
        XCTAssertTrue(app.staticTexts["signin-error"].waitForExistence(timeout: 20))
    }

    // MARK: - language

    private var lang: String { ProcessInfo.processInfo.environment["DV_LANG"] ?? "en" }
    private var locale: String { ["tr": "tr_TR", "de": "de_DE", "es": "es_ES"][lang] ?? "en_US" }
    private var needsApprovalLabel: String { ["tr": "Onayınızı bekliyor", "de": "Wartet auf Freigabe", "es": "Necesita tu aprobación"][lang] ?? "Needs your approval" }
    private var approveAfterAllLabel: String { ["tr": "Yine de onayla", "de": "Doch freigeben", "es": "Aprobarlo de todos modos"][lang] ?? "Approve it after all" }
}
