import XCTest

/// Sign-up, the email code, the clinic form, the paywall and the App Store purchase, end to end
/// against the in-process fake API and the demo's fake App Store (App/Sources/Demo).
/// `-DVBilling none` = a clinic that never paid (the paywall may open); the default `web` = a clinic
/// whose plan is the web's business (no paywall).
final class PurchaseJourneyTests: DVTestCase {
    /// Sign up → code → clinic → paywall → buy → "activating" → the plan is active.
    func testSignUpVerifyClinicPaywallBuyThenPlanActive() {
        launch(["SignedIn": "0"])
        openSignUp()
        fillSignUp("new@clinic.example", "a long clinic password 2026")

        // The 6-digit code: a wrong one says so, the right one opens the account.
        XCTAssertEqual(waitExplained(el("code.title"), "code step").label, Strings.value("code.title"))
        type(el("code.field"), "000000")
        wait(el("code.error"), 8, "wrong code message")
        type(el("code.field"), "123456")

        // The clinic form (the web's start flow): no paywall before it is saved.
        type(wait(el("setup.name"), 12, "clinic form"), "Sample Dental Practice")
        XCTAssertFalse(el("paywall.title").exists)
        let chip = el("setup.service.0")
        scrollTo(chip)
        chip.tap()
        let save = el("setup.submit")
        scrollTo(save)
        XCTAssertTrue(save.isEnabled)
        save.tap()

        // "See it with your logo" comes first for a new clinic, then the plans.
        wait(el("preview.continue"), 15, "logo preview after the clinic form").tap()

        // The paywall: both plans with StoreKit's prices, restore, terms, privacy, the 3.1.2 text.
        let starter = wait(el("paywall.buy.starter"), 12, "paywall")
        XCTAssertTrue(el("paywall.buy.practice").exists)
        XCTAssertFalse(el("paywall.price.starter").label.isEmpty)
        XCTAssertFalse(el("paywall.price.practice").label.isEmpty)
        XCTAssertLessThan(starter.frame.minY, el("paywall.buy.practice").frame.minY, "Starter first, nothing pre-selected")
        let terms = el("paywall.terms")
        scrollTo(terms)
        XCTAssertEqual(terms.label, Strings.value("paywall.terms"))
        XCTAssertTrue(el("paywall.restore").exists)
        XCTAssertTrue(el("legal.terms").exists)
        XCTAssertTrue(el("legal.privacy").exists)

        let practice = el("paywall.buy.practice")
        scrollTo(practice)
        if !practice.isHittable { app.swipeDown() }
        practice.tap()
        wait(el("paywall.activating"), 8, "activating")

        // Active: the week (empty for a new clinic) and the plan in Settings, managed in the App Store.
        XCTAssertEqual(wait(el("message.title"), 20, "the week after activation").label, Strings.value("week.empty.title"))
        tab("tab.settings").tap()
        let manage = el("plan.manage")
        scrollTo(manage)
        XCTAssertTrue(manage.waitForExistence(timeout: 6), "Manage subscription for an App Store plan")
        XCTAssertFalse(el("plan.managedWeb").exists)
    }

    func testSignUpWithAnAddressThatHasAnAccount() {
        launch(["SignedIn": "0"])
        openSignUp()
        fillSignUp("taken@clinic.example", "a long clinic password 2026")
        XCTAssertTrue(waitExplained(el("signup.notice"), "existing-account notice").label.contains(Strings.value("signup.existing")))
        XCTAssertFalse(el("code.title").exists)
        el("signup.toSignIn").tap()
        wait(el("signin.email"))
    }

    func testShortPasswordIsRefusedBeforeTheServer() {
        launch(["SignedIn": "0"])
        openSignUp()
        fillSignUp("new@clinic.example", "short")
        XCTAssertTrue(wait(el("signup.error")).label.contains(Strings.value("signup.error.passwordShort")))
    }

    /// A signed-in clinic that never confirmed its address is asked for the code before the plans.
    func testUnverifiedAccountGetsTheCodeBeforeThePaywall() {
        launch(["Plan": "noplan", "Billing": "none", "Email": "unverified"])
        wait(el("code.field"), 12, "code before the paywall")
        XCTAssertFalse(el("paywall.buy.starter").exists)
        type(el("code.field"), "123456")
        wait(el("paywall.buy.starter"), 12, "paywall after the code")
    }

    func testRestorePurchasesOpensTheWeek() {
        launch(["Plan": "noplan", "Billing": "none", "Restore": "found"])
        let restore = el("paywall.restore")
        wait(el("paywall.buy.starter"), 12)
        scrollTo(restore)
        restore.tap()
        wait(el("card.d1"), 20, "the week after a restore")
    }

    func testRestoreWithNothingToRestoreSaysSo() {
        launch(["Plan": "noplan", "Billing": "none", "Restore": "none"])
        let restore = el("paywall.restore")
        wait(el("paywall.buy.starter"), 12)
        scrollTo(restore)
        restore.tap()
        XCTAssertEqual(wait(el("paywall.message"), 8).label, Strings.value("paywall.restore.none"))
        XCTAssertTrue(el("paywall.buy.starter").exists)
    }

