import SwiftUI

/// Single-screen glance for the paired Apple Watch. Reads from the
/// watch-side App Group UserDefaults written by `WatchSyncBridge` and
/// re-polls every 30s so the user sees fresh numbers if they keep the
/// app foregrounded (the OS also nudges the view via `onAppear`).
struct WatchHomeView: View {
    @State private var state: SharedAppState = SharedAppState.load()

    // 30s polling is a power-cheap fallback. The primary refresh path
    // is the WCSession context arriving from the iPhone, which writes
    // to the App Group; this timer just makes the view pick up that
    // change without waiting for the user to dismiss and reopen.
    private let timer = Timer.publish(every: 30, on: .main, in: .common)
        .autoconnect()

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 10) {
                header
                HStack(spacing: 8) {
                    streakCard
                    queueCard
                }
                if !state.todaysPickHook.isEmpty {
                    hookCard
                }
                footer
            }
            .padding(.horizontal, 2)
        }
        .onAppear { state = SharedAppState.load() }
        .onReceive(timer) { _ in state = SharedAppState.load() }
        .navigationTitle("ClipForge")
    }

    // MARK: - Sections

    private var header: some View {
        HStack(spacing: 6) {
            Image(systemName: "scissors")
                .font(.caption.weight(.bold))
                .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
            Text("Studio")
                .font(.headline.weight(.bold))
            Spacer()
        }
    }

    private var streakCard: some View {
        statCard(
            icon: state.streak > 0 ? "flame.fill" : "flame",
            iconColor: state.streak > 0 ? .orange : .secondary,
            value: "\(state.streak)",
            label: state.streak == 1 ? "day" : "days"
        )
    }

    private var queueCard: some View {
        statCard(
            icon: state.activeJobs > 0
                ? "gearshape.2.fill"
                : "checkmark.circle.fill",
            iconColor: state.activeJobs > 0 ? .yellow : .green,
            value: "\(state.activeJobs)",
            label: state.activeJobs == 1 ? "render" : "renders"
        )
    }

    private func statCard(
        icon: String,
        iconColor: Color,
        value: String,
        label: String
    ) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Image(systemName: icon)
                .foregroundStyle(iconColor)
            Text(value)
                .font(.title3.weight(.bold))
                .monospacedDigit()
            Text(label)
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(8)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
    }

    private var hookCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: "sparkles")
                    .font(.caption2)
                    .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
                Text("TODAY'S HOOK")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(.secondary)
            }
            Text("\u{201C}\(state.todaysPickHook)\u{201D}")
                .font(.caption)
                .italic()
                .lineLimit(5)
                .minimumScaleFactor(0.85)
            if !state.todaysPickNiche.isEmpty {
                Text(state.todaysPickNiche.capitalized)
                    .font(.caption2.weight(.bold))
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(.fill.tertiary, in: Capsule())
            }
        }
        .padding(8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
    }

    private var footer: some View {
        Text(state.updatedAt > .distantPast
             ? "Updated \(relativeTime(state.updatedAt))"
             : "Open ClipForge on iPhone")
            .font(.caption2)
            .foregroundStyle(.tertiary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 2)
    }

    private func relativeTime(_ d: Date) -> String {
        let fmt = RelativeDateTimeFormatter()
        fmt.unitsStyle = .short
        return fmt.localizedString(for: d, relativeTo: Date())
    }
}
