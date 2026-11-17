import SwiftUI
import UIKit
import DentVideoCore

/// The clinic details of a new account: the web start flow's clinic step (name, country, video
/// language, services; more details folded away), plus the brand colour. Saved with POST clinic;
/// the plans come next.
struct ClinicSetupView: View {
    @Environment(AppModel.self) private var model
    @State private var name = ""
    @State private var country = ClinicSetupView.defaultCountry
    @State private var language = ClinicSetupView.defaultLanguage
    @State private var services: [String] = []
    @State private var newService = ""
    @State private var city = ""
    @State private var handle = ""
    @State private var booking = ""
    @State private var tone = "warm"
    @State private var address = "formal"
    @State private var color = Color(red: 15 / 255, green: 92 / 255, blue: 92 / 255)
    @State private var more = false
    @State private var busy = false
    @State private var error: String?
    @State private var deleting = false

    private var canSave: Bool { !name.trimmingCharacters(in: .whitespaces).isEmpty && !services.isEmpty && !busy }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(L("setup.lead"))
                        .font(.body)
                        .foregroundStyle(Theme.body)
                        .fixedSize(horizontal: false, vertical: true)
                        .listRowBackground(Color.clear)
                }

                Section {
                    CaptionedField(caption: L("clinic.name")) {
                        TextField(L("clinic.name"), text: $name)
                            .textContentType(.organizationName)
                            .accessibilityIdentifier("setup.name")
                    }
                    Picker(L("clinic.country"), selection: $country) {
                        ForEach(Self.countries, id: \.self) { Text(L10n.countryName($0)).tag($0) }
                    }
                    .accessibilityIdentifier("setup.country")
                    Picker(L("videos.language"), selection: $language) {
                        ForEach(ClinicProfile.videoLanguages, id: \.self) { Text(L10n.languageName($0)).tag($0) }
                    }
                    .accessibilityIdentifier("setup.language")
                } footer: {
                    Text(L("videos.language.footer"))
                }
                .dvFormRows()

                Section {
                    ForEach(services, id: \.self) { s in Text(s) }
                        .onDelete { services.remove(atOffsets: $0) }
                    HStack {
                        TextField(L("clinic.services.add"), text: $newService)
                            .onSubmit(addTyped)
                            .accessibilityIdentifier("setup.serviceField")
                        Button(L("common.add"), action: addTyped)
                            .disabled(newService.trimmingCharacters(in: .whitespaces).count < 2 || services.count >= 20)
                    }
                    suggestions
                } header: {
                    Text(L("clinic.services"))
                } footer: {
                    Text(L("clinic.services.footer"))
                }
                .dvFormRows()

                Section {
                    DisclosureGroup(L("setup.more"), isExpanded: $more) {
                        CaptionedField(caption: L("clinic.city")) {
                            TextField(L("clinic.city"), text: $city).textContentType(.addressCity)
                        }
                        CaptionedField(caption: L("clinic.handle")) {
                            TextField(L("clinic.handle"), text: $handle)
                                .textInputAutocapitalization(.never).autocorrectionDisabled()
                        }
                        CaptionedField(caption: L("clinic.booking")) {
                            TextField("https://", text: $booking)
                                .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                                .environment(\.layoutDirection, .leftToRight)
                        }
                        Picker(L("videos.tone"), selection: $tone) {
                            ForEach(["warm", "expert", "calm", "playful"], id: \.self) { Text(L("videos.tone.\($0)")).tag($0) }
                        }
                        // English has no formal/informal "you" (the web hides it too).
                        if language != "en" {
                            Picker(L("videos.address"), selection: $address) {
                                Text(L("videos.address.formal")).tag("formal")
                                Text(L("videos.address.informal")).tag("informal")
                            }
                        }
                        ColorPicker(L("setup.color"), selection: $color, supportsOpacity: false)
                    }
                    .tint(Theme.teal)
                    .accessibilityIdentifier("setup.more")
                }
                .dvFormRows()

                Section {
                    if let error { ErrorBox(text: error, id: "setup.error").listRowBackground(Color.clear) }
                    Button {
                        Task { await save() }
                    } label: {
                        if busy { ProgressView().tint(Theme.onFill) } else { Text(L("setup.button")) }
                    }
                    .buttonStyle(.dvPrimary)
                    .disabled(!canSave)
                    .accessibilityLabel(L("setup.button"))
                    .accessibilityIdentifier("setup.submit")
                    .listRowBackground(Color.clear)
                    .listRowInsets(EdgeInsets())
                }

                Section {
                    if let email = model.me?.user.email {
                        Text(L("settings.signedInAs", email)).font(.footnote).foregroundStyle(Theme.muted)
                    }
                    Button(L("settings.signOut")) { Task { await model.signOut() } }
                        .foregroundStyle(Theme.teal)
                        .accessibilityIdentifier("setup.signOut")
                    Button(L("settings.delete"), role: .destructive) { deleting = true }
                        .foregroundStyle(Theme.danger)
                }
                .dvFormRows()
            }
            .scrollContentBackground(.hidden)
            .scrollDismissesKeyboard(.interactively)
            .background(Theme.paper.ignoresSafeArea())
            .navigationTitle(L("setup.title"))
            .sheet(isPresented: $deleting) { DeleteAccountView() }
            #if DEBUG
            .task {
                guard model.isDemo("noclinic") else { return }
                name = DemoContent.of(L10n.languageCode).clinic
                services = Array(ServiceHints.of(language).prefix(3))
            }
            #endif
        }
    }

    /// The usual treatments one tap away (the web's chips): typing a list on a phone is where clinics stall.
    private var suggestions: some View {
        let hints = ServiceHints.of(language).filter { s in !services.contains { $0.caseInsensitiveCompare(s) == .orderedSame } }
        return Group {
            if !hints.isEmpty && services.count < 20 {
                VStack(alignment: .leading, spacing: Theme.s2) {
                    Text(L("setup.services.suggested")).font(.footnote).foregroundStyle(Theme.muted)
                    FlowLayout(spacing: Theme.s2) {
                        ForEach(Array(hints.enumerated()), id: \.element) { n, s in
                            Button { services.append(s) } label: {
                                Label(s, systemImage: "plus")
                                    .font(.subheadline.weight(.medium))
                                    .padding(.horizontal, Theme.s3)
                                    .frame(minHeight: 36)
                                    .background(Theme.card, in: Capsule())
                                    .overlay(Capsule().strokeBorder(Theme.line))
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(Theme.ink)
                            .accessibilityIdentifier("setup.service.\(n)")
                        }
                    }
                }
                .padding(.vertical, Theme.s1)
            }
        }
    }

    private func addTyped() {
        let s = newService.trimmingCharacters(in: .whitespacesAndNewlines)
        guard s.count >= 2, s.count <= 60, !services.contains(s), services.count < 20 else { return }
        services.append(s)
        newService = ""
    }

    private func save() async {
        busy = true
        error = nil
        defer { busy = false }
        let profile = ClinicProfile(
            name: name, city: city, country: country, language: language, services: services,
            tone: tone, address: address, handle: handle, bookingUrl: booking, brandColor: Self.hex(color)
        )
        error = await model.createClinic(profile.cleaned())
    }

    // MARK: Defaults

    /// The phone's region when it is a country, else the United States.
    static var defaultCountry: String {
        let r = Locale.current.region?.identifier ?? "US"
        return countries.contains(r) ? r : "US"
    }

    /// The interface language when videos come in it, else English.
    static var defaultLanguage: String {
        ClinicProfile.videoLanguages.contains(L10n.languageCode) ? L10n.languageCode : "en"
    }

    /// Every ISO country the phone knows, sorted by name in the app's language.
    static let countries: [String] = Locale.Region.isoRegions
        .map(\.identifier)
        .filter { $0.count == 2 && $0.allSatisfy(\.isLetter) }
        .sorted { L10n.countryName($0).localizedCompare(L10n.countryName($1)) == .orderedAscending }

    static func hex(_ c: Color) -> String? {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard UIColor(c).getRed(&r, green: &g, blue: &b, alpha: &a) else { return nil }
        func byte(_ v: CGFloat) -> Int { Int((min(max(v, 0), 1) * 255).rounded()) }
        return String(format: "%02X%02X%02X", byte(r), byte(g), byte(b))
    }
}

