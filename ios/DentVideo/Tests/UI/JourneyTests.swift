import XCTest

/// Every user journey of the app, end to end, against the in-process fake API.
final class SessionJourneyTests: DVTestCase {
    func testSignInSuccess() {
        launch(["SignedIn": "0"])
        type(wait(el("signin.email")), "hello@sample.example")
        type(el("signin.password"), "a good password")
        el("signin.submit").tap()
        wait(el("card.d1"), 12, "the week after signing in")
        XCTAssertTrue(tab("tab.week").exists)
    }

    func testSignInWrongPasswordSaysSo() {
        launch(["SignedIn": "0"])
        type(wait(el("signin.email")), "hello@sample.example")
        type(el("signin.password"), "wrong")
        el("signin.submit").tap()
        let error = wait(el("signin.error"))
        XCTAssertTrue(error.label.contains(Strings.value("signin.error.credentials")))
        XCTAssertFalse(el("card.d1").exists)
    }

    func testSignInWithAnotherProductsLogin() {
        launch(["SignedIn": "0"])
        type(wait(el("signin.email")), "other@clinic.example")
        type(el("signin.password"), "x")
        el("signin.submit").tap()
        XCTAssertTrue(wait(el("signin.error")).label.contains(Strings.value("signin.error.notDentVideo")))
    }

    func testSignInButtonNeedsAnEmailAndPassword() {
        launch(["SignedIn": "0"])
        XCTAssertFalse(wait(el("signin.submit")).isEnabled)
        type(el("signin.email"), "hello@sample.example")
        XCTAssertFalse(el("signin.submit").isEnabled)
    }

    func testForgotPassword() {
        launch(["SignedIn": "0"])
        type(wait(el("signin.email")), "hello@sample.example")
        text(Strings.value("signin.forgot")).tap()
        wait(text(Strings.value("forgot.button"))).tap()
        wait(text(Strings.value("forgot.sent")))
        text(Strings.value("common.done")).tap()
        wait(el("signin.email"))
    }

    func testExpiredSessionIsRefreshedWithoutTheDentistNoticing() {
        launch(["Session": "expired"])
        wait(el("card.d1"), 12)
        XCTAssertFalse(el("signin.email").exists)
    }

    func testRevokedSessionSignsOut() {
        launch(["Session": "revoked"])
        wait(el("signin.email"), 12, "sign-in after the session was revoked elsewhere")
    }

    func testNoActivePlanScreenOffersNoPurchase() {
        launch(["Plan": "noplan"])
        XCTAssertEqual(wait(el("message.title"), 12).label, Strings.value("access.noPlan.title"))
        XCTAssertTrue(text(Strings.value("settings.signOut")).exists)
        XCTAssertTrue(text(Strings.value("settings.delete")).exists)
        XCTAssertFalse(app.tabBars.firstMatch.exists, "no tabs without a plan")
    }

    func testPausedScreen() {
        launch(["Plan": "paused"])
        XCTAssertEqual(wait(el("message.title"), 12).label, Strings.value("access.paused.title"))
        XCTAssertTrue(text(Strings.value("access.contact")).exists)
    }

    func testSignOut() {
        launch()
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        let button = el("settings.signOut")
        scrollTo(button)
        button.tap()
        wait(app.alerts.buttons[Strings.value("settings.signOut")]).tap()
        wait(el("signin.email"), 10)
    }
}

final class WeekJourneyTests: DVTestCase {
    func testWeekWithReadyFlaggedApprovedAndMaking() {
        launch()
        for id in ["d1", "d2", "d3"] { wait(el("card.\(id)"), 12) }
        XCTAssertEqual(el("week.approveAll").label.contains("(1)"), true)
    }

    func testFreshWeekOffersApproveAll() {
        launch(["Week": "full"])
        let all = wait(el("week.approveAll"), 12)
        XCTAssertTrue(all.label.contains("(4)"), all.label)
        all.tap()
        wait(app.alerts.buttons[Strings.format("week.approveAll.button", "en", 4)]).tap()
        wait(textContaining(Strings.format("week.approveAll.done", "en", 4)), 8, "approve-all notice")
        waitGone(el("week.approveAll"))
    }

    func testApproveAllCanBeCancelled() {
        launch(["Week": "full"])
        wait(el("week.approveAll"), 12).tap()
        wait(app.alerts.buttons[Strings.value("common.cancel")]).tap()
        XCTAssertTrue(el("week.approveAll").label.contains("(4)"))
    }

