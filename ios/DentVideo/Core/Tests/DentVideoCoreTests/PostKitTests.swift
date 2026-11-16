import XCTest
@testable import DentVideoCore

final class PostKitTests: XCTestCase {
    func testUsesTheServersPostKit() {
        let i = LibraryItem(id: "a", status: .ready, approval: .approved, title: "t", weekOf: "2026-11-16", caption: "ignored", post: PostTexts(instagram: "IG text", short: "Short text"))
        XCTAssertEqual(PostKit.text(for: i, network: .instagram), "IG text")
        XCTAssertEqual(PostKit.text(for: i, network: .short), "Short text")
    }

    func testBuildsTheSameTextAsTheWebForOlderVideos() {
        // posting.ts postTexts: caption + hashtags; short = first sentence + three tags.
        let p = PostKit.build(caption: "Floss once a day. It takes two minutes.", hashtags: ["dentist", "#floss", "smile", "teeth", "bad tag!", ""])
        XCTAssertEqual(p.instagram, "Floss once a day. It takes two minutes.\n\n#dentist #floss #smile #teeth")
        XCTAssertEqual(p.short, "Floss once a day.\n#dentist #floss #smile")
        XCTAssertEqual(PostKit.build(caption: nil, hashtags: ["a"]).instagram, "#a")
        XCTAssertEqual(PostKit.build(caption: nil, hashtags: nil), PostTexts(instagram: "", short: ""))
    }

    func testHashtagsInEveryScript() {
        XCTAssertEqual(PostKit.cleanHashtags(["diş", "歯医者", "طبيب_اسنان", "zahnärztin", "x-y", String(repeating: "a", count: 61)]), ["#diş", "#歯医者", "#طبيب_اسنان", "#zahnärztin"])
    }

    func testLeadSentence() {
        XCTAssertEqual(PostKit.leadSentence("One. Two."), "One.")
        XCTAssertEqual(PostKit.leadSentence("歯を守る。毎日。"), "歯を守る。")
        XCTAssertEqual(PostKit.leadSentence("Version 2.0 is out"), "Version 2.0 is out")
        let long = String(repeating: "word ", count: 40)
        let cut = PostKit.leadSentence(long, max: 50)
        XCTAssertLessThanOrEqual(cut.count, 50)
        XCTAssertTrue(cut.hasSuffix("…"))
    }

    func testSlotMomentAndLabel() {
        let berlin = TimeZone(identifier: "Europe/Berlin")!
        let d = PostKit.date(of: Slot(date: "2026-11-17", time: "12:30"), timeZone: berlin)!
        XCTAssertEqual(ISO8601DateFormatter().string(from: d), "2026-11-17T11:30:00Z")
        XCTAssertNil(PostKit.date(of: Slot(date: "soon", time: "noon")))
        XCTAssertEqual(PostKit.label(of: Slot(date: "2026-11-17", time: "12:30"), locale: Locale(identifier: "en_US")), "Tue 12:30")
        XCTAssertTrue(PostKit.label(of: Slot(date: "2026-11-17", time: "12:30"), locale: Locale(identifier: "de_DE")).hasPrefix("Di"))
    }

    func testShareTargets() {
        let ig = ShareTarget.instagram.urls(localIdentifier: "ABC-123/L0/001")
        XCTAssertEqual(ig.first?.absoluteString, "instagram://library?LocalIdentifier=ABC%2D123%2FL0%2F001")
        XCTAssertEqual(ig.last?.absoluteString, "instagram://app")
        XCTAssertEqual(ShareTarget.instagram.urls(localIdentifier: nil).map(\.absoluteString), ["instagram://app"])
        XCTAssertEqual(ShareTarget.tiktok.urls(localIdentifier: "x").map(\.absoluteString), ["tiktok://", "snssdk1233://"])
        for t in ShareTarget.allCases { for u in t.urls(localIdentifier: "x") { XCTAssertTrue(ShareTarget.querySchemes.contains(u.scheme!)) } }
    }

    func testUploadRulesMatchTheWeb() {
        XCTAssertNil(UploadRules.check(size: 300 * 1024 * 1024, contentType: "video/quicktime"))
        XCTAssertNil(UploadRules.check(size: UploadRules.maxBytes, contentType: "video/mp4"))
        XCTAssertEqual(UploadRules.check(size: UploadRules.maxBytes + 1, contentType: "video/mp4"), .tooLarge)
        XCTAssertEqual(UploadRules.check(size: 0, contentType: "video/mp4"), .empty)
        XCTAssertEqual(UploadRules.check(size: 10, contentType: "image/png"), .type)
        XCTAssertEqual(UploadRules.contentType(forExtension: "MOV"), "video/quicktime")
        XCTAssertNil(UploadRules.contentType(forExtension: "exe"))
    }

    func testSnapshotIsPerAccount() throws {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString)
        let store = SnapshotStore(url: dir.appendingPathComponent("s.json"))
        let me = try JSONDecoder().decode(Me.self, from: fixture("me"))
        let items = try JSONDecoder().decode(ItemsResponse.self, from: fixture("items"))
        store.save(Snapshot(me: me, items: items, savedAt: Date(timeIntervalSince1970: 0)))
        XCTAssertEqual(store.load(for: me.user.id)?.items.items.count, 5)
        XCTAssertNil(store.load(for: "someone-else"))
        store.clear()
        XCTAssertNil(store.load(for: me.user.id))
    }
}
