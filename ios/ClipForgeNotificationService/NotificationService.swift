import UserNotifications

/// iOS Notification Service Extension. Wakes up when an APNs payload arrives
/// with `mutable-content: 1` set, downloads the URL out of the custom
/// `attachment_url` key, and attaches it to the notification before the OS
/// renders it. Result: the user sees the actual clip thumbnail inline in
/// the alert (and a larger preview on long-press) instead of a plain text
/// notification.
///
/// Apple gives the extension ~30 seconds. We use a 25s timeout for the
/// download so the extension always has time to call the handler cleanly,
/// and we fall through to the unattached content if anything fails.
final class NotificationService: UNNotificationServiceExtension {
    private var contentHandler: ((UNNotificationContent) -> Void)?
    private var bestAttempt: UNMutableNotificationContent?
    private var downloadTask: URLSessionDownloadTask?

    override func didReceive(
        _ request: UNNotificationRequest,
        withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
    ) {
        self.contentHandler = contentHandler
        bestAttempt = request.content.mutableCopy() as? UNMutableNotificationContent

        guard let attempt = bestAttempt,
              let urlString = request.content.userInfo["attachment_url"] as? String,
              let url = URL(string: urlString) else {
            contentHandler(bestAttempt ?? request.content)
            return
        }

        // 25s upper bound — Apple kills the extension at 30s. Use ephemeral
        // session so we don't pollute the app's cookie store.
        let config = URLSessionConfiguration.ephemeral
        config.timeoutIntervalForRequest = 25
        config.timeoutIntervalForResource = 25
        let session = URLSession(configuration: config)

        downloadTask = session.downloadTask(with: url) { [weak self] tempUrl, _, _ in
            guard let self else { return }
            defer { session.invalidateAndCancel() }

            guard let tempUrl = tempUrl else {
                self.deliver(attempt)
                return
            }

            // The OS deletes `tempUrl` once this block returns; we move it
            // into our extension's tmp dir first so the attachment reference
            // stays valid until the notification is presented.
            let fileExt = self.fileExtension(for: url)
            let dest = FileManager.default.temporaryDirectory
                .appendingPathComponent("\(UUID().uuidString).\(fileExt)")
            do {
                try FileManager.default.moveItem(at: tempUrl, to: dest)
                let attachment = try UNNotificationAttachment(
                    identifier: "preview",
                    url: dest,
                    options: [
                        UNNotificationAttachmentOptionsThumbnailHiddenKey: false,
                    ]
                )
                attempt.attachments = [attachment]
            } catch {
                // Silent fallback — alert still ships, just without the image.
            }
            self.deliver(attempt)
        }
        downloadTask?.resume()
    }

    /// Called by iOS just before the extension is killed. We hand back the
    /// best content we have so the user always gets *some* alert.
    override func serviceExtensionTimeWillExpire() {
        downloadTask?.cancel()
        if let contentHandler, let bestAttempt {
            contentHandler(bestAttempt)
        }
    }

    private func deliver(_ content: UNMutableNotificationContent) {
        contentHandler?(content)
        contentHandler = nil
    }

    private func fileExtension(for url: URL) -> String {
        // Supabase signed URLs come back with a `.jpg` path — but other
        // sources might be webp / png. Sniff the URL path first, fall back
        // to jpg which is the most common image type APNs supports.
        let path = url.path.lowercased()
        if path.hasSuffix(".png") { return "png" }
        if path.hasSuffix(".webp") { return "webp" }
        if path.hasSuffix(".gif") { return "gif" }
        return "jpg"
    }
}
