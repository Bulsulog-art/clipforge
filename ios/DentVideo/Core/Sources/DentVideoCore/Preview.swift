import Foundation

// "See it with your logo" before the paywall: the same static, already-reviewed sample library the
// web's live preview plays (web/src/lib/dentvid/preview-library.ts, public/dentvideo/preview/<lang>/),
// painted on the phone in the clinic's colour, with its logo and name. GET mobile/v1/preview names
// the samples; each sample is a scene plan (JSON) and, when narrated, an MP3 on the API's origin.
// Nothing is generated and no model is called.

/// GET mobile/v1/preview.
public struct PreviewInfo: Codable, Sendable, Equatable {
    public struct ClinicLook: Codable, Sendable, Equatable {
        public var name: String
        public var handle: String?
        /// "#RRGGBB" or nil.
        public var brandColor: String?
        public var logoUrl: URL?

        enum CodingKeys: String, CodingKey { case name, handle, brandColor, logoUrl }

        public init(name: String, handle: String? = nil, brandColor: String? = nil, logoUrl: URL? = nil) {
            self.name = name
            self.handle = handle
            self.brandColor = brandColor
            self.logoUrl = logoUrl
        }

        public init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            name = (try? c.decodeIfPresent(String.self, forKey: .name)) ?? ""
            handle = try? c.decodeIfPresent(String.self, forKey: .handle)
            brandColor = try? c.decodeIfPresent(String.self, forKey: .brandColor)
            logoUrl = VideoItem.webURL(try? c.decodeIfPresent(String.self, forKey: .logoUrl))
        }
    }

    public struct Sample: Codable, Sendable, Equatable, Identifiable {
        public var id: String
        public var title: String
        public var service: String?
        public var seconds: Double?
        /// "/dentvideo/preview/<lang>/<id>.json" on the API's origin.
        public var planPath: String
        /// The narration, or nil for a silent sample.
        public var audioPath: String?

        public init(id: String, title: String, service: String? = nil, seconds: Double? = nil, planPath: String, audioPath: String? = nil) {
            self.id = id
            self.title = title
            self.service = service
            self.seconds = seconds
            self.planPath = planPath
            self.audioPath = audioPath
        }
    }

    /// The library language of the samples (a clinic language without samples falls back to English).
    public var language: String
    /// The top corner the play and sound buttons sit in: the one the logo is not in.
    public var controlsSide: String
    public var clinic: ClinicLook
    public var samples: [Sample]
    /// Services the clinic chose that have no sample in its language yet.
    public var servicesWithoutSample: [String]

    public init(language: String, controlsSide: String, clinic: ClinicLook, samples: [Sample], servicesWithoutSample: [String] = []) {
        self.language = language
        self.controlsSide = controlsSide
        self.clinic = clinic
        self.samples = samples
        self.servicesWithoutSample = servicesWithoutSample
    }

    enum CodingKeys: String, CodingKey { case language, controlsSide, clinic, samples, servicesWithoutSample }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        language = (try? c.decodeIfPresent(String.self, forKey: .language)) ?? "en"
        controlsSide = (try? c.decodeIfPresent(String.self, forKey: .controlsSide)) ?? "left"
        clinic = try c.decode(ClinicLook.self, forKey: .clinic)
        // Only paths on our own origin, under the preview library: never another host.
        samples = (try c.decode([Sample].self, forKey: .samples)).filter { PreviewInfo.isLibraryPath($0.planPath) }.map { s in
            var s = s
            if let a = s.audioPath, !PreviewInfo.isLibraryPath(a) { s.audioPath = nil }
            return s
        }
        servicesWithoutSample = (try? c.decodeIfPresent([String].self, forKey: .servicesWithoutSample)) ?? []
    }

    public var isRightToLeft: Bool { language == "ar" }

    static func isLibraryPath(_ p: String) -> Bool {
        p.hasPrefix("/dentvideo/preview/") && !p.contains("..") && !p.contains("//") && !p.contains("?")
    }
}

