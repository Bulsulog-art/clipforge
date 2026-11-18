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

    /// Words that sell: allowed only on the App Store purchase screens (`paywall.*` keys, guideline
    /// 3.1.1 in-app purchase). Everywhere else the app neither sells nor points to buying.
    static let purchaseWords: [String: [String]] = [
        "en": ["\\bbuy\\b", "purchase", "\\bprice", "pricing", "subscribe", "upgrade"],
        "de": ["kaufen", "\\bpreis", "abonnieren", "upgrade"],
        "es": ["comprar", "precio", "suscríbe", "suscribir"],
        "fr": ["acheter", "\\bprix\\b", "abonnez", "s'abonner"],
        "tr": ["satın", "fiyat", "abone ol"],
        "ja": ["購入", "価格", "料金"],
        "ar": ["شراء", "سعر", "اشترك"],
        "pl": ["\\bkup", "\\bcena", "\\bceny", "subskrybuj"],
    ]

    /// Claims CLAUDE.md forbids, in every string, the purchase screens included.
    static let claimWords: [String: [String]] = [
        "en": ["\\bbest\\b", "#1", "\\bfree\\b", "guarantee", "discount"],
        "de": ["\\bbeste", "kostenlos", "gratis"],
        "es": ["mejor\\b", "gratis"],
        "fr": ["meilleur", "gratuit"],
        "tr": ["en iyi", "ücretsiz"],
        "ja": ["最高", "無料"],
        "ar": ["الأفضل", "مجان"],
        "pl": ["najlepsz", "darmow"],
    ]

    /// Dark patterns the purchase screens must not use: fake urgency, discounts, trials, savings.
    static let pressureWords: [String: [String]] = [
        "en": ["limited", "hurry", "today only", "last chance", "\\btrial\\b", "\\bsave\\b", "\\boffer\\b", "\\d+\\s?%", "\\bsale\\b"],
        "de": ["rabatt", "nur heute", "begrenzt", "testphase", "probe", "angebot", "sparen", "\\d+\\s?%"],
        "es": ["descuento", "solo hoy", "limitad", "prueba", "oferta", "ahorra", "\\d+\\s?%"],
        "fr": ["remise", "réduction", "aujourd'hui seulement", "limité", "essai", "offre", "économis", "\\d+\\s?%"],
        "tr": ["indirim", "sadece bugün", "sınırlı", "deneme", "fırsat", "kampanya", "\\d+\\s?%"],
        "ja": ["割引", "今だけ", "期間限定", "お試し期間", "無料体験", "セール", "\\d+\\s?[%％]"],
        "ar": ["(^|\\s)خصم", "محدودة", "تجربة", "عرض خاص", "وفّر", "\\d+\\s?%"],
        "pl": ["rabat", "zniżk", "tylko dziś", "ograniczon", "próbn", "okazj", "promocj", "\\d+\\s?%"],
    ]

    /// No price in any string (the paywall shows StoreKit's own, through a placeholder), no link to
    /// the web's sign-up, no superlatives (CLAUDE.md). Words that sell only on the purchase screens
    /// (`paywall.*`), and those screens use no pressure (no urgency, discount, trial or savings).
    func testNoPurchaseCallsToActionOrClaims() throws {
        let money = try NSRegularExpression(pattern: "[€$£¥₺]|\\b\\d+[.,]?\\d*\\s?(EUR|USD|TL|TRY)\\b")
        var paywallKeys = 0
        for name in ["Localizable", "InfoPlist"] {
            for (k, m) in try load(name) {
                let purchaseScreen = name == "Localizable" && k.hasPrefix("paywall.")
                if purchaseScreen { paywallKeys += 1 }
                for (l, raw) in m {
                    // Format placeholders ("%1$lld", "%@") are not money and not percentages.
                    let v = raw.replacingOccurrences(of: "%\\d+\\$", with: "%", options: .regularExpression)
                        .replacingOccurrences(of: "%(@|lld|ld|d|f)", with: "", options: .regularExpression)
                    XCTAssertNil(money.firstMatch(in: v, range: NSRange(v.startIndex..., in: v)), "\(k) \(l) shows money: \(v)")
                    XCTAssertFalse(v.lowercased().contains("dentvideo.com/start"), "\(k) \(l) links to sign-up")
                    let words = (Self.claimWords[l] ?? []) + (purchaseScreen ? (Self.pressureWords[l] ?? []) : (Self.purchaseWords[l] ?? []))
                    for w in words {
                        let re = try NSRegularExpression(pattern: w, options: [.caseInsensitive])
                        XCTAssertNil(re.firstMatch(in: v, range: NSRange(v.startIndex..., in: v)), "\(k) \(l) contains '\(w)': \(v)")
                    }
                }
            }
        }
        XCTAssertGreaterThan(paywallKeys, 10, "the purchase screens' strings are checked")
    }

    /// The paywall's price comes from StoreKit (a placeholder), and its disclosures are there in
    /// every language: auto-renewal, how to cancel, restore (guideline 3.1.2).
    func testPaywallDisclosures() throws {
        let cat = try load("Localizable")
        for l in Self.languages {
            XCTAssertEqual(Self.placeholders(try XCTUnwrap(cat["paywall.perMonth"]?[l])), ["@"], l)
            let terms = try XCTUnwrap(cat["paywall.terms"]?[l])
            XCTAssertTrue(terms.contains("24"), "\(l): cancel 24 hours before the period ends")
            XCTAssertNotNil(cat["paywall.restore"]?[l])
            XCTAssertNotNil(cat["legal.terms"]?[l])
            XCTAssertNotNil(cat["legal.privacy"]?[l])
        }
    }

    /// The owner's copy rule: no em dash and no spaced en dash in anything the user reads. Number
    /// ranges written with an unspaced en dash ("16–20 Kas") are fine.
    static func dashProblem(_ s: String) -> String? {
        if s.contains("\u{2014}") { return "em dash" }
        if s.range(of: "(^|\\s)\u{2013}(\\s|$)", options: .regularExpression) != nil { return "spaced en dash" }
        return nil
    }

    func testDashRuleItself() {
        XCTAssertEqual(Self.dashProblem("Short pause — have a look."), "em dash")
        XCTAssertEqual(Self.dashProblem("—"), "em dash")
        XCTAssertEqual(Self.dashProblem("Kurze Pause – bitte ansehen."), "spaced en dash")
        XCTAssertEqual(Self.dashProblem("leise –\nbitte"), "spaced en dash")
        XCTAssertNil(Self.dashProblem("16–20 Kas"))
        XCTAssertNil(Self.dashProblem("Short pause. Have a look before posting."))
        XCTAssertNil(Self.dashProblem("on-screen"))
    }

    func testNoEmDashOrSpacedEnDashInAnyLocalizedValue() throws {
        var checked = 0
        for name in ["Localizable", "InfoPlist"] {
            for (k, m) in try load(name) {
                for (l, v) in m {
                    checked += 1
                    XCTAssertNil(Self.dashProblem(v), "\(name) \(k) \(l) has an \(Self.dashProblem(v) ?? ""): \(v)")
                }
            }
        }
        XCTAssertGreaterThan(checked, 1000)
    }

    /// The same rule for text written straight into the app's Swift code (string literals outside comments).
    func testNoEmDashOrSpacedEnDashInSwiftStringLiterals() throws {
        let literal = try NSRegularExpression(pattern: #""(?:[^"\\\n]|\\.)*""#)
        let dir = Self.appDir.appendingPathComponent("Sources")
        let e = FileManager.default.enumerator(at: dir, includingPropertiesForKeys: nil)!
        while let u = e.nextObject() as? URL {
            guard u.pathExtension == "swift" else { continue }
            for (i, line) in try String(contentsOf: u, encoding: .utf8).components(separatedBy: "\n").enumerated() {
                if line.trimmingCharacters(in: .whitespaces).hasPrefix("//") { continue }
                for m in literal.matches(in: line, range: NSRange(line.startIndex..., in: line)) {
                    let s = String(line[Range(m.range, in: line)!])
                    XCTAssertNil(Self.dashProblem(s), "\(u.lastPathComponent):\(i + 1) \(s)")
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
