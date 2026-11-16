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
        XCTAssertTrue(app.buttons["approve-all"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.descendants(matching: .any)["demo-banner"].exists, "the sample clinic says it is a sample")
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
        XCTAssertTrue(app.descendants(matching: .any)["toast"].waitForExistence(timeout: 3), "copying confirms itself")
        let posted = app.switches["posted-toggle"]
        XCTAssertTrue(posted.waitForExistence(timeout: 5))
        shot(app, "04-approved")
        XCTAssertEqual(posted.value as? String, "0")
        if posted.switches.firstMatch.exists { posted.switches.firstMatch.tap() } else { posted.tap() }
        XCTAssertEqual(posted.value as? String, "1", "the posted tick sticks")

        // Save to Photos: the add-only permission prompt, then the confirmation.
        addUIInterruptionMonitor(withDescription: "Photos") { alert in
            for label in ["Allow", "Allow Access", "OK", "İzin Ver", "Tamam"] where alert.buttons[label].exists { alert.buttons[label].tap(); return true }
            return false
        }
        app.buttons["save"].tap()
        app.tap() // lets the interruption monitor run
        // The add-only Photos alert, in any language: its last button allows.
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let alert = springboard.alerts.firstMatch
        if alert.waitForExistence(timeout: 5), alert.buttons.count > 0 { alert.buttons.element(boundBy: alert.buttons.count - 1).tap() }
        let saved = NSPredicate(format: "label CONTAINS[c] %@", savedLabel)
        expectation(for: saved, evaluatedWith: app.buttons["save"])
        waitForExpectations(timeout: 45)

        // Share: the system share sheet opens with the video.
        app.buttons["share"].tap()
        let sheet = app.otherElements["ActivityListView"]
        XCTAssertTrue(sheet.waitForExistence(timeout: 60) || app.navigationBars["UIActivityContentView"].waitForExistence(timeout: 5), "share sheet opens")
        // Close the share sheet: its Close button, or a swipe on the sheet itself.
        if app.buttons["Close"].waitForExistence(timeout: 3) { app.buttons["Close"].tap() } else { sheet.swipeDown(velocity: .fast) }
        XCTAssertTrue(sheet.waitForNonExistence(timeout: 10), "share sheet closes")

        // Back to the week: approve the rest in one tap.
        app.navigationBars.buttons.element(boundBy: 0).tap()
        XCTAssertTrue(app.buttons["approve-all"].waitForExistence(timeout: 5))
        app.buttons["approve-all"].tap()
        XCTAssertTrue(app.buttons["approve-all"].waitForNonExistence(timeout: 5))
        app.scrollViews.firstMatch.swipeDown()
        shot(app, "05-all-approved")

        // Library and account.
        app.tabBars.buttons.element(boundBy: 1).tap()
        XCTAssertTrue(app.cells.firstMatch.waitForExistence(timeout: 5), "the library lists this week's videos")
        XCTAssertGreaterThanOrEqual(app.cells.count, 3)
        sleep(2)
        shot(app, "06-library")
        app.tabBars.buttons.element(boundBy: 2).tap()
        XCTAssertTrue(app.buttons["signout"].waitForExistence(timeout: 5))
        XCTAssertFalse(app.buttons["delete-account"].exists, "the sample clinic has no account to delete")
        shot(app, "07-account")
        app.buttons["signout"].tap()
        XCTAssertTrue(app.buttons["signin-button"].waitForExistence(timeout: 5))
    }

    func testForgotPasswordStaysInTheApp() throws {
        let app = XCUIApplication()
        app.launchArguments += ["-AppleLanguages", "(en)"]
        app.launch()
        XCTAssertTrue(app.buttons["forgot-password"].waitForExistence(timeout: 10))
        app.buttons["forgot-password"].tap()
        XCTAssertTrue(app.textFields["reset-email"].waitForExistence(timeout: 5), "a sheet in the app, not the website")
        XCTAssertFalse(app.buttons["reset-send"].isEnabled)
        XCTAssertEqual(XCUIApplication(bundleIdentifier: "com.apple.mobilesafari").state, .notRunning)
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
    private var savedLabel: String { ["tr": "kaydedildi", "de": "gesichert", "es": "Guardado"][lang] ?? "Saved to Photos" }
    private var approveAfterAllLabel: String { ["tr": "Yine de onayla", "de": "Doch freigeben", "es": "Aprobarlo de todos modos"][lang] ?? "Approve it after all" }
}
