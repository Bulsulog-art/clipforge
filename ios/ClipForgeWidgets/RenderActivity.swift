import ActivityKit
import SwiftUI
import WidgetKit

/// Activity attributes shared between the main app (start/update/end calls)
/// and the widget extension (Lock Screen + Dynamic Island UI). Lives in the
/// widget target; the main app references this type via a duplicate file
/// (RenderActivityAttributes.swift) that re-declares the same shape.
public struct RenderActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        /// "transcribing" | "scoring" | "rendering" | "ready"
        public var stage: String
        /// 0...100
        public var progress: Int
        /// How many clips have rendered so far (live counter).
        public var clipsReady: Int

        public init(stage: String, progress: Int, clipsReady: Int) {
            self.stage = stage
            self.progress = progress
            self.clipsReady = clipsReady
        }
    }

    /// Static metadata captured when the activity is created.
    public var jobTitle: String
    public var totalClipsExpected: Int

    public init(jobTitle: String, totalClipsExpected: Int) {
        self.jobTitle = jobTitle
        self.totalClipsExpected = totalClipsExpected
    }
}

// MARK: - Live Activity widget

struct RenderActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: RenderActivityAttributes.self) { ctx in
            LockScreenView(ctx: ctx)
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
                .activityBackgroundTint(Color.black.opacity(0.85))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { ctx in
            DynamicIsland {
                // Expanded
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: iconFor(stage: ctx.state.stage))
                        .font(.title2)
                        .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(ctx.state.progress)%")
                        .font(.title2.weight(.bold))
                        .monospacedDigit()
                        .foregroundStyle(.white)
                }
                DynamicIslandExpandedRegion(.center) {
                    VStack(spacing: 2) {
                        Text(ctx.attributes.jobTitle)
                            .font(.caption.weight(.semibold))
                            .lineLimit(1)
                            .foregroundStyle(.white)
                        Text(labelFor(stage: ctx.state.stage))
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: Double(ctx.state.progress), total: 100)
                        .tint(Color(red: 1.0, green: 0.20, blue: 0.40))
                }
            } compactLeading: {
                Image(systemName: iconFor(stage: ctx.state.stage))
                    .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
            } compactTrailing: {
                Text("\(ctx.state.progress)%")
                    .font(.caption.weight(.semibold))
                    .monospacedDigit()
            } minimal: {
                Image(systemName: "scissors")
                    .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
            }
        }
    }

    private func iconFor(stage: String) -> String {
        switch stage {
        case "transcribing": return "waveform"
        case "scoring":      return "wand.and.stars"
        case "rendering":    return "film.stack"
        case "ready":        return "checkmark.circle.fill"
        case "failed":       return "exclamationmark.triangle.fill"
        default:             return "scissors"
        }
    }

    private func labelFor(stage: String) -> String {
        switch stage {
        case "transcribing": return "Listening to your video…"
        case "scoring":      return "Finding viral moments…"
        case "rendering":    return "Cutting & styling clips…"
        case "ready":        return "Your clips are ready"
        case "failed":       return "Something went wrong"
        default:             return "Working…"
        }
    }
}

private struct LockScreenView: View {
    let ctx: ActivityViewContext<RenderActivityAttributes>

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color(red: 1.0, green: 0.20, blue: 0.40).opacity(0.18))
                    .frame(width: 44, height: 44)
                Image(systemName: iconFor(stage: ctx.state.stage))
                    .font(.title3)
                    .foregroundStyle(Color(red: 1.0, green: 0.20, blue: 0.40))
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(ctx.attributes.jobTitle)
                    .font(.callout.weight(.semibold))
                    .foregroundStyle(.white)
                    .lineLimit(1)
                HStack(spacing: 6) {
                    Text(labelFor(stage: ctx.state.stage))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                    if ctx.state.clipsReady > 0 {
                        Text("· \(ctx.state.clipsReady) ready")
                            .font(.caption2)
                            .foregroundStyle(Color(red: 1.0, green: 0.40, blue: 0.60))
                    }
                }
                ProgressView(value: Double(ctx.state.progress), total: 100)
                    .tint(Color(red: 1.0, green: 0.20, blue: 0.40))
                    .frame(maxWidth: .infinity)
            }
            Text("\(ctx.state.progress)%")
                .font(.title3.weight(.bold))
                .monospacedDigit()
                .foregroundStyle(.white)
        }
    }

    private func iconFor(stage: String) -> String {
        switch stage {
        case "transcribing": return "waveform"
        case "scoring":      return "wand.and.stars"
        case "rendering":    return "film.stack"
        case "ready":        return "checkmark.circle.fill"
        case "failed":       return "exclamationmark.triangle.fill"
        default:             return "scissors"
        }
    }

    private func labelFor(stage: String) -> String {
        switch stage {
        case "transcribing": return "Listening to your video"
        case "scoring":      return "Finding viral moments"
        case "rendering":    return "Cutting & styling clips"
        case "ready":        return "Clips are ready"
        case "failed":       return "Something went wrong"
        default:             return "Working"
        }
    }
}
