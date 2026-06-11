import SwiftUI

// Light, premium palette — matches the App Store screenshots + the web app.
// Brand stays #FF3366. The app renders in light mode (see ClipForgeApp).
//
// Usage rules (followed across the views during the dark→light re-theme):
//   • Text sitting on appBackground / cardBackground → .textPrimary / .textSecondary
//   • White text on a brand / colored / gradient / media surface → KEEP .white
//   • Surfaces → .appBackground (page) / .cardBackground (cards) / .hairline (borders)
extension Color {
    static let brand = Color(red: 1.0, green: 0.20, blue: 0.40)          // #FF3366
    static let brandGlow = Color(red: 1.0, green: 0.40, blue: 0.60)      // #FF6699

    static let appBackground = Color(red: 0.996, green: 0.976, blue: 0.984)  // barely-pink off-white page
    static let cardBackground = Color(red: 1.0, green: 1.0, blue: 1.0)        // clean white cards

    static let textPrimary = Color(red: 0.09, green: 0.07, blue: 0.13)        // soft near-black
    static let textSecondary = Color(red: 0.42, green: 0.40, blue: 0.46)      // muted gray
    static let hairline = Color(red: 0.93, green: 0.89, blue: 0.91)           // soft rose-gray border
}

// Lets brand + the semantic text/surface colors resolve in any ShapeStyle
// context (foregroundStyle, fill, etc.).
extension ShapeStyle where Self == Color {
    static var brand: Color { .brand }
    static var brandGlow: Color { .brandGlow }
    static var textPrimary: Color { .textPrimary }
    static var textSecondary: Color { .textSecondary }
    static var cardBackground: Color { .cardBackground }
    static var appBackground: Color { .appBackground }
    static var hairline: Color { .hairline }
}
