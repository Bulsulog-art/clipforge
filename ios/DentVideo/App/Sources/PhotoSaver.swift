import Foundation
import Photos

/// Saves a video to Photos (add-only permission: the app never reads the library) and answers
/// the new asset's identifier, which Instagram's library link can open.
enum PhotoSaver {
    enum Failure: Error { case denied, failed }

    static func saveVideo(at url: URL) async throws -> String? {
        let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
        guard status == .authorized || status == .limited else { throw Failure.denied }
        let box = IdentifierBox()
        do {
            try await PHPhotoLibrary.shared().performChanges {
                let req = PHAssetCreationRequest.forAsset()
                req.addResource(with: .video, fileURL: url, options: nil)
                box.value = req.placeholderForCreatedAsset?.localIdentifier
            }
        } catch {
            throw Failure.failed
        }
        return box.value
    }

    private final class IdentifierBox: @unchecked Sendable { var value: String? }
}