    /// Closing Apple's sheet: nothing happens, no error, still on the plans.
    func testCancelledPurchaseChangesNothing() {
        launch(["Plan": "noplan", "Billing": "none", "Store": "cancel"])
        wait(el("paywall.buy.starter"), 12).tap()
        sleep(2)
        XCTAssertTrue(el("paywall.buy.starter").isEnabled)
        XCTAssertFalse(el("paywall.message").exists)
        XCTAssertFalse(el("paywall.activating").exists)
        XCTAssertFalse(app.tabBars.firstMatch.exists)
    }

    func testPaidButNotYetActiveSaysWeAreConfirming() {
        launch(["Plan": "noplan", "Billing": "none", "Activation": "never"])
        wait(el("paywall.buy.starter"), 12).tap()
        wait(el("paywall.activating"), 8)
        XCTAssertEqual(wait(el("message.title"), 20, "timeout message").label, Strings.value("paywall.confirming.title"))
        XCTAssertTrue(el("paywall.confirming.retry").exists)
    }

    /// A clinic whose plan is the web's business never sees a paywall, in any state.
    func testWebManagedClinicGetsNoPaywall() {
        launch(["Plan": "active", "Billing": "web"])
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        let note = el("plan.managedWeb")
        scrollTo(note)
        XCTAssertTrue(note.waitForExistence(timeout: 6))
        XCTAssertEqual(note.label, Strings.value("plan.managedWeb"))
        XCTAssertFalse(el("plan.manage").exists, "no link for a web plan (3.1.1)")
        XCTAssertFalse(el("paywall.buy.starter").exists)
    }

    func testWebPaymentBeingConfirmedGetsNoPaywall() {
        launch(["Plan": "noplan", "Billing": "web"])
        XCTAssertEqual(wait(el("message.title"), 12).label, Strings.value("access.noPlan.title"))
        XCTAssertFalse(el("paywall.buy.starter").exists)
        XCTAssertFalse(el("paywall.restore").exists)
    }

    func testAppStorePlanShowsManageSubscription() {
        launch(["Plan": "active", "Billing": "apple"])
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        let manage = el("plan.manage")
        scrollTo(manage)
        XCTAssertTrue(manage.waitForExistence(timeout: 6))
        XCTAssertEqual(el("plan.managedAppStore").label, Strings.value("plan.managedAppStore"))
    }

    /// No RevenueCat key in the build: a calm "not available yet", never a crash or an empty paywall.
    func testMissingKeyShowsNotAvailable() {
        launch(["Plan": "noplan", "Billing": "none", "Store": "missing"])
        XCTAssertEqual(wait(el("message.title"), 12).label, Strings.value("paywall.unavailable.title"))
        XCTAssertFalse(el("paywall.buy.starter").exists)
        XCTAssertFalse(el("paywall.buy.practice").exists)
        XCTAssertTrue(text(Strings.value("settings.signOut")).exists)
    }

    /// The paywall in Turkish: translated, StoreKit's price in lira, nothing in English left over.
    func testPaywallInTurkish() {
        launch(["Plan": "noplan", "Billing": "none"], lang: "tr")
        XCTAssertEqual(wait(el("paywall.title"), 12).label, Strings.value("paywall.title", "tr"))
        XCTAssertEqual(el("paywall.buy.starter").label, Strings.format("paywall.subscribe", "tr", "Starter"))
    }

    /// Email, then return (which moves the focus to the password, as a person would), the
    /// password and return (which sends the form). On a small phone the password field can sit
    /// under the keyboard, so it is reached through the form's own focus, not by a tap.
    private func fillSignUp(_ email: String, _ password: String) {
        type(wait(el("signup.email")), email + "\n")
        let pw = el("signup.password")
        // The iOS 18 runner drops keystrokes when they come fast (runs 44189260264 and 44194834942:
        // the form said "at least 8 characters"; EnvironmentTests got "W" for "Wi" on the same
        // simulator), and a secure field does not show what arrived. Wait for the focus and type
        // one key at a time. The journeys use a long password, so the length rule is not what they test.
        let focused = NSPredicate(format: "hasKeyboardFocus == true")
        if XCTWaiter.wait(for: [expectation(for: focused, evaluatedWith: pw)], timeout: 3) != .completed {
            if !pw.isHittable { app.swipeUp() }
            focus(pw) { pw.tap() }
        }
        // If iOS still offers a strong password, take the user's own path out of it.
        let own = app.buttons["Choose My Own Password"]
        if own.waitForExistence(timeout: 1) { own.tap() }
        for c in password {
            app.typeText(String(c))
            usleep(60_000)
        }
        app.typeText("\n")
    }

    /// Wait for an element; when it does not come, say what the sign-up form shows instead.
    @discardableResult
    private func waitExplained(_ e: XCUIElement, _ what: String, file: StaticString = #filePath, line: UInt = #line) -> XCUIElement {
        if !e.waitForExistence(timeout: 12) {
            let error = el("signup.error"), email = el("signup.email"), routing = el("debug.routing")
            XCTFail("not shown: \(what); form error: \(error.exists ? error.label : "-"); email field: \(email.exists ? String(describing: email.value) : "-"); routing: \(routing.exists ? routing.label : "-")", file: file, line: line)
        }
        return e
    }

    /// "Create an account" sits under the sign-in form; on a small phone it can be below the fold.
    private func openSignUp() {
        let create = wait(el("signin.create"), 10)
        scrollTo(create)
        create.tap()
    }
}
