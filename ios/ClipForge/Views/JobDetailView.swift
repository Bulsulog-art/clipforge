import SwiftUI

struct JobDetailView: View {
    let job: VideoJob
    @StateObject private var vm = JobDetailViewModel()
    @StateObject private var progress = JobProgressService()
    @State private var actionsForClip: Clip?
    @State private var playerForClip: Clip?
    @State private var fireConfetti = false

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
                                onTap: { playerForClip = clip },
                                onActions: { actionsForClip = clip }
                            )
                        }
                    }
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
        .navigationTitle("Clips")
        .navigationBarTitleDisplayMode(.inline)
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
    let onTap: () -> Void
    let onActions: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Button(action: onTap) {
                ZStack(alignment: .bottomTrailing) {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.cardBackground)
                        .aspectRatio(9/16, contentMode: .fit)
                        .overlay(
                            Image(systemName: "play.fill")
                                .font(.system(size: 30))
                                .foregroundStyle(.white.opacity(0.85))
                        )

                    Button(action: onActions) {
                        Image(systemName: "sparkles")
                            .padding(8)
                            .background(Color.brand)
                            .foregroundStyle(.white)
                            .clipShape(Circle())
                            .shadow(color: .brand.opacity(0.5), radius: 8)
                    }
                    .padding(6)
                }
            }
            .buttonStyle(.plain)

            Text(clip.hook ?? "—").font(.caption).lineLimit(2)

            if let score = clip.viralScore {
                Text("⚡ \(String(format: "%.1f", score))")
                    .font(.caption2)
                    .foregroundStyle(.brand)
            }
        }
    }
}
