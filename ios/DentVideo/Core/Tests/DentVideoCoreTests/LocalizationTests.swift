import Foundation
import XCTest
@testable import DentVideoCore

/// The app's String Catalogs (../App/Resources) are complete in all eight languages, every key the
/// app uses exists, placeholders agree, and no string offers a purchase or a price
/// (App Store guideline 3.1.3) or makes a claim CLAUDE.md forbids.
final class LocalizationTests: XCTestCase {
    static let languages = ["en", "de", "es", "tr", "fr", "ja", "ar", "pl"]
    static let appDir = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("App")

    struct Catalog: Decodable {
        struct Entry: Decodable { let localizations: [String: Loc]? }
        struct Loc: Decodable { let stringUnit: Unit? }
        struct Unit: Decodable { let state: String; let value: String }
        let sourceLanguage: String
        let strings: [String: Entry]
    }

    func load(_ name: String) throws -> [String: [String: String]] {
        let data = try Data(contentsOf: Self.appDir.appendingPathComponent("Resources/\(name).xcstrings"))
        let c = try JSONDecoder().decode(Catalog.self, from: data)
        XCTAssertEqual(c.sourceLanguage, "en")
        var out: [String: [String: String]] = [:]
        for (k, e) in c.strings {
            var m: [String: String] = [:]
            for (l, loc) in e.localizations ?? [:] {
                XCTAssertEqual(loc.stringUnit?.state, "translated", "\(name) \(k) \(l)")
                m[l] = loc.stringUnit?.value
            }
            out[k] = m
        }
        return out
    }

    /// The placeholders of a format string, by type, in argument order ("%2$@" counts as position 2).
    static func placeholders(_ s: String) -> [String] {
        let re = try! NSRegularExpression(pattern: "%(?:(\\d+)\\$)?(lld|ld|d|@|f)")
        var byPos: [Int: String] = [:]
        var next = 1
        for m in re.matches(in: s, range: NSRange(s.startIndex..., in: s)) {
            let type = String(s[Range(m.range(at: 2), in: s)!])
            if let r = Range(m.range(at: 1), in: s), let p = Int(s[r]) { byPos[p] = type } else { byPos[next] = type; next += 1 }
        }
        return byPos.keys.sorted().map { byPos[$0]! }
    }

    func testEveryStringInAllEightLanguagesWithMatchingPlaceholders() throws {
        for name in ["Localizable", "InfoPlist"] {
            let cat = try load(name)
            XCTAssertFalse(cat.isEmpty)
            for (k, m) in cat {
                let en = try XCTUnwrap(m["en"], "\(k) has no English")
                for l in Self.languages {
                    let v = try XCTUnwrap(m[l], "\(name): \(k) is missing \(l)")
                    XCTAssertFalse(v.trimmingCharacters(in: .whitespaces).isEmpty, "\(k) \(l) empty")
                    XCTAssertEqual(Self.placeholders(v), Self.placeholders(en), "\(k) \(l): placeholders differ")
                    // Words that are the same in some languages ("Notifications" in French, brand names).
                    let same: Set<String> = ["settings.notifications", "post.short", "settings.version"]
                    if l != "en" && en.count > 12 && !same.contains(k) {
                        XCTAssertNotEqual(v, en, "\(k) \(l) looks untranslated")
                    }
                }
            }
        }
    }

    func sources() throws -> String {
        let dir = Self.appDir.appendingPathComponent("Sources")
        var text = ""
        let e = FileManager.default.enumerator(at: dir, includingPropertiesForKeys: nil)!
        while let u = e.nextObject() as? URL {
            if u.pathExtension == "swift" { text += try String(contentsOf: u, encoding: .utf8) }
        }
        return text
    }

