import Foundation
import SwiftUI

/// The app's strings come from Localizable.xcstrings by key ("week.title"), in eight languages:
/// en, de, es, tr, fr, ja, ar (right to left) and pl. The language is the phone's (or the one
/// chosen for DentVideo in iOS Settings); the video language is a clinic setting, separate from it.
func L(_ key: String) -> String {
    Bundle.main.localizedString(forKey: key, value: nil, table: nil)
}

/// A string with %@ / %lld placeholders filled in the app's locale.
func L(_ key: String, _ args: CVarArg...) -> String {
    String(format: L(key), locale: L10n.locale, arguments: args)
}

enum L10n {
    static let supported = ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"]

    /// The language the interface is showing (one of `supported`).
    static var languageCode: String {
        let code = Bundle.main.preferredLocalizations.first.map { String($0.prefix(2)) } ?? "en"
        return supported.contains(code) ? code : "en"
    }

    static var locale: Locale { Locale(identifier: languageCode) }

    static func languageName(_ code: String) -> String {
        Locale(identifier: languageCode).localizedString(forLanguageCode: code)?.capitalized(with: locale) ?? code
    }

    static func countryName(_ code: String) -> String {
        Locale(identifier: languageCode).localizedString(forRegionCode: code) ?? code
    }

    static func weekRange(_ week: String) -> String {
        guard let start = DentVideoCoreBridge.day(week) else { return week }
        let end = start.addingTimeInterval(4 * 86_400)
        let f = DateIntervalFormatter()
        f.locale = locale
        f.timeZone = TimeZone(identifier: "UTC")
        f.dateTemplate = "dMMM"
        return f.string(from: start, to: end)
    }
}
