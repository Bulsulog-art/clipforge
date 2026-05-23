import SwiftUI

struct JobDetailView: View {
    let job: VideoJob
    @StateObject private var vm = JobDetailViewModel()
    @StateObject private var progress = JobProgressService()
    @State private var actionsForClip: Clip?
    @State private var playerForClip: Clip?
    @State private var fireConfetti = false
    @State private var retrying = false
    @State private var retryError: String?
    @State private var selecting: Bool = false
    @State private var selectedIds: Set<String> = []
    @State private var bulkBusy: Bool = false
    @State private var bulkError: String?
    @State private var bulkSaveCompleted: Int = 0
    @State private var bulkSaveTotal: Int = 0
    @State private var showBulkPublish: Bool = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(job.title ?? "Untitled").font(.title2.bold())
                HStack {
                    Text((job.niche ?? "—").capitalized)
                        .font(.caption.bold())
                        .padding(.horizontal, 8).padding(.vertical, 3)
                        .background(Color.brand.opacity(0.18))
                        .foregroundStyle(.brand)
                        .clipShape(.capsule)
                    Spacer()
                    StatusBadge(status: progress.status)
                }

                if !progress.jobReady && progress.status != "failed" {
                    ProgressCard(
                        status: progress.status,
                        percent: progress.progress,
                        clipsReady: progress.clipsReady
                    )
                }

                if progress.status == "failed", let e = progress.error {
                    ErrorCard(message: e)
                    retryButton
                    if let rerr = retryError {
                        Text(rerr)
                            .font(.caption2)
                            .foregroundStyle(.red)
                    }
                }

