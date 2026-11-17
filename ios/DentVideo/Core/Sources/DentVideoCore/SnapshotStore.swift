import Foundation

/// The last /me and /items answers on disk, so the app opens with this week's videos offline.
/// Signed URLs in it expire after an hour; the cached files (VideoCache in the app) do not.
public struct Snapshot: Codable, Sendable, Equatable {
    public var me: Me
    public var items: ItemsResponse
    public var savedAt: Date
    public init(me: Me, items: ItemsResponse, savedAt: Date) {
        self.me = me
        self.items = items
        self.savedAt = savedAt
    }
}

public struct SnapshotStore: Sendable {
    public let url: URL
    public init(url: URL) { self.url = url }

    public func load(for userID: String) -> Snapshot? {
        guard let data = try? Data(contentsOf: url), let s = try? JSONDecoder().decode(Snapshot.self, from: data) else { return nil }
        // Another account's snapshot is never shown.
        return s.me.user.id == userID ? s : nil
    }

    public func save(_ s: Snapshot) {
        guard let data = try? JSONEncoder().encode(s) else { return }
        try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        #if canImport(Darwin)
        try? data.write(to: url, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
        #else
        try? data.write(to: url, options: [.atomic])
        #endif
    }

    public func clear() { try? FileManager.default.removeItem(at: url) }
}
