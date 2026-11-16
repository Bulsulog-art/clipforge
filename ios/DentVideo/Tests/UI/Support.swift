import XCTest

/// Base for DentVideo's end-to-end tests. Every test launches the real app (DEBUG build) in demo
/// flow mode: the app starts as in normal use (bootstrap, snapshot, refresh, uploads) against an
/// in-process fake of the mobile API (App/Sources/Demo). `-DV…` flags shape that fake server.
/// After every test the app must still be running: a crash fails the test.
class DVTestCase: XCTestCase {
    var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func tearDownWithError() throws {
        if let app, app.state != .notRunning {
            XCTAssertEqual(app.state, .runningForeground, "the app is no longer in the foreground (crash?)")
        }
        app = nil
    }

    static func locale(_ lang: String) -> String {
        ["en": "en_US", "tr": "tr_TR", "de": "de_DE", "es": "es_ES", "fr": "fr_FR", "ja": "ja_JP", "ar": "ar_SA", "pl": "pl_PL"][lang] ?? "en_US"
    }

    /// Launch in flow mode. `flags` without the "DV" prefix: ["Net": "offline", "Upload": "fail"].
    @discardableResult
    func launch(_ flags: [String: String] = [:], lang: String = "en", reset: Bool = true, extra: [String] = []) -> XCUIApplication {
        let a = XCUIApplication()
        var args = ["-DVFlow", "1", "-DVReset", reset ? "1" : "0",
                    "-AppleLanguages", "(\(lang))", "-AppleLocale", Self.locale(lang)]
        for (k, v) in flags.sorted(by: { $0.key < $1.key }) { args += ["-DV\(k)", v] }
        a.launchArguments = args + extra
        a.launch()
        app = a
        return a
    }

    func el(_ id: String) -> XCUIElement { app.descendants(matching: .any).matching(identifier: id).firstMatch }

    @discardableResult
    func wait(_ e: XCUIElement, _ timeout: TimeInterval = 10, _ what: String = "", file: StaticString = #filePath, line: UInt = #line) -> XCUIElement {
        XCTAssertTrue(e.waitForExistence(timeout: timeout), "not shown: \(what.isEmpty ? e.description : what)", file: file, line: line)
        return e
    }

    func waitGone(_ e: XCUIElement, _ timeout: TimeInterval = 15, file: StaticString = #filePath, line: UInt = #line) {
        let p = NSPredicate(format: "exists == false")
        let r = XCTWaiter.wait(for: [expectation(for: p, evaluatedWith: e)], timeout: timeout)
        XCTAssertEqual(r, .completed, "still shown: \(e)", file: file, line: line)
    }

    func text(_ s: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label == %@", s)).firstMatch
    }

    func textContaining(_ s: String) -> XCUIElement {
        app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", s)).firstMatch
    }

    /// A tab: in the tab bar on iPhone; on iPad (iPadOS 18+) the tabs sit in the top bar and are
    /// not inside a tab bar element, so fall back to any button with that label.
    func tab(_ key: String, lang: String = "en") -> XCUIElement {
        let label = Strings.value(key, lang)
        let inBar = app.tabBars.buttons[label].firstMatch
        if inBar.exists { return inBar }
        let any = app.buttons.matching(NSPredicate(format: "label == %@", label)).firstMatch
        if any.waitForExistence(timeout: 2) { return any }
        return inBar
    }

    /// Focus a field (retrying: on iOS 17 the first tap sometimes does not give keyboard focus) and type.
    func type(_ field: XCUIElement, _ s: String) {
        focus(field) { field.tap() }
        field.typeText(s)
    }

    /// Tap until the field has keyboard focus and the keyboard is up (fresh iOS 17 simulators
    /// sometimes swallow the first tap).
    func focus(_ field: XCUIElement, tap: () -> Void) {
        for _ in 0..<5 {
            tap()
            if app.keyboards.firstMatch.waitForExistence(timeout: 1.5),
               (field.value(forKey: "hasKeyboardFocus") as? Bool) ?? true { return }
        }
    }

    /// Opening a link from outside: iOS may ask "Open in DentVideo?" first; answer it.
    func openLink(_ url: String) {
        app.open(URL(string: url)!)
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let open = springboard.buttons["Open"]
        if open.waitForExistence(timeout: 3) { open.tap() }
    }

    func clear(_ field: XCUIElement) {
        // Cursor at the end (fields may be right-aligned), delete everything, check, and fall back
        // to Select All when the cursor landed elsewhere.
        focus(field) { field.coordinate(withNormalizedOffset: CGVector(dx: 0.98, dy: 0.5)).tap() }
        let n = (field.value as? String)?.count ?? 0
        field.typeText(String(repeating: XCUIKeyboardKey.delete.rawValue, count: n + 2))
        let left = (field.value as? String) ?? ""
        if !left.isEmpty && left != field.placeholderValue {
            field.press(forDuration: 1.2)
            let all = app.menuItems["Select All"].exists ? app.menuItems["Select All"] : app.buttons["Select All"]
            if all.waitForExistence(timeout: 2) { all.tap() }
            field.typeText(XCUIKeyboardKey.delete.rawValue)
        }
    }

    /// Open a video of the week by its demo id (d1 … d5).
    func openVideo(_ id: String) {
        let card = wait(el("card.\(id)"), 12, "card \(id)")
        if !card.isHittable { app.swipeUp() }
        card.tap()
        wait(el("video.state"), 8, "video detail")
    }

    /// Scroll a Form until an element is on screen.
    func scrollTo(_ e: XCUIElement, max: Int = 6) {
        var n = 0
        while !(e.exists && e.isHittable) && n < max {
            app.swipeUp()
            n += 1
        }
    }
}

/// The app's own String Catalog, read from the repository (the simulator sees the Mac's files),
/// so the tests check the real texts in every language without copying them.
enum Strings {
    private static let catalog: [String: [String: String]] = {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("App/Resources/Localizable.xcstrings")
        guard let data = try? Data(contentsOf: url),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let strings = root["strings"] as? [String: [String: Any]] else { return [:] }
        var out: [String: [String: String]] = [:]
        for (k, e) in strings {
            let locs = e["localizations"] as? [String: [String: Any]] ?? [:]
            var m: [String: String] = [:]
            for (l, v) in locs { m[l] = (v["stringUnit"] as? [String: Any])?["value"] as? String }
            out[k] = m
        }
        return out
    }()

    static func value(_ key: String, _ lang: String = "en") -> String {
        catalog[key]?[lang] ?? key
    }

    /// "%lld videos approved." with the numbers filled in.
    static func format(_ key: String, _ lang: String = "en", _ args: CVarArg...) -> String {
        String(format: value(key, lang), locale: Locale(identifier: lang), arguments: args)
    }
}
