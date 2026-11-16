import SwiftUI

/// docs/BRAND.md: teal on warm paper, ink text, no neon.
extension Color {
    static let dvTeal = Color(red: 0x0f / 255, green: 0x5c / 255, blue: 0x5c / 255)
    static let dvTeal600 = Color(red: 0x16 / 255, green: 0x72 / 255, blue: 0x69 / 255)
    static let dvTeal300 = Color(red: 0x8f / 255, green: 0xd1 / 255, blue: 0xc6 / 255)
    static let dvTint = Color(red: 0xee / 255, green: 0xf5 / 255, blue: 0xf2 / 255)
    static let dvPaper = Color(red: 0xfa / 255, green: 0xf7 / 255, blue: 0xf2 / 255)
    static let dvSand = Color(red: 0xf5 / 255, green: 0xef / 255, blue: 0xe6 / 255)
    static let dvLine = Color(red: 0xe8 / 255, green: 0xe1 / 255, blue: 0xd5 / 255)
    static let dvInk = Color(red: 0x14 / 255, green: 0x21 / 255, blue: 0x1f / 255)
    static let dvBody = Color(red: 0x3d / 255, green: 0x4c / 255, blue: 0x49 / 255)
    static let dvMuted = Color(red: 0x5b / 255, green: 0x6a / 255, blue: 0x67 / 255)
    static let dvClay = Color(red: 0xb6 / 255, green: 0x77 / 255, blue: 0x4f / 255)
}

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(Color.dvTeal.opacity(configuration.isPressed ? 0.85 : 1), in: .rect(cornerRadius: 14))
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.body.weight(.semibold))
            .foregroundStyle(Color.dvTeal)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(Color.dvTint.opacity(configuration.isPressed ? 0.7 : 1), in: .rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.dvTeal.opacity(0.25)))
    }
}

/// The app's mark: the tooth-play tile from the site, drawn natively.
struct BrandMark: View {
    var size: CGFloat = 56
    var body: some View {
        Image("Mark")
            .resizable()
            .frame(width: size, height: size)
            .clipShape(.rect(cornerRadius: size * 0.25))
            .accessibilityHidden(true)
    }
}

/// The one line every video screen carries (App Review 1.4.1, and the truth:
/// the clinic decides, the video is general information).
struct EducationNote: View {
    var body: some View {
        Label {
            Text("General patient information, not a diagnosis. Nothing is shared until your dentist approves it.")
        } icon: {
            Image(systemName: "stethoscope")
        }
        .font(.footnote)
        .foregroundStyle(Color.dvMuted)
    }
}