                if vm.clips.isEmpty && progress.jobReady {
                    EmptyClipsView()
                } else if vm.loading && vm.clips.isEmpty {
                    LazyVGrid(
                        columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                        spacing: 12
                    ) {
                        ForEach(0..<4, id: \.self) { _ in ClipCellSkeleton() }
                    }
                } else {
                    LazyVGrid(
                        columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)],
                        spacing: 12
                    ) {
                        ForEach(vm.clips) { clip in
                            ClipThumb(
                                clip: clip,
                                isSelecting: selecting,
                                isSelected: selectedIds.contains(clip.id),
                                onTap: {
                                    if selecting {
                                        toggleSelected(clip.id)
                                    } else {
                                        playerForClip = clip
                                    }
                                },
                                onActions: { actionsForClip = clip },
                                onLongPress: {
                                    if !selecting {
                                        selecting = true
                                        selectedIds = [clip.id]
                                        Task { await Haptics.impact(.medium) }
                                    }
                                }
                            )
                        }
                    }
                }
                if let err = bulkError {
                    Text(err)
                        .font(.caption2)
                        .foregroundStyle(.red)
                }
            }
            .padding()
        }
        .onAppear {
            progress.start(jobId: job.id, initialStatus: job.status, initialProgress: job.progress)
        }
        .onDisappear { progress.stop() }
        .onChange(of: progress.jobReady) { _, ready in
            if ready {
                Task {
                    await vm.load(jobId: job.id)
                    await Haptics.notify(.success)
                    fireConfetti = true
                    // Auto-reset so the overlay tears down after the animation
                    try? await Task.sleep(nanoseconds: 1_800_000_000)
                    fireConfetti = false
                }
            }
        }
        .confettiOverlay(trigger: fireConfetti, count: 90, duration: 1.6)
        .task { await vm.load(jobId: job.id) }
        .refreshable { await vm.load(jobId: job.id) }
        .sheet(item: $actionsForClip) { clip in
            ClipActionsSheet(clip: clip)
        }
        .fullScreenCover(item: $playerForClip) { clip in
            ClipPlayerView(clip: clip)
        }
        .sheet(isPresented: $showBulkPublish) {
            BulkPublishSheet(
                clips: vm.clips.filter { selectedIds.contains($0.id) }
            )
        }
        .navigationTitle(selecting ? "\(selectedIds.count) selected" : "Clips")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if selecting {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        selecting = false
                        selectedIds.removeAll()
                    }
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            if selecting && !selectedIds.isEmpty {
                bulkActionBar
            }
        }
    }

    private var bulkActionBar: some View {
        // Scroll horizontally so 4 actions + progress all fit on small
        // devices without truncating labels.
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 14) {
                Button {
                    Task { await bulkSetFavorite(true) }
                } label: {
                    Label("Star", systemImage: "star.fill")
                }
                .disabled(bulkBusy)
                Button {
                    Task { await bulkSetFavorite(false) }
                } label: {
                    Label("Unstar", systemImage: "star.slash")
                }
                .disabled(bulkBusy)
                Button {
                    Task { await bulkSaveToPhotos() }
                } label: {
                    Label(bulkSaveTotal > 0
                          ? "Saved \(bulkSaveCompleted)/\(bulkSaveTotal)"
                          : "Save",
                          systemImage: "square.and.arrow.down")
                }
                .disabled(bulkBusy)
                Button {
                    showBulkPublish = true
                } label: {
                    Label("Publish", systemImage: "paperplane.fill")
                }
                .disabled(bulkBusy)
                if bulkBusy {
                    ProgressView().controlSize(.small).tint(.white)
                }
            }
        }
        .font(.callout.weight(.semibold))
        .foregroundStyle(.white)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            LinearGradient(
                colors: [.brand, .brandGlow],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
        .clipShape(.rect(cornerRadius: 14))
        .padding(12)
    }

    private func toggleSelected(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
            // Auto-exit selection mode when the last selection clears so the
            // user doesn't have to hit Done.
            if selectedIds.isEmpty { selecting = false }
        } else {
            selectedIds.insert(id)
        }
        Task { await Haptics.impact(.light) }
    }

    /// Save every selected ready clip to the user's Photos library
    /// sequentially. Photos permission is requested on the first call;
    /// failures are tallied but don't abort the rest of the batch.
    private func bulkSaveToPhotos() async {
        let targets = vm.clips
            .filter { selectedIds.contains($0.id) && $0.status == "ready" && $0.storagePath != nil }
        if targets.isEmpty { return }
        bulkBusy = true
        bulkError = nil
        bulkSaveCompleted = 0
        bulkSaveTotal = targets.count
        defer { bulkBusy = false }
        var failures: [String] = []
        for clip in targets {
            do {
                let url = try await SignedURLCache.shared.signedURL(
                    path: clip.storagePath!,
                    bucket: "clipforge-videos-rendered"
                )
                try await SaveToPhotos.saveVideo(from: url)
                bulkSaveCompleted += 1
            } catch {
                failures.append(error.localizedDescription)
            }
        }
        if failures.isEmpty {
            await Haptics.notify(.success)
            selecting = false
            selectedIds.removeAll()
        } else {
            bulkError = "Saved \(bulkSaveCompleted) of \(targets.count). \(failures.first ?? "")"
            await Haptics.notify(.warning)
        }
        // Reset the per-button counter after a beat so it doesn't stick
        // around on the bar after success.
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            bulkSaveTotal = 0
            bulkSaveCompleted = 0
        }
    }

    private func bulkSetFavorite(_ favorite: Bool) async {
        guard !selectedIds.isEmpty else { return }
        bulkBusy = true
        bulkError = nil
        defer { bulkBusy = false }
        let ids = Array(selectedIds)
        do {
            try await ClipForgeAPI.shared.bulkFavoriteClips(ids: ids, favorite: favorite)
            await vm.load(jobId: job.id)   // reload to reflect new flags
            await Haptics.notify(.success)
            selecting = false
            selectedIds.removeAll()
        } catch {
            bulkError = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    /// CTA shown under the ErrorCard. Re-queues the job and immediately
    /// kicks off our local progress poll so the UI feels responsive — the
    /// server has already flipped status back to "queued" by the time the
    /// network call returns.
    private var retryButton: some View {
        Button {
            Task { await performRetry() }
        } label: {
            HStack {
                if retrying {
                    ProgressView().tint(.white)
                } else {
                    Image(systemName: "arrow.clockwise")
                }
                Text(retrying ? "Re-queueing…" : "Retry render")
                    .fontWeight(.semibold)
                Spacer()
            }
            .padding()
            .background(Color.brand)
            .foregroundStyle(.white)
            .clipShape(.rect(cornerRadius: 12))
        }
        .buttonStyle(.plain)
        .disabled(retrying)
    }

    private func performRetry() async {
        retrying = true
        retryError = nil
        defer { retrying = false }
        do {
            try await ClipForgeAPI.shared.retryJob(id: job.id)
            await Haptics.notify(.success)
            // Restart progress polling — the server-side row is now
            // status=queued so JobProgressService will tick through stages.
            progress.start(jobId: job.id, initialStatus: "queued", initialProgress: 0)
            // Fire a fresh Live Activity since the previous one was ended on
            // the failure event.
            RenderActivityKit.start(
                jobId: job.id,
                title: job.title ?? "ClipForge render",
                expectedClips: 12
            )
        } catch {
            retryError = error.localizedDescription
            await Haptics.notify(.error)
        }
    }
}

private struct StatusBadge: View {
    let status: String
    var body: some View {
        Text(status.capitalized)
            .font(.caption.bold())
            .padding(.horizontal, 10).padding(.vertical, 4)
            .background(color.opacity(0.18))
            .foregroundStyle(color)
            .clipShape(.capsule)
    }
    private var color: Color {
        switch status {
        case "ready": return .green
        case "failed": return .red
        case "rendering": return .orange
        default: return .brand
        }
    }
}

private struct ProgressCard: View {
    let status: String
    let percent: Int
    let clipsReady: Int
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text(label).fontWeight(.semibold)
                Spacer()
                Text("\(percent)%").foregroundStyle(.brand).font(.callout.bold())
            }
            ProgressView(value: Double(percent) / 100)
                .tint(.brand)
            if clipsReady > 0 {
                Text("\(clipsReady) clip\(clipsReady == 1 ? "" : "s") ready so far")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }
    private var label: String {
        switch status {
        case "queued":       return "Waiting in queue…"
        case "transcribing": return "Transcribing audio with Whisper"
        case "scoring":      return "Finding viral moments"
        case "rendering":    return "Rendering your clips"
        case "ready":        return "Done!"
        default:             return status.capitalized
        }
    }
}