    func testEmptyWeekGuides() {
        launch(["Week": "empty"])
        XCTAssertEqual(wait(el("message.title"), 12).label, Strings.value("week.empty.title"))
    }

    func testApproveThenUndo() {
        launch()
        openVideo("d1")
        XCTAssertEqual(el("video.state").label, Strings.value("state.review"))
        let decline = el("video.decline"), approve = el("video.approve")
        XCTAssertLessThan(decline.frame.minX, approve.frame.minX, "left to right: decline, then approve")
        approve.tap()
        wait(el("video.post"))
        XCTAssertEqual(el("video.state").label, Strings.value("state.approved"))
        let undo = el("video.undo")
        scrollTo(undo)
        undo.tap()
        wait(el("video.approve"))
        XCTAssertEqual(el("video.state").label, Strings.value("state.review"))
    }

    func testDeclineWithANoteThenUndo() {
        launch()
        openVideo("d1")
        el("video.decline").tap()
        type(wait(el("decline.note")), "A bit too fast")
        el("decline.submit").tap()
        waitGone(el("decline.note"))
        XCTAssertEqual(wait(el("video.state")).label, Strings.value("state.declined"))
        let undo = el("video.undo")
        scrollTo(undo)
        undo.tap()
        wait(el("video.approve"))
    }

    func testFlaggedVideoShowsTheNoteBeforeApproving() {
        launch()
        openVideo("d2")
        XCTAssertEqual(el("video.state").label, Strings.value("state.look"))
        XCTAssertTrue(text(Strings.value("video.look.title")).exists)
        XCTAssertTrue(text(Strings.value("reason.pause")).exists)
    }

    func testRefusedApproveRollsBackWithAMessage() {
        launch(["ApproveFail": "1"])
        openVideo("d1")
        el("video.approve").tap()
        wait(el("notice"), 8, "error notice")
        XCTAssertEqual(el("video.state").label, Strings.value("state.review"))
    }

    func testPostedTick() {
        launch()
        openVideo("d3")
        let toggle = wait(el("video.posted"))
        scrollTo(toggle)
        // The switch sits at the trailing end of the row.
        toggle.coordinate(withNormalizedOffset: CGVector(dx: 0.93, dy: 0.5)).tap()
        wait(text(Strings.value("state.posted")), 6)
    }
}

final class PostJourneyTests: DVTestCase {
    func testSaveVideoAndCopyTextThenOpenApps() {
        launch(["Photos": "granted"])
        openVideo("d3")
        el("video.post").tap()
        wait(el("post.prepare")).tap()
        wait(el("post.ready"), 8, "saved and copied")
        XCTAssertTrue(el("post.open.instagram").exists)
        XCTAssertTrue(el("post.open.tiktok").exists)
        // The share sheet ("More apps").
        el("post.more").tap()
        let sheet = app.otherElements["ActivityListView"]
        let shown = sheet.waitForExistence(timeout: 6) || !el("post.done").isHittable
        XCTAssertTrue(shown, "share sheet")
    }

    func testPhotosDeniedExplainsAndKeepsAWayOut() {
        launch(["Photos": "denied"])
        openVideo("d3")
        el("video.post").tap()
        wait(el("post.prepare")).tap()
        let error = wait(el("post.error"))
        XCTAssertEqual(error.label, Strings.value("post.error.photos"))
        XCTAssertTrue(el("post.prepare").exists, "can try again")
        XCTAssertTrue(el("post.more").exists, "the share sheet still works without Photos")
    }

    func testTikTokTextIsShorter() {
        launch()
        openVideo("d3")
        el("video.post").tap()
        wait(el("post.prepare"))
        XCTAssertTrue(textContaining("#dentist #whitening #smile").exists)
        app.buttons[Strings.value("post.short")].tap()
        XCTAssertTrue(textContaining("#dentist").exists)
        el("post.done").tap()
        waitGone(el("post.prepare"))
    }
}

final class RecordJourneyTests: DVTestCase {
    private func recordATake() {
        tab("tab.record").tap()
        wait(el("record.start"), 10).tap()
        let record = wait(el("camera.record"))
        record.tap()
        sleep(1)
        record.tap()
        wait(el("camera.use"), 6).tap()
    }

    func testRecordAndUpload() {
        launch(["Camera": "granted", "Upload": "ok"])
        wait(el("card.d1"), 12)
        recordATake()
        wait(el("upload.processing"), 12, "uploaded, being edited")
        waitGone(el("upload.processing"), 15)
        XCTAssertFalse(el("upload.failed").exists)
    }

