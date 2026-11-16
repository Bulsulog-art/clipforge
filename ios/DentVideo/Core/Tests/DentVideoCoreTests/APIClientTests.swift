import XCTest
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import DentVideoCore

final class APIClientTests: XCTestCase {
    func testSignInStoresTokensAndNormalisesTheAddress() async throws {
        let store = MemoryTokenStore()
        let t = FakeTransport { r in
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/session")
            XCTAssertNil(r.value(forHTTPHeaderField: "Authorization"))
            XCTAssertEqual(bodyJSON(r)["email"] as? String, "a@clinic.example")
            return (200, tokenJSON("acc", refresh: "ref"), [:])
        }
        let api = APIClient(baseURL: base, transport: t, store: store)
        _ = try await api.signIn(email: "  A@Clinic.example ", password: "pw")
        XCTAssertEqual(store.load()?.accessToken, "acc")
    }

    func testSignInErrors() async {
        for (status, body, expected) in [
            (401, ["code": "invalid_credentials"], APIError.invalidCredentials),
            (400, ["code": "invalid_credentials"], APIError.invalidCredentials),
            (403, ["code": "not_dentvideo"], APIError.notDentVideo),
            (429, [:], APIError.rateLimited(retryAfter: 30)),
        ] as [(Int, [String: String], APIError)] {
            let api = APIClient(baseURL: base, transport: FakeTransport { _ in (status, body, ["Retry-After": "30"]) }, store: MemoryTokenStore())
            do {
                _ = try await api.signIn(email: "a@b.example", password: "x")
                XCTFail("should throw")
            } catch {
                XCTAssertEqual(error as? APIError, expected)
            }
        }
    }

