import SwiftUI
import WidgetKit

/// Apple Watch complications — placed on watch faces via the modern
/// WidgetKit accessory family system (watchOS 10+). Each family reads
/// the same `SharedAppState` snapshot the iPhone pushed via
/// `WatchSyncBridge` and persisted in watch-side App Group UserDefaults.
@main
struct ClipForgeWatchWidgetsBundle: WidgetBundle {
    var body: some Widget {
        WatchStudioComplication()
    }
}

/// One widget definition covers all three accessory families: the user
/// picks which face slot to use, and watchOS renders the appropriate
/// view automatically.
struct WatchStudioComplication: Widget {
    let kind: String = "ClipForgeWatchStudio"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: WatchTimelineProvider()) { entry in
            WatchComplicationView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("ClipForge")
        .description("Daily streak + render queue at a glance.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
            .accessoryCorner,
        ])
    }
}

// MARK: - Timeline

struct WatchEntry: TimelineEntry {
    let date: Date
    let state: SharedAppState
}

struct WatchTimelineProvider: TimelineProvider {
    func placeholder(in context: Context) -> WatchEntry {
        WatchEntry(date: Date(), state: .empty)
    }

    func getSnapshot(
        in context: Context,
        completion: @escaping (WatchEntry) -> Void
    ) {
        completion(WatchEntry(date: Date(), state: SharedAppState.load()))
    }

    func getTimeline(
        in context: Context,
        completion: @escaping (Timeline<WatchEntry>) -> Void
    ) {
        let entry = WatchEntry(date: Date(), state: SharedAppState.load())
        // Watch widgets are tighter on energy budget than iOS ones —
        // refresh at most every 30min. The primary refresh path is
        // WCSession context arriving + the watch app calling
        // WidgetCenter.reloadAllTimelines explicitly.
        let next = Date().addingTimeInterval(30 * 60)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - Views

struct WatchComplicationView: View {
    let entry: WatchEntry
    @Environment(\.widgetFamily) private var family

    var body: some View {
        switch family {
        case .accessoryCircular:    circular
        case .accessoryRectangular: rectangular
        case .accessoryInline:      inline
        case .accessoryCorner:      corner
        default:                    circular
        }
    }

    // Tiny corner / circular slot: streak number with a flame.
    private var circular: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 0) {
                Image(systemName: entry.state.streak > 0 ? "flame.fill" : "flame")
                    .font(.caption.weight(.bold))
                Text("\(entry.state.streak)")
                    .font(.system(size: 16, weight: .bold).monospacedDigit())
            }
        }
        .widgetAccentable()
    }

    // Two-line slot: streak + queue.
    private var rectangular: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: "flame.fill")
                Text("\(entry.state.streak)-day streak")
                    .font(.body.weight(.semibold))
                    .lineLimit(1)
            }
            HStack(spacing: 4) {
                Image(systemName: "scissors")
                Text("\(entry.state.activeJobs) rendering")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .widgetAccentable()
    }

    // Single-line slot (top of Modular face etc.) — render via Label so
    // VoiceOver reads the icon properly and watchOS handles truncation.
    private var inline: some View {
        Label(
            "\(entry.state.streak) day · \(entry.state.activeJobs) rendering",
            systemImage: "flame.fill"
        )
    }

    // X-Large corner faces (Infograph): bigger streak readout.
    private var corner: some View {
        Text("\(entry.state.streak)")
            .font(.title3.weight(.bold).monospacedDigit())
            .widgetLabel("\(entry.state.activeJobs) rendering")
            .widgetAccentable()
    }
}
