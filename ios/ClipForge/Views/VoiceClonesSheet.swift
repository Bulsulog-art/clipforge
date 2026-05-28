import SwiftUI
import AVFoundation

/// Plus-tier voice cloning. Record a ≤60s sample in-app, server forwards
/// to ElevenLabs, the resulting voice id is persisted on the user's
/// account and surfaces in the AvatarStudio voice picker.
///
/// Recording is in-app (AVAudioRecorder → .m4a) so the user doesn't
/// have to bounce out to Voice Memos and re-import. We cap at 60s
/// because ElevenLabs's "professional voice" clone quality plateaus
/// past that mark and longer samples just inflate the upload.
@MainActor
struct VoiceClonesSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared

    @State private var clones: [ClipForgeAPI.VoiceClone] = []
    @State private var loading = true
    @State private var error: String?

    @State private var cloneName: String = ""
    @State private var recorder: VoiceRecorder = VoiceRecorder()
    @State private var uploading = false
    @State private var cloneToDelete: ClipForgeAPI.VoiceClone?

    private let maxDuration: TimeInterval = 60

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    headerCard
                    if !credits.hasPlus {
                        nonPlusCard
                    } else {
                        if !clones.isEmpty {
                            existingClonesSection
                        }
                        recorderCard
                        if let err = error { errorCard(err) }
                    }
                    footnote
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Voice clones")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { await loadClones() }
            .alert(
                "Delete clone?",
                isPresented: Binding(
                    get: { cloneToDelete != nil },
                    set: { if !$0 { cloneToDelete = nil } }
                )
            ) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    if let c = cloneToDelete {
                        Task { await deleteClone(c); cloneToDelete = nil }
                    }
                }
            } message: {
                Text("Removes the clone from ElevenLabs and your account. Renders that already used it stay intact.")
            }
        }
    }

    // MARK: - Sections

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Your voice on every avatar", systemImage: "waveform.badge.mic")
                .font(.caption.weight(.bold))
                .foregroundStyle(.brand)
            Text("Record a clean 30–60s sample in a quiet room. We forward it to ElevenLabs; your cloned voice then shows up as a picker option in AvatarStudio.")
                .font(.callout)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var nonPlusCard: some View {
        VStack(spacing: 14) {
            Image(systemName: "lock.fill")
                .font(.system(size: 36))
                .foregroundStyle(.brand)
            Text("Plus feature").font(.headline)
            Text("Voice cloning is included with any Plus subscription.")
                .font(.callout).foregroundStyle(.secondary)
                .multilineTextAlignment(.center).padding(.horizontal)
        }
        .frame(maxWidth: .infinity).padding(.vertical, 26)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 16))
    }

    private var existingClonesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Your clones").font(.caption.weight(.bold)).foregroundStyle(.secondary).tracking(0.8)
            ForEach(clones) { c in
                HStack(spacing: 10) {
                    Image(systemName: c.status == "ready" ? "waveform" : "waveform.path.badge.minus")
                        .foregroundStyle(c.status == "ready" ? .green : .orange)
                    VStack(alignment: .leading, spacing: 1) {
                        Text(c.name).font(.callout.weight(.semibold))
                        Text(c.status.capitalized).font(.caption2).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button(role: .destructive) {
                        cloneToDelete = c
                    } label: {
                        Image(systemName: "trash")
                            .padding(8)
                            .foregroundStyle(.red)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Delete clone")
                }
                .padding(12)
                .background(Color.cardBackground)
                .clipShape(.rect(cornerRadius: 12))
            }
        }
    }

    private var recorderCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Record a new clone")
                .font(.callout.weight(.semibold))
            TextField("Name (e.g. 'My voice')", text: $cloneName)
                .textInputAutocapitalization(.words)
                .padding(.horizontal, 12).padding(.vertical, 10)
                .background(Color.cardBackground)
                .clipShape(.rect(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.white.opacity(0.08), lineWidth: 1)
                )

            HStack(spacing: 14) {
                Button {
                    Task { await toggleRecord() }
                } label: {
                    ZStack {
                        Circle()
                            .fill(recorder.isRecording ? Color.red : Color.brand)
                            .frame(width: 64, height: 64)
                            .shadow(color: (recorder.isRecording ? Color.red : Color.brand).opacity(0.5), radius: 12)
                        Image(systemName: recorder.isRecording ? "stop.fill" : "mic.fill")
                            .font(.title2.weight(.bold))
                            .foregroundStyle(.white)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(recorder.isRecording ? "Stop recording" : "Start recording")

                VStack(alignment: .leading, spacing: 4) {
                    Text(timeLabel)
                        .font(.title3.monospacedDigit().weight(.semibold))
                    Text(statusLine)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Spacer()
                if recorder.lastRecording != nil && !recorder.isRecording {
                    Button {
                        Task { await upload() }
                    } label: {
                        HStack {
                            if uploading { ProgressView().tint(.white) }
                            Text(uploading ? "Uploading…" : "Save")
                                .fontWeight(.semibold)
                        }
                        .padding(.horizontal, 14).padding(.vertical, 10)
                        .background(canUpload ? Color.brand : Color.gray.opacity(0.5))
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                    }
                    .buttonStyle(.plain)
                    .disabled(!canUpload)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground.opacity(0.55))
        .clipShape(.rect(cornerRadius: 14))
    }

    private func errorCard(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill").foregroundStyle(.red)
            Text(message).font(.callout).foregroundStyle(.red)
            Spacer(minLength: 4)
        }
        .padding(12).background(Color.red.opacity(0.12)).clipShape(.rect(cornerRadius: 12))
    }

    private var footnote: some View {
        Text("Up to 60s, mono audio, quiet background. Once uploaded, the clone appears in AvatarStudio's voice picker on your next render.")
            .font(.caption2)
            .foregroundStyle(.tertiary)
    }

    // MARK: - Behaviour

    private var timeLabel: String {
        let s = Int(recorder.elapsed)
        return String(format: "%01d:%02d / 1:00", s / 60, s % 60)
    }

    private var statusLine: String {
        if recorder.isRecording { return "Recording…" }
        if recorder.lastRecording != nil { return "Sample ready · tap Save" }
        return "Tap the mic to start"
    }

    private var canUpload: Bool {
        !uploading
            && !cloneName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && recorder.lastRecording != nil
    }

    private func toggleRecord() async {
        error = nil
        if recorder.isRecording {
            recorder.stop()
            await Haptics.notify(.success)
            return
        }
        do {
            try await recorder.start(maxDuration: maxDuration)
            await Haptics.impact(.medium)
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func upload() async {
        guard let url = recorder.lastRecording else { return }
        uploading = true
        error = nil
        defer { uploading = false }
        do {
            let data = try Data(contentsOf: url)
            let clone = try await ClipForgeAPI.shared.uploadVoiceClone(
                name: cloneName.trimmingCharacters(in: .whitespacesAndNewlines),
                audioData: data,
                mimeType: "audio/m4a"
            )
            clones.insert(clone, at: 0)
            cloneName = ""
            recorder.reset()
            await Haptics.notify(.success)
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func loadClones() async {
        loading = true
        defer { loading = false }
        do {
            clones = try await ClipForgeAPI.shared.fetchVoiceClones()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func deleteClone(_ c: ClipForgeAPI.VoiceClone) async {
        do {
            try await ClipForgeAPI.shared.deleteVoiceClone(id: c.id)
            clones.removeAll { $0.id == c.id }
            await Haptics.notify(.success)
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }
}

/// AVAudioRecorder wrapper. State is @Published so the view's progress
/// label and button affordance update live. Single recording held at a
/// time — we keep the file URL until the user either uploads or
/// re-records, then clean it up.
@MainActor
final class VoiceRecorder: ObservableObject {
    @Published private(set) var isRecording: Bool = false
    @Published private(set) var elapsed: TimeInterval = 0
    @Published private(set) var lastRecording: URL?

    private var avRecorder: AVAudioRecorder?
    private var timer: Timer?

    /// Begin recording to a temp .m4a file. Throws if mic permission was
    /// denied or AVAudioSession setup fails.
    func start(maxDuration: TimeInterval) async throws {
        // Permission
        let granted = await AVAudioApplication.requestRecordPermission()
        guard granted else {
            throw NSError(
                domain: "VoiceRecorder",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Microphone access denied. Enable it in Settings → ClipForge."]
            )
        }
        // Session
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
        try session.setActive(true)

        // File
        if let prev = lastRecording {
            try? FileManager.default.removeItem(at: prev)
        }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("clipforge-voice-\(UUID().uuidString).m4a")
        let settings: [String: Any] = [
            AVFormatIDKey:             Int(kAudioFormatMPEG4AAC),
            AVSampleRateKey:           44_100.0,
            AVNumberOfChannelsKey:     1,                      // mono
            AVEncoderAudioQualityKey:  AVAudioQuality.high.rawValue,
        ]
        let rec = try AVAudioRecorder(url: url, settings: settings)
        rec.prepareToRecord()
        rec.record(forDuration: maxDuration)
        avRecorder = rec
        lastRecording = nil      // will be set on stop()
        elapsed = 0
        isRecording = true

        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self, let r = self.avRecorder else { return }
                if r.isRecording {
                    self.elapsed = r.currentTime
                } else {
                    // OS stopped us at maxDuration — finalise.
                    self.finishCurrent(url: url)
                }
            }
        }
    }

    func stop() {
        avRecorder?.stop()
        if let url = avRecorder?.url { finishCurrent(url: url) }
    }

    func reset() {
        if let prev = lastRecording {
            try? FileManager.default.removeItem(at: prev)
        }
        lastRecording = nil
        elapsed = 0
    }

    private func finishCurrent(url: URL) {
        timer?.invalidate()
        timer = nil
        isRecording = false
        lastRecording = url
        avRecorder = nil
        // Deactivate the audio session so the mic indicator turns off
        // and any other audio app (music, podcasts) can resume. The
        // `notifyOthersOnDeactivation` flag tells iOS to send a
        // resume notification to whoever was interrupted.
        try? AVAudioSession.sharedInstance().setActive(
            false,
            options: [.notifyOthersOnDeactivation],
        )
    }
}
