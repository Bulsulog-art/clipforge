import XCTest

/// Checks the simulator itself, so a failure in the journeys can be told apart from a broken
/// test machine: does a system app's text field take keyboard focus, does the software keyboard
/// come up (not hidden by a connected hardware keyboard, see scripts/test.sh), and do the typed
/// keys arrive, every one of them?
///
/// Why it was flaky. In the CI logs it failed only on its first attempt (three runs, iPhone 17 Pro
/// Max on iOS 26 and iPhone SE on iOS 18) and passed on every retry. Once the keyboard never came
/// up ("Neither element nor any descendant has keyboard focus"), twice the second key was lost
/// ("W" instead of "Wi"). It is the first UI test after the simulator boots (classes run in name
/// order), so it met the Settings app on its very first launch, and the retry met a warm one.
/// Settings fills its list asynchronously after XCUITest already sees it as idle, and the first
/// key brings up the search results, which replace the screen while the next key is sent; both
/// can take the field's focus. Neither says anything about the simulator's typing.
/// Now Settings gets a first launch of its own, the test waits until the screen has stopped
/// changing before tapping, and each key is sent only after the previous one has landed and the
/// results have settled. The checks are unchanged: focus, the software keyboard, and the exact
/// text in the field.
final class EnvironmentTests: XCTestCase {
    func testTheSimulatorCanTypeIntoASystemTextField() {
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        // First launch after boot: let Settings finish loading once, then start it again.
        settings.launch()
        XCTAssertTrue(settings.wait(for: .runningForeground, timeout: 20), "Settings starts")
        settle(settings)
        settings.terminate()

        settings.launch()
        let search = settings.searchFields.firstMatch
        if !(search.waitForExistence(timeout: 3) && search.isHittable) { settings.swipeDown() }
        XCTAssertTrue(search.waitForExistence(timeout: 10), "Settings search field")
        settle(settings)

        search.tap()
        XCTAssertTrue(waitFor(search, "hasKeyboardFocus == true", 10), "the search field takes keyboard focus")
        XCTAssertTrue(settings.keyboards.firstMatch.waitForExistence(timeout: 10), "software keyboard in the Settings app")

        var typed = ""
        for key in ["W", "i"] {
            search.typeText(key)
            typed += key
            XCTAssertTrue(waitFor(search, "value == '\(typed)'", 10), "the field shows \"\(typed)\" (it shows \(String(describing: search.value)))")
            settle(settings)
        }
        XCTAssertEqual(search.value as? String, "Wi")
        settings.terminate()
    }

    private func waitFor(_ e: XCUIElement, _ format: String, _ timeout: TimeInterval) -> Bool {
        let exp = XCTNSPredicateExpectation(predicate: NSPredicate(format: format), object: e)
        return XCTWaiter.wait(for: [exp], timeout: timeout) == .completed
    }

    /// Wait until the app's screen stops changing: the same number of cells and text fields in
    /// two looks one second apart (at most `timeout`).
    private func settle(_ app: XCUIApplication, timeout: TimeInterval = 15) {
        func look() -> [Int] { [app.cells.count, app.staticTexts.count, app.searchFields.count] }
        let end = Date().addingTimeInterval(timeout)
        var last = look()
        while Date() < end {
            Thread.sleep(forTimeInterval: 1)
            let now = look()
            if now == last { return }
            last = now
        }
    }
}
