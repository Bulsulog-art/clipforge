import Foundation
import UIKit

/// Minimal in-house analytics. Events are batched in memory and flushed
/// to `/api/events` on a 30-second cadence (or sooner when the queue
/// fills to 25). Failures are non-fatal — the queue keeps growing up to
/// a hard 500-event cap and we retry on the next flush.
///
/// Why not a third-party SDK?
///   • iOS binary stays small
///   • All data inside our Supabase project, no third-party data sharing
///   • RLS already enforces user-scoped writes
@MainActor
final class AnalyticsService: ObservableObject {
    static let shared = AnalyticsService()

    /// Max events held in memory before a forced trim. Beyond this we drop
    /// the oldest events to keep the app responsive even if the network
    /// has been broken for a long time.
    private static let queueCap = 500
    private static let flushBatch = 25
    private static let flushIntervalSec: TimeInterval = 30

    private var queue: [Event] = []
    private var flushTimer: Timer?
    private var flushing = false

    private init() {
        startTimer()
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleBackground),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
    }

    // MARK: - Public

    /// Track an event. Props may be any JSON-serialisable shape; non-encodable
    /// values are silently dropped so a bad caller can't crash the app.
    func track(_ event: String, props: [String: Any]? = nil) {
        let safeProps = props?.compactMapValues(jsonSafe) ?? [:]
        queue.append(Event(
            event: event,
            props: safeProps.isEmpty ? nil : safeProps,
            createdAt: Date()
        ))
        if queue.count > Self.queueCap {
            queue.removeFirst(queue.count - Self.queueCap)
        }
        if queue.count >= Self.flushBatch {
            Task { await flush() }
        }
    }

    /// Force flush. Called manually around high-value events (sub_purchased)
    /// where we want the row to land even if the user kills the app.
    func flushNow() async { await flush() }

    // MARK: - Internals

    private func startTimer() {
        flushTimer?.invalidate()
        flushTimer = Timer.scheduledTimer(
            withTimeInterval: Self.flushIntervalSec,
            repeats: true
        ) { [weak self] _ in
            Task { @MainActor in await self?.flush() }
        }
        if let timer = flushTimer {
            RunLoop.current.add(timer, forMode: .common)
        }
    }

    @objc private func handleBackground() {
        Task { @MainActor in await flush() }
    }

    private func flush() async {
        guard !flushing, !queue.isEmpty,
              let token = SupabaseService.shared.session?.accessToken
        else { return }
        flushing = true
        defer { flushing = false }

        let batch = Array(queue.prefix(Self.flushBatch))
        do {
            try await postBatch(batch, token: token)
            // Drop the events we successfully sent from the head of the queue
            queue.removeFirst(min(batch.count, queue.count))
        } catch {
            // Network blip — leave the queue alone so the next tick retries
            // the same batch. We don't surface this error to the user since
            // analytics drops are not visible/recoverable from the UI.
        }
    }

    private func postBatch(_ batch: [Event], token: String) async throws {
        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/events"))
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        let payload = WirePayload(events: batch.map { $0.toWire() })
        req.httpBody = try JSONEncoder().encode(payload)
        let (_, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
    }

    /// Strip any `[String: Any]` value that can't be JSON-encoded so the
    /// network call doesn't fail on a bad prop. Allow strings, numbers,
    /// bools, and basic arrays of the same.
    private func jsonSafe(_ value: Any) -> Any? {
        switch value {
        case is String, is Int, is Double, is Bool, is Float:
            return value
        case let arr as [Any]:
            let mapped = arr.compactMap { jsonSafe($0) }
            return mapped.isEmpty ? nil : mapped
        default:
            return nil
        }
    }

    // MARK: - Wire shapes

    private struct Event {
        let event: String
        let props: [String: Any]?
        let createdAt: Date

        func toWire() -> WireEvent {
            WireEvent(
                event: event,
                props: props.flatMap { AnyJSON($0) },
                appVersion: appVersionString(),
                osVersion: osVersionString(),
                createdAt: ISO8601DateFormatter().string(from: createdAt)
            )
        }
    }

    private struct WireEvent: Encodable {
        let event: String
        let props: AnyJSON?
        let appVersion: String
        let osVersion: String
        let createdAt: String
    }

    private struct WirePayload: Encodable {
        let events: [WireEvent]
    }

    /// A bare-bones AnyEncodable shim for [String: Any]. The JSONSerialization
    /// fallback handles values that aren't statically typed Encodable.
    private struct AnyJSON: Encodable {
        let value: Any
        init?(_ value: Any) {
            if JSONSerialization.isValidJSONObject(["v": value]) {
                self.value = value
            } else {
                return nil
            }
        }
        func encode(to encoder: Encoder) throws {
            let data = try JSONSerialization.data(withJSONObject: value)
            var container = encoder.singleValueContainer()
            // Use JSON decoder to round-trip the Any into an encodable shape
            let any = try JSONDecoder().decode(JSONNode.self, from: data)
            try container.encode(any)
        }
    }

    /// Recursive Codable enum so AnyJSON can stably encode arbitrary
    /// JSON-shaped values without depending on third-party packages.
    private indirect enum JSONNode: Codable {
        case string(String)
        case int(Int)
        case double(Double)
        case bool(Bool)
        case null
        case array([JSONNode])
        case object([String: JSONNode])

        init(from decoder: Decoder) throws {
            let c = try decoder.singleValueContainer()
            if c.decodeNil() { self = .null; return }
            if let v = try? c.decode(Bool.self)   { self = .bool(v);   return }
            if let v = try? c.decode(Int.self)    { self = .int(v);    return }
            if let v = try? c.decode(Double.self) { self = .double(v); return }
            if let v = try? c.decode(String.self) { self = .string(v); return }
            if let v = try? c.decode([JSONNode].self) { self = .array(v); return }
            if let v = try? c.decode([String: JSONNode].self) { self = .object(v); return }
            throw DecodingError.dataCorruptedError(
                in: c, debugDescription: "Unsupported JSON node"
            )
        }
        func encode(to encoder: Encoder) throws {
            var c = encoder.singleValueContainer()
            switch self {
            case .null:           try c.encodeNil()
            case .bool(let v):    try c.encode(v)
            case .int(let v):     try c.encode(v)
            case .double(let v):  try c.encode(v)
            case .string(let v):  try c.encode(v)
            case .array(let v):   try c.encode(v)
            case .object(let v):  try c.encode(v)
            }
        }
    }
}

private func appVersionString() -> String {
    let v = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "?"
    let b = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "?"
    return "\(v) (\(b))"
}

/// `UIDevice.current.systemVersion` is documented as safe to read off the
/// main thread, so we leave this nonisolated to keep it callable from
/// AnalyticsService.Event.toWire() (which itself isn't actor-isolated).
private func osVersionString() -> String {
    "iOS \(UIDevice.current.systemVersion)"
}
