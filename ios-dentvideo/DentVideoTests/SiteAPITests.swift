import XCTest
@testable import DentVideo

/// Records every request and answers with a canned status and body.
final class StubProtocol: URLProtocol {
    nonisolated(unsafe) static var requests: [URLRequest] = []
    nonisolated(unsafe) static var bodies: [[String: Any]] = []
    nonisolated(unsafe) static var status = 200
    nonisolated(unsafe) static var response: [String: Any] = ["ok": true]

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        Self.requests.append(request)
        var data = request.httpBody
        if data == nil, let stream = request.httpBodyStream {
            stream.open(); var buf = [UInt8](repeating: 0, count: 4096); var d = Data()
            while stream.hasBytesAvailable { let n = stream.read(&buf, maxLength: buf.count); if n <= 0 { break }; d.append(buf, count: n) }
            stream.close(); data = d
        }
        Self.bodies.append((data.flatMap { try? JSONSerialization.jsonObject(with: $0) as? [String: Any] }) ?? [:])
        let resp = HTTPURLResponse(url: request.url!, statusCode: Self.status, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: resp, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: try! JSONSerialization.data(withJSONObject: Self.response))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

/// The request shapes must match the website's routes exactly:
/// web/src/app/api/dentvideo/items/[id]/route.ts (Decision, Posted .strict()),
/// account/delete ({ confirm }), password-reset ({ email, locale }).
final class SiteAPITests: XCTestCase {
    private var api: SiteAPI!

    override func setUp() {
        StubProtocol.requests = []; StubProtocol.bodies = []; StubProtocol.status = 200; StubProtocol.response = ["ok": true]
        let cfg = URLSessionConfiguration.ephemeral
        cfg.protocolClasses = [StubProtocol.self]
        api = SiteAPI(base: URL(string: "https://dentvideo.test")!, session: URLSession(configuration: cfg), token: { "user.jwt" })
    }

    func testApproveAndRejectSendTheDecisionShape() async throws {
        try await api.decide("abc", approval: .approved, note: nil)
        try await api.decide("abc", approval: .rejected, note: "Shorter please")
        XCTAssertEqual(StubProtocol.requests[0].httpMethod, "PATCH")
        XCTAssertEqual(StubProtocol.requests[0].url?.path, "/api/dentvideo/items/abc")
        XCTAssertEqual(StubProtocol.requests[0].value(forHTTPHeaderField: "Authorization"), "Bearer user.jwt")
        XCTAssertEqual(StubProtocol.bodies[0] as NSDictionary, ["approval": "approved"])
        XCTAssertEqual(StubProtocol.bodies[1] as NSDictionary, ["approval": "rejected", "note": "Shorter please"])
    }

    func testPostedTickSendsOnlyPosted() async throws {
        try await api.setPosted("abc", posted: true)
        XCTAssertEqual(StubProtocol.bodies[0] as NSDictionary, ["posted": true], "the route's Posted schema is .strict()")
    }

    func testNoteIsCappedAtTheServersLimit() async throws {
        try await api.decide("abc", approval: .rejected, note: String(repeating: "x", count: 900))
        XCTAssertEqual((StubProtocol.bodies[0]["note"] as? String)?.count, 500)
    }

    func testDeleteSendsConfirm() async throws {
        try await api.deleteAccount(confirm: "Demo Dental")
        XCTAssertEqual(StubProtocol.requests[0].url?.path, "/api/dentvideo/account/delete")
        XCTAssertEqual(StubProtocol.bodies[0] as NSDictionary, ["confirm": "Demo Dental"])
    }

    func testPasswordResetIsUnauthenticatedWithTheSitesOrigin() async throws {
        try await api.requestPasswordReset(email: " dr@clinic.example ")
        let r = StubProtocol.requests[0]
        XCTAssertNil(r.value(forHTTPHeaderField: "Authorization"))
        XCTAssertEqual(r.value(forHTTPHeaderField: "Origin"), "https://dentvideo.test")
        XCTAssertEqual(StubProtocol.bodies[0]["email"] as? String, "dr@clinic.example")
    }

    func testUnauthorizedMeansSignInAgain() async {
        StubProtocol.status = 401
        do { try await api.setPosted("abc", posted: true); XCTFail("should throw") } catch {
            XCTAssertEqual(error as? BackendError, .signedOut)
        }
    }

    func testA4xxShowsTheServersWordsButA403OrA5xxDoesNot() async {
        StubProtocol.status = 409; StubProtocol.response = ["error": "Cancel your subscription first."]
        do { try await api.deleteAccount(confirm: "x"); XCTFail() } catch { XCTAssertEqual((error as? BackendError)?.message, "Cancel your subscription first.") }
        StubProtocol.status = 403; StubProtocol.response = ["error": "Bad Origin"]
        do { try await api.setPosted("a", posted: true); XCTFail() } catch { XCTAssertEqual(error as? BackendError, .generic) }
        StubProtocol.status = 500; StubProtocol.response = ["error": "stack trace"]
        do { try await api.setPosted("a", posted: true); XCTFail() } catch { XCTAssertEqual(error as? BackendError, .generic) }
    }

    func testNoTokenNoRequest() async {
        let none = SiteAPI(base: URL(string: "https://dentvideo.test")!, session: .shared, token: { nil })
        do { try await none.setPosted("a", posted: true); XCTFail() } catch { XCTAssertEqual(error as? BackendError, .signedOut) }
    }
}