/// Example services per video language, as on the web's clinic form (web/src/lib/dentvid/service-hints.ts).
enum ServiceHints {
    static let byLanguage: [String: [String]] = [
        "en": ["Cleanings", "Teeth whitening", "Implants", "Clear aligners", "Root canal treatment", "Children's dentistry"],
        "de": ["Professionelle Zahnreinigung", "Bleaching", "Implantate", "Aligner", "Wurzelbehandlung", "Kinderzahnheilkunde"],
        "es": ["Limpieza dental", "Blanqueamiento", "Implantes", "Ortodoncia invisible", "Endodoncia", "Odontopediatría"],
        "fr": ["Détartrage", "Blanchiment", "Implants", "Aligneurs", "Traitement de canal", "Pédodontie"],
        "it": ["Igiene dentale", "Sbiancamento", "Impianti", "Allineatori", "Devitalizzazione", "Odontoiatria pediatrica"],
        "pt": ["Limpeza", "Clareamento", "Implantes", "Alinhadores", "Tratamento de canal", "Odontopediatria"],
        "tr": ["Diş taşı temizliği", "Diş beyazlatma", "İmplant", "Şeffaf plak", "Kanal tedavisi", "Çocuk diş hekimliği"],
        "ja": ["歯のクリーニング", "ホワイトニング", "インプラント", "マウスピース矯正", "根管治療", "小児歯科"],
        "ar": ["تنظيف الأسنان", "تبييض الأسنان", "زراعة الأسنان", "التقويم الشفاف", "علاج العصب", "طب أسنان الأطفال"],
        "pl": ["Higienizacja", "Wybielanie zębów", "Implanty", "Leczenie nakładkami", "Leczenie kanałowe", "Stomatologia dziecięca"],
    ]

    static func of(_ language: String) -> [String] { byLanguage[language] ?? byLanguage["en"]! }
}

/// Chips that wrap onto as many lines as they need (and right to left in Arabic).
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, line: CGFloat = 0, widest: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.init(width: width, height: nil))
            if x > 0 && x + size.width > width { y += line + spacing; x = 0; line = 0 }
            x += size.width + spacing
            line = max(line, size.height)
            widest = max(widest, x - spacing)
        }
        return CGSize(width: min(widest, width), height: y + line)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, line: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.init(width: bounds.width, height: nil))
            if x > bounds.minX && x + size.width > bounds.maxX { y += line + spacing; x = bounds.minX; line = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: .init(size))
            x += size.width + spacing
            line = max(line, size.height)
        }
    }
}