/// POST mobile/v1/logo: where the server stored the logo, and a signed address to show it.
public struct LogoUpload: Codable, Sendable, Equatable {
    public var path: String
    public var contentType: String?
    public var logoUrl: URL?

    enum CodingKeys: String, CodingKey { case path, contentType, logoUrl }

    public init(path: String, contentType: String? = nil, logoUrl: URL? = nil) {
        self.path = path
        self.contentType = contentType
        self.logoUrl = logoUrl
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        path = try c.decode(String.self, forKey: .path)
        contentType = try? c.decodeIfPresent(String.self, forKey: .contentType)
        logoUrl = VideoItem.webURL(try? c.decodeIfPresent(String.self, forKey: .logoUrl))
    }
}

/// One scene of a sample's plan (the worker's scene kinds, web/src/remotion/scene-plan.ts).
public struct PreviewScene: Codable, Sendable, Equatable {
    public enum Kind: String, Codable, Sendable {
        case hook, statement, footage, list, compare, stat, cta, unknown
        public init(from decoder: Decoder) throws {
            self = Kind(rawValue: (try? decoder.singleValueContainer().decode(String.self)) ?? "") ?? .unknown
        }
    }

    public struct Side: Codable, Sendable, Equatable {
        public var label: String
        public var text: String
        public init(label: String, text: String) {
            self.label = label
            self.text = text
        }
    }

    public var kind: Kind
    public var seconds: Double
    public var text: String?
    public var sub: String?
    public var emphasis: [String]
    public var caption: String?
    public var heading: String?
    public var items: [String]
    public var value: String?
    public var label: String?
    public var context: String?
    public var handle: String?
    public var left: Side?
    public var right: Side?

    enum CodingKeys: String, CodingKey { case kind, seconds, text, sub, emphasis, caption, heading, items, value, label, context, handle, left, right }

    public init(kind: Kind, seconds: Double = 3, text: String? = nil, sub: String? = nil, emphasis: [String] = [], caption: String? = nil, heading: String? = nil, items: [String] = [], value: String? = nil, label: String? = nil, context: String? = nil, handle: String? = nil, left: Side? = nil, right: Side? = nil) {
        self.kind = kind
        self.seconds = seconds
        self.text = text
        self.sub = sub
        self.emphasis = emphasis
        self.caption = caption
        self.heading = heading
        self.items = items
        self.value = value
        self.label = label
        self.context = context
        self.handle = handle
        self.left = left
        self.right = right
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        kind = (try? c.decode(Kind.self, forKey: .kind)) ?? .unknown
        let s = (try? c.decodeIfPresent(Double.self, forKey: .seconds)) ?? nil
        seconds = (s ?? 0) > 0 ? min(s ?? 3, 20) : 3
        text = try? c.decodeIfPresent(String.self, forKey: .text)
        sub = try? c.decodeIfPresent(String.self, forKey: .sub)
        if let list = try? c.decodeIfPresent([String].self, forKey: .emphasis) { emphasis = list } else if let one = try? c.decodeIfPresent(String.self, forKey: .emphasis) { emphasis = [one] } else { emphasis = [] }
        caption = try? c.decodeIfPresent(String.self, forKey: .caption)
        heading = try? c.decodeIfPresent(String.self, forKey: .heading)
        items = (try? c.decodeIfPresent([String].self, forKey: .items)) ?? []
        if let v = try? c.decodeIfPresent(String.self, forKey: .value) { value = v } else if let n = try? c.decodeIfPresent(Double.self, forKey: .value) { value = n == n.rounded() ? String(Int(n)) : String(n) } else { value = nil }
        label = try? c.decodeIfPresent(String.self, forKey: .label)
        context = try? c.decodeIfPresent(String.self, forKey: .context)
        handle = try? c.decodeIfPresent(String.self, forKey: .handle)
        left = try? c.decodeIfPresent(Side.self, forKey: .left)
        right = try? c.decodeIfPresent(Side.self, forKey: .right)
    }

