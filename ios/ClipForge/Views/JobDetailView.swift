import SwiftUI

struct JobDetailView: View {
    let job: VideoJob
    @StateObject private var vm = JobDetailViewModel()
    @State private var actionsForClip: Clip?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                Text(job.title ?? "Untitled").font(.title2.bold())
                Text("\(job.niche ?? "—") · \(job.status)")
                    .font(.subheadline).foregroundStyle(.secondary)

                if job.status != "ready" {
                    ProgressView(value: Double(job.progress) / 100)
                        .tint(.brand)
                }

                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                    ForEach(vm.clips) { clip in
                        ClipThumb(clip: clip, onActions: { actionsForClip = clip })
                    }
                }
            }
            .padding()
        }
        .task { await vm.load(jobId: job.id) }
        .refreshable { await vm.load(jobId: job.id) }
        .sheet(item: $actionsForClip) { clip in
            ClipActionsSheet(clip: clip)
        }
        .navigationTitle("Clips")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct ClipThumb: View {
    let clip: Clip
    let onActions: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .bottomTrailing) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.cardBackground)
                    .aspectRatio(9/16, contentMode: .fit)
                    .overlay(
                        Image(systemName: "play.fill")
                            .font(.system(size: 30))
                            .foregroundStyle(.white.opacity(0.8))
                    )

                Button(action: onActions) {
                    Image(systemName: "sparkles")
                        .padding(8)
                        .background(Color.brand)
                        .foregroundStyle(.white)
                        .clipShape(Circle())
                }
                .padding(6)
            }

            Text(clip.hook ?? "—").font(.caption).lineLimit(2)

            if let score = clip.viralScore {
                Text("⚡ \(String(format: "%.1f", score))")
                    .font(.caption2)
                    .foregroundStyle(.brand)
            }
        }
    }
}
