import SwiftUI

/// Sequential first-launch tooltips shown on top of Studio after onboarding
/// completes. Three steps walk new users through (1) create-a-project, (2)
/// today's pick, (3) channels — the three flows most users miss without a
/// nudge. Dismissed permanently once stepped through; "Skip all" cancels
/// remaining steps in one tap.
///
/// State machine model:
///   Tooltip n shown → user taps "Got it" → advance to n+1
///   At step end OR Skip all → mark seen, never show again on this install
@MainActor
struct StudioTooltipsOverlay: View {
    @Binding var step: Int  // 0, 1, 2; >=3 means "done"
    let onComplete: () -> Void

    private let pages: [Page] = [
        Page(
            title: "Start a project",
            body: "Tap the + at the top-right to clip from a URL, upload a video, or generate an AI avatar.",
            anchor: .topTrailing,
            icon: "plus.circle.fill"
        ),
        Page(
            title: "Today's pick",
            body: "We pull the day's top trending hook for your niche. Tap the gradient card to start a project from it.",
            anchor: .center,
            icon: "sparkles"
        ),
        Page(
            title: "Auto-publish",
            body: "Connect TikTok, Instagram or YouTube in the Channels tab to auto-post every clip the moment it's ready.",
            anchor: .center,
            icon: "antenna.radiowaves.left.and.right"
        ),
    ]

    var body: some View {
        if step < pages.count {
            ZStack(alignment: pages[step].anchor) {
                // Dim background — taps anywhere outside the card don't
                // advance, only the explicit buttons do, so an accidental
                // background tap can't blow past tooltips.
                Color.black.opacity(0.35)
                    .ignoresSafeArea()
                    .transition(.opacity)

                tooltipCard
                    .padding(.horizontal, 18)
                    .padding(.top, pages[step].anchor == .topTrailing ? 70 : 0)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
            .animation(.spring(duration: 0.4), value: step)
        }
    }

    private var tooltipCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: pages[step].icon)
                    .foregroundStyle(.brand)
                Text(pages[step].title)
                    .font(.callout.weight(.bold))
                Spacer()
                Text("\(step + 1) / \(pages.count)")
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            Text(pages[step].body)
                .font(.footnote)
                .foregroundStyle(.secondary)
            HStack(spacing: 10) {
                Button {
                    Task { await Haptics.impact(.light) }
                    onComplete()
                } label: {
                    Text("Skip all")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.appBackground)
                        .foregroundStyle(.textSecondary)
                        .clipShape(.capsule)
                        .overlay(Capsule().stroke(Color.hairline, lineWidth: 0.8))
                }
                .buttonStyle(.plain)

                Button {
                    Task { await Haptics.impact(.light) }
                    if step + 1 >= pages.count {
                        onComplete()
                    } else {
                        step += 1
                    }
                } label: {
                    Text(step + 1 >= pages.count ? "Got it" : "Next")
                        .font(.caption.weight(.semibold))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(
                            LinearGradient(
                                colors: [.brand, .brandGlow],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .foregroundStyle(.white)
                        .clipShape(.capsule)
                }
                .buttonStyle(.plain)
                Spacer()
            }
        }
        .padding(14)
        .background(Color.cardBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.brand.opacity(0.5), lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 14))
        .shadow(color: .black.opacity(0.12), radius: 14, y: 6)
        .frame(maxWidth: 360)
    }

    private struct Page {
        let title: String
        let body: String
        let anchor: Alignment
        let icon: String
    }
}
