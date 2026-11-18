import XCTest

/// Checks the simulator itself, so a failure in the journeys can be told apart from a broken
/// test machine: can text be typed into a system app's text field at all?
final class EnvironmentTests: XCTestCase {
    func testTheSimulatorCanTypeIntoASystemTextField() {
        let settings = XCUIApplication(bundleIdentifier: "com.apple.Preferences")
        settings.launch()
        settings.swipeDown()
        let search = settings.searchFields.firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 10), "Settings search field")
        search.tap()
        XCTAssertTrue(settings.keyboards.firstMatch.waitForExistence(timeout: 5), "software keyboard in the Settings app")
        search.typeText("Wi")
        XCTAssertEqual(search.value as? String, "Wi")
        settings.terminate()
    }
}
