import Foundation

/// The sample clinic: the same three sample videos dentvideo.com shows for each
/// language (web/src/content/dentvideo-samples.ts), streamed from the site.
enum DemoContent {
    struct Sample { let slug: String; let title: String; let caption: String; let tags: [String] }

    static let clinicName: [String: String] = [
        "en": "Demo Dental Studio",
        "de": "Demo Zahnarztpraxis",
        "es": "Clínica Dental Demo",
        "tr": "Demo Diş Kliniği",
    ]

    static let weeks: [String: [Sample]] = [
        "en": [
            Sample(slug: "whitening-myths-debunked", title: "Whitening your teeth? Not as harsh as you think.",
                   caption: "Wondering whether whitening weakens enamel? Here is what actually happens, and when to ask us first.",
                   tags: ["teethwhitening", "dentist", "smile"]),
            Sample(slug: "caring-for-clear-aligners", title: "Aligners smelling off by evening?",
                   caption: "A few small habits keep clear aligners fresh all day.",
                   tags: ["clearaligners", "orthodontics", "dentalcare"]),
            Sample(slug: "proper-brushing-technique", title: "Your toothbrush skips one spot every morning.",
                   caption: "The spot most people miss when brushing, and how to reach it.",
                   tags: ["brushing", "oralhealth", "dentist"]),
        ],
        "de": [
            Sample(slug: "bleaching-zahnschmelz", title: "Bleaching heißt nicht gleich schwacher Zahnschmelz.",
                   caption: "Schwächt Bleaching den Zahnschmelz? Was dabei passiert und wann Sie uns vorher fragen sollten.",
                   tags: ["bleaching", "zahnarzt", "zahnpflege"]),
            Sample(slug: "aligner-verfaerbung", title: "Kaffee macht Aligner schneller gelb als gedacht.",
                   caption: "Ein paar Gewohnheiten halten Aligner klar.",
                   tags: ["aligner", "kieferorthopädie", "zahnpflege"]),
            Sample(slug: "kinder-zahnarztangst", title: "Ihr Kind spürt Ihre Nervosität sofort.",
                   caption: "So wird der Zahnarztbesuch für Kinder entspannter.",
                   tags: ["kinderzahnarzt", "zahnarztangst", "familie"]),
        ],
        "es": [
            Sample(slug: "limpieza-dental", title: "Ese sarro junto a la encía…",
                   caption: "Qué hace una limpieza dental profesional y cada cuánto conviene.",
                   tags: ["limpiezadental", "dentista", "sonrisa"]),
            Sample(slug: "primer-diente", title: "Asoma el primer diente… ¿ya lo cepillas?",
                   caption: "Cómo cuidar el primer diente de tu bebé desde el primer día.",
                   tags: ["odontopediatria", "bebes", "dentista"]),
            Sample(slug: "cuidado-encias", title: "Tus encías tratadas también necesitan cepillo.",
                   caption: "Después del tratamiento de encías, el cuidado en casa importa.",
                   tags: ["encias", "saludbucal", "dentista"]),
        ],
        "tr": [
            Sample(slug: "implant-asamalari", title: "İmplant yapıldı ama diş daha hazır değil.",
                   caption: "İmplant tedavisi hangi aşamalardan geçer? Kısaca anlattık; sorularınız için bize danışın.",
                   tags: ["implant", "dishekimi", "agizsagligi"]),
            Sample(slug: "dis-tasi-temizligi", title: "Diş eti kanaması bazen diş taşıyla başlar.",
                   caption: "Diş taşı temizliği neden önemli, ne sıklıkla yapılmalı?",
                   tags: ["distasi", "dishekimi", "disfircalama"]),
            Sample(slug: "beyazlatma-hassasiyet", title: "Beyazlatmadan sonra gelen o diş sızısı…",
                   caption: "Beyazlatma sonrası hassasiyet neden olur, ne zaman geçer?",
                   tags: ["dişbeyazlatma", "dishekimi", "gulumseme"]),
        ],
    ]

    /// This week's Monday (UTC), as the server writes week_of.
    static func monday(of date: Date) -> String {
        var cal = Calendar(identifier: .iso8601)
        cal.timeZone = TimeZone(identifier: "UTC")!
        let start = cal.dateInterval(of: .weekOfYear, for: date)?.start ?? date
        let f = DateFormatter()
        f.calendar = cal
        f.locale = Locale(identifier: "en_US_POSIX")
        f.timeZone = cal.timeZone
        f.dateFormat = "yyyy-MM-dd"
        return f.string(from: start)
    }

    static func items(language: String, now: Date) -> [VideoItem] {
        let week = monday(of: now)
        let base = Config.siteURL.appendingPathComponent("dentvideo/samples/\(language)")
        return (weeks[language] ?? weeks["en"]!).map { s in
            VideoItem(
                id: "demo-\(s.slug)",
                title: s.title,
                weekOf: week,
                status: .ready,
                approval: .pending,
                approvalNote: nil,
                caption: s.caption,
                hashtags: s.tags,
                postedAt: nil,
                videoURL: base.appendingPathComponent("\(s.slug).mp4"),
                thumbURL: base.appendingPathComponent("\(s.slug).jpg")
            )
        }
    }
}
