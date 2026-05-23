import SwiftUI
import WidgetKit

/// Home-screen widget for ClipForge Studio. Two families:
///
///   • .systemSmall  — streak + active count
///   • .systemMedium — same, plus today's hook quote + niche pill
///
/// Lockscreen / accessory families could be added later. We read every
/// field from the App Group SharedAppState; the timeline reloads on app
/// activity (the app calls WidgetCenter.reloadAllTimelines after writes)
/// plus an opportunistic 15-min refresh as fallback so nothing goes stale
/// if the user never opens the app.
struct StudioWidget: Widget {
    let kind: String = "ClipForgeStudioWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: StudioProvider()) { entry in
            StudioWidgetView(entry: entry)
                .containerBackground(for: .widget) { background }
        }
        .configurationDisplayName("ClipForge")
        .description("Today's viral hook + your render queue at a glance.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }

    private var background: some View {
        LinearGradient(
            colors: [Color(red: 0.05, green: 0.05, blue: 0.06),
                     Color(red: 0.10, green: 0.04, blue: 0.10)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

// MARK: - Timeline

struct StudioEntry: TimelineEntry {
    let date: Date
    let state: SharedAppState
}

struct StudioProvider: TimelineProvider {
    func placeholder(in context: Context) -> StudioEntry {
        StudioEntry(date: Date(), state: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (StudioEntry) -> Void) {
        completion(StudioEntry(date: Date(), state: SharedAppState.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<StudioEntry>) -> Void) {
        let entry = StudioEntry(date: Date(), state: SharedAppState.load())
        // Auto-refresh 15min from now — App-driven reloadAllTimelines is the
        // primary path; this is just the safety net.
        let next = Date().addingTimeInterval(15 * 60)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Views

struct StudioWidgetView: View {
    let entry: StudioEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .systemMedium: medium
        default:            small
        }
    }

    // Small: stacked stats + a single hook line
    private var small: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image(systemName: "scissors")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
                Text("ClipForge")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.white.opacity(0.9))
            }
            Spacer(minLength: 0)
            HStack(alignment: .firstTextBaseline, spacing: 4) {
                Text("\(entry.state.activeJobs)")
                    .font(.system(size: 34, weight: .bold))
                    .foregroundStyle(.white)
                    .monospacedDigit()
                Text("active")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.75))
            }
            HStack(spacing: 6) {
                Image(systemName: entry.state.streak > 0 ? "flame.fill" : "flame")
                    .foregroundStyle(entry.state.streak > 0 ? .orange : Color.white.opacity(0.4))
                Text(entry.state.streak > 0
                     ? "\(entry.state.streak)-day streak"
                     : "Start a streak today")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.8))
            }
            Spacer(minLength: 0)
            updatedAtFooter
        }
        .padding(12)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }

    // Medium: stats on the left, today's pick hook on the right
    private var medium: some View {
        HStack(spacing: 14) {
            // Left column — stats
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Image(systemName: "scissors")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
                    Text("ClipForge")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.white.opacity(0.9))
                }
                Spacer(minLength: 0)
                Text("\(entry.state.activeJobs)")
                    .font(.system(size: 38, weight: .bold))
                    .foregroundStyle(.white)
                    .monospacedDigit()
                Text("rendering")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.7))
                HStack(spacing: 4) {
                    Image(systemName: entry.state.streak > 0 ? "flame.fill" : "flame")
                        .foregroundStyle(entry.state.streak > 0 ? .orange : Color.white.opacity(0.4))
                    Text(entry.state.streak > 0
                         ? "\(entry.state.streak)-day streak"
                         : "No streak yet")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.white.opacity(0.75))
                }
                Spacer(minLength: 0)
            }
            .frame(minWidth: 100, alignment: .leading)

            // Right column — today's pick hook
            VStack(alignment: .leading, spacing: 6) {
                HStack(spacing: 6) {
                    Image(systemName: "sparkles")
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
                    Text("TODAY'S HOOK")
                        .font(.caption2.weight(.bold))
                        .tracking(0.6)
                        .foregroundStyle(.white.opacity(0.75))
                    Spacer()
                }
                if entry.state.todaysPickHook.isEmpty {
                    Text("Open the app to pull a fresh hook.")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.6))
                        .lineLimit(3)
                } else {
                    Text("\"\(entry.state.todaysPickHook)\"")
                        .font(.callout.weight(.semibold).italic())
                        .foregroundStyle(.white)
                        .lineLimit(3)
                        .minimumScaleFactor(0.85)
                    if !entry.state.todaysPickNiche.isEmpty {
                        Text(entry.state.todaysPickNiche.capitalized)
                            .font(.caption2.weight(.bold))
                            .padding(.horizontal, 7)
                            .padding(.vertical, 2)
                            .background(Color.white.opacity(0.12))
                            .foregroundStyle(.white.opacity(0.85))
                            .clipShape(.capsule)
                    }
                }
                Spacer(minLength: 0)
                updatedAtFooter
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(14)
    }

    private var updatedAtFooter: some View {
        Group {
            if entry.state.updatedAt > .distantPast {
                Text("Updated \(relativeTime(entry.state.updatedAt))")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.35))
            } else {
                Text("Open the app to refresh")
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.35))
            }
        }
    }

    private func relativeTime(_ d: Date) -> String {
        let fmt = RelativeDateTimeFormatter()
        fmt.unitsStyle = .short
        return fmt.localizedString(for: d, relativeTo: Date())
    }
}
