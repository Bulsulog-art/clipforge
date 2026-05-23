import SwiftUI
import PhotosUI
import AVFoundation

/// Pick a video from the photo library and kick off a background upload.
/// Uses UploadService so backgrounding the app doesn't kill the transfer.
@MainActor
struct UploadVideoSheet: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var credits = CreditsService.shared
    @StateObject private var uploader = UploadService.shared

    @State private var pickerItem: PhotosPickerItem?
    @State private var stagedURL: URL?
    @State private var stagedDurationSec: Double?
    @State private var stagedSizeMB: Double?
    @State private var niche = "motivation"
    @State private var thumbnailStyle: String =
        UserDefaults.standard.string(forKey: "clipforge.thumbnailStyle") ?? "mrbeast"
    @State private var preparing = false
    @State private var showPaywall = false
    @State private var error: String?

    private let niches = ["motivation", "business", "finance", "health", "tech",
                          "education", "comedy", "fitness", "spirituality"]
    let onSubmitted: () -> Void

    /// Free tier source cap (worker also enforces this, but we surface it early)
    private var maxSeconds: Double { credits.hasPlus ? 5400 : 300 }
    private var maxMB: Double { credits.hasPlus ? 4096 : 500 }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack {
                        Image(systemName: "creditcard.circle.fill").foregroundStyle(.brand)
                        Text("Balance"); Spacer()
                        Text("\(credits.balance) credits").foregroundStyle(.secondary)
                    }
                }

                Section {
                    PhotosPicker(
                        selection: $pickerItem,
                        matching: .videos,
                        photoLibrary: .shared()
                    ) {
                        Label(stagedURL == nil ? "Pick a video" : "Replace video",
                              systemImage: "video.fill")
                    }
                    .onChange(of: pickerItem) { _, newItem in
                        if let newItem { Task { await stage(item: newItem) } }
                    }
                    if let stagedURL {
                        stagedDetails(stagedURL: stagedURL)
                    }
                } header: {
                    Text("Video")
                } footer: {
                    Text(credits.hasPlus
                         ? "Plus: up to 90 min / 4 GB per upload."
                         : "Free: up to 5 min / 500 MB. Upgrade to Plus for hour-long sources.")
                        .font(.caption2)
                }

                Section("Niche") {
                    Picker("Niche", selection: $niche) {
                        ForEach(niches, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                }

                if uploader.inFlight {
                    Section("Uploading") {
                        VStack(alignment: .leading, spacing: 6) {
                            ProgressView(value: uploader.progress)
                                .tint(.brand)
                            Text("\(Int(uploader.progress * 100))% — keeps going if you background the app.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                Section("Thumbnail style") {
                    Picker("Style", selection: $thumbnailStyle) {
                        Text("Punchy").tag("mrbeast")
                        Text("Cinematic").tag("cinematic")
                        Text("Minimal").tag("minimal")
                    }
                    .pickerStyle(.segmented)
                    .onChange(of: thumbnailStyle) { _, newValue in
                        UserDefaults.standard.set(newValue, forKey: "clipforge.thumbnailStyle")
                    }
                }

                if let error {
                    Section { Text(error).foregroundStyle(.red).font(.callout) }
                }

                Section {
                    Button {
                        Task { await submit() }
                    } label: {
                        HStack {
                            if preparing || uploader.inFlight { ProgressView() }
                            Text(submitLabel).fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .tint(.brand)
                    .disabled(!canSubmit)
                }
            }
            .navigationTitle("Upload video")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .sheet(isPresented: $showPaywall) { CreditsPaywallView() }
            .task { await credits.refresh() }
            .onChange(of: uploader.lastJobId) { _, newId in
                if let id = newId, !id.isEmpty {
                    // Light up the Live Activity now that the server has
                    // accepted the upload and minted a jobId — JobProgressService
                    // will push status updates from there.
                    RenderActivityKit.start(
                        jobId: id,
                        title: "\(niche.capitalized) clip set",
                        expectedClips: 12
                    )
                    onSubmitted()
                    dismiss()
                }
            }
            .onChange(of: uploader.lastError) { _, newErr in
                if let newErr { error = newErr }
            }
        }
    }

    @ViewBuilder
    private func stagedDetails(stagedURL: URL) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(stagedURL.lastPathComponent)
                .font(.callout)
                .lineLimit(1)
            HStack(spacing: 8) {
                if let s = stagedDurationSec {
                    let okDuration = durationOK(s)
                    Label(formatDuration(s), systemImage: "clock")
                        .foregroundStyle(okDuration ? Color.secondary : Color.orange)
                }
                if let mb = stagedSizeMB {
                    let okSize = sizeOK(mb)
                    Label(String(format: "%.1f MB", mb), systemImage: "doc.fill")
                        .foregroundStyle(okSize ? Color.secondary : Color.orange)
                }
            }
            .font(.caption2)
        }
    }

    private var submitLabel: String {
        if uploader.inFlight { return "Uploading…" }
        if preparing { return "Preparing…" }
        if credits.balance < 1 { return "Get credits — Plus" }
        return "Start render · 1 credit"
    }

    private var canSubmit: Bool {
        stagedURL != nil
            && !preparing
            && !uploader.inFlight
            && stagedDurationOk
            && stagedSizeOk
    }

    private var stagedDurationOk: Bool {
        guard let s = stagedDurationSec else { return false }
        return durationOK(s)
    }
    private var stagedSizeOk: Bool {
        guard let m = stagedSizeMB else { return false }
        return sizeOK(m)
    }
    private func durationOK(_ s: Double) -> Bool { s <= maxSeconds }
    private func sizeOK(_ mb: Double) -> Bool { mb <= maxMB }
    private func formatDuration(_ s: Double) -> String {
        let m = Int(s) / 60, sec = Int(s) % 60
        return String(format: "%d:%02d", m, sec)
    }

    private func stage(item: PhotosPickerItem) async {
        preparing = true; error = nil
        defer { preparing = false }
        do {
            guard let data = try await item.loadTransferable(type: Data.self) else {
                throw NSError(domain: "Upload", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not read video"])
            }
            // Persist to tmp so background URLSession can stream from disk.
            let ext = (item.supportedContentTypes.first?.preferredFilenameExtension ?? "mp4")
            let dir = FileManager.default.temporaryDirectory
                .appendingPathComponent("clipforge-staged-\(UUID().uuidString)", isDirectory: true)
            try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
            let dest = dir.appendingPathComponent("source.\(ext)")
            try data.write(to: dest)
            stagedURL = dest
            stagedSizeMB = Double(data.count) / (1024 * 1024)
            // Probe duration via AVAsset
            let asset = AVURLAsset(url: dest)
            let dur = try? await asset.load(.duration)
            stagedDurationSec = dur.map { CMTimeGetSeconds($0) }
        } catch {
            self.error = error.localizedDescription
            Telemetry.capture(error, context: ["op": "stage_upload"])
        }
    }

    private func submit() async {
        guard let url = stagedURL else { return }
        if credits.balance < 1 { showPaywall = true; return }
        await Haptics.impact(.medium)
        do {
            try await uploader.upload(fileURL: url, niche: niche, thumbnailStyle: thumbnailStyle)
            DailyPickService.rememberNiche(niche)
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }
}
