import Foundation
import Observation
import DentVideoCore

/// Recordings on their way to DentVideo. Each file is PUT to a one-time signed storage URL by a
/// background URLSession, so the upload continues while the app is in the background or
/// suspended, and the system retries it when the network comes back. When the file is stored,
/// the app asks the server to process it (POST /recording). The queue survives app restarts.
@MainActor
@Observable
final class UploadCenter {
    struct Entry: Codable, Identifiable, Equatable {
        enum State: String, Codable { case waiting, uploading, processing, done, failed }
        enum Problem: String, Codable { case tooLarge, type, needsPlan, quota, network, server }
        var id: UUID
        var fileName: String
        var title: String
        var bytes: Int64
        var contentType: String
        var state: State
        var progress: Double
        var path: String?
        var problem: Problem?
        var createdAt: Date
    }

    static let sessionID = "com.bulsulabs.dentvideo.uploads"

    private(set) var entries: [Entry] = []
    @ObservationIgnored private var api: APIClient?
    @ObservationIgnored private let delegate: UploadDelegate
    @ObservationIgnored private let session: URLSession
    /// Handed over by the app delegate when iOS wakes the app for finished uploads.
    @ObservationIgnored var backgroundCompletion: (() -> Void)?

    static let folder: URL = {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let u = docs.appendingPathComponent("recordings", isDirectory: true)
        try? FileManager.default.createDirectory(at: u, withIntermediateDirectories: true)
        var v = URLResourceValues()
        v.isExcludedFromBackup = true
        var m = u
        try? m.setResourceValues(v)
        return u
    }()
    private static let queueFile = folder.appendingPathComponent("queue.json")

    init() {
        let delegate = UploadDelegate()
        let c = URLSessionConfiguration.background(withIdentifier: Self.sessionID)
        c.isDiscretionary = false
        c.sessionSendsLaunchEvents = true
        c.allowsCellularAccess = true
        // Creating the session with the same identifier reconnects to uploads iOS kept running while the app was closed.
        self.delegate = delegate
        self.session = URLSession(configuration: c, delegate: delegate, delegateQueue: nil)
        entries = (try? JSONDecoder().decode([Entry].self, from: Data(contentsOf: Self.queueFile))) ?? []
        delegate.center = self
    }

    func attach(_ api: APIClient) {
        self.api = api
        Task { await resume() }
    }

    var active: [Entry] { entries.filter { $0.state != .done } }

    /// Take a finished recording (moved into the app's folder) and start uploading it.
    func enqueue(file: URL, title: String) {
        let id = UUID()
        let ext = file.pathExtension.isEmpty ? "mov" : file.pathExtension.lowercased()
        let target = Self.folder.appendingPathComponent("\(id.uuidString).\(ext)")
        do {
            try FileManager.default.moveItem(at: file, to: target)
        } catch {
            try? FileManager.default.copyItem(at: file, to: target)
        }
        let size = (try? FileManager.default.attributesOfItem(atPath: target.path)[.size] as? NSNumber)?.int64Value ?? 0
        let type = UploadRules.contentType(forExtension: ext) ?? "video/quicktime"
        var e = Entry(id: id, fileName: target.lastPathComponent, title: title, bytes: size, contentType: type, state: .waiting, progress: 0, path: nil, problem: nil, createdAt: Date())
        switch UploadRules.check(size: size, contentType: type) {
        case .tooLarge?: e.state = .failed; e.problem = .tooLarge
        case .type?, .empty?: e.state = .failed; e.problem = .type
        case nil: break
        }
        entries.insert(e, at: 0)
        persist()
        if e.state == .waiting { Task { await start(e.id) } }
    }

    func retry(_ id: UUID) {
        update(id) { $0.state = .waiting; $0.problem = nil; $0.progress = 0 }
        Task { await start(id) }
    }

    func remove(_ id: UUID) {
        guard let e = entries.first(where: { $0.id == id }) else { return }
        try? FileManager.default.removeItem(at: Self.folder.appendingPathComponent(e.fileName))
        entries.removeAll { $0.id == id }
        persist()
    }

    /// After sign-out: forget everything (the files belong to that clinic).
    func reset() {
        session.getAllTasks { tasks in tasks.forEach { $0.cancel() } }
        for e in entries { try? FileManager.default.removeItem(at: Self.folder.appendingPathComponent(e.fileName)) }
        entries = []
        persist()
    }

