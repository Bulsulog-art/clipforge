@preconcurrency import AVFoundation
import Observation
import SwiftUI
import UIKit

/// The capture session lives on its own queue; the model the views read is on the main actor.
@MainActor
@Observable
final class CameraModel {
    enum Access { case unknown, granted, denied }
    var access: Access = .unknown
    var isRecording = false
    var elapsed: TimeInterval = 0
    var front = true
    /// The finished take, in the temporary folder until the dentist keeps it.
    var take: URL?
    var failed = false
    #if DEBUG
    /// Demo screenshots: no capture session, a stand-in picture.
    var demo = false
    #endif

    @ObservationIgnored let engine = CameraEngine()
    @ObservationIgnored private var timer: Timer?
    @ObservationIgnored private var startedAt: Date?

    func prepare() async {
        let video = await AVCaptureDevice.requestAccess(for: .video)
        let audio = await AVCaptureDevice.requestAccess(for: .audio)
        guard video && audio else {
            access = .denied
            return
        }
        access = .granted
        let ok = await engine.configure(front: front)
        failed = !ok
        if ok { engine.start() }
    }

    func flip() {
        guard !isRecording else { return }
        front.toggle()
        let f = front
        Task { failed = !(await engine.configure(front: f)) }
    }

    func toggleRecording() {
        if isRecording { engine.stop(); return }
        take = nil
        let url = FileManager.default.temporaryDirectory.appendingPathComponent("take-\(UUID().uuidString).mov")
        let orientation = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first?.interfaceOrientation ?? .portrait
        engine.record(to: url, angle: CameraPreview.angle(for: orientation)) { [weak self] result in
            Task { @MainActor in self?.finished(result) }
        }
        isRecording = true
        startedAt = Date()
        elapsed = 0
        timer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let s = self.startedAt else { return }
                self.elapsed = Date().timeIntervalSince(s)
            }
        }
    }

    private func finished(_ result: URL?) {
        timer?.invalidate()
        timer = nil
        isRecording = false
        take = result
        failed = result == nil
    }

    func discardTake() {
        if let take { try? FileManager.default.removeItem(at: take) }
        take = nil
    }

    func shutdown() {
        if isRecording { engine.stop() }
        engine.stopSession()
    }
}

/// AVCaptureSession and a movie file output. Every call runs on the engine's serial queue.
final class CameraEngine: NSObject, AVCaptureFileOutputRecordingDelegate, @unchecked Sendable {
    let session = AVCaptureSession()
    private let output = AVCaptureMovieFileOutput()
    private let queue = DispatchQueue(label: "com.bulsulabs.dentvideo.camera")
    private var videoInput: AVCaptureDeviceInput?
    private var audioInput: AVCaptureDeviceInput?
    private var completion: ((URL?) -> Void)?

    /// Under the web's 500 MB upload limit with room to spare; ten minutes is far longer than a card.
    static let maxBytes: Int64 = 480 * 1024 * 1024
    static let maxSeconds: Double = 600

    func configure(front: Bool) async -> Bool {
        await withCheckedContinuation { c in
            queue.async {
                c.resume(returning: self.configureOnQueue(front: front))
            }
        }
    }

    private func configureOnQueue(front: Bool) -> Bool {
        session.beginConfiguration()
        defer { session.commitConfiguration() }
        session.sessionPreset = .high
        if let v = videoInput { session.removeInput(v) }
        guard let cam = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: front ? .front : .back),
              let input = try? AVCaptureDeviceInput(device: cam), session.canAddInput(input) else { return false }
        session.addInput(input)
        videoInput = input
        if audioInput == nil, let mic = AVCaptureDevice.default(for: .audio), let a = try? AVCaptureDeviceInput(device: mic), session.canAddInput(a) {
            session.addInput(a)
            audioInput = a
        }
        if !session.outputs.contains(output) {
            guard session.canAddOutput(output) else { return false }
            session.addOutput(output)
        }
        output.maxRecordedFileSize = Self.maxBytes
        output.maxRecordedDuration = CMTime(seconds: Self.maxSeconds, preferredTimescale: 600)
        if let conn = output.connection(with: .video) {
            // Portrait, as Reels and TikTok expect.
            if conn.isVideoRotationAngleSupported(90) { conn.videoRotationAngle = 90 }
            if conn.isVideoStabilizationSupported { conn.preferredVideoStabilizationMode = .auto }
        }
        return true
    }

    func start() { queue.async { if !self.session.isRunning { self.session.startRunning() } } }
    func stopSession() { queue.async { if self.session.isRunning { self.session.stopRunning() } } }

    /// `angle`: the interface's rotation, so the file is upright the way the screen showed it
    /// (portrait on iPhone; an iPad held sideways records sideways).
    func record(to url: URL, angle: CGFloat, completion: @escaping @Sendable (URL?) -> Void) {
        queue.async {
            if let conn = self.output.connection(with: .video), conn.isVideoRotationAngleSupported(angle) { conn.videoRotationAngle = angle }
            self.completion = completion
            self.output.startRecording(to: url, recordingDelegate: self)
        }
    }

    func stop() { queue.async { if self.output.isRecording { self.output.stopRecording() } } }

    func fileOutput(_ output: AVCaptureFileOutput, didFinishRecordingTo outputFileURL: URL, from connections: [AVCaptureConnection], error: Error?) {
        // Reaching the size or time limit ends the take with an "error" whose file is still good.
        let finished = (error as NSError?)?.userInfo[AVErrorRecordingSuccessfullyFinishedKey] as? Bool
        let ok = error == nil || finished == true
        queue.async {
            self.completion?(ok ? outputFileURL : nil)
            self.completion = nil
        }
    }
}

/// The live camera image.
struct CameraPreview: UIViewRepresentable {
    let session: AVCaptureSession

    final class PreviewView: UIView {
        override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
        var previewLayer: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }

        /// Keep the image upright when an iPad turns.
        override func layoutSubviews() {
            super.layoutSubviews()
            guard let o = window?.windowScene?.interfaceOrientation, let c = previewLayer.connection else { return }
            let a = CameraPreview.angle(for: o)
            if c.isVideoRotationAngleSupported(a), c.videoRotationAngle != a { c.videoRotationAngle = a }
        }
    }

    /// Capture rotation for an interface orientation (90 = portrait).
    nonisolated static func angle(for o: UIInterfaceOrientation) -> CGFloat {
        switch o {
        case .landscapeRight: return 0
        case .landscapeLeft: return 180
        case .portraitUpsideDown: return 270
        default: return 90
        }
    }

    func makeUIView(context: Context) -> PreviewView {
        let v = PreviewView()
        v.previewLayer.session = session
        v.previewLayer.videoGravity = .resizeAspectFill
        return v
    }

    func updateUIView(_ uiView: PreviewView, context: Context) {}
}
