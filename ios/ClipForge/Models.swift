import Foundation

struct VideoJob: Identifiable, Codable, Hashable {
    let id: String
    let title: String?
    let niche: String?
    let status: String
    let progress: Int
    let durationSeconds: Int?
    let createdAt: String
    enum CodingKeys: String, CodingKey {
        case id, title, niche, status, progress
        case durationSeconds = "duration_seconds"
        case createdAt = "created_at"
    }
}

struct Clip: Identifiable, Codable, Hashable {
    let id: String
    let jobId: String?
    let hook: String?
    let caption: String?
    let hashtags: [String]?
    let storagePath: String?
    let thumbnailPath: String?
    let viralScore: Double?
    let durationSeconds: Double?
    let sourceKind: String?
    let status: String?
    /// Per-user "starred" flag. Default false; decoded as false if the
    /// server hasn't backfilled the column on older clips (decoder uses
    /// `decodeIfPresent` via Bool?? trick on the Codable side).
    let isFavorite: Bool?
    enum CodingKeys: String, CodingKey {
        case id, hook, caption, hashtags, status
        case jobId = "job_id"
        case storagePath = "storage_path"
        case thumbnailPath = "thumbnail_path"
        case viralScore = "viral_score"
        case durationSeconds = "duration_seconds"
        case sourceKind = "source_kind"
        case isFavorite = "is_favorite"
    }
}