    /// Restart what was interrupted: waiting entries, and uploads the system no longer knows about.
    func resume() async {
        let running = await withCheckedContinuation { (c: CheckedContinuation<Set<String>, Never>) in
            session.getAllTasks { tasks in c.resume(returning: Set(tasks.compactMap(\.taskDescription))) }
        }
        for e in entries {
            switch e.state {
            case .waiting: await start(e.id)
            case .uploading where !running.contains(e.id.uuidString): await start(e.id)
            case .processing where e.path != nil: await finish(e.id)
            default: break
            }
        }
        // Finished entries older than a day leave the list.
        entries.removeAll { $0.state == .done && Date().timeIntervalSince($0.createdAt) > 86_400 }
        persist()
    }

    private func start(_ id: UUID) async {
        guard let api, let e = entries.first(where: { $0.id == id }) else { return }
        let file = Self.folder.appendingPathComponent(e.fileName)
        guard FileManager.default.fileExists(atPath: file.path) else {
            update(id) { $0.state = .failed; $0.problem = .server }
            return
        }
        do {
            let ticket = try await api.uploadTicket(size: e.bytes, contentType: e.contentType, name: e.fileName)
            var req = URLRequest(url: ticket.uploadUrl)
            req.httpMethod = "PUT"
            req.setValue(ticket.contentType, forHTTPHeaderField: "Content-Type")
            req.setValue("false", forHTTPHeaderField: "x-upsert")
            let task = session.uploadTask(with: req, fromFile: file)
            task.taskDescription = id.uuidString
            update(id) { $0.state = .uploading; $0.path = ticket.path; $0.progress = 0; $0.problem = nil }
            task.resume()
        } catch {
            update(id) { $0.state = .failed; $0.problem = Self.problem(for: error) }
        }
    }

    private func finish(_ id: UUID) async {
        guard let api, let e = entries.first(where: { $0.id == id }), let path = e.path else { return }
        update(id) { $0.state = .processing; $0.progress = 1 }
        do {
            try await api.startRecording(path: path)
            update(id) { $0.state = .done }
            // The server has the file: the phone's copy is no longer needed.
            try? FileManager.default.removeItem(at: Self.folder.appendingPathComponent(e.fileName))
        } catch APIError.offline {
            // Stays "processing" and is asked again on the next resume().
        } catch {
            update(id) { $0.state = .failed; $0.problem = Self.problem(for: error) }
        }
    }

    static func problem(for error: Error) -> Entry.Problem {
        switch error as? APIError {
        case .needsPlan?: return .needsPlan
        case let .refused(code, _)? where code == "quota": return .quota
        case let .refused(code, _)? where code == "size": return .tooLarge
        case .offline?: return .network
        default: return .server
        }
    }

    // MARK: Delegate callbacks (main actor)

    fileprivate func progressed(_ idString: String, _ fraction: Double) {
        guard let id = UUID(uuidString: idString) else { return }
        update(id, save: false) { $0.progress = min(max(fraction, 0), 1) }
    }

    fileprivate func completed(_ idString: String, status: Int, failed: Bool) {
        guard let id = UUID(uuidString: idString) else { return }
        if !failed, (200..<300).contains(status) {
            Task { await finish(id) }
        } else {
            update(id) { $0.state = .failed; $0.problem = failed ? .network : .server }
        }
    }

    fileprivate func finishedBackgroundEvents() {
        backgroundCompletion?()
        backgroundCompletion = nil
    }

    private func update(_ id: UUID, save: Bool = true, _ change: (inout Entry) -> Void) {
        guard let i = entries.firstIndex(where: { $0.id == id }) else { return }
        change(&entries[i])
        if save { persist() }
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(entries) else { return }
        try? data.write(to: Self.queueFile, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
}

/// URLSession's delegate runs on its own queue; it only forwards to the main actor.
private final class UploadDelegate: NSObject, URLSessionTaskDelegate, URLSessionDataDelegate, @unchecked Sendable {
    weak var center: UploadCenter?

    func urlSession(_ session: URLSession, task: URLSessionTask, didSendBodyData bytesSent: Int64, totalBytesSent: Int64, totalBytesExpectedToSend: Int64) {
        guard let id = task.taskDescription, totalBytesExpectedToSend > 0 else { return }
        let fraction = Double(totalBytesSent) / Double(totalBytesExpectedToSend)
        let c = center
        Task { @MainActor [weak c] in c?.progressed(id, fraction) }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let id = task.taskDescription else { return }
        let status = (task.response as? HTTPURLResponse)?.statusCode ?? 0
        let failed = error != nil
        let c = center
        Task { @MainActor [weak c] in c?.completed(id, status: status, failed: failed) }
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        let c = center
        Task { @MainActor [weak c] in c?.finishedBackgroundEvents() }
    }
}