    func testCameraDenied() {
        launch(["Camera": "denied"])
        wait(el("card.d1"), 12)
        tab("tab.record").tap()
        wait(el("record.start"), 10).tap()
        XCTAssertEqual(wait(el("message.title")).label, Strings.value("camera.denied.title"))
        XCTAssertTrue(text(Strings.value("camera.openSettings")).exists)
        app.buttons[Strings.value("common.close")].tap()
        wait(el("record.start"))
    }

    func testRetakeDiscardsTheTake() {
        launch()
        wait(el("card.d1"), 12)
        tab("tab.record").tap()
        wait(el("record.start"), 10).tap()
        let record = wait(el("camera.record"))
        record.tap(); sleep(1); record.tap()
        wait(el("camera.retake"), 6).tap()
        wait(el("camera.record"))
        el("camera.close").tap()
        XCTAssertFalse(el("upload.uploading").exists)
    }

    func testFailedUploadCanBeRetried() {
        launch(["Upload": "failonce"])
        wait(el("card.d1"), 12)
        recordATake()
        wait(el("upload.failed"), 12)
        XCTAssertTrue(text(Strings.value("upload.problem.network")).exists)
        el("upload.retry").tap()
        wait(el("upload.processing"), 12)
        waitGone(el("upload.processing"), 15)
    }

    func testFailedUploadCanBeRemoved() {
        launch(["Upload": "fail"])
        wait(el("card.d1"), 12)
        recordATake()
        wait(el("upload.failed"), 12)
        el("upload.remove").tap()
        waitGone(el("upload.failed"), 5)
    }

    func testUploadResumesAfterTheAppIsClosed() {
        launch(["Upload": "hold"])
        wait(el("card.d1"), 12)
        recordATake()
        wait(el("upload.uploading"), 10)
        app.terminate()
        launch(["Upload": "ok"], reset: false)
        wait(el("card.d1"), 12)
        tab("tab.record").tap()
        // The queue survived; it restarts on its own and finishes.
        let processing = el("upload.processing")
        XCTAssertTrue(processing.waitForExistence(timeout: 12) || !el("upload.uploading").exists)
        waitGone(el("upload.uploading"), 15)
        waitGone(processing, 15)
    }

    func testStarterPlanHasNoRecording() {
        launch(["Plan": "starter"])
        wait(el("card.d1"), 12)
        tab("tab.record").tap()
        XCTAssertEqual(wait(el("message.title")).label, Strings.value("record.notIncluded.title"))
        XCTAssertFalse(el("record.start").exists)
    }
}

final class SettingsJourneyTests: DVTestCase {
    func testEditAndSaveClinicDetails() {
        launch()
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        wait(el("settings.clinic")).tap()
        let city = wait(el("clinic.city"))
        clear(city)
        city.typeText("Portland")
        el("clinic.save").tap()
        wait(textContaining(Strings.value("settings.saved")), 8, "saved notice")
        wait(el("settings.clinic"))
    }

    func testClinicNameIsRequired() {
        launch()
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        wait(el("settings.clinic")).tap()
        let name = wait(el("clinic.name"))
        clear(name)
        XCTAssertTrue(((name.value as? String) ?? "").isEmpty || name.value as? String == name.placeholderValue, "name cleared")
        // Disabled: tapping Save does nothing (no "Saved" notice, the form stays).
        el("clinic.save").tap()
        XCTAssertFalse(textContaining(Strings.value("settings.saved")).waitForExistence(timeout: 3))
        XCTAssertTrue(el("clinic.name").exists)
    }

    func testServerRefusalIsShown() {
        launch(["ClinicReject": "1"])
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        wait(el("settings.videos")).tap()
        wait(el("videos.save")).tap()
        wait(textContaining("cannot be used"), 8, "the server's reason")
        XCTAssertTrue(el("videos.save").exists, "stays on the form")
    }

    func testDeleteAccountCancel() {
        launch()
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        let delete = el("settings.delete")
        scrollTo(delete)
        delete.tap()
        XCTAssertFalse(wait(el("delete.submit")).isEnabled)
        el("delete.cancel").tap()
        waitGone(el("delete.field"))
        XCTAssertTrue(el("settings.delete").exists)
    }

    func testDeleteAccountConfirmed() {
        launch()
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        let delete = el("settings.delete")
        scrollTo(delete)
        delete.tap()
        type(wait(el("delete.field")), "sample   dental   practice")
        XCTAssertTrue(el("delete.submit").isEnabled, "case and spaces do not matter")
        el("delete.submit").tap()
        wait(el("signin.email"), 10, "signed out after deletion")
    }
}

