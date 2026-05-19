import SwiftUI

/// SwiftUI confetti burst. Pure SwiftUI — no third-party deps, no UIKit hacks.
/// Fires `count` particles outward from the source point with a tiny physics
/// arc, fading out over `duration` seconds.
///
/// Use case: when a user's first clip set finishes rendering, drop this on
/// the JobDetailView via `.overlay`. Auto-dismisses.
struct ConfettiBurst: View {
    let count: Int
    let duration: Double

    @State private var fired = false

    var body: some View {
        ZStack {
            ForEach(0..<count, id: \.self) { i in
                Particle(seed: i, fired: fired, duration: duration)
            }
        }
        .allowsHitTesting(false)
        .onAppear {
            // start the animation a tick after mount so geometry has settled
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                fired = true
            }
        }
    }

    private struct Particle: View {
        let seed: Int
        let fired: Bool
        let duration: Double

        var body: some View {
            // Deterministic pseudo-random based on seed so we don't re-roll
            // on every render and break the animation curve.
            var rng = SeededRNG(seed: UInt64(seed))
            let dx = CGFloat(rng.next(-180, 180))
            let dy = CGFloat(rng.next(-360, -80))
            let rotation = Double(rng.next(-540, 540))
            let scale = CGFloat(rng.next(0.6, 1.2))
            let palette: [Color] = [.brand, .brandGlow, .yellow, .green, .cyan, .pink]
            let color = palette[seed % palette.count]
            let shape = seed % 3

            Group {
                switch shape {
                case 0:
                    Rectangle().fill(color)
                case 1:
                    Circle().fill(color)
                default:
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(color)
                        .frame(width: 8, height: 3)
                }
            }
            .frame(width: 8, height: 8)
            .scaleEffect(fired ? scale : 0.1)
            .opacity(fired ? 0 : 1)
            .rotationEffect(.degrees(fired ? rotation : 0))
            .offset(x: fired ? dx : 0, y: fired ? dy : 0)
            .animation(
                .timingCurve(0.18, 0.62, 0.4, 1, duration: duration)
                    .delay(Double(seed) * 0.005),
                value: fired
            )
        }
    }
}

/// Tiny seedable RNG so each particle gets a deterministic trajectory.
private struct SeededRNG {
    private var state: UInt64
    init(seed: UInt64) { state = seed &* 2_862_933_555_777_941_757 &+ 1 }
    mutating func nextRaw() -> UInt64 {
        state = state &* 6_364_136_223_846_793_005 &+ 1_442_695_040_888_963_407
        return state
    }
    mutating func next(_ lo: Double, _ hi: Double) -> Double {
        let r = Double(nextRaw() >> 11) / Double(1 << 53)
        return lo + r * (hi - lo)
    }
}

/// Modifier: drops a confetti burst over a view when `trigger` flips true.
extension View {
    func confettiOverlay(trigger: Bool, count: Int = 80, duration: Double = 1.6) -> some View {
        overlay {
            if trigger {
                ConfettiBurst(count: count, duration: duration)
                    .id(UUID()) // re-mount each trigger
            }
        }
    }
}
