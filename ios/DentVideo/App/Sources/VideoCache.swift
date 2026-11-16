import Foundation

/// Approved videos on the phone, so they play and post offline and the "Post" step never waits
/// for a download. Files live in Caches (iOS may purge them; they come back on the next refresh),
/// keyed by video id, for 21 days, at most 2 GB.
actor VideoCache {
    static let shared = VideoCache()

    private let dir: URL
    private var inFlight: [String: Task<URL, Error>] = [:]
    private let maxBytes: Int64 = 2 * 1024 * 1024 * 1024
    private let maxAge: TimeInterval = 21 * 86_400

    init() {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        dir = caches.appendingPathComponent("videos", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }

    static func fileName(for id: String) -> String {
        let safe = id.filter { $0.isLetter || $0.isNumber || $0 == "-" }
        return "\(safe.isEmpty ? "video" : safe).mp4"
    }

    nonisolated func localURL(for id: String) -> URL? {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        let u = caches.appendingPathComponent("videos", isDirectory: true).appendingPathComponent(Self.fileName(for: id))
        return FileManager.default.fileExists(atPath: u.path) ? u : nil
    }

    /// The local file, downloading it first if needed.
    func file(for id: String, from remote: URL) async throws -> URL {
        if let local = localURL(for: id) { return local }
        if let t = inFlight[id] { return try await t.value }
        let target = dir.appendingPathComponent(Self.fileName(for: id))
        let task = Task<URL, Error> {
            let (tmp, response) = try await URLSession.shared.download(from: remote)
            guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw URLError(.badServerResponse) }
            try? FileManager.default.removeItem(at: target)
            try FileManager.default.moveItem(at: tmp, to: target)
            var values = URLResourceValues()
            values.isExcludedFromBackup = true
            var t = target
            try? t.setResourceValues(values)
            return target
        }
        inFlight[id] = task
        defer { inFlight[id] = nil }
        return try await task.value
    }

    /// Keep the given ids; drop old files and trim to the size limit, oldest first.
    func prune(keeping ids: Set<String>) {
        let keep = Set(ids.map(Self.fileName(for:)))
        let fm = FileManager.default
        guard let files = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: [.contentModificationDateKey, .fileSizeKey]) else { return }
        var entries: [(URL, Date, Int64)] = files.compactMap { u in
            let v = try? u.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
            return (u, v?.contentModificationDate ?? .distantPast, Int64(v?.fileSize ?? 0))
        }
        let now = Date()
        entries.removeAll { (u, date, _) in
            if !keep.contains(u.lastPathComponent) || now.timeIntervalSince(date) > maxAge {
                try? fm.removeItem(at: u)
                return true
            }
            return false
        }
        var total = entries.reduce(Int64(0)) { $0 + $1.2 }
        for (u, _, size) in entries.sorted(by: { $0.1 < $1.1 }) where total > maxBytes {
            try? fm.removeItem(at: u)
            total -= size
        }
    }

    func clearAll() {
        try? FileManager.default.removeItem(at: dir)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    }
}
