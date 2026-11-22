import Foundation
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif

/// Something that performs an HTTP request. URLSession in the app; a fake in tests.
public protocol HTTPTransport: Sendable {
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

/// Where the session's tokens live (the Keychain in the app).
public protocol TokenStore: Sendable {
    func load() -> Tokens?
    func save(_ tokens: Tokens?)
}

public enum APIError: Error, Equatable, Sendable {
    /// The session is gone (signed out elsewhere, password changed, account deleted): sign out.
    case unauthorized
    case invalidCredentials
    /// A login of another product on the shared account server.
    case notDentVideo
    /// The plan does not include this (402). The app never shows the server's text for it.
    case needsPlan
    /// Paused by DentVideo (423).
    case paused
    case rateLimited(retryAfter: Int?)
    /// The request was understood and refused (400 / 409), with the server's sentence in the clinic's language.
    case refused(code: String?, message: String?)
    case server(status: Int)
    case offline
    case decoding
}

/// The DentVideo mobile API (`/api/dentvideo/mobile/v1`). One transparent token refresh on 401;
/// concurrent requests share that refresh.
public actor APIClient {
    public let baseURL: URL
    private let transport: HTTPTransport
    let store: TokenStore
    private let now: @Sendable () -> Date
    private var refreshing: Task<Tokens, Error>?
    let languageCode: String

    public init(baseURL: URL, transport: HTTPTransport, store: TokenStore, languageCode: String = "en", now: @escaping @Sendable () -> Date = { Date() }) {
        self.baseURL = baseURL
        self.transport = transport
        self.store = store
        self.languageCode = languageCode
        self.now = now
    }

    public var isSignedIn: Bool { store.load() != nil }

    // MARK: Session

    public func signIn(email: String, password: String) async throws -> Tokens {
        let body = ["email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), "password": password]
        do {
            let tokens: Tokens = try await send("session", method: "POST", body: body, auth: false)
            store.save(tokens)
            return tokens
        } catch APIError.unauthorized {
            throw APIError.invalidCredentials
        } catch let APIError.refused(code, _) where code == "invalid_credentials" {
            throw APIError.invalidCredentials
        }
    }

    /// Ends this phone's session on the server and forgets its push token. Local state is cleared
    /// whatever the server answers.
    public func signOut(deviceToken: String?) async {
        var body: [String: String] = [:]
        if let deviceToken { body["deviceToken"] = deviceToken }
        _ = try? await sendRaw("session/signout", method: "POST", body: body, auth: true, retry: false)
        store.save(nil)
    }

    public func requestPasswordReset(email: String) async throws {
        let body = ["email": email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), "locale": languageCode]
        _ = try await sendRaw("password-reset", method: "POST", body: body, auth: false, retry: false)
    }

    // MARK: Reads

    public func me() async throws -> Me { try await send("me") }
    public func items() async throws -> ItemsResponse { try await send("items") }

    // MARK: Writes

    public func decide(itemID: String, approval: Approval, note: String? = nil) async throws {
        var body: [String: String] = ["approval": approval.rawValue]
        if let note, !note.trimmingCharacters(in: .whitespaces).isEmpty { body["note"] = String(note.prefix(500)) }
        _ = try await sendRaw("items/\(Self.pathSafe(itemID))", method: "PATCH", body: body)
    }

    public func setPosted(itemID: String, posted: Bool) async throws {
        _ = try await sendRaw("items/\(Self.pathSafe(itemID))", method: "PATCH", body: ["posted": posted])
    }

    struct ApproveWeekAnswer: Decodable { let approved: Int; let ids: [String]? }

    /// Approves the week's ready, undecided videos; answers the ids approved.
    public func approveWeek(_ week: String) async throws -> [String] {
        let a: ApproveWeekAnswer = try await send("items/approve-week", method: "POST", body: ["week": week])
        return a.ids ?? []
    }

    public struct DeviceRegistration: Encodable, Sendable {
        public var token: String
        public var environment: String
        public var locale: String?
        public var readyPush: Bool
        public init(token: String, environment: String, locale: String?, readyPush: Bool) {
            self.token = token
            self.environment = environment
            self.locale = locale
            self.readyPush = readyPush
        }
    }

    public func registerDevice(_ d: DeviceRegistration) async throws {
        _ = try await sendRaw("devices", method: "POST", body: d)
    }

    public func uploadTicket(size: Int64, contentType: String, name: String) async throws -> UploadTicket {
        struct Body: Encodable { let kind = "recording"; let size: Int64; let contentType: String; let name: String }
        return try await send("upload-url", method: "POST", body: Body(size: size, contentType: contentType, name: name))
    }

    public func startRecording(path: String) async throws {
        _ = try await sendRaw("recording", method: "POST", body: ["path": path])
    }

    public func saveClinic(_ profile: ClinicProfile) async throws {
        struct Body: Encodable { let profile: ClinicProfile }
        _ = try await sendRaw("clinic", method: "POST", body: Body(profile: profile.cleaned()))
    }

    public func deleteAccount(confirm: String) async throws {
        _ = try await sendRaw("account/delete", method: "POST", body: ["confirm": confirm])
        store.save(nil)
    }

    /// A valid access token (refreshed when it expires within a minute), for the background upload's header-free PUT.
    public func validTokens() async throws -> Tokens {
        guard let t = store.load() else { throw APIError.unauthorized }
        return t.expiresSoon(now: now()) ? try await refresh() : t
    }

    // MARK: Plumbing

    static func pathSafe(_ id: String) -> String {
        id.addingPercentEncoding(withAllowedCharacters: .alphanumerics.union(CharacterSet(charactersIn: "-"))) ?? ""
    }

    func send<T: Decodable>(_ path: String, method: String = "GET", body: (any Encodable)? = nil, auth: Bool = true) async throws -> T {
        let data = try await sendRaw(path, method: method, body: body, auth: auth)
        do {
            return try Self.decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decoding
        }
    }

    @discardableResult
    func sendRaw(_ path: String, method: String, body: (any Encodable)?, auth: Bool = true, retry: Bool = true) async throws -> Data {
        var tokens: Tokens?
        if auth {
            tokens = try await validTokens()
        }
        let (data, response) = try await perform(path, method: method, body: body, token: tokens?.accessToken)
        if response.statusCode == 401, auth, retry {
            let fresh = try await refresh()
            let (d2, r2) = try await perform(path, method: method, body: body, token: fresh.accessToken)
            return try Self.check(d2, r2)
        }
        return try Self.check(data, response)
    }

    /// The address of a route: "items" under the API, "items/x/subtitles?format=srt" with its query,
    /// and "/dentvideo/preview/…" (a leading slash) on the API's own origin (the preview library).
    nonisolated func url(for path: String) -> URL {
        if path.hasPrefix("/") { return URL(string: path, relativeTo: baseURL)?.absoluteURL ?? baseURL }
        let parts = path.split(separator: "?", maxSplits: 1).map(String.init)
        let u = baseURL.appendingPathComponent(parts.first ?? "")
        guard parts.count == 2, var c = URLComponents(url: u, resolvingAgainstBaseURL: false) else { return u }
        c.percentEncodedQuery = parts[1]
        return c.url ?? u
    }

    private func perform(_ path: String, method: String, body: (any Encodable)?, token: String?) async throws -> (Data, HTTPURLResponse) {
        var req = URLRequest(url: url(for: path))
        req.httpMethod = method
        req.timeoutInterval = 30
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue(languageCode, forHTTPHeaderField: "Accept-Language")
        if let token { req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        if let raw = body as? RawBody {
            // Bytes as they are (the logo): the server reads its type from Content-Type.
            req.setValue(raw.contentType, forHTTPHeaderField: "Content-Type")
            req.httpBody = raw.data
            req.timeoutInterval = 60
        } else if let body {
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
            req.httpBody = try JSONEncoder().encode(body)
        }
        do {
            return try await transport.send(req)
        } catch let e as APIError {
            throw e
        } catch {
            throw APIError.offline
        }
    }

    /// One refresh at a time; every waiting request gets its result.
    private func refresh() async throws -> Tokens {
        if let refreshing { return try await refreshing.value }
        guard let current = store.load() else { throw APIError.unauthorized }
        let task = Task<Tokens, Error> {
            let (data, response) = try await perform("session/refresh", method: "POST", body: ["refreshToken": current.refreshToken], token: nil)
            if response.statusCode == 401 { throw APIError.unauthorized }
            let checked = try Self.check(data, response)
            guard let t = try? Self.decoder.decode(Tokens.self, from: checked) else { throw APIError.decoding }
            return t
        }
        refreshing = task
        defer { refreshing = nil }
        do {
            let t = try await task.value
            store.save(t)
            return t
        } catch APIError.unauthorized {
            store.save(nil)
            throw APIError.unauthorized
        }
    }

    static var decoder: JSONDecoder { JSONDecoder() }

    static func check(_ data: Data, _ r: HTTPURLResponse) throws -> Data {
        if (200..<300).contains(r.statusCode) { return data }
        let body = try? decoder.decode(APIErrorBody.self, from: data)
        switch r.statusCode {
        case 401: throw APIError.unauthorized
        case 402: throw APIError.needsPlan
        case 403 where body?.code == "not_dentvideo": throw APIError.notDentVideo
        case 423: throw APIError.paused
        // A cap the clinic reached (3 changes a week), with the server's sentence: not "slow down".
        case 429 where body?.code == "limit": throw APIError.refused(code: body?.code, message: body?.error)
        // Requests (topics, changes) not available on this server yet, or not queued: its sentence.
        case 503 where body?.code == "unavailable" || body?.code == "not_queued": throw APIError.refused(code: body?.code, message: body?.error)
        case 429:
            let after = r.value(forHTTPHeaderField: "Retry-After").flatMap { Int($0) }
            throw APIError.rateLimited(retryAfter: after)
        case 400, 403, 404, 409, 413: throw APIError.refused(code: body?.code, message: body?.error)
        default: throw APIError.server(status: r.statusCode)
        }
    }
}

/// A request body sent as raw bytes with its own type (the logo image), not JSON.
struct RawBody: Encodable, Sendable {
    let data: Data
    let contentType: String
    func encode(to encoder: Encoder) throws {}
}

#if canImport(Darwin)
/// URLSession as the app's transport.
public struct URLSessionTransport: HTTPTransport {
    let session: URLSession
    public init(session: URLSession = .shared) { self.session = session }
    public func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else { throw APIError.offline }
        return (data, http)
    }
}
#endif
