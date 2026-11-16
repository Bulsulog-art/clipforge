import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import DentVideoCore

func fixture(_ name: String) throws -> Data {
    let url = Bundle.module.url(forResource: name, withExtension: "json", subdirectory: "Fixtures")!
    return try Data(contentsOf: url)
}

final class MemoryTokenStore: TokenStore, @unchecked Sendable {
    private let lock = NSLock()
    private var tokens: Tokens?
    init(_ t: Tokens? = nil) { tokens = t }
    func load() -> Tokens? { lock.lock(); defer { lock.unlock() }; return tokens }
    func save(_ t: Tokens?) { lock.lock(); tokens = t; lock.unlock() }
}

/// A scripted server: a handler per request, every request recorded.
final class FakeTransport: HTTPTransport, @unchecked Sendable {
    private let lock = NSLock()
    private(set) var requests: [URLRequest] = []
    let handler: @Sendable (URLRequest) throws -> (Int, Any, [String: String])

    init(_ handler: @escaping @Sendable (URLRequest) throws -> (Int, Any, [String: String])) { self.handler = handler }

    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        record(request)
        let (status, body, headers) = try handler(request)
        let data: Data
        if let d = body as? Data { data = d } else { data = try JSONSerialization.data(withJSONObject: body) }
        return (data, HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers)!)
    }

    private func record(_ r: URLRequest) { lock.lock(); requests.append(r); lock.unlock() }

    var paths: [String] { lock.lock(); defer { lock.unlock() }; return requests.map { $0.url!.path } }
}

func tokens(_ access: String = "access-1", refresh: String = "refresh-1", expiresAt: Int = 4_000_000_000) -> Tokens {
    Tokens(accessToken: access, refreshToken: refresh, expiresAt: expiresAt, user: AccountUser(id: "u1", email: "a@clinic.example"))
}

func tokenJSON(_ access: String, refresh: String) -> [String: Any] {
    ["accessToken": access, "refreshToken": refresh, "expiresAt": 4_000_000_000, "user": ["id": "u1", "email": "a@clinic.example"]]
}

func bodyJSON(_ r: URLRequest) -> [String: Any] {
    guard let d = r.httpBody, let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] else { return [:] }
    return o
}

let base = URL(string: "https://dentvideo.com/api/dentvideo/mobile/v1")!
