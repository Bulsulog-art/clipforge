import Foundation
import DentVideoCore

/// The clinic's own requests (web/src/components/dentvid/clinic-requests.tsx): "Ask for a change" on
/// a video and its subtitle file. Topic suggestions live in their sheet (Views/RequestViews.swift).
extension AppModel {
    /// Sends the note; on success the video shows "Change requested" at once and a notice says how
    /// many are left this week. Answers nil on success, else the sentence to show under the note.
    func requestChange(_ item: VideoItem, note: String) async -> String? {
        do {
            let sent = try await api.requestChange(itemID: item.id, note: note)
            if let i = items.firstIndex(where: { $0.id == item.id }) {
                items[i].change = sent.change ?? ChangeView(status: .queued, at: ISO8601DateFormatter().string(from: Date()))
            }
            saveSnapshot()
            notice = Notice(text: L("change.sentNotice", sent.left, RequestRules.changesPerWeek), isError: false)
            return nil
        } catch {
            if case APIError.unauthorized? = error as? APIError { handle(error); return nil }
            if case let APIError.refused(_, message)? = error as? APIError, let message { return message }
            if case APIError.refused? = error as? APIError { return L("change.error.unavailable") }
            return message(for: error)
        }
    }

    /// The video's subtitle file, saved under the web's file name in a temporary folder, ready for
    /// the share sheet.
    func subtitlesFile(for item: VideoItem) async throws -> URL {
        let data = try await api.subtitles(itemID: item.id)
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("subtitles", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let url = dir.appendingPathComponent(RequestRules.subtitleFileName(item.title))
        try data.write(to: url, options: .atomic)
        return url
    }

    /// The clinic's look changed in the logo preview: keep the account in step without a reload.
    func applyLook(brandColor: String?, logoUrl: URL?) {
        if let brandColor { me?.clinic?.profile.brandColor = brandColor }
        if let logoUrl { me?.clinic?.logoUrl = logoUrl }
    }
}
