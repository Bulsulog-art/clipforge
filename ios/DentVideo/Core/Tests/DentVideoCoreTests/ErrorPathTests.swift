import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
import XCTest
@testable import DentVideoCore

/// Every way a request can go wrong, and what the app is told.
final class ErrorPathTests: XCTestCase {
    private func api(_ t: FakeTransport, _ store: MemoryTokenStore = MemoryTokenStore(tokens())) -> APIClient {
        APIClient(baseURL: base, transport: t, store: store)
    }

    private func expect(_ expected: APIError, _ work: () async throws -> Void, file: StaticString = #filePath, line: UInt = #line) async {
        do {
            try await work()
            XCTFail("should throw \(expected)", file: file, line: line)
        } catch {
            XCTAssertEqual(error as? APIError, expected, file: file, line: line)
        }
    }

    func testRateLimitCarriesRetryAfter() async {
        let a = api(FakeTransport { _ in (429, ["error": "slow down"], ["Retry-After": "30"]) })
        await expect(.rateLimited(retryAfter: 30)) { _ = try await a.items() }
        let b = api(FakeTransport { _ in (429, [:] as [String: Any], [:]) })
        await expect(.rateLimited(retryAfter: nil)) { _ = try await b.me() }
    }

    func testServerErrors() async {
        for status in [500, 502, 503, 504] {
            let a = api(FakeTransport { _ in (status, Data("<html>Bad Gateway</html>".utf8), [:]) })
            await expect(.server(status: status)) { _ = try await a.items() }
        }
    }

    func testTimeoutsAndLostConnectionsAreOffline() async {
        for code in [URLError.timedOut, .notConnectedToInternet, .networkConnectionLost, .cannotFindHost] {
            let a = api(FakeTransport { _ in throw URLError(code) })
            await expect(.offline) { _ = try await a.me() }
        }
    }

    func testMalformedJSONIsADecodingError() async {
        let cases: [Data] = [Data("not json".utf8), Data("{\"currentWeek\": 5}".utf8), Data()]
        for body in cases {
            let a = api(FakeTransport { _ in (200, body, [:]) })
            await expect(.decoding) { _ = try await a.items() }
        }
        // A sign-in answer without tokens never signs in.
        let store = MemoryTokenStore()
        let s = api(FakeTransport { _ in (200, ["ok": true], [:]) }, store)
        await expect(.decoding) { _ = try await s.signIn(email: "a@b.c", password: "x") }
        XCTAssertNil(store.load())
    }

    func testRefusalWithoutAJSONBodyHasNoServerText() async {
        let a = api(FakeTransport { _ in (400, Data("Bad Request".utf8), [:]) })
        await expect(.refused(code: nil, message: nil)) { try await a.decide(itemID: "a1", approval: .approved) }
    }

    /// A refresh that fails for a reason other than a dead session keeps the session (a retry may work).
    func testRefreshServerErrorKeepsTheSession() async {
        let store = MemoryTokenStore(tokens())
        let t = FakeTransport { r in
            if r.url!.path.hasSuffix("refresh") { return (503, [:] as [String: Any], [:]) }
            return (401, [:] as [String: Any], [:])
        }
        await expect(.server(status: 503)) { _ = try await self.api(t, store).me() }
        XCTAssertNotNil(store.load())
    }

    /// Still 401 with the fresh token: unauthorized, and only one refresh was tried.
    func testUnauthorizedAfterRefreshDoesNotLoop() async {
        let t = FakeTransport { r in
            if r.url!.path.hasSuffix("refresh") { return (200, tokenJSON("access-2", refresh: "refresh-2"), [:]) }
            return (401, [:] as [String: Any], [:])
        }
        await expect(.unauthorized) { _ = try await self.api(t).items() }
        XCTAssertEqual(t.paths.filter { $0.hasSuffix("refresh") }.count, 1)
        XCTAssertEqual(t.paths.filter { $0.hasSuffix("items") }.count, 2)
    }

    func testRefreshWhileOfflineIsOfflineAndKeepsTheSession() async {
        let store = MemoryTokenStore(tokens(expiresAt: 0))
        let t = FakeTransport { _ in throw URLError(.notConnectedToInternet) }
        await expect(.offline) { _ = try await self.api(t, store).me() }
        XCTAssertNotNil(store.load())
    }

    func testSignedOutCallsAreUnauthorizedWithoutANetworkRequest() async {
        let t = FakeTransport { _ in (200, [:] as [String: Any], [:]) }
        await expect(.unauthorized) { _ = try await self.api(t, MemoryTokenStore()).items() }
        XCTAssertTrue(t.paths.isEmpty)
    }

    func testNotDentVideoOnlyFor403WithItsCode() async {
        let a = api(FakeTransport { _ in (403, ["code": "not_dentvideo"], [:]) }, MemoryTokenStore())
        await expect(.notDentVideo) { _ = try await a.signIn(email: "a@b.c", password: "x") }
        let b = api(FakeTransport { _ in (403, ["code": "forbidden", "error": "No"], [:]) })
        await expect(.refused(code: "forbidden", message: "No")) { _ = try await b.items() }
    }

    func testDeepLinks() {
        func id(_ s: String) -> String?? { DeepLink.target(URL(string: s)!).map { $0.itemID } }
        XCTAssertEqual(id("dentvideo://app/video/abc-1"), .some("abc-1"))
        XCTAssertEqual(id("https://dentvideo.com/app/video/abc-1"), .some("abc-1"))
        XCTAssertEqual(id("https://www.dentvideo.com/app/video/abc-1?x=1"), .some("abc-1"))
        XCTAssertEqual(id("https://dentvideo.com/app"), .some(nil))
        XCTAssertEqual(id("dentvideo://app"), .some(nil))
        XCTAssertEqual(id("https://dentvideo.com/app/somewhere"), .some(nil))
        XCTAssertNil(DeepLink.target(URL(string: "https://evil.example/app/video/abc")!))
        XCTAssertNil(DeepLink.target(URL(string: "http://dentvideo.com/app/video/abc")!))
        XCTAssertNil(DeepLink.target(URL(string: "https://dentvideo.com/pricing")!))
        // Notification payloads: the push's and the reminder's item id.
        XCTAssertEqual(DeepLink.itemID(fromNotification: ["itemID": "x1", "kind": "post_reminder"]), "x1")
        XCTAssertNil(DeepLink.itemID(fromNotification: ["itemID": 5]))
        XCTAssertNil(DeepLink.itemID(fromNotification: [:]))
    }
}