    /// Every text of the scene, for VoiceOver and for the placeholder fill.
    public var texts: [String] {
        [text, sub, caption, heading, value, label, context, handle, left?.label, left?.text, right?.label, right?.text].compactMap { $0 } + items
    }
}

/// A sample's plan: its scenes in order, and a disclaimer some markets need on screen (Türkiye).
public struct PreviewPlan: Codable, Sendable, Equatable {
    public var title: String
    public var scenes: [PreviewScene]
    public var disclaimer: String?

    enum CodingKeys: String, CodingKey { case title, scenes, disclaimer }

    public init(title: String, scenes: [PreviewScene], disclaimer: String? = nil) {
        self.title = title
        self.scenes = scenes
        self.disclaimer = disclaimer
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        title = (try? c.decodeIfPresent(String.self, forKey: .title)) ?? ""
        scenes = try c.decode([PreviewScene].self, forKey: .scenes).filter { $0.kind != .unknown }
        disclaimer = try? c.decodeIfPresent(String.self, forKey: .disclaimer)
    }

    public var duration: Double { scenes.reduce(0) { $0 + $1.seconds } }

    /// The scene playing at `t` seconds, and how far into it (0...1). Past the end: the last scene, at 1.
    public func scene(at t: Double) -> (index: Int, progress: Double)? {
        guard !scenes.isEmpty else { return nil }
        var start = 0.0
        for (i, s) in scenes.enumerated() {
            if t < start + s.seconds { return (i, max(0, (t - start) / s.seconds)) }
            start += s.seconds
        }
        return (scenes.count - 1, 1)
    }

    /// The library's "{name}" and "{handle}" filled with the clinic's own (the web's personalisePlan):
    /// without a handle the call-to-action chip is dropped and an inline mention says the clinic's name.
    public func personalised(name: String, handle: String?) -> PreviewPlan {
        let h = PreviewLook.formatHandle(handle)
        let n = name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? "…" : name.trimmingCharacters(in: .whitespacesAndNewlines)
        func fill(_ s: String?) -> String? {
            s.map { $0.replacingOccurrences(of: PreviewLook.handleToken, with: h ?? n).replacingOccurrences(of: PreviewLook.nameToken, with: n) }
        }
        var p = self
        p.title = fill(title) ?? title
        p.disclaimer = fill(disclaimer)
        p.scenes = scenes.map { s in
            var x = s
            if s.kind == .cta && s.handle == PreviewLook.handleToken && h == nil {
                x.handle = nil
            } else {
                x.handle = fill(s.handle)
            }
            x.text = fill(s.text)
            x.sub = fill(s.sub)
            x.caption = fill(s.caption)
            x.heading = fill(s.heading)
            x.label = fill(s.label)
            x.context = fill(s.context)
            x.items = s.items.map { fill($0) ?? $0 }
            x.emphasis = s.emphasis.map { fill($0) ?? $0 }
            if let l = s.left { x.left = .init(label: fill(l.label) ?? l.label, text: fill(l.text) ?? l.text) }
            if let r = s.right { x.right = .init(label: fill(r.label) ?? r.label, text: fill(r.text) ?? r.text) }
            return x
        }
        return p
    }
}

/// A colour as three components 0...1.
public struct RGB: Equatable, Sendable {
    public var r: Double
    public var g: Double
    public var b: Double
    public init(_ r: Double, _ g: Double, _ b: Double) {
        self.r = min(max(r, 0), 1)
        self.g = min(max(g, 0), 1)
        self.b = min(max(b, 0), 1)
    }
}

/// The clinic's look in the preview: colour, text colour on it, handle, and a colour read from the logo.
public enum PreviewLook {
    public static let handleToken = "{handle}"
    public static let nameToken = "{name}"
    /// DentVideo's own teal: the colour of a clinic that has not chosen one.
    public static let defaultColor = "0F5C5C"
    /// The web teaser's colour swatches (web/src/components/dentvid/teaser.tsx).
    public static let swatches = ["0F5C5C", "1F4E79", "2E7D6B", "B6774F", "8A3B4A", "24303A"]

