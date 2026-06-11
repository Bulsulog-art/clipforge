import SwiftUI

/// Per-kind push notification toggles. Apple Review Guideline 5.1.1(vi)
/// requires granular control for any app that sends push, and disabling
/// at this granularity is a much better UX than nuking notifications at
/// the OS level.
///
/// Backend's worker/src/push.ts reads profiles.push_preferences before
/// each send; a `false` value here suppresses that kind of push for
/// this user. Missing keys default to enabled.
@MainActor
struct PushPreferencesSheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var prefs: [String: Bool] = [:]
    @State private var loading = true
    @State private var saving = false
    @State private var error: String?

    /// All known push kinds emitted by the worker. Keep this list in sync
    /// with worker/src/push.ts + the pipeline / cron call sites.
    private let kinds: [(key: String, title: String, body: String, icon: String)] = [
        ("job_ready",
         "Clip ready",
         "We've finished rendering your clip set.",
         "scissors"),
        ("avatar_ready",
         "AI avatar ready",
         "Your talking-head clip is rendered and waiting.",
         "person.wave.2.fill"),
        ("trend_match",
         "Trending in your niche",
         "A fresh hook just broke for the niches you've worked in.",
         "sparkles"),
        ("low_credits",
         "Low credits",
         "Heads-up when you're down to ≤ 2 credits.",
         "bolt.badge.clock"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    headerCard
                    if loading {
                        ProgressView().padding(.vertical, 30)
                    } else {
                        ForEach(kinds, id: \.key) { kind in
                            row(for: kind)
                        }
                        if let err = error {
                            Text(err)
                                .font(.caption2)
                                .foregroundStyle(.red)
                                .padding(.top, 6)
                        }
                        footnote
                    }
                }
                .padding()
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { await load() }
        }
    }

    private var headerCard: some View {
        VStack(alignment: .leading, spacing: 6) {
            Label("Per-notification control", systemImage: "bell.badge.fill")
                .font(.caption.weight(.bold))
                .foregroundStyle(.brand)
            Text("Toggle each kind of notification on or off. iOS-level Do Not Disturb still applies on top of these.")
                .font(.callout)
                .foregroundStyle(.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func row(for kind: (key: String, title: String, body: String, icon: String)) -> some View {
        let enabled = prefs[kind.key] ?? true   // default-on
        return HStack(alignment: .top, spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.brand.opacity(0.18))
                    .frame(width: 36, height: 36)
                Image(systemName: kind.icon)
                    .font(.callout.weight(.bold))
                    .foregroundStyle(.brand)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(kind.title)
                    .font(.callout.weight(.semibold))
                Text(kind.body)
                    .font(.caption2)
                    .foregroundStyle(.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            Spacer(minLength: 0)
            Toggle("", isOn: Binding(
                get: { enabled },
                set: { newValue in
                    prefs[kind.key] = newValue
                    Task { await persist(kind.key, value: newValue) }
                }
            ))
            .labelsHidden()
            .tint(.brand)
        }
        .padding(14)
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }

    private var footnote: some View {
        Text("Disabling here doesn't stop in-app banners or the home-screen widget — just the push delivered to your lock screen.")
            .font(.caption2)
            .foregroundStyle(.textSecondary.opacity(0.6))
            .padding(.top, 4)
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            prefs = try await ClipForgeAPI.shared.fetchPushPreferences()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func persist(_ key: String, value: Bool) async {
        saving = true
        defer { saving = false }
        do {
            try await ClipForgeAPI.shared.updatePushPreferences([key: value])
            await Haptics.impact(.light)
        } catch {
            self.error = error.localizedDescription
            // Roll back the optimistic toggle if the network call failed.
            prefs[key] = !value
            await Haptics.notify(.error)
        }
    }
}
