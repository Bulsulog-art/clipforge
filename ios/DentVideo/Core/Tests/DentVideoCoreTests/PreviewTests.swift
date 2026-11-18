import XCTest
#if canImport(FoundationNetworking)
import FoundationNetworking
#endif
@testable import DentVideoCore

/// "See it with your logo": GET preview, the library's plans (read from the web's own files, every
/// language), POST logo, and the look (colour, text colour, the logo's own colour).
final class PreviewTests: XCTestCase {
    static let library = URL(fileURLWithPath: #filePath)
        .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
        .appendingPathComponent("web/public/dentvideo/preview")

    private func api(_ t: FakeTransport, _ store: MemoryTokenStore = MemoryTokenStore(tokens())) -> APIClient {
        APIClient(baseURL: base, transport: t, store: store, languageCode: "de")
    }

    func testPreviewInfo() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/preview")
            XCTAssertEqual(r.value(forHTTPHeaderField: "Authorization"), "Bearer access-1")
            return (200, [
                "language": "de", "controlsSide": "left",
                "clinic": ["name": "Beispiel Zahnarztpraxis", "handle": "@beispiel", "brandColor": "#0E7C7B", "logoUrl": "https://liman.example/sign/u/logo.png?t=1"],
                "placeholders": ["name": "{name}", "handle": "{handle}"],
                "samples": [
                    ["id": "a", "title": "A", "service": "Implantate", "category": "implant", "seconds": 18, "planPath": "/dentvideo/preview/de/a.json", "audioPath": "/dentvideo/preview/de/a.mp3"],
                    ["id": "b", "title": "B", "service": "Bleaching", "seconds": 20, "planPath": "/dentvideo/preview/de/b.json", "audioPath": NSNull()],
                    ["id": "evil", "title": "C", "seconds": 1, "planPath": "https://elsewhere.example/x.json", "audioPath": NSNull()],
                    ["id": "up", "title": "D", "seconds": 1, "planPath": "/dentvideo/preview/../secret.json", "audioPath": NSNull()],
                ],
                "servicesWithoutSample": ["Prophylaxe"],
            ] as [String: Any], [:])
        }
        let a = api(t)
        let p = try await a.preview()
        XCTAssertEqual(p.clinic.brandColor, "#0E7C7B")
        XCTAssertEqual(p.clinic.logoUrl?.host, "liman.example")
        XCTAssertEqual(p.samples.map(\.id), ["a", "b"], "only paths inside the preview library")
        XCTAssertNil(p.samples[1].audioPath)
        XCTAssertEqual(p.servicesWithoutSample, ["Prophylaxe"])
        XCTAssertFalse(p.isRightToLeft)
        XCTAssertEqual(a.previewAudioURL(p.samples[0].audioPath)?.absoluteString, "https://dentvideo.com/dentvideo/preview/de/a.mp3")
        XCTAssertNil(a.previewAudioURL(nil))
        XCTAssertNil(a.previewAudioURL("https://elsewhere.example/a.mp3"))
    }

    func testPreviewWithoutAClinicIsARefusal() async {
        do {
            _ = try await api(FakeTransport { _ in (409, ["error": "Set up your clinic first.", "code": "no_clinic"], [:]) }).preview()
            XCTFail("should throw")
        } catch {
            XCTAssertEqual(error as? APIError, .refused(code: "no_clinic", message: "Set up your clinic first."))
        }
    }

    func testPlanComesFromTheLibraryOnTheAPIsOriginWithoutTheSession() async throws {
        let t = FakeTransport { r in
            XCTAssertEqual(r.url?.absoluteString, "https://dentvideo.com/dentvideo/preview/de/a.json")
            XCTAssertNil(r.value(forHTTPHeaderField: "Authorization"), "a public file: the session token is not sent")
            return (200, ["title": "T", "scenes": [["kind": "hook", "text": "Hallo {name}", "seconds": 3], ["kind": "cta", "text": "Fragen?", "handle": "{handle}", "seconds": 2]]], [:])
        }
        let plan = try await api(t).previewPlan(path: "/dentvideo/preview/de/a.json")
        XCTAssertEqual(plan.scenes.count, 2)
        XCTAssertEqual(plan.duration, 5)
        do {
            _ = try await api(t).previewPlan(path: "/api/dentvideo/mobile/v1/me")
            XCTFail("only library paths")
        } catch {
            XCTAssertEqual(error as? APIError, .refused(code: "not_found", message: nil))
        }
    }

    /// Every sample the web's preview library has, in every language, reads in the app: the kinds,
    /// texts and timings the native player draws.
    func testEveryLibraryPlanDecodes() throws {
        let langs = try FileManager.default.contentsOfDirectory(atPath: Self.library.path).filter { $0.count == 2 }
        XCTAssertGreaterThanOrEqual(langs.count, 8, "library at \(Self.library.path)")
        var plans = 0
        var kinds = Set<PreviewScene.Kind>()
        for l in langs {
            let dir = Self.library.appendingPathComponent(l)
            for f in try FileManager.default.contentsOfDirectory(atPath: dir.path) where f.hasSuffix(".json") {
                let raw = try Data(contentsOf: dir.appendingPathComponent(f))
                let plan = try JSONDecoder().decode(PreviewPlan.self, from: raw)
                let count = ((try JSONSerialization.jsonObject(with: raw) as? [String: Any])?["scenes"] as? [Any])?.count
                XCTAssertEqual(plan.scenes.count, count, "\(l)/\(f): every scene is a kind the app draws")
                XCTAssertGreaterThan(plan.duration, 5, "\(l)/\(f)")
                XCTAssertLessThan(plan.duration, 90, "\(l)/\(f)")
                for s in plan.scenes { kinds.insert(s.kind) }
                let filled = plan.personalised(name: "Sample Dental Practice", handle: nil)
                for s in filled.scenes { for t in s.texts { XCTAssertFalse(t.contains("{"), "\(l)/\(f): placeholder left: \(t)") } }
                plans += 1
            }
        }
        XCTAssertGreaterThan(plans, 30)
        XCTAssertTrue(kinds.isSuperset(of: [.hook, .statement, .list, .cta]))
    }

    func testPersonalisedLikeTheWeb() {
        let plan = PreviewPlan(title: "{name}", scenes: [
            PreviewScene(kind: .hook, text: "Ask {name}"),
            PreviewScene(kind: .list, heading: "{handle} says", items: ["one {name}"]),
            PreviewScene(kind: .cta, text: "Questions?", handle: "{handle}"),
        ], disclaimer: "{name}")
        let with = plan.personalised(name: " Sample Dental Practice ", handle: " @@sample_dental ")
        XCTAssertEqual(with.scenes[0].text, "Ask Sample Dental Practice")
        XCTAssertEqual(with.scenes[1].heading, "@sample_dental says")
        XCTAssertEqual(with.scenes[1].items, ["one Sample Dental Practice"])
        XCTAssertEqual(with.scenes[2].handle, "@sample_dental")
        let without = plan.personalised(name: "Sample Dental Practice", handle: "  ")
        XCTAssertNil(without.scenes[2].handle, "no handle: the chip is dropped")
        XCTAssertEqual(without.scenes[1].heading, "Sample Dental Practice says", "an inline mention falls back to the name")
        XCTAssertEqual(plan.personalised(name: "", handle: nil).scenes[0].text, "Ask …")
    }

    func testTimeline() {
        let plan = PreviewPlan(title: "", scenes: [PreviewScene(kind: .hook, seconds: 2), PreviewScene(kind: .statement, seconds: 4)])
        XCTAssertEqual(plan.scene(at: 0)?.index, 0)
        XCTAssertEqual(plan.scene(at: 1)?.progress ?? 0, 0.5, accuracy: 0.001)
        XCTAssertEqual(plan.scene(at: 2)?.index, 1)
        XCTAssertEqual(plan.scene(at: 5)?.progress ?? 0, 0.75, accuracy: 0.001)
        XCTAssertEqual(plan.scene(at: 60)?.index, 1)
        XCTAssertNil(PreviewPlan(title: "", scenes: []).scene(at: 0))
    }

    func testScenesReadEveryShape() throws {
        let json = #"{"title":"T","scenes":[{"kind":"stat","value":2,"label":"min","seconds":2},{"kind":"statement","text":"x","emphasis":"x"},{"kind":"compare","left":{"label":"Avoid","text":"a"},"right":{"label":"Use","text":"b"},"seconds":-1},{"kind":"hologram","text":"?"}]}"#
        let p = try JSONDecoder().decode(PreviewPlan.self, from: Data(json.utf8))
        XCTAssertEqual(p.scenes.map(\.kind), [.stat, .statement, .compare], "a scene kind the app does not know is left out")
        XCTAssertEqual(p.scenes[0].value, "2")
        XCTAssertEqual(p.scenes[1].emphasis, ["x"])
        XCTAssertEqual(p.scenes[1].seconds, 3, "no length: 3 seconds")
        XCTAssertEqual(p.scenes[2].seconds, 3, "a nonsense length: 3 seconds")
        XCTAssertEqual(p.scenes[2].right?.label, "Use")
    }

    func testUploadLogoSendsTheBytesAsTheirOwnType() async throws {
        let png = Data([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3])
        let t = FakeTransport { r in
            XCTAssertEqual(r.httpMethod, "POST")
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/logo")
            XCTAssertEqual(r.value(forHTTPHeaderField: "Content-Type"), "image/png")
            XCTAssertEqual(r.value(forHTTPHeaderField: "Authorization"), "Bearer access-1")
            XCTAssertEqual(r.httpBody, Data([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1, 2, 3]))
            return (200, ["path": "u1/logo-1731081600000.png", "contentType": "image/png", "logoUrl": "https://liman.example/sign/u1/logo.png"], [:])
        }
        let up = try await api(t).uploadLogo(png, contentType: "image/png")
        XCTAssertEqual(up.path, "u1/logo-1731081600000.png")
        XCTAssertEqual(up.logoUrl?.absoluteString, "https://liman.example/sign/u1/logo.png")
    }

    func testUploadLogoRefusalsAndRefresh() async throws {
        for (status, code, expected) in [
            (413, "size", APIError.refused(code: "size", message: "That logo is larger than 5 MB.")),
            (400, "type", APIError.refused(code: "type", message: "That logo is larger than 5 MB.")),
            (409, "no_clinic", APIError.refused(code: "no_clinic", message: "That logo is larger than 5 MB.")),
        ] {
            do {
                _ = try await api(FakeTransport { _ in (status, ["error": "That logo is larger than 5 MB.", "code": code], [:]) }).uploadLogo(Data([1]), contentType: "image/jpeg")
                XCTFail("should throw")
            } catch {
                XCTAssertEqual(error as? APIError, expected)
            }
        }
        // An expired token: refreshed once, and the same bytes sent again.
        let store = MemoryTokenStore(tokens("old"))
        let t = FakeTransport { r in
            if r.url!.path.hasSuffix("refresh") { return (200, tokenJSON("new", refresh: "r2"), [:]) }
            if r.value(forHTTPHeaderField: "Authorization") != "Bearer new" { return (401, ["code": "unauthorized"], [:]) }
            XCTAssertEqual(r.httpBody, Data([7, 7, 7]))
            return (200, ["path": "u1/logo-1.jpg"], [:])
        }
        let up = try await api(t, store).uploadLogo(Data([7, 7, 7]), contentType: "image/jpeg")
        XCTAssertEqual(up.path, "u1/logo-1.jpg")
        XCTAssertNil(up.logoUrl)
    }

    func testSaveBrandColorKeepsTheRestOfTheProfile() async throws {
        let profile = ClinicProfile(name: "Sample Dental Practice", city: "Springfield", country: "US", language: "en", services: ["Check-ups"], handle: "@sample")
        let t = FakeTransport { r in
            XCTAssertEqual(r.url?.path, "/api/dentvideo/mobile/v1/clinic")
            let p = bodyJSON(r)["profile"] as? [String: Any]
            XCTAssertEqual(p?["brandColor"] as? String, "8A3B4A")
            XCTAssertEqual(p?["name"] as? String, "Sample Dental Practice")
            XCTAssertEqual(p?["handle"] as? String, "sample")
            XCTAssertNil(bodyJSON(r)["logoPath"], "the app never names a logo path")
            return (200, ["id": "c"], [:])
        }
        let saved = try await api(t).saveBrandColor("8A3B4A", profile: profile)
        XCTAssertEqual(saved.brandColor, "8A3B4A")
    }

    func testColours() {
        XCTAssertEqual(PreviewLook.parse("#0f5c5c"), RGB(15.0 / 255, 92.0 / 255, 92.0 / 255))
        XCTAssertNil(PreviewLook.parse("teal"))
        XCTAssertNil(PreviewLook.parse(nil))
        XCTAssertEqual(PreviewLook.hex(PreviewLook.parse("0F5C5C")!), "0F5C5C")
        for s in PreviewLook.swatches { XCTAssertFalse(PreviewLook.prefersDarkText(on: PreviewLook.parse(s)!), "\(s): white text") }
        XCTAssertTrue(PreviewLook.prefersDarkText(on: PreviewLook.parse("F5E663")!), "a pale yellow takes dark text")
        XCTAssertTrue(PreviewLook.prefersDarkText(on: RGB(1, 1, 1)))
        XCTAssertEqual(PreviewLook.deeper(RGB(1, 0.5, 0), by: 0.5), RGB(0.5, 0.25, 0))
        XCTAssertEqual(PreviewLook.formatHandle(" @@Sample_Dental "), "@Sample_Dental")
        XCTAssertNil(PreviewLook.formatHandle(" @ "))
    }

    func testTheLogosOwnColour() {
        // 10×10: a white background, a transparent corner, and a block of clinic red with a few grey pixels.
        var px = [UInt8](repeating: 255, count: 10 * 10 * 4)
        func set(_ x: Int, _ y: Int, _ c: (UInt8, UInt8, UInt8, UInt8)) {
            let o = (y * 10 + x) * 4
            px[o] = c.0; px[o + 1] = c.1; px[o + 2] = c.2; px[o + 3] = c.3
        }
        for y in 0..<3 { for x in 0..<3 { set(x, y, (0, 0, 0, 0)) } }
        for y in 4..<9 { for x in 2..<9 { set(x, y, (0x8A, 0x3B, 0x4A, 255)) } }
        for x in 0..<4 { set(x, 9, (120, 120, 120, 255)) }
        set(9, 0, (0x1F, 0x4E, 0x79, 255))
        XCTAssertEqual(PreviewLook.suggest(rgba: px, width: 10, height: 10), "8A3B4A")
        // Black and white only: no colour to suggest.
        var bw = [UInt8](repeating: 255, count: 4 * 4 * 4)
        for i in stride(from: 0, to: bw.count, by: 8) { bw[i] = 0; bw[i + 1] = 0; bw[i + 2] = 0 }
        XCTAssertNil(PreviewLook.suggest(rgba: bw, width: 4, height: 4))
        XCTAssertNil(PreviewLook.suggest(rgba: [], width: 0, height: 0))
        XCTAssertNil(PreviewLook.suggest(rgba: [1, 2, 3], width: 4, height: 4), "too few bytes")
    }
}
