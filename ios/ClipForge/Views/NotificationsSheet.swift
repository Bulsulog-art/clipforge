import SwiftUI

/// Bell-icon inbox showing the user's last 7 days of in-app
/// notifications — synthesised client-side from existing jobs +
/// publishes (no separate notifications table). Designed to fill the
/// gap when a user has push disabled or simply missed one.
@MainActor
struct NotificationsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var appState: AppState
    @StateObject private var svc = NotificationsService.shared

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    if svc.items.isEmpty {
                        emptyCard
                    } else {
                        ForEach(svc.items) { item in
                            row(item)
                        }
                    }
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Inbox")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
                if !svc.items.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            svc.markAllRead()
                            Task { await Haptics.impact(.light) }
                        } label: {
                            Text("Mark read").font(.caption.weight(.semibold))
                        }
                    }
                }
            }
            .task { await svc.reload() }
            .refreshable { await svc.reload() }
            .onAppear { svc.markAllRead() }
        }
    }

    private func row(_ item: NotificationsService.Item) -> some View {
        Button {
            handleTap(item)
        } label: {
            HStack(alignment: .top, spacing: 12) {
                iconBadge(item)
                VStack(alignment: .leading, spacing: 3) {
                    Text(item.title)
                        .font(.callout.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text(item.body)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                    Text(relative(item.date))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                Spacer(minLength: 4)
                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.tertiary)
            }
            .padding(12)
            .background(Color.cardBackground)
            .clipShape(.rect(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }

    private func iconBadge(_ item: NotificationsService.Item) -> some View {
        let (symbol, tint): (String, Color) = {
            switch item.kind {
            case .jobReady:      return ("checkmark.circle.fill", .green)
            case .jobFailed:     return ("exclamationmark.triangle.fill", .red)
            case .publishDone:   return ("paperplane.fill", .brand)
            case .publishFailed: return ("xmark.octagon.fill", .orange)
            }
        }()
        return ZStack {
            Circle()
                .fill(tint.opacity(0.18))
                .frame(width: 36, height: 36)
            Image(systemName: symbol)
                .font(.callout.weight(.bold))
                .foregroundStyle(tint)
        }
    }

    private var emptyCard: some View {
        VStack(spacing: 10) {
            Image(systemName: "bell.slash")
                .font(.system(size: 38))
                .foregroundStyle(.secondary)
            Text("All caught up")
                .font(.callout.weight(.semibold))
            Text("Recent renders, publishes and trend matches will appear here.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 30)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }

    private func handleTap(_ item: NotificationsService.Item) {
        Task { await Haptics.impact(.light) }
        switch item.deepLink {
        case .jobId(let id):
            appState.selectedTab = .studio
            appState.pendingJobId = id
            dismiss()
        case .publishHistory:
            // Closing here would require Settings → Publish history → re-open.
            // For now we close the sheet and let the user open Settings → Grow.
            dismiss()
        case .externalURL(let url):
            UIApplication.shared.open(url)
        case .none:
            break
        }
    }

    private func relative(_ d: Date) -> String {
        let fmt = RelativeDateTimeFormatter()
        fmt.unitsStyle = .abbreviated
        return fmt.localizedString(for: d, relativeTo: Date())
    }
}
