import Foundation
import Supabase

/// What the screens need from DentVideo. Two implementations: the live clinic
/// account, and a sample clinic that needs no login (App Review, first look).
@MainActor
protocol Backend: AnyObject {
    var isDemo: Bool { get }
    func clinic() async throws -> Clinic
    func items() async throws -> [VideoItem]
    func decide(_ id: String, approval: VideoItem.Approval, note: String?) async throws
    func setPosted(_ id: String, posted: Bool) async throws
    func signOut() async
    func deleteAccount(confirm: String) async throws
}

struct BackendError: LocalizedError, Equatable {
    let message: String
    var errorDescription: String? { message }

    static let generic = BackendError(message: String(localized: "Something went wrong. Please try again."))
    static let signedOut = BackendError(message: String(localized: "Please sign in again."))
}

// MARK: - Live

@MainActor
final class LiveBackend: Backend {
    let isDemo = false
    let client: SupabaseClient

    static let shared = LiveBackend()

    private init() {
        client = SupabaseClient(
            supabaseURL: Config.supabaseURL,
            supabaseKey: Config.supabaseAnonKey,
            options: .init(auth: .init(emitLocalSessionAsInitialSession: true))
        )
    }

    /// A stored, unexpired session (the SDK refreshes it when needed).
    func restore() async -> Bool {
        guard let s = try? await client.auth.session else { return false }
        return !s.isExpired
    }

