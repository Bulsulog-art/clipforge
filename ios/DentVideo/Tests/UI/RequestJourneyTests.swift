import XCTest

/// "See it with your logo" before the plans, and the clinic's own requests (topic suggestions,
/// change requests, subtitle files), end to end against the in-process fake API (App/Sources/Demo).
/// The demo has no photo library: there, "Choose your logo" uses the demo's sample logo.
final class LogoPreviewJourneyTests: DVTestCase {
    /// A new clinic: the clinic form, then its own look on the samples, a logo saved, the logo's
    /// colour chosen, then the plans. The preview opens again from the plans.
    func testLogoPreviewHappyPath() {
        launch(["Plan": "noclinic", "Billing": "none"])
        fillClinicForm()

        XCTAssertEqual(wait(el("preview.title"), 15, "logo preview after the clinic form").label, Strings.value("preview.title"))
        XCTAssertFalse(el("paywall.buy.starter").exists, "the look first, then the plans")
        wait(el("preview.stage"), 10, "the first sample")
        XCTAssertTrue(el("preview.chip.initials").exists, "no logo yet: the clinic's initials")
        let sample = el("preview.sample")
        XCTAssertTrue(sample.label.contains(Strings.format("preview.sample", "en", 1, 2)), sample.label)
        let next = el("preview.next")
        reveal(next)
        next.tap()
        XCTAssertTrue(wait(textContaining(Strings.format("preview.sample", "en", 2, 2)), 5, "second sample").exists)

        let pick = el("preview.logo.pick")
        reveal(pick)
        pick.tap()
        XCTAssertEqual(wait(el("preview.logo.saved"), 12, "logo saved").label, Strings.value("preview.logo.saved"))
        XCTAssertTrue(el("preview.chip.logo").exists, "the logo is in the video's corner")
        let fromLogo = el("preview.swatch.logo")
        reveal(fromLogo)
        XCTAssertTrue(fromLogo.exists, "the logo's own colour is offered")
        fromLogo.tap()
        XCTAssertTrue(fromLogo.isSelected)

        el("preview.continue").tap()
        wait(el("paywall.buy.starter"), 12, "the plans after the preview")

        // Alongside the plans: the preview opens again, and closes back to them.
        let card = el("paywall.preview")
        scrollTo(card)
        card.tap()
        wait(el("preview.title"), 8, "preview from the plans")
        el("preview.close").tap()
        waitGone(el("preview.title"))
        XCTAssertTrue(el("paywall.preview").exists)
    }

    /// The logo cannot be saved: the preview still shows it, says so, and a retry saves it.
    func testLogoUploadFailureThenRetry() {
        launch(["Plan": "noclinic", "Billing": "none", "Logo": "failonce"])
        fillClinicForm()
        let pick = wait(el("preview.logo.pick"), 15, "logo preview")
        reveal(pick)
        pick.tap()
        XCTAssertEqual(wait(el("preview.logo.error"), 12, "upload error").label, Strings.value("preview.logo.failed"))
        XCTAssertTrue(el("preview.chip.logo").exists, "the preview keeps showing the picked logo")
        let retry = el("preview.logo.retry")
        reveal(retry)
        retry.tap()
        wait(el("preview.logo.saved"), 12, "saved on retry")
        XCTAssertFalse(el("preview.logo.error").exists)
    }

    /// Scroll until the element is on screen and clear of the pinned "See the plans" bar: an element
    /// under the bar still counts as hittable, and a tap on it lands on the bar's button (seen on the
    /// iPhone SE and the 17 Pro Max; the iPad shows the whole screen).
    private func reveal(_ e: XCUIElement) {
        let bar = el("preview.continue")
        for _ in 0..<8 {
            if e.exists, e.isHittable, !bar.exists || e.frame.maxY < bar.frame.minY - 8 { return }
            app.swipeUp(velocity: .slow)
        }
    }

    private func fillClinicForm() {
        type(wait(el("setup.name"), 12, "clinic form"), "Sample Dental Practice")
        let chip = el("setup.service.0")
        scrollTo(chip)
        chip.tap()
        let save = el("setup.submit")
        scrollTo(save)
        save.tap()
    }
}