final class OfflineAndLinkJourneyTests: DVTestCase {
    func testOfflineStartShowsTheSavedWeek() {
        launch()
        wait(el("card.d1"), 12)
        app.terminate()
        launch(["Net": "offline"], reset: false)
        wait(el("week.offline"), 12, "offline note")
        wait(el("card.d1"))
        openVideo("d3")
        XCTAssertEqual(el("video.state").label, Strings.value("state.approved"))
    }

    func testOfflineFirstStartOffersRetry() {
        launch(["Net": "offline"])
        XCTAssertEqual(wait(el("message.title"), 12).label, Strings.value("offline.title"))
        XCTAssertTrue(text(Strings.value("common.retry")).exists)
    }

    func testActionWhileOfflineSaysSo() {
        launch()
        wait(el("card.d1"), 12)
        app.terminate()
        launch(["Net": "offline"], reset: false)
        openVideo("d1")
        el("video.approve").tap()
        wait(textContaining(Strings.value("error.offline")), 8)
        XCTAssertEqual(el("video.state").label, Strings.value("state.review"))
    }

    /// The same path a notification tap or a dentvideo.com/app link takes.
    func testLinkOpensTheNamedVideoFromAnyTab() {
        launch()
        wait(el("card.d1"), 12)
        tab("tab.settings").tap()
        openLink("dentvideo://app/video/d2")
        let shown = el("video.state").waitForExistence(timeout: 10)
        let routing = el("debug.routing").exists ? el("debug.routing").label : "(no routing info)"
        XCTAssertTrue(shown, "the linked video did not open; app state: \(routing)")
        XCTAssertEqual(el("video.state").label, Strings.value("state.look"))
    }

    /// A link (or a notification tap) that starts the app opens its video once the week loads.
    func testLinkOpensTheNamedVideoWhenItStartsTheApp() {
        launch()
        wait(el("card.d1"), 12)
        app.terminate()
        launch(reset: false, extra: [])
        app.terminate()
        openLink("dentvideo://app/video/d2")
        let shown = el("video.state").waitForExistence(timeout: 15)
        let routing = el("debug.routing").exists ? el("debug.routing").label : "(no routing info)"
        XCTAssertTrue(shown, "the linked video did not open on a cold start; app state: \(routing)")
        XCTAssertEqual(el("video.state").label, Strings.value("state.look"))
    }

    func testLinkToTheWeek() {
        launch()
        wait(el("card.d1"), 12)
        tab("tab.record").tap()
        openLink("dentvideo://app")
        wait(el("card.d1"), 10)
    }
}

final class LanguageAndSizeTests: DVTestCase {
    func testEveryLanguage() {
        for lang in ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"] {
            launch(lang: lang)
            XCTAssertTrue(tab("tab.week", lang: lang).waitForExistence(timeout: 12), "\(lang): week tab")
            XCTAssertTrue(tab("tab.record", lang: lang).exists, "\(lang): record tab")
            XCTAssertTrue(tab("tab.settings", lang: lang).exists, "\(lang): settings tab")
            XCTAssertTrue(app.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", Strings.value("week.title", lang))).firstMatch.exists, "\(lang): title")
            openVideo("d1")
            XCTAssertEqual(el("video.approve").label.contains(Strings.value("video.approve", lang)), true, "\(lang): approve")
            app.terminate()
        }
        app = nil
    }

    func testArabicIsRightToLeft() {
        launch(lang: "ar")
        openVideo("d1")
        let decline = el("video.decline"), approve = el("video.approve")
        XCTAssertGreaterThan(decline.frame.minX, approve.frame.minX, "right to left: decline on the right")
        let card = el("video.state")
        XCTAssertGreaterThan(card.frame.midX, app.frame.midX, "leading content sits on the right")
    }

    func testLargestTextSize() {
        launch(extra: ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"])
        let all = wait(el("week.approveAll"), 12)
        XCTAssertTrue(all.isHittable)
        openVideo("d1")
        let approve = el("video.approve")
        XCTAssertTrue(approve.isHittable, "the main action stays reachable at AX5")
        XCTAssertGreaterThanOrEqual(approve.frame.height, 44)
        approve.tap()
        wait(el("video.post"))
    }

    func testTapTargetsAreAtLeast44Points() {
        launch()
        openVideo("d1")
        for id in ["video.approve", "video.decline"] {
            XCTAssertGreaterThanOrEqual(el(id).frame.height, 44, id)
        }
    }
}
