import AVKit
import Photos
import SwiftUI

/// Watch one video and decide. After approval: save, share, copy the post text,
/// tick "posted".
struct VideoDetailView: View {
    let itemID: String
    @Environment(AppModel.self) private var model
    @State private var player: AVPlayer?
    @State private var showReject = false
    @State private var note = ""
    @State private var working: String?
    @State private var toast: String?
    @State private var shareFile: ShareFile?
    @State private var saved = false

    private var item: VideoItem? { model.item(itemID) }

    var body: some View {
        ScrollView {
            if let item {
                VStack(alignment: .leading, spacing: 18) {
                    video(item)
                    Text(item.title)
                        .font(.title3.bold())
                        .foregroundStyle(Color.dvInk)
                    StageChip(item: item)
                    actions(item)
                    if !item.postText.isEmpty { postText(item) }
                    EducationNote()
                }
                .padding(18)
            }
        }
        .background(Color.dvPaper.ignoresSafeArea())
        .navigationTitle(item.map { WeekLabel.title($0.weekOf) } ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar(.hidden, for: .tabBar)
        .onAppear {
            if player == nil, let url = item?.videoURL { player = AVPlayer(url: url) }
        }
        .onDisappear { player?.pause() }
        .sheet(isPresented: $showReject) { rejectSheet }
        .sheet(item: $shareFile) { file in ActivityView(items: [file.url]) }
        .overlay(alignment: .bottom) {
            if let toast {
                Text(toast)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 16).padding(.vertical, 10)
                    .background(Color.dvInk.opacity(0.92), in: .capsule)
                    .padding(.bottom, 20)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .accessibilityIdentifier("toast")
            }
        }
        .animation(.easeInOut, value: toast)
    }

    @ViewBuilder
    private func video(_ item: VideoItem) -> some View {
        Group {
            if let player {
                VideoPlayer(player: player)
            } else {
                ZStack { Color.dvSand; VStack(spacing: 8) { ProgressView(); Text("This video is still being made.").font(.footnote).foregroundStyle(Color.dvMuted) } }
            }
        }
        .aspectRatio(9 / 16, contentMode: .fit)
        .frame(maxWidth: .infinity, maxHeight: 470)
        .clipShape(.rect(cornerRadius: 18))
        .accessibilityIdentifier("video-player")
    }

