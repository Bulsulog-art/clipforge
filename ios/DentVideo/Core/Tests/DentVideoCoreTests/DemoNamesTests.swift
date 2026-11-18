import Foundation
import XCTest

/// Demo data (the App Store screenshots, previews, UI tests) must never show a clinic name or a
/// social handle that could belong to a real practice. The demo clinic is plainly fictional in
/// every language, with the same names as the web's demo data
/// (web/src/lib/dentvid/demo-names.test.ts), and has no handle.
///
/// The names below were used before and were taken out. If one comes back anywhere in the iOS
/// app's sources, tests, scripts or configuration (ios/DentVideo), this test fails.
final class DemoNamesTests: XCTestCase {
    static let retired = [
        // The iOS demo clinic until 2026-11-18, in its eight languages, and its handle and domain.
        "Riverside", "ريفرسايد", "リバーサイド", "riversidedental", "riverside.example",
        // PreviewData and the sign-up UI test.
        "Sunrise Dental", "sunrisedental", "Lakeside Dental",
        // Retired on the web (demo-names.test.ts), kept out of the app too.
        "riverside.dental", "riverside-dental", "Smile Studio", "smilestudio", "smile_studio", "smile_clinic",
        "Harbour Smiles", "Oakwood Dental Care", "Kingsway Dental", "Brightside Dentistry", "Meadow Lane Dental", "Smile Dental",
        "Zahnarztpraxis am Park", "zahnarzt-am-park", "Zahnzentrum Mitte", "Praxis Dr. Weber", "Zahnärzte am Markt", "Lächelwerk",
        "Clínica Dental Sonrisa", "clinicasonrisa", "Dental Mediterráneo",
        "Cabinet Dentaire du Parc", "cabinet-du-parc", "Centre Dentaire Lumière", "Cabinet Dr Martin",
        "Gabinet Stomatologiczny Uśmiech", "Gabinet Uśmiech", "gabinet-usmiech", "Dentica Kraków",
        "さくら歯科", "sakura-dental", "みなと歯科",
        "عيادة الابتسامة", "مركز النور لطب الأسنان", "smile-dental.example",
        "Gülümse Diş", "gulumsedis", "Dentpark", "Beyaz Diş Kliniği",
        "demodisklinigi", "demodentalstudio", "demozahnarztpraxis", "clinicadentaldemo",
        "cabinetdentairedemo", "demo_shika_tokyo", "demodental.dubai", "gabinet.demo.krakow",
    ]

    /// The demo clinic's name per app language (App/Sources/Demo/DemoContent.swift).
    static let fictional = [
        "Sample Dental Practice", "Örnek Diş Kliniği", "Demo Zahnarztpraxis", "Clínica Dental Ejemplo",
        "Cabinet Dentaire Exemple", "サンプル歯科", "عيادة أسنان تجريبية", "Przykładowy Gabinet Stomatologiczny",
    ]

    /// ios/DentVideo
    static let root = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()

    static let textExtensions: Set<String> = ["swift", "py", "sh", "yml", "yaml", "xcstrings", "xcconfig", "json",
                                              "storekit", "plist", "xcprivacy", "entitlements", "md", "txt"]
    /// Generated or downloaded, not ours.
    static let skippedDirs: Set<String> = ["build", ".build", ".swiftpm", "DerivedData", "DentVideo.xcodeproj", "node_modules"]

    static func retiredNames(in text: String) -> [String] {
        let t = text.lowercased()
        return retired.filter { t.contains($0.lowercased()) }
    }

    static func sourceFiles() -> [URL] {
        let fm = FileManager.default
        var out: [URL] = []
        var stack = [root]
        while let dir = stack.popLast() {
            guard let names = try? fm.contentsOfDirectory(atPath: dir.path) else { continue }
            for name in names.sorted() where !name.hasPrefix(".") && !skippedDirs.contains(name) {
                let url = dir.appendingPathComponent(name)
                var isDir: ObjCBool = false
                guard fm.fileExists(atPath: url.path, isDirectory: &isDir) else { continue }
                if isDir.boolValue { stack.append(url) } else if textExtensions.contains(url.pathExtension.lowercased()) { out.append(url) }
            }
        }
        return out
    }

    func testTheMatcherCatchesEveryRetiredNameAndPassesTheFictionalOnes() {
        for n in Self.retired {
            XCTAssertTrue(Self.retiredNames(in: "x \(n.uppercased()) y").contains(n), n)
        }
        XCTAssertEqual(Self.retiredNames(in: Self.fictional.joined(separator: " | ") + " hello@sample.example https://sample.example/book"), [])
    }

    func testNoRetiredNameInTheIOSSources() throws {
        let files = Self.sourceFiles()
        // The scan must see the app, its tests and its scripts, or it proves nothing.
        let paths = files.map { $0.path }
        for expected in ["App/Sources/Demo/DemoContent.swift", "App/Sources/PreviewData.swift", "Tests/UI/JourneyTests.swift",
                         "scripts/screens.sh", "scripts/appstore_shots.py", "project.yml"] {
            XCTAssertTrue(paths.contains { $0.hasSuffix("/" + expected) }, "scan missed \(expected)")
        }
        let me = URL(fileURLWithPath: #filePath).standardizedFileURL.path
        var found: [String] = []
        for f in files where f.standardizedFileURL.path != me {
            guard let text = try? String(contentsOf: f, encoding: .utf8) else { continue }
            for n in Self.retiredNames(in: text) {
                found.append("\(f.path.replacingOccurrences(of: Self.root.path + "/", with: "")): \(n)")
            }
        }
        XCTAssertEqual(found, [], "retired demo names are back; use the fictional names in DemoContent.swift")
    }

    func testTheDemoClinicHasTheFictionalNameInEveryLanguageAndNoHandle() throws {
        let demo = Self.root.appendingPathComponent("App/Sources/Demo")
        let content = try String(contentsOf: demo.appendingPathComponent("DemoContent.swift"), encoding: .utf8)
        let re = try NSRegularExpression(pattern: #"clinic: "([^"]+)""#)
        let names = re.matches(in: content, range: NSRange(content.startIndex..., in: content)).compactMap {
            Range($0.range(at: 1), in: content).map { String(content[$0]) }
        }
        XCTAssertEqual(Set(names), Set(Self.fictional))
        XCTAssertEqual(names.count, Self.fictional.count)

        // A demo profile carries no social handle (nil, or not passed at all).
        for file in ["Demo.swift", "DemoContent.swift", "DemoPurchases.swift"] {
            let text = try String(contentsOf: demo.appendingPathComponent(file), encoding: .utf8)
            XCTAssertNil(text.range(of: #"handle: ""#), "\(file) gives the demo clinic a handle")
        }
        let preview = try String(contentsOf: Self.root.appendingPathComponent("App/Sources/PreviewData.swift"), encoding: .utf8)
        XCTAssertNil(preview.range(of: #"handle: ""#), "PreviewData gives the sample clinic a handle")
    }
}
