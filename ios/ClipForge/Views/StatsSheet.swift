import SwiftUI
import Charts

/// Stats sheet — premium-feel data view built on SwiftUI Charts. Reads
/// from existing endpoints (no new API surface) and synthesises four
/// chart sections client-side:
///
///   1. Clips per day (last 14 days, bar)
///   2. Viral-score distribution (histogram-style bars)
///   3. Publish status breakdown (donut)
///   4. Top niches by job count (horizontal bar)
@MainActor
struct StatsSheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var clips: [Clip] = []
    @State private var jobs: [VideoJob] = []
    @State private var publishes: [ClipForgeAPI.PublishHistoryRow] = []
    @State private var loading = true
    @State private var error: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    if loading {
                        ProgressView().frame(maxWidth: .infinity).padding(.vertical, 40)
                    } else if let err = error {
                        Text(err).font(.callout).foregroundStyle(.red)
                    } else {
                        clipsPerDayCard
                        viralScoreCard
                        publishStatusCard
                        topNichesCard
                    }
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Stats")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    // MARK: - Cards

    private var clipsPerDayCard: some View {
        let buckets = clipsPerDay()
        return chartCard(title: "Clips ready · last 14 days",
                         subtitle: "\(buckets.reduce(0) { $0 + $1.count }) clips total") {
            Chart(buckets) { bucket in
                BarMark(
                    x: .value("Date", bucket.date, unit: .day),
                    y: .value("Clips", bucket.count)
                )
                .foregroundStyle(LinearGradient(
                    colors: [.brand, .brandGlow],
                    startPoint: .top, endPoint: .bottom
                ))
                .cornerRadius(3)
            }
            .chartXAxis { AxisMarks(values: .stride(by: .day, count: 3)) }
            .frame(height: 160)
        }
    }

    private var viralScoreCard: some View {
        let buckets = viralScoreBuckets()
        return chartCard(title: "Viral score distribution",
                         subtitle: "Average \(String(format: "%.1f", avgViralScore()))") {
            Chart(buckets) { bucket in
                BarMark(
                    x: .value("Bucket", bucket.label),
                    y: .value("Clips", bucket.count)
                )
                .foregroundStyle(.brand)
                .cornerRadius(3)
            }
            .frame(height: 160)
        }
    }

    private var publishStatusCard: some View {
        let buckets = publishStatusBuckets()
        let total = buckets.reduce(0) { $0 + $1.count }
        return chartCard(title: "Publishing",
                         subtitle: "\(total) post\(total == 1 ? "" : "s") attempted") {
            if total == 0 {
                Text("Connect a channel and publish a clip to see this chart light up.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 100, alignment: .center)
                    .multilineTextAlignment(.center)
            } else {
                Chart(buckets) { bucket in
                    SectorMark(
                        angle: .value("Count", bucket.count),
                        innerRadius: .ratio(0.55),
                        angularInset: 1.5
                    )
                    .foregroundStyle(by: .value("Status", bucket.label))
                    .cornerRadius(3)
                }
                .chartLegend(position: .bottom, alignment: .center)
                .frame(height: 180)
            }
        }
    }

    private var topNichesCard: some View {
        let buckets = topNiches()
        return chartCard(title: "Top niches",
                         subtitle: "Most-rendered project niches") {
            if buckets.isEmpty {
                Text("Submit a project to see your niche breakdown.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, minHeight: 100, alignment: .center)
                    .multilineTextAlignment(.center)
            } else {
                Chart(buckets) { bucket in
                    BarMark(
                        x: .value("Count", bucket.count),
                        y: .value("Niche", bucket.label)
                    )
                    .foregroundStyle(.brand.opacity(0.85))
                    .cornerRadius(3)
                }
                .frame(height: CGFloat(max(120, buckets.count * 28)))
            }
        }
    }

    @ViewBuilder
    private func chartCard<Body: View>(
        title: String,
        subtitle: String,
        @ViewBuilder content: () -> Body
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.callout.weight(.bold))
                Text(subtitle).font(.caption2).foregroundStyle(.secondary)
            }
            content()
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 16))
    }

    // MARK: - Data shaping

    struct DayBucket: Identifiable {
        let date: Date
        let count: Int
        var id: Date { date }
    }
    struct LabelBucket: Identifiable {
        let label: String
        let count: Int
        var id: String { label }
    }

    private func clipsPerDay() -> [DayBucket] {
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let isoStrict = ISO8601DateFormatter()
        let isoFrac: ISO8601DateFormatter = {
            let f = ISO8601DateFormatter()
            f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            return f
        }()
        func parse(_ s: String?) -> Date? {
            guard let s else { return nil }
            return isoStrict.date(from: s) ?? isoFrac.date(from: s)
        }
        // Seed 14 days so an empty day still renders as a 0-height tick.
        var counts: [Date: Int] = [:]
        for offset in 0..<14 {
            if let d = cal.date(byAdding: .day, value: -offset, to: today) {
                counts[d] = 0
            }
        }
        for clip in clips where clip.status == "ready" {
            guard let raw = clip.createdAt, let stamp = parse(raw) else { continue }
            let day = cal.startOfDay(for: stamp)
            // Only count days that fall in our 14-day window — older clips
            // are still in the data but shouldn't blow up the leftmost bar.
            if counts[day] != nil {
                counts[day, default: 0] += 1
            }
        }
        return counts.keys.sorted().map { DayBucket(date: $0, count: counts[$0] ?? 0) }
    }

    private func viralScoreBuckets() -> [LabelBucket] {
        let bucketRanges: [(String, ClosedRange<Double>)] = [
            ("0–2", 0...2),
            ("2–4", 2...4),
            ("4–6", 4...6),
            ("6–8", 6...8),
            ("8–10", 8...10),
        ]
        return bucketRanges.map { (label, range) in
            let count = clips.filter { clip in
                guard let s = clip.viralScore else { return false }
                return range.contains(s)
            }.count
            return LabelBucket(label: label, count: count)
        }
    }

    private func avgViralScore() -> Double {
        let scores = clips.compactMap { $0.viralScore }
        guard !scores.isEmpty else { return 0 }
        return scores.reduce(0, +) / Double(scores.count)
    }

    private func publishStatusBuckets() -> [LabelBucket] {
        var byStatus: [String: Int] = [:]
        for pub in publishes {
            // Bucket "cancelled" rows separately from "failed" — they're
            // intentional, not red flags.
            let key: String
            if pub.status == "failed" && pub.errorMessage == "Cancelled by user" {
                key = "Cancelled"
            } else {
                key = pub.status.capitalized
            }
            byStatus[key, default: 0] += 1
        }
        // Stable order so the donut doesn't shuffle between renders.
        let order = ["Published", "Publishing", "Pending", "Failed", "Cancelled"]
        return order.compactMap { label in
            guard let count = byStatus[label], count > 0 else { return nil }
            return LabelBucket(label: label, count: count)
        }
    }

    private func topNiches() -> [LabelBucket] {
        var counts: [String: Int] = [:]
        for j in jobs {
            guard let n = j.niche, !n.isEmpty else { continue }
            counts[n.capitalized, default: 0] += 1
        }
        return counts
            .map { LabelBucket(label: $0.key, count: $0.value) }
            .sorted { $0.count > $1.count }
            .prefix(5)
            .map { $0 }
    }

    // MARK: - Loading

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            async let clipsT = ClipForgeAPI.shared.fetchAllClips()
            async let jobsT = ClipForgeAPI.shared.fetchJobs()
            async let pubsT = ClipForgeAPI.shared.fetchPublishHistory()
            self.clips = (try? await clipsT) ?? []
            self.jobs = (try? await jobsT) ?? []
            self.publishes = (try? await pubsT) ?? []
        }
    }
}
