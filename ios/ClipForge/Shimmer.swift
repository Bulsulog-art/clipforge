import SwiftUI

/// Animated shimmer overlay used by skeleton placeholders.
/// Apply via `.shimmer()` on any opaque rect/shape.
struct ShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = -1

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        gradient: Gradient(stops: [
                            .init(color: .clear,                location: 0),
                            .init(color: .white.opacity(0.18), location: 0.5),
                            .init(color: .clear,                location: 1),
                        ]),
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 1.4)
                    .offset(x: geo.size.width * phase)
                }
                .mask(content)
            )
            .onAppear {
                withAnimation(.linear(duration: 1.3).repeatForever(autoreverses: false)) {
                    phase = 1.4
                }
            }
            .allowsHitTesting(false)
    }
}

extension View {
    func shimmer() -> some View { modifier(ShimmerModifier()) }
}

/// Rounded skeleton rectangle building block.
struct SkeletonBlock: View {
    var width: CGFloat? = nil
    var height: CGFloat = 14
    var corner: CGFloat = 6

    var body: some View {
        RoundedRectangle(cornerRadius: corner, style: .continuous)
            .fill(Color.white.opacity(0.06))
            .frame(width: width, height: height)
            .shimmer()
    }
}

/// Skeleton row matching the JobRow visual rhythm in ProjectsView so the
/// transition from skeleton → real content is jitter-free.
struct ProjectRowSkeleton: View {
    var body: some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.white.opacity(0.06))
                .frame(width: 56, height: 56)
                .shimmer()
            VStack(alignment: .leading, spacing: 8) {
                SkeletonBlock(width: 180, height: 14)
                SkeletonBlock(width: 110, height: 10)
            }
            Spacer()
            SkeletonBlock(width: 40, height: 10)
        }
        .padding()
        .background(Color.cardBackground)
        .clipShape(.rect(cornerRadius: 14))
    }
}

/// Skeleton grid cell matching a JobDetailView clip thumb so the layout
/// doesn't jump when the real clips arrive.
struct ClipCellSkeleton: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 10, style: .continuous)
                .fill(Color.white.opacity(0.06))
                .aspectRatio(9.0/16.0, contentMode: .fit)
                .shimmer()
            SkeletonBlock(width: 110, height: 11)
            SkeletonBlock(width: 60, height: 9)
        }
    }
}
