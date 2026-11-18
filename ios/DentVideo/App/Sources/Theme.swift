import SwiftUI
import UIKit

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
    /// Text and icons on a teal or danger fill. Teal and danger turn light in dark mode, so white
    /// on them would fail contrast; paper is near-white in light mode and near-black in dark mode.
    static let onFill = Color("Paper")

    // 8-point rhythm.
    static let s1: CGFloat = 4
    static let s2: CGFloat = 8
    static let s3: CGFloat = 12
    static let s4: CGFloat = 16
    static let s5: CGFloat = 24
    static let s6: CGFloat = 32

    static let radius: CGFloat = 20
    static let radiusSmall: CGFloat = 12
    static let radiusButton: CGFloat = 14
    static let gutter: CGFloat = 20
    /// Reading width on iPad and in landscape.
    static let readable: CGFloat = 680

    /// Serif headings, scaled with Dynamic Type (New York: the system's counterpart of Instrument Serif).
    static func display(_ style: Font.TextStyle = .largeTitle) -> Font { .system(style, design: .serif).weight(.regular) }

    /// Navigation bars: large titles in the serif (as on dentvideo.com), inline titles in SF, ink on paper.
    @MainActor static func configureNavigationBars() {
        let ink = UIColor(named: "Ink") ?? .label
        let base = UIFont.preferredFont(forTextStyle: .largeTitle)
        let serif = base.fontDescriptor.withDesign(.serif) ?? base.fontDescriptor
        let large = UIFontMetrics(forTextStyle: .largeTitle).scaledFont(for: UIFont(descriptor: serif, size: 34))
        let inline = UIFont.preferredFont(forTextStyle: .headline)
        let standard = UINavigationBarAppearance()
        standard.configureWithDefaultBackground()
        standard.largeTitleTextAttributes = [.font: large, .foregroundColor: ink]
        standard.titleTextAttributes = [.font: inline, .foregroundColor: ink]
        let edge = UINavigationBarAppearance()
        edge.configureWithTransparentBackground()
        edge.largeTitleTextAttributes = standard.largeTitleTextAttributes
        edge.titleTextAttributes = standard.titleTextAttributes
        let bar = UINavigationBar.appearance()
        bar.standardAppearance = standard
        bar.compactAppearance = standard
        bar.scrollEdgeAppearance = edge
    }
}

struct CardBackground: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radius, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radius, style: .continuous).strokeBorder(Theme.line, lineWidth: 1))
            .shadow(color: Color.black.opacity(0.05), radius: 14, x: 0, y: 6)
    }
}

extension View {
    func dvCard() -> some View { modifier(CardBackground()) }

    /// Rows of a Form on the app's card colour (not the system's grey, which clashes with paper).
    func dvFormRows() -> some View { listRowBackground(Theme.card) }

    /// Centre content at a readable width (iPad, landscape).
    func readableWidth(_ width: CGFloat = Theme.readable) -> some View {
        frame(maxWidth: width).frame(maxWidth: .infinity)
    }
}

struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    var fill: Color
    init(fill: Color = Theme.teal) { self.fill = fill }
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .multilineTextAlignment(.center)
            .foregroundStyle(Theme.onFill)
            .padding(.vertical, Theme.s3)
            .padding(.horizontal, Theme.s4)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(fill.opacity(enabled ? 1 : 0.4), in: RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous))
            .opacity(configuration.isPressed ? 0.85 : 1)
            .scaleEffect(configuration.isPressed ? 0.985 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
            .contentShape(Rectangle())
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var enabled
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .multilineTextAlignment(.center)
            .foregroundStyle(Theme.teal)
            .padding(.vertical, Theme.s3)
            .padding(.horizontal, Theme.s4)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(Theme.card, in: RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: Theme.radiusButton, style: .continuous).strokeBorder(Theme.line, lineWidth: 1))
            .opacity(enabled ? (configuration.isPressed ? 0.7 : 1) : 0.5)
            .contentShape(Rectangle())
    }
}

/// A quiet text button (undo, forgot password): teal, at least 44 pt tall.
struct QuietButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .foregroundStyle(configuration.role == .destructive ? Theme.danger : Theme.teal)
            .multilineTextAlignment(.center)
            .frame(minHeight: 44)
            .padding(.horizontal, Theme.s2)
            .opacity(configuration.isPressed ? 0.6 : 1)
            .contentShape(Rectangle())
    }
}

extension ButtonStyle where Self == PrimaryButtonStyle {
    static var dvPrimary: PrimaryButtonStyle { .init() }
    static var dvDestructive: PrimaryButtonStyle { .init(fill: Theme.danger) }
}
extension ButtonStyle where Self == SecondaryButtonStyle { static var dvSecondary: SecondaryButtonStyle { .init() } }
extension ButtonStyle where Self == QuietButtonStyle { static var dvQuiet: QuietButtonStyle { .init() } }