private struct ErrorCard: View {
    let message: String
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Render failed", systemImage: "xmark.octagon.fill")
                .font(.callout.bold())
                .foregroundStyle(.red)
            Text(message).font(.footnote).foregroundStyle(.secondary)
        }
        .padding()
        .background(Color.red.opacity(0.1))
        .clipShape(.rect(cornerRadius: 14))
    }
}

private struct EmptyClipsView: View {
    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: "film")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)
            Text("No clips yet").font(.headline)
            Text("Pull down to refresh.").font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
    }
}

private struct ClipThumb: View {
    let clip: Clip
    /// When true, the thumbnail renders a selection ring + tap toggles the
    /// selection instead of opening the player.
    var isSelecting: Bool = false
    var isSelected: Bool = false
    let onTap: () -> Void
    let onActions: () -> Void
    var onLongPress: () -> Void = {}

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button(action: onTap) {
                ZStack(alignment: .topLeading) {
                    ZStack(alignment: .bottomTrailing) {
                        RoundedRectangle(cornerRadius: 12)
                            .fill(Color.cardBackground)
                            .aspectRatio(9/16, contentMode: .fit)
                            .overlay(
                                Image(systemName: "play.fill")
                                    .font(.system(size: 30))
                                    .foregroundStyle(.white.opacity(0.85))
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(
                                        isSelected ? Color.brand : Color.clear,
                                        lineWidth: 3
                                    )
                            )

                        // Hide the per-clip action icon while in selection
                        // mode so the user can hit the thumb cleanly.
                        if !isSelecting {
                            Button(action: onActions) {
                                Image(systemName: "sparkles")
                                    .padding(8)
                                    .background(Color.brand)
                                    .foregroundStyle(.white)
                                    .clipShape(Circle())
                                    .shadow(color: .brand.opacity(0.5), radius: 8)
                            }
                            .padding(6)
                            .accessibilityLabel("AI tools and publish")
                            .accessibilityHint("Open the AI tools sheet — face swap, translate, save, publish")
                        }
                    }

                    // Selection checkmark overlays the thumb top-left while
                    // in selection mode.
                    if isSelecting {
                        ZStack {
                            Circle()
                                .fill(.black.opacity(0.55))
                                .frame(width: 26, height: 26)
                            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                                .font(.callout.weight(.bold))
                                .foregroundStyle(isSelected ? Color.brand : .white.opacity(0.85))
                        }
                        .padding(8)
                    }
                }
            }
            .buttonStyle(.plain)
            // Long-press anywhere on the thumb enters selection mode. Inside
            // selection mode we leave the gesture wired so additional
            // long-presses are no-ops rather than canceling selection.
            .onLongPressGesture(minimumDuration: 0.35) { onLongPress() }

            Text(clip.hook ?? "—").font(.caption).lineLimit(2)

            if let tags = clip.hashtags, !tags.isEmpty {
                // Compact hashtag chip strip — surfaces the AI-extracted tags
                // without forcing the user to open the actions sheet.
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 4) {
                        ForEach(tags.prefix(3), id: \.self) { tag in
                            Text("#" + tag.replacingOccurrences(of: "#", with: ""))
                                .font(.caption2.weight(.semibold))
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.brand.opacity(0.18))
                                .foregroundStyle(.brand)
                                .clipShape(.capsule)
                                .lineLimit(1)
                        }
                    }
                }
            }

            if let score = clip.viralScore {
                Text("⚡ \(String(format: "%.1f", score))")
                    .font(.caption2)
                    .foregroundStyle(.brand)
            }
        }
    }
}
