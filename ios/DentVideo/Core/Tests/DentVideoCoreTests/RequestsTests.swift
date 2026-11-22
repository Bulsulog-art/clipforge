import XCTest
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import DentVideoCore

/// A stored suggestion as GET / POST topic-requests answer it.
private func topicRow() -> [String: Any] {
    ["id": "6f1e2d3c-4b5a-4c6d-8e7f-0a1b2c3d4e5f", "text": "Beyazlatma sonrası hassasiyet ne kadar sürer?", "status": "pending", "reason": NSNull(), "week_of": NSNull(), "created_at": "2026-11-18T09:00:00.123456+00:00"]
}

/// Topic suggestions, change requests and subtitle files (web/src/lib/dentvid/clinic-requests.ts):
/// the calls the app makes, the answers it reads, and the small rules it keeps on its side.
final class RequestsTests: XCTestCase {
    private func api(_ t: FakeTransport) -> APIClient { APIClient(baseURL: base, transport: t, store: MemoryTokenStore(tokens()), languageCode: "tr") }

    // MARK: Topics

    func testListTopics() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.httpMethod, "GET")
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/topic-requests")
            XCTAssertEqual(r.value(forHTTPHeaderField: "Authorization"), "Bearer access-1")
            return (200, ["available": true, "topics": [topicRow(), ["id": "u2", "text": "İmplant mı köprü mü?", "status": "used", "week_of": "2026-11-16"], ["id": "r3", "text": "En ucuz implant", "status": "refused", "reason": "ad_rules"], ["id": "x4", "text": "?", "status": "someday", "reason": "new_reason"]]], [:])
        }
        let a = try await api(t).topics()
        XCTAssertTrue(a.available)
        XCTAssertEqual(a.topics.map(\.status), [.pending, .used, .refused, .unknown])
        XCTAssertEqual(a.topics[1].weekOf, "2026-11-16")
        XCTAssertEqual(a.topics[2].reason, .adRules)
        XCTAssertEqual(a.topics[3].reason, .unclear, "an unknown refusal reads as the general one, never a crash")
        XCTAssertEqual(RequestRules.waiting(a.topics), 1)
    }

    func testTopicsNotAvailableYet() async throws {
        let a = try await api(FakeTransport { _ in (200, ["topics": [], "available": false], [:]) }).topics()
        XCTAssertFalse(a.available)
        XCTAssertTrue(a.topics.isEmpty)
    }

    func testSuggestTopicSendsCleanTextAndReadsTheThanks() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.httpMethod, "POST")
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/topic-requests")
            XCTAssertEqual(bodyJSON(r) as NSDictionary, ["text": "How long does sensitivity last after whitening?"] as NSDictionary)
            return (200, ["ok": true, "topic": topicRow(), "message": "Teşekkürler."], [:])
        }
        let sent = try await api(t).suggestTopic("  How long does   sensitivity\nlast after whitening?  ")
        XCTAssertEqual(sent.message, "Teşekkürler.")
        XCTAssertEqual(sent.topic.status, .pending)
    }

    func testSuggestTopicRefusalsCarryTheServersSentence() async {
        let cases: [(Int, [String: String], APIError)] = [
            (400, ["error": "Lütfen 3 ile 140 karakter arasında yazın.", "code": "length"], .refused(code: "length", message: "Lütfen 3 ile 140 karakter arasında yazın.")),
            (400, ["error": "Ad rules", "code": "adRules"], .refused(code: "adRules", message: "Ad rules")),
            (409, ["error": "5 waiting", "code": "too_many_pending"], .refused(code: "too_many_pending", message: "5 waiting")),
            (503, ["error": "Not available yet", "code": "unavailable"], .refused(code: "unavailable", message: "Not available yet")),
            (429, ["error": "Too many"], .rateLimited(retryAfter: nil)),
        ]
        for (status, body, expected) in cases {
            do {
                _ = try await api(FakeTransport { _ in (status, body, [:]) }).suggestTopic("A fine question")
                XCTFail("should throw for \(status)")
            } catch {
                XCTAssertEqual(error as? APIError, expected, "\(status)")
            }
        }
    }

    func testWithdrawTopic() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.httpMethod, "DELETE")
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/topic-requests/6f1e2d3c-4b5a-4c6d-8e7f-0a1b2c3d4e5f")
            XCTAssertNil(r.httpBody)
            return (200, ["ok": true], [:])
        }
        try await api(t).withdrawTopic("6f1e2d3c-4b5a-4c6d-8e7f-0a1b2c3d4e5f")
        // An id is never a path: slashes and dots are escaped.
        let t2 = FakeTransport { r in
            XCTAssertFalse(r.url!.path.contains("/../"))
            return (404, ["error": "not found"], [:])
        }
        do {
            try await api(t2).withdrawTopic("../items")
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(error as? APIError, .refused(code: nil, message: "not found"))
        }
    }

    // MARK: Change requests

    func testRequestChange() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.httpMethod, "POST")
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/items/9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a/change")
            XCTAssertEqual(bodyJSON(r)["note"] as? String, "Shorter, please.")
            return (200, ["ok": true, "change": ["id": "c1", "item_id": "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a", "status": "queued", "reason": NSNull(), "created_at": "2026-11-18T10:00:00Z"], "left": 2], [:])
        }
        let sent = try await api(t).requestChange(itemID: "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a", note: " Shorter,  please. ")
        XCTAssertEqual(sent.left, 2)
        XCTAssertEqual(sent.change?.status, .queued)
        XCTAssertEqual(sent.change?.at, "2026-11-18T10:00:00Z")
    }

    func testChangeRefusalsKeepTheirCodeAndSentence() async {
        let cases: [(Int, [String: String], APIError)] = [
            (429, ["error": "You've used this week's 3 change requests.", "code": "limit"], .refused(code: "limit", message: "You've used this week's 3 change requests.")),
            (409, ["error": "Already being made.", "code": "busy"], .refused(code: "busy", message: "Already being made.")),
            (409, ["error": "Only our videos.", "code": "not_this"], .refused(code: "not_this", message: "Only our videos.")),
            (400, ["error": "3 to 300.", "code": "length"], .refused(code: "length", message: "3 to 300.")),
            (402, ["error": "Changes need an active plan.", "code": "no_plan"], .needsPlan),
            (503, ["error": "Something went wrong on our side.", "code": "not_queued"], .refused(code: "not_queued", message: "Something went wrong on our side.")),
            (503, [:], .server(status: 503)),
        ]
        for (status, body, expected) in cases {
            do {
                _ = try await api(FakeTransport { _ in (status, body, [:]) }).requestChange(itemID: "i", note: "Shorter please")
                XCTFail("should throw for \(status)")
            } catch {
                XCTAssertEqual(error as? APIError, expected, "\(status) \(body)")
            }
        }
    }

    func testItemsCarryTheirChangeAndSubtitles() throws {
        let json = """
        {"currentWeek":"2026-11-16","items":[
          {"id":"a","kind":"generated","status":"ready","approval":"pending","title":"A","week_of":"2026-11-16","subtitles":true,"change":{"status":"working","reason":null,"at":"2026-11-18T10:00:00Z"}},
          {"id":"b","kind":"generated","status":"ready","approval":"pending","title":"B","week_of":"2026-11-16","change":{"status":"surprise"}},
          {"id":"c","kind":"recording","status":"ready","approval":"approved","title":"C","week_of":"2026-11-16","change":"garbage"}
        ]}
        """
        let r = try JSONDecoder().decode(ItemsResponse.self, from: Data(json.utf8))
        XCTAssertTrue(r.items[0].subtitles)
        XCTAssertEqual(r.items[0].change, ChangeView(status: .working, reason: nil, at: "2026-11-18T10:00:00Z"))
        XCTAssertFalse(r.items[1].subtitles, "absent = no subtitle file")
        XCTAssertEqual(r.items[1].change?.status, .unknown)
        XCTAssertNil(r.items[2].change, "a malformed change never breaks the week")
        // The snapshot (offline start) keeps both.
        let again = try JSONDecoder().decode(ItemsResponse.self, from: JSONEncoder().encode(r))
        XCTAssertEqual(again, r)
    }

    func testWhenAChangeCanBeAskedFor() {
        let ready = VideoItem(id: "a", status: .ready, approval: .pending, title: "A", weekOf: "2026-11-16")
        XCTAssertTrue(RequestRules.canAskForChange(ready))
        var flagged = ready
        flagged.status = .flagged
        XCTAssertTrue(RequestRules.canAskForChange(flagged))
        var running = ready
        running.change = ChangeView(status: .queued)
        XCTAssertFalse(RequestRules.canAskForChange(running), "one change at a time per video")
        var approved = ready
        approved.approval = .approved
        XCTAssertFalse(RequestRules.canAskForChange(approved))
        var recording = ready
        recording.kind = .recording
        XCTAssertFalse(RequestRules.canAskForChange(recording), "not clips from the clinic's recordings")
        var making = ready
        making.status = .working
        XCTAssertFalse(RequestRules.canAskForChange(making))
        var refused = ready
        refused.change = ChangeView(status: .refused, reason: .checks)
        XCTAssertTrue(RequestRules.canAskForChange(refused), "a refused change can be asked again")
    }

    func testChangeNoteAsTheWebShowsIt() {
        let now = RequestRules.date("2026-11-18T12:00:00Z")!
        var item = VideoItem(id: "a", status: .ready, approval: .pending, title: "A", weekOf: "2026-11-16")
        XCTAssertNil(RequestRules.note(for: item, now: now))
        item.change = ChangeView(status: .working, at: "2026-11-01T00:00:00Z")
        XCTAssertEqual(RequestRules.note(for: item, now: now), .running(.working), "a running change shows however old")
        item.change = ChangeView(status: .done, at: "2026-11-18T09:00:00.123456+00:00")
        XCTAssertEqual(RequestRules.note(for: item, now: now), .done)
        item.approval = .approved
        XCTAssertNil(RequestRules.note(for: item, now: now), "a changed video's note goes once it is decided on")
        item.approval = .pending
        item.change = ChangeView(status: .failed, reason: .technical, at: "2026-11-17T09:00:00Z")
        XCTAssertEqual(RequestRules.note(for: item, now: now), .notChanged(.technical))
        item.change = ChangeView(status: .refused, reason: .checks, at: "2026-11-01T09:00:00Z")
        XCTAssertNil(RequestRules.note(for: item, now: now), "an outcome is news for a week")
    }

    // MARK: Subtitles

    func testDownloadSubtitles() async throws {
        let srt = "1\n00:00:00,000 --> 00:00:02,500\nBeyazlatma ne kadar sürer?\n"
        let t = FakeTransport { r in
            XCTAssertEqual(r.httpMethod, "GET")
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/items/9d1e2f3a/subtitles")
            XCTAssertEqual(r.url?.query, "format=srt")
            XCTAssertEqual(r.value(forHTTPHeaderField: "Authorization"), "Bearer access-1")
            return (200, Data(srt.utf8), ["Content-Type": "application/x-subrip; charset=utf-8"])
        }
        let data = try await api(t).subtitles(itemID: "9d1e2f3a")
        XCTAssertEqual(String(data: data, encoding: .utf8), srt)
    }

    func testNoSubtitlesIsARefusalNotACrash() async {
        do {
            _ = try await api(FakeTransport { _ in (404, ["error": "not found"], [:]) }).subtitles(itemID: "x")
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(error as? APIError, .refused(code: nil, message: "not found"))
        }
        do {
            _ = try await api(FakeTransport { _ in (200, Data(), [:]) }).subtitles(itemID: "x")
            XCTFail("an empty file is not a subtitle file")
        } catch {
            XCTAssertEqual(error as? APIError, .decoding)
        }
    }

    func testSubtitleFileNameMatchesTheWeb() {
        XCTAssertEqual(RequestRules.subtitleFileName("How long does whitening last?"), "dentvideo-how-long-does-whitening-last.srt")
        XCTAssertEqual(RequestRules.subtitleFileName("Diş beyazlatma ne kadar sürer? İşte cevap"), "dentvideo-dis-beyazlatma-ne-kadar-surer-iste-cevap.srt")
        XCTAssertEqual(RequestRules.subtitleFileName("Zahnreinigung: Was passiert, wenn man's vergisst? Größe"), "dentvideo-zahnreinigung-was-passiert-wenn-man-s-vergisst-g.srt")
        XCTAssertEqual(RequestRules.subtitleFileName("ホワイトニングはどのくらい持ちますか"), "dentvideo.srt")
        XCTAssertEqual(RequestRules.subtitleFileName(""), "dentvideo.srt")
    }

    // MARK: Text rules

    func testLengthsCountLikeTheServer() {
        XCTAssertFalse(RequestRules.canSendTopic("ab"))
        XCTAssertFalse(RequestRules.canSendTopic("  a \n  "), "spaces around do not count")
        XCTAssertTrue(RequestRules.canSendTopic("  a   b  "), "runs of spaces count once: \"a b\" is 3")
        XCTAssertTrue(RequestRules.canSendTopic("abc"))
        XCTAssertTrue(RequestRules.canSendTopic(String(repeating: "x", count: 140)))
        XCTAssertFalse(RequestRules.canSendTopic(String(repeating: "x", count: 141)))
        XCTAssertTrue(RequestRules.canSendNote(String(repeating: "ü", count: 300)))
        XCTAssertFalse(RequestRules.canSendNote(String(repeating: "ü", count: 301)))
        XCTAssertEqual(RequestRules.limit(String(repeating: "a", count: 150), to: 140).count, 140)
        XCTAssertEqual(RequestRules.limit("short", to: 140), "short")
        XCTAssertEqual(RequestRules.clean(" a \n\n b\tc "), "a b c")
    }
}