final class RequestJourneyTests: DVTestCase {
    /// "Suggest a topic for next week" from the week: earlier suggestions, a new one sent and
    /// listed as waiting, then removed again.
    func testSuggestATopic() {
        launch()
        wait(el("card.d1"), 12)
        let entry = el("week.suggestTopic")
        scrollTo(entry, max: 10)
        entry.tap()
        let field = wait(el("topics.field"), 10, "topic sheet")
        XCTAssertGreaterThanOrEqual(app.descendants(matching: .any).matching(identifier: "topics.row").count, 2, "earlier suggestions listed")
        XCTAssertFalse(el("topics.submit").isEnabled, "nothing to send yet")
        type(field, "How long does sensitivity last?")
        let submit = el("topics.submit")
        XCTAssertTrue(submit.waitForExistence(timeout: 3) && submit.isEnabled)
        // On a small phone the keyboard can cover the button: scroll it into view first.
        scrollTo(submit)
        submit.tap()
        XCTAssertEqual(wait(el("topics.sent"), 10, "thank-you").label, Strings.value("topics.sent"))
        let mine = textContaining("How long does sensitivity last?")
        XCTAssertTrue(mine.waitForExistence(timeout: 5), "the new suggestion is listed")
        XCTAssertEqual(app.descendants(matching: .any).matching(identifier: "topics.withdraw").count, 2, "two waiting: the new one and the earlier one")
        // The newest is first; remove it.
        app.descendants(matching: .any).matching(identifier: "topics.withdraw").element(boundBy: 0).tap()
        waitGone(mine, 8)
        el("topics.close").tap()
        waitGone(el("topics.field"))
    }

    /// "Ask for a change" next to Decline: the note is sent, the video says the change is
    /// requested, how many are left this week, and Decline is still there.
    func testRequestAChange() {
        launch()
        openVideo("d1")
        XCTAssertTrue(el("video.decline").exists)
        el("video.change").tap()
        let note = wait(el("change.note"), 8, "change sheet")
        XCTAssertFalse(el("change.submit").isEnabled, "a note is needed")
        type(note, "Shorter, please, and a calmer pace.")
        let submit = el("change.submit")
        scrollTo(submit)
        submit.tap()
        waitGone(note)
        XCTAssertEqual(wait(el("notice"), 6, "sent notice").label, Strings.format("change.sentNotice", "en", 2, 3))
        XCTAssertTrue(wait(el("change.state"), 6).label.contains(Strings.value("change.status.queued")))
        XCTAssertFalse(el("video.change").exists, "one change at a time per video")
        XCTAssertTrue(el("video.decline").exists, "Decline stays")
        XCTAssertTrue(el("video.approve").exists)
    }

    /// This week's three changes are used: the web's sentence, and nothing changes on the video.
    func testChangeLimitSaysSo() {
        launch(["Change": "limit"])
        openVideo("d1")
        el("video.change").tap()
        type(wait(el("change.note"), 8), "Shorter, please.")
        let submit = el("change.submit")
        scrollTo(submit)
        submit.tap()
        XCTAssertEqual(wait(el("change.error"), 8, "limit message").label, Strings.value("change.error.limit"))
        XCTAssertTrue(el("change.note").exists, "the note stays for a later try")
        el("change.cancel").tap()
        waitGone(el("change.note"))
        XCTAssertFalse(el("change.state").exists)
    }

    /// "Download subtitles (.srt)" in the post sheet opens the share sheet with the file.
    func testDownloadSubtitles() {
        launch()
        openVideo("d3")
        el("video.post").tap()
        let srt = wait(el("post.subtitles"), 8, "subtitles button")
        scrollTo(srt)
        XCTAssertEqual(srt.label, Strings.value("subtitles.download"))
        srt.tap()
        let sheet = app.otherElements["ActivityListView"]
        let shown = sheet.waitForExistence(timeout: 8) || !el("post.done").isHittable
        XCTAssertTrue(shown, "share sheet with the .srt file")
        XCTAssertFalse(el("post.subtitles.error").exists)
    }
}
