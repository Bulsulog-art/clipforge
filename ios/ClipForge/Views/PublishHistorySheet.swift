import SwiftUI

/// Read-only timeline of every publish the user has scheduled or sent.
/// Failed rows expose a Retry button; pending+scheduled rows expose a
/// Cancel button. Tap a published row to open it on the live platform.
@MainActor
struct PublishHistorySheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var rows: [ClipForgeAPI.PublishHistoryRow] = []
    @State private var loading = true
    @State private var error: String?
    @State private var filter: Filter = .all
    @State private var pendingAction: String?    // publishId currently being acted on

    enum Filter: String, CaseIterable, Identifiable {
        case all = "All", scheduled = "Scheduled", published = "Published", failed = "Failed"
        var id: String { rawValue }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    filterChips
                    if loading && rows.isEmpty {
                        ProgressView().padding(.vertical, 40)
                    } else if let err = error, rows.isEmpty {
                        errorCard(err)
                    } else if filteredRows.isEmpty {
                        emptyCard
                    } else {
                        ForEach(filteredRows) { row in
                            historyCard(row)
                        }
                    }
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Publish history")
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

    // MARK: - Sections

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Filter.allCases) { f in
                    Button {
                        filter = f
                        Task { await Haptics.impact(.light) }
                    } label: {
                        Text(f.rawValue)
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(filter == f ? Color.brand : Color.cardBackground)
                            .foregroundStyle(filter == f ? Color.white : Color.textSecondary)
                            .clipShape(.capsule)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func historyCard(_ row: ClipForgeAPI.PublishHistoryRow) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: iconFor(platform: row.platform))
                    .foregroundStyle(tintFor(platform: row.platform))
                Text(row.platform.capitalized)
                    .font(.callout.weight(.semibold))
                Spacer()
                statusBadge(row)
            }
            if let hook = row.clipHook {
                Text("\"\(hook)\"")
                    .font(.caption.italic())
                    .foregroundStyle(.textSecondary)
                    .lineLimit(2)
            }
            timingLine(row)
            if let err = row.errorMessage, row.status == "failed" {
                Text(err)
                    .font(.caption2)
                    .foregroundStyle(.red)
                    .lineLimit(3)
            }
            actionRow(row)
        }
        .padding(14)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }

    @ViewBuilder
    private func statusBadge(_ row: ClipForgeAPI.PublishHistoryRow) -> some View {
        let (text, tint): (String, Color) = {
            switch row.status {
            case "published":  return ("Posted", .green)
            case "publishing": return ("Posting…", .brand)
            case "failed":     return (row.errorMessage == "Cancelled by user" ? "Cancelled" : "Failed", .red)
            case "pending":    return (isScheduled(row) ? "Scheduled" : "Queued", .orange)
            default:           return (row.status.capitalized, .textSecondary)
            }
        }()
        Text(text)
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 8).padding(.vertical, 3)
            .background(tint.opacity(0.18))
            .foregroundStyle(tint)
            .clipShape(.capsule)
    }

    @ViewBuilder
    private func timingLine(_ row: ClipForgeAPI.PublishHistoryRow) -> some View {
        if row.status == "published", let when = row.publishedAt, let d = parse(when) {
            Label(d.formatted(date: .abbreviated, time: .shortened),
                  systemImage: "checkmark.seal")
                .font(.caption2)
                .foregroundStyle(Color.textSecondary.opacity(0.6))
        } else if isScheduled(row), let when = row.scheduledFor, let d = parse(when) {
            Label("Goes live \(d.formatted(date: .abbreviated, time: .shortened))",
                  systemImage: "calendar.badge.clock")
                .font(.caption2)
                .foregroundStyle(Color.textSecondary.opacity(0.6))
        } else if let created = row.createdAt, let d = parse(created) {
            Label(d.formatted(date: .abbreviated, time: .shortened),
                  systemImage: "clock")
                .font(.caption2)
                .foregroundStyle(Color.textSecondary.opacity(0.6))
        }
    }

    @ViewBuilder
    private func actionRow(_ row: ClipForgeAPI.PublishHistoryRow) -> some View {
        HStack(spacing: 8) {
            if row.status == "published", let urlStr = row.externalUrl, let url = URL(string: urlStr) {
                Link(destination: url) {
                    Label("Open post", systemImage: "arrow.up.right.square")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12).padding(.vertical, 7)
                        .background(Color.brand)
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                }
            }
            if row.status == "failed", row.errorMessage != "Cancelled by user" {
                Button {
                    Task { await retry(row) }
                } label: {
                    HStack(spacing: 4) {
                        if pendingAction == row.id { ProgressView().controlSize(.mini).tint(.white) }
                        Text("Retry").font(.caption.weight(.semibold))
                    }
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(Color.brand)
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
                }
                .buttonStyle(.plain)
                .disabled(pendingAction != nil)
            }
            if row.status == "pending" {
                Button(role: .destructive) {
                    Task { await cancel(row) }
                } label: {
                    HStack(spacing: 4) {
                        if pendingAction == row.id { ProgressView().controlSize(.mini) }
                        Text("Cancel").font(.caption.weight(.semibold))
                    }
                    .padding(.horizontal, 12).padding(.vertical, 7)
                    .background(Color.cardBackground)
                    .foregroundStyle(.red)
                    .clipShape(.capsule)
                    .overlay(Capsule().stroke(Color.red.opacity(0.4), lineWidth: 0.8))
                }
                .buttonStyle(.plain)
                .disabled(pendingAction != nil)
            }
            Spacer()
        }
    }

    private var emptyCard: some View {
        VStack(spacing: 8) {
            Image(systemName: "paperplane")
                .font(.title2)
                .foregroundStyle(.textSecondary)
            Text("Nothing here yet")
                .font(.callout.weight(.semibold))
                .foregroundStyle(.textPrimary)
            Text("When you publish a clip, every attempt lands in this timeline.")
                .font(.caption)
                .foregroundStyle(.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 30)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }

    private func errorCard(_ message: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)
            Text(message).font(.callout).foregroundStyle(.red)
            Spacer(minLength: 4)
        }
        .padding(12)
        .background(Color.red.opacity(0.12))
        .clipShape(.rect(cornerRadius: 12))
    }

    // MARK: - Behaviour

    private var filteredRows: [ClipForgeAPI.PublishHistoryRow] {
        switch filter {
        case .all:        return rows
        case .scheduled:  return rows.filter { isScheduled($0) }
        case .published:  return rows.filter { $0.status == "published" }
        case .failed:     return rows.filter { $0.status == "failed" && $0.errorMessage != "Cancelled by user" }
        }
    }

    private func isScheduled(_ row: ClipForgeAPI.PublishHistoryRow) -> Bool {
        guard row.status == "pending", let s = row.scheduledFor, let d = parse(s) else { return false }
        return d > Date()
    }

    private func parse(_ iso: String) -> Date? {
        ISO8601DateFormatter().date(from: iso) ?? Self.fallbackFormatter.date(from: iso)
    }
    /// Supabase sometimes emits microseconds (.123456+00). ISO8601 parser is
    /// strict; this lenient fallback handles those rows.
    private static let fallbackFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private func iconFor(platform: String) -> String {
        switch platform {
        case "tiktok":    return "music.note"
        case "instagram": return "camera.fill"
        case "youtube":   return "play.rectangle.fill"
        default:          return "paperplane"
        }
    }
    private func tintFor(platform: String) -> Color {
        switch platform {
        case "tiktok":    return Color(red: 0.13, green: 0.94, blue: 0.92)
        case "instagram": return Color(red: 0.91, green: 0.30, blue: 0.55)
        case "youtube":   return Color(red: 0.99, green: 0.10, blue: 0.10)
        default:          return .brand
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            rows = try await ClipForgeAPI.shared.fetchPublishHistory()
            error = nil
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func retry(_ row: ClipForgeAPI.PublishHistoryRow) async {
        pendingAction = row.id
        defer { pendingAction = nil }
        do {
            try await ClipForgeAPI.shared.retryPublish(id: row.id)
            await Haptics.notify(.success)
            await load()
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }

    private func cancel(_ row: ClipForgeAPI.PublishHistoryRow) async {
        pendingAction = row.id
        defer { pendingAction = nil }
        do {
            try await ClipForgeAPI.shared.cancelPublish(id: row.id)
            await Haptics.notify(.success)
            await load()
        } catch {
            self.error = error.localizedDescription
            await Haptics.notify(.error)
        }
    }
}
