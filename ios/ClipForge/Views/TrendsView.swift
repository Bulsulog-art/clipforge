import SwiftUI

/// Read-only trend feed per niche. Free tier appetizer — sticky daily check-in.
@MainActor
struct TrendsView: View {
    @EnvironmentObject private var appState: AppState
    @State private var niche: String = "motivation"
    @State private var items: [TrendItem] = []
    @State private var loading = false
    @State private var error: String?
    @State private var lastUpdated: String?

    private let niches = ["motivation", "business", "finance", "health", "tech",
                          "education", "comedy", "fitness", "spirituality", "lifestyle"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Picker("Niche", selection: $niche) {
                        ForEach(niches, id: \.self) { Text($0.capitalized).tag($0) }
                    }
                    .pickerStyle(.menu)
                    .onChange(of: niche) { _, _ in Task { await load() } }

                    if let lastUpdated {
                        Text("Updated \(lastUpdated)")
                            .font(.caption).foregroundStyle(.secondary)
                    }

                    if loading && items.isEmpty {
                        ProgressView().frame(maxWidth: .infinity).padding(.vertical, 40)
                    }

                    if let error {
                        Text(error)
                            .padding()
                            .background(Color.red.opacity(0.1))
                            .clipShape(.rect(cornerRadius: 12))
                            .foregroundStyle(.red)
                    }

                    ForEach(items) { item in
                        trendCard(item)
                    }

                    if !loading && items.isEmpty && error == nil {
                        VStack(spacing: 8) {
                            Image(systemName: "sparkles.tv")
                                .font(.system(size: 36))
                                .foregroundStyle(.secondary)
                            Text("No trends yet for \(niche).")
                                .font(.callout)
                                .foregroundStyle(.secondary)
                            Text("Snapshots refresh every 24 hours.")
                                .font(.caption2)
                                .foregroundStyle(.secondary)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 40)
                    }
                }
                .padding()
            }
            .navigationTitle("Trends")
            .refreshable { await load() }
            .task { await load() }
            .onChange(of: appState.pendingTrendNiche) { _, newNiche in
                guard let n = newNiche, !n.isEmpty else { return }
                niche = n
                appState.pendingTrendNiche = nil
                Task { await load() }
            }
        }
    }

    private func trendCard(_ item: TrendItem) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(item.platform?.capitalized ?? "Platform")
                    .font(.caption.bold())
                    .padding(.horizontal, 8).padding(.vertical, 3)
                    .background(Color.brand.opacity(0.18))
                    .foregroundStyle(Color.brand)
                    .clipShape(.capsule)
                Spacer()
                if let f = item.format {
                    Text(f.replacingOccurrences(of: "_", with: " "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Text(item.title).font(.callout.bold())
            Text("Hook: ") .font(.caption).foregroundStyle(.secondary)
            + Text("\"\(item.hook)\"").font(.caption.italic())
            if let why = item.why_it_works {
                Text(why).font(.footnote).foregroundStyle(.secondary)
            }
            if let evidence = item.evidence {
                Label(evidence, systemImage: "magnifyingglass")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Button {
                appState.startFromTrend(niche: niche, hook: item.hook)
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                    Text("Use this hook")
                }
                .font(.caption.bold())
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.brand)
                .foregroundStyle(.white)
                .clipShape(.capsule)
            }
            .padding(.top, 4)
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            let snap = try await ClipForgeAPI.shared.fetchTrends(niche: niche)
            self.items = snap.items.enumerated().map { idx, raw in
                TrendItem(
                    id: idx,
                    title: raw["title"] as? String ?? "—",
                    hook: raw["hook"] as? String ?? "—",
                    format: raw["format"] as? String,
                    platform: raw["platform"] as? String,
                    evidence: raw["evidence"] as? String,
                    why_it_works: raw["why_it_works"] as? String
                )
            }
            if let generated = snap.generated_at {
                let df = ISO8601DateFormatter()
                if let d = df.date(from: generated) {
                    let rel = RelativeDateTimeFormatter()
                    rel.unitsStyle = .short
                    lastUpdated = rel.localizedString(for: d, relativeTo: .now)
                }
            }
            self.error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct TrendItem: Identifiable {
    let id: Int
    let title: String
    let hook: String
    let format: String?
    let platform: String?
    let evidence: String?
    let why_it_works: String?
}