    @ViewBuilder
    private func actions(_ item: VideoItem) -> some View {
        switch item.stage {
        case .needsReview:
            VStack(spacing: 10) {
                Button("Approve") { Task { await model.decide(item.id, .approved); flash(String(localized: "Approved")) } }
                    .buttonStyle(PrimaryButtonStyle())
                    .accessibilityIdentifier("approve")
                Button("Don't use this one") { note = ""; showReject = true }
                    .buttonStyle(SecondaryButtonStyle())
                    .accessibilityIdentifier("reject")
            }
        case .approved:
            VStack(spacing: 10) {
                HStack(spacing: 10) {
                    Button { Task { await saveToPhotos(item) } } label: {
                        Label(working == "save" ? String(localized: "Saving…") : saved ? String(localized: "Saved to Photos") : String(localized: "Save to Photos"),
                              systemImage: saved ? "checkmark" : "square.and.arrow.down")
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .disabled(working != nil)
                    .accessibilityIdentifier("save")
                    Button { Task { await share(item) } } label: {
                        Label(working == "share" ? String(localized: "Preparing…") : String(localized: "Share"), systemImage: "square.and.arrow.up")
                    }
                    .buttonStyle(SecondaryButtonStyle())
                    .disabled(working != nil)
                    .accessibilityIdentifier("share")
                }
                Toggle(isOn: Binding(get: { item.postedAt != nil }, set: { v in Task { await model.setPosted(item.id, v) } })) {
                    Text("I've posted this").font(.subheadline.weight(.semibold)).foregroundStyle(Color.dvInk)
                }
                .tint(.dvTeal)
                .padding(.horizontal, 4)
                .accessibilityIdentifier("posted-toggle")
                Button("Undo approval") { Task { await model.decide(item.id, .pending) } }
                    .font(.footnote)
                    .foregroundStyle(Color.dvMuted)
            }
        case .changesRequested:
            VStack(alignment: .leading, spacing: 10) {
                if let note = item.approvalNote, !note.isEmpty {
                    Text("Your note: \(note)").font(.subheadline).foregroundStyle(Color.dvBody)
                }
                Text("This video won't be used. Changed your mind?")
                    .font(.subheadline).foregroundStyle(Color.dvBody)
                Button("Approve it after all") { Task { await model.decide(item.id, .approved) } }
                    .buttonStyle(SecondaryButtonStyle())
            }
        case .making, .unavailable:
            EmptyView()
        }
    }

    private func postText(_ item: VideoItem) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Caption and hashtags").font(.headline).foregroundStyle(Color.dvInk)
                Spacer()
                Button {
                    UIPasteboard.general.string = item.postText
                    flash(String(localized: "Copied"))
                } label: { Label("Copy", systemImage: "doc.on.doc").font(.subheadline.weight(.semibold)) }
                .accessibilityIdentifier("copy-caption")
            }
            Text(item.postText)
                .font(.subheadline)
                .foregroundStyle(Color.dvBody)
                .textSelection(.enabled)
        }
        .padding(16)
        .background(Color.white, in: .rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.dvLine))
    }

    private var rejectSheet: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("What should change? (optional)", text: $note, axis: .vertical)
                        .lineLimit(3...6)
                } footer: {
                    Text("The video stays unused. Your note helps DentVideo choose better topics for your clinic.")
                }
            }
            .navigationTitle("Don't use this video")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { showReject = false } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Confirm") {
                        showReject = false
                        Task { await model.decide(itemID, .rejected, note: note.trimmingCharacters(in: .whitespacesAndNewlines)) }
                    }
                    .accessibilityIdentifier("confirm-reject")
                }
            }
        }
        .presentationDetents([.medium])
    }

    private func flash(_ text: String) {
        toast = text
        Task { try? await Task.sleep(for: .seconds(1.8)); if toast == text { toast = nil } }
    }

    private func saveToPhotos(_ item: VideoItem) async {
        guard let url = item.videoURL else { return }
        working = "save"
        defer { working = nil }
        do {
            let file = try await VideoFiles.local(url, name: item.id)
            let status = await PHPhotoLibrary.requestAuthorization(for: .addOnly)
            guard status == .authorized || status == .limited else {
                flash(String(localized: "Allow DentVideo to add to Photos in Settings."))
                return
            }
            try await PHPhotoLibrary.shared().performChanges {
                PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: file)
            }
            saved = true
            flash(String(localized: "Saved to Photos"))
        } catch {
            flash(String(localized: "Couldn't save the video. Please try again."))
        }
    }

    private func share(_ item: VideoItem) async {
        guard let url = item.videoURL else { return }
        working = "share"
        defer { working = nil }
        do {
            UIPasteboard.general.string = item.postText
            shareFile = ShareFile(url: try await VideoFiles.local(url, name: item.id))
        } catch {
            flash(String(localized: "Couldn't prepare the video. Please try again."))
        }
    }
}

struct ShareFile: Identifiable { let url: URL; var id: URL { url } }

/// Downloads a video once into Caches, under a readable file name.
enum VideoFiles {
    static func local(_ remote: URL, name: String) async throws -> URL {
        let dir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("videos", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let safe = name.replacingOccurrences(of: "[^A-Za-z0-9_-]", with: "-", options: .regularExpression)
        let dest = dir.appendingPathComponent("DentVideo-\(safe).mp4")
        if FileManager.default.fileExists(atPath: dest.path) { return dest }
        let (tmp, resp) = try await URLSession.shared.download(from: remote)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else { throw BackendError.generic }
        try? FileManager.default.removeItem(at: dest)
        try FileManager.default.moveItem(at: tmp, to: dest)
        return dest
    }
}

struct ActivityView: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ vc: UIActivityViewController, context: Context) {}
}
