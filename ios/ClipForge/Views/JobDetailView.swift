import SwiftUI

struct JobDetailView: View {
    let job: VideoJob
    @StateObject private var vm = JobDetailViewModel()

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
                        ClipThumb(clip: clip)
                    }
                }
            }
            .padding()
        }
        .task { await vm.load(jobId: job.id) }
        .navigationTitle("Clips")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct ClipThumb: View {
    let clip: Clip
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            RoundedRectangle(cornerRadius: 12)
                .fill(Color.cardBackground)
                .aspectRatio(9/16, contentMode: .fit)
                .overlay(
                    Image(systemName: "play.fill")
                        .font(.system(size: 30))
                        .foregroundStyle(.white.opacity(0.8))
                )
            Text(clip.hook ?? "—").font(.caption).lineLimit(2)
        }
    }
}
