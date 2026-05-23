import Foundation
import UIKit

/// Background-capable video uploader for the `source_type='upload'` job flow.
///
/// Uses `URLSessionConfiguration.background(...)` so the OS continues the
/// upload even if the user backgrounds or kills the app. iOS will re-launch
/// the app in the background to deliver completion / failure events.
@MainActor
final class UploadService: NSObject, ObservableObject {
    static let shared = UploadService()

    @Published var progress: Double = 0
    @Published var inFlight: Bool = false
    @Published var lastError: String?
    @Published var lastJobId: String?

    /// Identifier MUST match across launches so iOS can wake us up.
    private static let sessionId = "com.bulsulabs.clipforge.upload.background"

    private lazy var session: URLSession = {
        let cfg = URLSessionConfiguration.background(withIdentifier: Self.sessionId)
        cfg.isDiscretionary = false
        cfg.sessionSendsLaunchEvents = true
        cfg.allowsCellularAccess = true
        cfg.waitsForConnectivity = true
        cfg.shouldUseExtendedBackgroundIdleMode = true
        return URLSession(configuration: cfg, delegate: self, delegateQueue: nil)
    }()

    /// AppDelegate must call this when iOS hands back completion events for
    /// the background session (see application:handleEventsForBackgroundURLSession).
    var backgroundCompletionHandler: (() -> Void)?

    private override init() { super.init() }

    /// Build multipart body on disk so we don't blow memory on a 4GB upload.
    /// Returns (bodyFileURL, contentType header value).
    private func buildMultipartBody(
        fileURL: URL,
        fileMime: String,
        niche: String,
        language: String,
        thumbnailStyle: String?,
        workDir: URL
    ) throws -> (URL, String) {
        let boundary = "clipforge-\(UUID().uuidString)"
        let body = workDir.appendingPathComponent("upload-body-\(UUID().uuidString).bin")
        FileManager.default.createFile(atPath: body.path, contents: nil)
        let handle = try FileHandle(forWritingTo: body)
        defer { try? handle.close() }

        let crlf = "\r\n".data(using: .utf8)!
        func writeField(_ name: String, value: String) {
            handle.write("--\(boundary)\r\n".data(using: .utf8)!)
            handle.write("Content-Disposition: form-data; name=\"\(name)\"\r\n\r\n".data(using: .utf8)!)
            handle.write(value.data(using: .utf8)!)
            handle.write(crlf)
        }
        writeField("niche", value: niche)
        writeField("language", value: language)
        if let thumbnailStyle, !thumbnailStyle.isEmpty {
            writeField("thumbnailStyle", value: thumbnailStyle)
        }
        // File part
        let fileName = fileURL.lastPathComponent
        handle.write("--\(boundary)\r\n".data(using: .utf8)!)
        handle.write("Content-Disposition: form-data; name=\"file\"; filename=\"\(fileName)\"\r\n".data(using: .utf8)!)
        handle.write("Content-Type: \(fileMime)\r\n\r\n".data(using: .utf8)!)
        // Stream the file in chunks
        let input = try FileHandle(forReadingFrom: fileURL)
        defer { try? input.close() }
        while true {
            let chunk = try input.read(upToCount: 1 << 20) ?? Data() // 1 MB
            if chunk.isEmpty { break }
            handle.write(chunk)
        }
        handle.write(crlf)
        handle.write("--\(boundary)--\r\n".data(using: .utf8)!)
        return (body, "multipart/form-data; boundary=\(boundary)")
    }

    /// Kick off an upload. Resolves the moment the OS accepts the task — the
    /// transfer itself continues in the background and completion arrives via
    /// the delegate.
    func upload(
        fileURL: URL,
        niche: String,
        language: String = "en",
        thumbnailStyle: String? = nil
    ) async throws {
        guard let token = SupabaseService.shared.session?.accessToken else {
            throw APIError.unauthorized
        }
        // Build the multipart payload to a temp file so we don't blow memory.
        let tmp = FileManager.default.temporaryDirectory.appendingPathComponent(
            "clipforge-upload-\(UUID().uuidString)", isDirectory: true
        )
        try FileManager.default.createDirectory(at: tmp, withIntermediateDirectories: true)
        let mime = mimeFor(extension: fileURL.pathExtension)
        let (bodyURL, contentType) = try buildMultipartBody(
            fileURL: fileURL,
            fileMime: mime,
            niche: niche,
            language: language,
            thumbnailStyle: thumbnailStyle,
            workDir: tmp
        )

        var req = URLRequest(url: Secrets.apiBaseURL.appendingPathComponent("/api/jobs/upload"))
        req.httpMethod = "POST"
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.setValue(contentType, forHTTPHeaderField: "Content-Type")

        // backgrounding requires uploadTask(with:fromFile:) (NOT data-bodied requests).
        let task = session.uploadTask(with: req, fromFile: bodyURL)
        task.taskDescription = bodyURL.path  // for cleanup in delegate
        inFlight = true
        progress = 0
        lastError = nil
        lastJobId = nil
        task.resume()
    }

    private func mimeFor(extension ext: String) -> String {
        switch ext.lowercased() {
        case "mp4", "m4v":  return "video/mp4"
        case "mov":         return "video/quicktime"
        case "webm":        return "video/webm"
        case "mkv":         return "video/x-matroska"
        default:            return "application/octet-stream"
        }
    }

    private func handleResponseBody(_ data: Data) {
        struct Resp: Decodable { let jobId: String? }
        if let r = try? JSONDecoder().decode(Resp.self, from: data), let id = r.jobId {
            lastJobId = id
        }
    }
}

extension UploadService: URLSessionTaskDelegate, URLSessionDataDelegate {
    nonisolated func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didSendBodyData bytesSent: Int64,
        totalBytesSent: Int64,
        totalBytesExpectedToSend: Int64
    ) {
        let p = totalBytesExpectedToSend > 0
            ? Double(totalBytesSent) / Double(totalBytesExpectedToSend)
            : 0
        Task { @MainActor in self.progress = p }
    }

    nonisolated func urlSession(
        _ session: URLSession,
        dataTask: URLSessionDataTask,
        didReceive data: Data
    ) {
        Task { @MainActor in self.handleResponseBody(data) }
    }

    nonisolated func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        // Best-effort cleanup of the multipart body we wrote to /tmp.
        if let bodyPath = task.taskDescription {
            try? FileManager.default.removeItem(atPath: bodyPath)
            let parent = (bodyPath as NSString).deletingLastPathComponent
            try? FileManager.default.removeItem(atPath: parent)
        }
        Task { @MainActor in
            self.inFlight = false
            if let error {
                self.lastError = error.localizedDescription
                Telemetry.capture(error, context: ["op": "upload_video"])
            } else if let http = task.response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
                self.lastError = "Server returned \(http.statusCode)"
            }
        }
    }

    nonisolated func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        Task { @MainActor in
            let cb = self.backgroundCompletionHandler
            self.backgroundCompletionHandler = nil
            cb?()
        }
    }
}

enum APIError: Error { case unauthorized }
