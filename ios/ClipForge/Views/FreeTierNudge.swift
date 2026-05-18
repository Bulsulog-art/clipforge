import SwiftUI

/// Soft Plus nudge surfaced inside the Studio tab once the user has experienced
/// a successful render but exhausted their lifetime free credit. Designed to
/// catch the "wow this is cool" moment and convert it before the user closes
/// the app.
struct FreeTierNudge: View {
    let onUpgradeTap: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.brand.opacity(0.18))
                    .frame(width: 44, height: 44)
                Image(systemName: "sparkles")
                    .font(.title3.weight(.bold))
                    .foregroundStyle(.brand)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text("Loved it? Keep clipping.")
                    .font(.callout.weight(.semibold))
                    .lineLimit(1)
                Text("Plus: 10 credits/week for $4.99 — cancel anytime.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                    .minimumScaleFactor(0.9)
            }
            Spacer(minLength: 4)
            Button {
                Task { await Haptics.impact(.medium) }
                onUpgradeTap()
            } label: {
                Text("Go Plus")
                    .font(.caption.weight(.bold))
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.brand)
                    .foregroundStyle(.white)
                    .clipShape(.capsule)
            }
            .buttonStyle(.plain)
            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.tertiary)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Dismiss")
        }
        .padding(12)
        .background(
            LinearGradient(
                colors: [Color.brand.opacity(0.18), Color.cardBackground],
                startPoint: .leading, endPoint: .trailing
            )
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .stroke(Color.brand.opacity(0.4), lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 14))
    }
}
