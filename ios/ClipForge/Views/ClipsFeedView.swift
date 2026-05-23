import SwiftUI
import AVKit

/// Vertical paged feed of rendered clips — the TikTok/Reels mental model.
/// Each card autoplays only when in view (via scrollPosition tracking).
struct ClipsFeedView: View {
    @EnvironmentObject private var appState: AppState
    @StateObject private var vm = ClipsFeedViewModel()
    @State private var scrollPosition: String?
    @State private var actionsClip: Clip?
    @State private var publishClip: Clip?

    var body: some View {
        NavigationStack {
            GeometryReader { proxy in
                Group {
                    if vm.loading && vm.clips.isEmpty {
                        loadingState
                    } else if vm.clips.isEmpty {
                        emptyState
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 0) {
                                ForEach(vm.clips) { clip in
                                    ClipCard(
                                        clip: clip,
                                        isVisible: scrollPosition == clip.id,
                                        onActions: { actionsClip = clip },
                                        onPublish: { publishClip = clip }
                                    )
                                    .frame(width: proxy.size.width, height: proxy.size.height)
                                    .id(clip.id)
                                }
                            }
                            .scrollTargetLayout()
                        }
                        .scrollTargetBehavior(.paging)
                        .scrollPosition(id: $scrollPosition)
                        .ignoresSafeArea(edges: .bottom)
                        .refreshable { await vm.load() }
                    }
                }
            }
            .task { await vm.load() }
            .navigationBarHidden(true)
            .onAppear {
                // Seed scrollPosition with the first clip on entry so it starts
                // playing immediately instead of waiting for the user to scroll.
                if scrollPosition == nil { scrollPosition = vm.clips.first?.id }
            }
            .onChange(of: vm.clips.first?.id) { _, newId in
                if scrollPosition == nil { scrollPosition = newId }
            }
            .onChange(of: appState.pendingClipId) { _, newId in
                guard let newId else { return }
                Task { await openDeeplinkClip(id: newId) }
            }
            .sheet(item: $actionsClip) { clip in
                ClipActionsSheet(clip: clip)
            }
            .sheet(item: $publishClip) { clip in
                ClipPublishSheet(clip: clip)
            }
        }
    }

    private var loadingState: some View {
        ZStack {
            Color.cardBackground.ignoresSafeArea()
            VStack(alignment: .leading, spacing: 20) {
                Spacer()
                SkeletonBlock(width: 220, height: 22)
                SkeletonBlock(width: 280, height: 14)
                SkeletonBlock(width: 180, height: 14)
            }
            .padding(28)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 14) {
            Image(systemName: "play.rectangle.on.rectangle")
                .font(.system(size: 50))
                .foregroundStyle(.brand)
            Text("No clips yet")
                .font(.title3.bold())
            Text("Create a project in the Studio tab — your finished clips will appear here.")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
                .minimumScaleFactor(0.9)
            Button("Go to Studio") {
                appState.selectedTab = .studio
            }
            .buttonStyle(.borderedProminent)
            .tint(.brand)
            .padding(.top, 6)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private func openDeeplinkClip(id: String) async {
        if !vm.clips.contains(where: { $0.id == id }) {
            await vm.load()
        }
        if vm.clips.contains(where: { $0.id == id }) {
            withAnimation(.easeInOut) { scrollPosition = id }
        }
        appState.pendingClipId = nil
    }
}

/// One card in the vertical feed. Hosts a `ClipVideoPlayer` in feed mode +
/// a right-side action column (Publish / AI tools).
private struct ClipCard: View {
    let clip: Clip
    let isVisible: Bool
    let onActions: () -> Void
    let onPublish: () -> Void

    var body: some View {
        ZStack(alignment: .trailing) {
            ClipVideoPlayer(
                clip: clip,
                mode: .feed,
                isVisible: isVisible
            )

            // Right-side action column — TikTok pattern, vertical stack with
            // the most-used actions surfacing first.
            actionColumn
        }
    }

    private var actionColumn: some View {
        VStack(spacing: 18) {
            Spacer()
            actionButton(systemImage: "paperplane.fill",
                         tint: .brand,
                         glow: true,
                         accessibilityLabel: "Publish to channels",
                         action: onPublish)
            actionButton(systemImage: "sparkles",
                         tint: .white,
                         glow: false,
                         accessibilityLabel: "AI tools",
                         action: onActions)
        }
        .padding(.trailing, 14)
        .padding(.bottom, 140)
        .frame(maxHeight: .infinity, alignment: .bottom)
    }

    private func actionButton(
        systemImage: String,
        tint: Color,
        glow: Bool,
        accessibilityLabel: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: {
            action()
            Task { await Haptics.impact(.medium) }
        }) {
            ZStack {
                Circle()
                    .fill(glow
                          ? AnyShapeStyle(LinearGradient(
                                colors: [.brand, .brandGlow],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing))
                          : AnyShapeStyle(.black.opacity(0.4)))
                    .frame(width: 46, height: 46)
                    .overlay(Circle().stroke(.white.opacity(0.18), lineWidth: 0.6))
                Image(systemName: systemImage)
                    .font(.callout.weight(.bold))
                    .foregroundStyle(.white)
            }
            .shadow(color: glow ? .brand.opacity(0.45) : .black.opacity(0.4),
                    radius: glow ? 10 : 4)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityLabel)
    }
}