    func testSendsBearerAndLanguage() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.value(forHTTPHeaderField: "Authorization"), "Bearer access-1")
            XCTAssertEqual(r.value(forHTTPHeaderField: "Accept-Language"), "ar")
            return (200, try JSONSerialization.jsonObject(with: fixture("items")), [:])
        }
        let api = APIClient(baseURL: base, transport: t, store: MemoryTokenStore(tokens()), languageCode: "ar")
        let items = try await api.items()
        XCTAssertEqual(items.items.count, 5)
    }

    func testRefreshesOnceOn401ThenRetries() async throws {
        let store = MemoryTokenStore(tokens("old"))
        let t = FakeTransport { r in
            switch r.url!.path {
            case "/api/dentvideo/mobile/v1/session/refresh":
                XCTAssertEqual(bodyJSON(r)["refreshToken"] as? String, "refresh-1")
                return (200, tokenJSON("new", refresh: "refresh-2"), [:])
            default:
                return r.value(forHTTPHeaderField: "Authorization") == "Bearer new"
                    ? (200, try JSONSerialization.jsonObject(with: fixture("me")), [:])
                    : (401, ["code": "unauthorized"], [:])
            }
        }
        let api = APIClient(baseURL: base, transport: t, store: store)
        let me = try await api.me()
        XCTAssertEqual(me.locale, "de")
        XCTAssertEqual(t.paths.map { $0.replacingOccurrences(of: "/api/dentvideo/mobile/v1/", with: "") }, ["me", "session/refresh", "me"])
        XCTAssertEqual(store.load()?.refreshToken, "refresh-2")
    }

    func testRefreshesAheadOfExpiry() async throws {
        let store = MemoryTokenStore(tokens("old", expiresAt: 1_000))
        let t = FakeTransport { r in
            r.url!.path.hasSuffix("refresh") ? (200, tokenJSON("new", refresh: "r2"), [:]) : (200, try JSONSerialization.jsonObject(with: fixture("me")), [:])
        }
        let api = APIClient(baseURL: base, transport: t, store: store, now: { Date(timeIntervalSince1970: 990) })
        _ = try await api.me()
        XCTAssertEqual(t.paths.count, 2)
        XCTAssertEqual(t.requests.last?.value(forHTTPHeaderField: "Authorization"), "Bearer new")
    }

    func testAGoneSessionSignsOut() async {
        let store = MemoryTokenStore(tokens())
        let api = APIClient(baseURL: base, transport: FakeTransport { _ in (401, ["code": "unauthorized"], [:]) }, store: store)
        do {
            _ = try await api.me()
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(error as? APIError, .unauthorized)
        }
        XCTAssertNil(store.load())
    }

    func testConcurrentRequestsShareOneRefresh() async throws {
        let store = MemoryTokenStore(tokens("old", expiresAt: 1_000))
        let t = FakeTransport { r in
            r.url!.path.hasSuffix("refresh") ? (200, tokenJSON("new", refresh: "r2"), [:]) : (200, try JSONSerialization.jsonObject(with: fixture("me")), [:])
        }
        let api = APIClient(baseURL: base, transport: t, store: store, now: { Date(timeIntervalSince1970: 990) })
        async let a = api.me()
        async let b = api.me()
        async let c = api.me()
        _ = try await (a, b, c)
        XCTAssertEqual(t.paths.filter { $0.hasSuffix("refresh") }.count, 1)
    }

    func testErrorMapping() async {
        let cases: [(Int, String, APIError)] = [
            (402, #"{"needsPlan":true,"error":"Choose a plan"}"#, .needsPlan),
            (423, #"{"code":"admin_paused"}"#, .paused),
            (409, #"{"error":"Not decidable"}"#, .refused(code: nil, message: "Not decidable")),
            (413, #"{"code":"quota"}"#, .refused(code: "quota", message: nil)),
            (503, "{}", .server(status: 503)),
        ]
        for (status, body, expected) in cases {
            let data = Data(body.utf8)
            let api = APIClient(baseURL: base, transport: FakeTransport { _ in (status, data, [:]) }, store: MemoryTokenStore(tokens()))
            do {
                try await api.decide(itemID: "a1", approval: .approved)
                XCTFail("should throw")
            } catch {
                XCTAssertEqual(error as? APIError, expected, "\(status)")
            }
        }
    }

    func testOfflineIsOneError() async {
        struct Down: Error {}
        let api = APIClient(baseURL: base, transport: FakeTransport { _ in throw Down() }, store: MemoryTokenStore(tokens()))
        do {
            _ = try await api.items()
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(error as? APIError, .offline)
        }
    }

    func testWriteBodies() async throws {
        let t = FakeTransport { r in
            if r.url!.path.hasSuffix("approve-week") { return (200, ["ok": true, "approved": 2, "ids": ["a1", "a2"]], [:]) }
            return (200, ["ok": true], [:])
        }
        let api = APIClient(baseURL: base, transport: t, store: MemoryTokenStore(tokens()))
        try await api.decide(itemID: "a1", approval: .rejected, note: "Falscher Dienst")
        try await api.setPosted(itemID: "a1", posted: true)
        let ids = try await api.approveWeek("2026-11-16")
        try await api.saveClinic(ClinicProfile(name: " A ", city: "", country: "DE", language: "de", services: ["x"]))
        XCTAssertEqual(ids, ["a1", "a2"])
        let r = t.requests
        XCTAssertEqual(r[0].httpMethod, "PATCH")
        XCTAssertEqual(r[0].url?.path, "/api/dentvideo/mobile/v1/items/a1")
        XCTAssertEqual(bodyJSON(r[0]) as NSDictionary, ["approval": "rejected", "note": "Falscher Dienst"])
        XCTAssertEqual(bodyJSON(r[1]) as NSDictionary, ["posted": true])
        XCTAssertEqual(bodyJSON(r[2]) as NSDictionary, ["week": "2026-11-16"])
        let profile = bodyJSON(r[3])["profile"] as? [String: Any]
        XCTAssertEqual(profile?["name"] as? String, "A")
        XCTAssertNil(profile?["city"])
    }

    func testItemIDsCannotEscapeThePath() {
        XCTAssertEqual(APIClient.pathSafe("../../account/delete"), "%2E%2E%2F%2E%2E%2Faccount%2Fdelete")
        XCTAssertEqual(APIClient.pathSafe("9d1e2f3a-4b5c"), "9d1e2f3a-4b5c")
    }

    func testSignOutClearsLocallyEvenWhenOffline() async {
        struct Down: Error {}
        let store = MemoryTokenStore(tokens())
        let api = APIClient(baseURL: base, transport: FakeTransport { _ in throw Down() }, store: store)
        await api.signOut(deviceToken: "abc")
        XCTAssertNil(store.load())
    }

    func testDeleteAccountClearsTheSession() async throws {
        let store = MemoryTokenStore(tokens())
        let t = FakeTransport { r in
            XCTAssertEqual(bodyJSON(r)["confirm"] as? String, "DELETE")
            return (200, ["ok": true], [:])
        }
        try await APIClient(baseURL: base, transport: t, store: store).deleteAccount(confirm: "DELETE")
        XCTAssertNil(store.load())
    }
}