    func testEveryKeyTheAppUsesExists() throws {
        let cat = try load("Localizable")
        let text = try sources()
        let re = try NSRegularExpression(pattern: #"L\("([A-Za-z0-9_.]+)""#)
        var used = Set(re.matches(in: text, range: NSRange(text.startIndex..., in: text)).map { String(text[Range($0.range(at: 1), in: text)!]) })
        // Keys built at run time.
        used.formUnion(PlanState.allValues.map { "plan.state.\($0)" })
        used.formUnion(ReviewReason.allCases.map { "reason.\($0.rawValue)" })
        used.formUnion(WeekBoard.CardState.allCases.map { "state.\($0 == .notMade ? "notMade" : $0.rawValue)" })
        used.formUnion(["tooLarge", "type", "needsPlan", "quota", "network", "server"].map { "upload.problem.\($0)" })
        used.formUnion(["warm", "expert", "calm", "playful"].map { "videos.tone.\($0)" })
        used.formUnion(["videos", "clinic", "login", "billing"].map { "delete.item.\($0)" })
        XCTAssertGreaterThan(used.count, 150)
        for k in used.sorted() { XCTAssertNotNil(cat[k], "missing key \(k)") }
        let unused = Set(cat.keys).subtracting(used)
        XCTAssertTrue(unused.isEmpty, "keys nobody uses: \(unused.sorted())")
    }

    /// No price, no way to buy, no "subscribe on the web" (3.1.3), no superlatives (CLAUDE.md).
    func testNoPurchaseCallsToActionOrClaims() throws {
        let forbidden: [String: [String]] = [
            "en": ["\\bbuy\\b", "purchase", "\\bprice", "pricing", "subscribe", "upgrade", "\\bbest\\b", "#1", "\\bfree\\b", "guarantee", "discount"],
            "de": ["kaufen", "\\bpreis", "abonnieren", "upgrade", "\\bbeste", "kostenlos", "gratis"],
            "es": ["comprar", "precio", "suscríbe", "suscribir", "mejor\\b", "gratis"],
            "fr": ["acheter", "\\bprix\\b", "abonnez", "s'abonner", "meilleur", "gratuit"],
            "tr": ["satın", "fiyat", "abone ol", "en iyi", "ücretsiz"],
            "ja": ["購入", "価格", "料金", "最高", "無料"],
            "ar": ["شراء", "سعر", "اشترك", "الأفضل", "مجان"],
            "pl": ["\\bkup", "\\bcena", "\\bceny", "subskrybuj", "najlepsz", "darmow"],
        ]
        let money = try NSRegularExpression(pattern: "[€$£¥₺]|\\b\\d+[.,]?\\d*\\s?(EUR|USD|TL|TRY)\\b")
        for name in ["Localizable", "InfoPlist"] {
            for (k, m) in try load(name) {
                for (l, raw) in m {
                    // Format placeholders ("%1$lld") are not money.
                    let v = raw.replacingOccurrences(of: "%\\d+\\$", with: "%", options: .regularExpression)
                    XCTAssertNil(money.firstMatch(in: v, range: NSRange(v.startIndex..., in: v)), "\(k) \(l) shows money: \(v)")
                    XCTAssertFalse(v.lowercased().contains("dentvideo.com/start"), "\(k) \(l) links to sign-up")
                    for w in forbidden[l] ?? [] {
                        let re = try NSRegularExpression(pattern: w, options: [.caseInsensitive])
                        XCTAssertNil(re.firstMatch(in: v, range: NSRange(v.startIndex..., in: v)), "\(k) \(l) contains '\(w)': \(v)")
                    }
                }
            }
        }
    }

    /// The app's code links only to help, privacy and terms on the site: never to a sign-up or plan page.
    func testNoLinksToPlansOrCheckout() throws {
        let text = try sources()
        for bad in ["/start", "pricing", "checkout", "/plans", "billing/portal", "dodopayments"] {
            XCTAssertFalse(text.contains(bad), "app code mentions \(bad)")
        }
    }
}

extension PlanState {
    static let allValues = ["trial", "active", "paused", "cancelled", "unknown"]
}
