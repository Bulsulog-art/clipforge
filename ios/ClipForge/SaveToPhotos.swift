import Foundation
import Photos
import UIKit

/// Save a remote video (or local file URL) to the user's Photos library after
/// requesting permission. Used from ClipActionsSheet's "Save to Camera Roll"
/// button so users have a single-tap export path that doesn't go through the
/// system share sheet.
enum SaveToPhotos {

    enum Error: LocalizedError {
        case downloadFailed
        case permissionDenied
        case saveFailed(String)

        var errorDescription: String? {
            switch self {
            case .downloadFailed: return "Couldn't download the clip — try again."
            case .permissionDenied: return "Allow Photos access in Settings to save clips."
            case .saveFailed(let s): return "Save failed: \(s)"
            }
        }
    }

    /// Download from a signed URL (e.g. Supabase storage), then save into the
    /// user's Photos library. Returns once the asset is persisted.
    static func saveVideo(from remoteURL: URL) async throws {
        // 1. Request permission. .addOnly is preferred — we don't need read.
        let status: PHAuthorizationStatus
        if #available(iOS 14, *) {
            status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        } else {
            status = await withCheckedContinuation { c in
                PHPhotoLibrary.requestAuthorization { c.resume(returning: $0) }
            }
        }
        guard status == .authorized || status == .limited else {
            throw Error.permissionDenied
        }

        // 2. Download to a tmp file (Photos library can't ingest in-memory data
        //    for video — only file URLs).
        let (tmpURL, response) = try await URLSession.shared.download(from: remoteURL)
        guard let http = response as? HTTPURLResponse,
              (200..<300).contains(http.statusCode) else {
            throw Error.downloadFailed
        }

        // .mov / .mp4 extension matters for Photos to recognize as video
        let dest = FileManager.default.temporaryDirectory
            .appendingPathComponent("\(UUID().uuidString).mp4")
        try? FileManager.default.removeItem(at: dest)
        try FileManager.default.moveItem(at: tmpURL, to: dest)

        // 3. Save into the library.
        try await withCheckedThrowingContinuation { (c: CheckedContinuation<Void, Swift.Error>) in
            PHPhotoLibrary.shared().performChanges {
                let req = PHAssetCreationRequest.forAsset()
                req.addResource(with: .video, fileURL: dest, options: nil)
            } completionHandler: { ok, err in
                try? FileManager.default.removeItem(at: dest)
                if ok {
                    c.resume()
                } else {
                    c.resume(throwing: Error.saveFailed(err?.localizedDescription ?? "unknown"))
                }
            }
        }
    }
}
