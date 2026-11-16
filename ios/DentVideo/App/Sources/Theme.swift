import SwiftUI

/// dentvideo.com's design system (docs/SITE_RESEARCH.md, web tailwind `dv` tokens), native:
/// deep teal, warm paper and sand, serif headings, one soft shadow, generous spacing.
enum Theme {
    static let teal = Color("Teal")            // #0f5c5c / dark: #8fd1c6
    static let tealDeep = Color("TealDeep")    // #082e2d / dark: #dcebe7
    static let paper = Color("Paper")          // #faf7f2 / dark: #0b1716
    static let sand = Color("Sand")            // #f5efe6 / dark: #13211f
    static let card = Color("Card")            // #ffffff / dark: #16302d
    static let ink = Color("Ink")              // #14211f / dark: #f2efe9
    static let body = Color("Body")            // #3d4c49 / dark: #c9d3d0
    static let muted = Color("Muted")          // #5b6a67 / dark: #9fb0ac
    static let line = Color("Line")            // #e8e1d5 / dark: #23403c
    static let amber = Color("Amber")          // "needs a look": #7a4b00 on #fdf1dc
    static let amberSoft = Color("AmberSoft")
    static let danger = Color("Danger")        // #8a1f1f / dark: #f2b8b8

    static let radius: CGFloat = 20
    static let radiusSmall: CGFloat = 12
    static let gutter: CGFloat = 20

    /// Serif headings, scaled with Dynamic Type (New York: the system's counterpart of Instrument Serif).
    static func display(_ style: Font.TextStyle = .largeTitle) -> Font { .system(style, design: .serif).weight(.regular) }
}

struct CardBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(Theme.line, lineWidth: 1))
            .shadow(color: Theme.ink.opacity(0.06), radius: 16, x: 0, y: 8)
    }
}

extension View {
    func dvCard() -> some View { modifier(CardBackground()) }
}

struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(Color.white)
            .frame(maxWidth: .infinity, minHeight: 50)
            .padding(.horizontal, 16)
            .background(Theme.teal.opacity(enabled ? (configuration.isPressed ? 0.85 : 1) : 0.4), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .contentShape(Rectangle())
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(Theme.teal)
            .frame(maxWidth: .infinity, minHeight: 50)
            .padding(.horizontal, 16)
            .background(Theme.sand.opacity(configuration.isPressed ? 0.7 : 1), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(Theme.line, lineWidth: 1))
            .contentShape(Rectangle())
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle { static var dvPrimary: PrimaryButtonStyle { .init() } }
extension ButtonStyle where Self == SecondaryButtonStyle { static var dvSecondary: SecondaryButtonStyle { .init() } }