    /// "@example_handle" from "example_handle", "@example_handle" or " @Example_Handle " (case kept).
    public static func formatHandle(_ handle: String?) -> String? {
        guard let handle else { return nil }
        var h = handle.trimmingCharacters(in: .whitespacesAndNewlines)
        while h.hasPrefix("@") { h.removeFirst() }
        h = h.filter { !$0.isWhitespace }
        return h.isEmpty ? nil : "@\(h)"
    }

    /// "#0f5c5c", "0F5C5C" → RGB; anything else nil.
    public static func parse(_ hex: String?) -> RGB? {
        guard var s = hex?.trimmingCharacters(in: .whitespaces) else { return nil }
        if s.hasPrefix("#") { s.removeFirst() }
        guard s.count == 6, let v = UInt32(s, radix: 16) else { return nil }
        return RGB(Double((v >> 16) & 0xFF) / 255, Double((v >> 8) & 0xFF) / 255, Double(v & 0xFF) / 255)
    }

    /// "0F5C5C": the form the server's profile stores.
    public static func hex(_ c: RGB) -> String {
        func byte(_ v: Double) -> Int { Int((v * 255).rounded()) }
        return String(format: "%02X%02X%02X", byte(c.r), byte(c.g), byte(c.b))
    }

    /// Relative luminance (WCAG).
    public static func luminance(_ c: RGB) -> Double {
        func lin(_ v: Double) -> Double { v <= 0.03928 ? v / 12.92 : pow((v + 0.055) / 1.055, 2.4) }
        return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
    }

    /// Dark text only on a light brand colour (a pale yellow, white); white on the mid and deep
    /// colours clinics use, as the videos themselves do.
    public static func prefersDarkText(on c: RGB) -> Bool { luminance(c) > 0.36 }

    /// The colour mixed towards black: the lower end of the preview's background.
    public static func deeper(_ c: RGB, by amount: Double) -> RGB {
        let k = 1 - min(max(amount, 0), 1)
        return RGB(c.r * k, c.g * k, c.b * k)
    }

    /// The logo's own colour, for a clinic that has not picked one: the most common clearly coloured
    /// pixels (not white, not black, not grey, not transparent), averaged. nil for a black-and-white
    /// or empty logo. `rgba` is width × height × 4 bytes.
    public static func suggest(rgba: [UInt8], width: Int, height: Int) -> String? {
        guard width > 0, height > 0, rgba.count >= width * height * 4 else { return nil }
        var buckets: [Int: (n: Int, r: Double, g: Double, b: Double)] = [:]
        for i in 0..<(width * height) {
            let o = i * 4
            guard rgba[o + 3] >= 128 else { continue }
            let r = Double(rgba[o]) / 255, g = Double(rgba[o + 1]) / 255, b = Double(rgba[o + 2]) / 255
            let hi = max(r, g, b), lo = min(r, g, b)
            if hi - lo < 0.15 { continue } // white, black and greys
            if hi < 0.12 { continue }
            let key = (Int(rgba[o]) >> 5) << 6 | (Int(rgba[o + 1]) >> 5) << 3 | (Int(rgba[o + 2]) >> 5)
            var e = buckets[key] ?? (n: 0, r: 0, g: 0, b: 0)
            e.n += 1
            e.r += r
            e.g += g
            e.b += b
            buckets[key] = e
        }
        let total = buckets.values.reduce(0) { $0 + $1.n }
        // A few stray coloured pixels (anti-aliasing) do not make a colour.
        guard let best = buckets.max(by: { $0.value.n == $1.value.n ? $0.key > $1.key : $0.value.n < $1.value.n })?.value,
              total >= max(4, width * height / 200) else { return nil }
        let n = Double(best.n)
        return hex(RGB(best.r / n, best.g / n, best.b / n))
    }
}