    func signIn(email: String, password: String) async throws {
        do {
            _ = try await client.auth.signIn(email: email.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
        } catch {
            throw BackendError(message: String(localized: "That email and password don't match a DentVideo account."))
        }
        // A login from another product on the same server is not a clinic.
        do { _ = try await clinic() } catch {
            await signOut()
            throw BackendError(message: String(localized: "This login has no DentVideo clinic. Use the email your clinic signed up with."))
        }
    }

    private func userId() async throws -> String {
        guard let s = try? await client.auth.session else { throw BackendError.signedOut }
        return s.user.id.uuidString.lowercased()
    }

    private struct ClinicRow: Decodable {
        struct Profile: Decodable { let name: String? }
        let profile: Profile?
        let plan: String
        let admin_paused_at: String?
    }

    func clinic() async throws -> Clinic {
        let uid = try await userId()
        let rows: [ClinicRow] = try await client.from("dentvid_clinics")
            .select("profile, plan, admin_paused_at")
            .eq("owner_id", value: uid)
            .limit(1)
            .execute()
            .value
        guard let row = rows.first else { throw BackendError.generic }
        let email = (try? await client.auth.session.user.email) ?? ""
        return Clinic(
            name: row.profile?.name ?? "DentVideo",
            email: email,
            active: row.plan == "active",
            paused: row.admin_paused_at != nil
        )
    }

    private struct ItemRow: Decodable {
        struct Copy: Decodable { let caption: String?; let hashtags: [String]? }
        let id: String
        let kind: String
        let status: String
        let approval: String
        let approval_note: String?
        let title: String
        let week_of: String
        let copy: Copy?
        let posted_at: String?
        let video_path: String?
        let thumb_path: String?
    }

    func items() async throws -> [VideoItem] {
        let uid = try await userId()
        let rows: [ItemRow] = try await client.from("dentvid_items")
            .select("id, kind, status, approval, approval_note, title, week_of, copy, posted_at, video_path, thumb_path")
            .eq("owner_id", value: uid)
            .eq("kind", value: "generated")
            .order("created_at", ascending: false)
            .limit(60)
            .execute()
            .value
        let paths = rows.flatMap { [$0.video_path, $0.thumb_path] }.compactMap { $0 }
        var urls: [String: URL] = [:]
        if !paths.isEmpty {
            let signed = try await client.storage.from("dentvid").createSignedURLs(paths: paths, expiresIn: 60 * 60)
            for s in signed { if let u = s.signedURL { urls[s.path] = u } }
        }
        let iso = ISO8601DateFormatter()
        iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return rows.compactMap { r in
            guard let status = VideoItem.Status(rawValue: r.status),
                  let approval = VideoItem.Approval(rawValue: r.approval) else { return nil }
            return VideoItem(
                id: r.id,
                title: r.title,
                weekOf: String(r.week_of.prefix(10)),
                status: status,
                approval: approval,
                approvalNote: r.approval_note,
                caption: r.copy?.caption,
                hashtags: r.copy?.hashtags ?? [],
                postedAt: r.posted_at.flatMap { iso.date(from: $0) ?? ISO8601DateFormatter().date(from: $0) },
                videoURL: r.video_path.flatMap { urls[$0] },
                thumbURL: r.thumb_path.flatMap { urls[$0] }
            )
        }
    }

    /// Decisions go through the website's API (same checks and events as the web app).
    private func api(_ path: String, body: [String: Any], method: String = "POST") async throws {
        guard let token = try? await client.auth.session.accessToken else { throw BackendError.signedOut }
        var req = URLRequest(url: Config.siteURL.appendingPathComponent(path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(Locale.preferredLanguages.first ?? "en", forHTTPHeaderField: "Accept-Language")
        req.httpBody = try JSONSerialization.data(withJSONObject: body)
        let (data, resp) = try await URLSession.shared.data(for: req)
        let code = (resp as? HTTPURLResponse)?.statusCode ?? 0
        if (200..<300).contains(code) { return }
        if code == 401 { throw BackendError.signedOut }
        let message = (try? JSONSerialization.jsonObject(with: data) as? [String: Any])?["error"] as? String
        throw message.map { BackendError(message: $0) } ?? BackendError.generic
    }

    func decide(_ id: String, approval: VideoItem.Approval, note: String?) async throws {
        var body: [String: Any] = ["approval": approval.rawValue]
        if let note, !note.isEmpty { body["note"] = String(note.prefix(500)) }
        try await api("/api/dentvideo/items/\(id)", body: body, method: "PATCH")
    }

    func setPosted(_ id: String, posted: Bool) async throws {
        try await api("/api/dentvideo/items/\(id)", body: ["posted": posted], method: "PATCH")
    }

    func deleteAccount(confirm: String) async throws {
        try await api("/api/dentvideo/account/delete", body: ["confirm": confirm])
        try? await client.auth.signOut(scope: .local)
    }

    func signOut() async {
        try? await client.auth.signOut(scope: .local)
    }
}

// MARK: - Sample clinic

/// A clinic that exists only on this phone: the real sample videos from
/// dentvideo.com, decisions kept in memory. No login, nothing sent.
@MainActor
final class DemoBackend: Backend {
    let isDemo = true
    private(set) var store: [VideoItem]
    private let lang: String

    init(language: String = Locale.current.language.languageCode?.identifier ?? "en", now: Date = Date()) {
        let lang = DemoContent.weeks[language] != nil ? language : "en"
        self.lang = lang
        self.store = DemoContent.items(language: lang, now: now)
    }

    func clinic() async throws -> Clinic {
        Clinic(name: DemoContent.clinicName[lang] ?? "Demo Dental Studio", email: "", active: true, paused: false)
    }

    func items() async throws -> [VideoItem] { store }

    func decide(_ id: String, approval: VideoItem.Approval, note: String?) async throws {
        guard let i = store.firstIndex(where: { $0.id == id }), store[i].canDecide else { return }
        store[i].approval = approval
        store[i].approvalNote = note
        if approval != .approved { store[i].postedAt = nil }
    }

    func setPosted(_ id: String, posted: Bool) async throws {
        guard let i = store.firstIndex(where: { $0.id == id }), store[i].approval == .approved else { return }
        store[i].postedAt = posted ? Date() : nil
    }

    func signOut() async {}
    func deleteAccount(confirm: String) async throws {}
}
