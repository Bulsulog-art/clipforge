import type { Locale } from "./dentvideo-locales";
import type { RuleId } from "@/lib/dentvid/hard-rules";
export { CHECKER_PATH } from "./guides/ui";

/**
 * The free public ad checker ("Is my post allowed?"), one page per language:
 * dentvideo.com/ad-checker, /tr/ad-checker, …
 *
 * Written natively per language for what dentists in that market search for
 * (`queries`, not rendered). Rules notes state only what the sources below
 * say (the same official texts the guides cite) and are general information,
 * not legal advice. The checker itself is the compliance agent's
 * deterministic hard rules (lib/dentvid/hard-rules.ts), run in the browser.
 *
 * Server-side content: the page passes its locale's `ui` to the client
 * component (components/dentvid/ad-checker.tsx), never the whole table.
 */

type Source = { label: string; url: string };

/** Everything the interactive checker shows, in one language (passed to the client component). */
export type CheckerUi = {
  label: string;
  placeholder: string;
  /** A risky example post in this language, for the "Try an example" button. */
  sample: string;
  trySample: string;
  check: string;
  clear: string;
  /** Under the box: the text stays in the browser. */
  privacy: string;
  /** Shown when the text is longer than the checker reads; {max} is the limit. */
  tooLong: string;
  resultsHeading: string;
  /** "{n}": how many phrases were flagged. */
  found: string;
  cleanTitle: string;
  cleanText: string;
  why: string;
  instead: string;
  tip: string;
  /** The highlighted text's caption. */
  yourText: string;
  /** Opening and closing quotation marks in this language, around a flagged phrase and its rewrite. */
  quotes: [string, string];
  rules: Record<RuleId, { name: string; why: string; tip: string }>;
  cta: { title: string; text: string; button: string; secondary: string };
};

export type CheckerCopy = {
  /** Short label for the header, footer and breadcrumbs. */
  nav: string;
  seoTitle: string;
  seoDescription: string;
  h1: string;
  intro: string;
  /** The searches this page is written to answer (documentation; not rendered). */
  queries: string[];
  ui: CheckerUi;
  how: { heading: string; paragraphs: string[] };
  rulesHeading: string;
  rules: { heading: string; text: string; sources: Source[] }[];
  notLegalAdvice: string;
  /** The guide on this market's advertising rules, linked under the rules notes. */
  guide: { slug: string; label: string };
  faq: { q: string; a: string }[];
};

/** The day the checker pages last changed in substance (sitemap lastmod). */
export const CHECKER_UPDATED = "2026-11-13";

// Official texts, as the guides cite them.
const GDC_ADV: Source = { label: "General Dental Council — Guidance on advertising", url: "https://www.gdc-uk.org/standards-guidance/standards-and-guidance/gdc-guidance-for-dental-professionals/guidance-on-advertising" };
const CAP: Source = { label: "ASA / CAP — UK Code of Non-broadcast Advertising (CAP Code)", url: "https://www.asa.org.uk/codes-and-rulings/advertising-codes/non-broadcast-code.html" };
const FTC_HEALTH: Source = { label: "FTC — Health Products Compliance Guidance", url: "https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance" };
const FTC_EIR: Source = { label: "FTC — Endorsements, influencers and reviews (business guidance)", url: "https://www.ftc.gov/business-guidance/advertising-marketing/endorsements-influencers-reviews" };
const ADA: Source = { label: "American Dental Association — Principles of Ethics and Code of Professional Conduct", url: "https://www.ada.org/about/principles/code-of-ethics" };
const RG_TR: Source = { label: "Resmî Gazete — 12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete (Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik)", url: "https://www.resmigazete.gov.tr/eskiler/2025/11/20251112.htm" };
const TDB: Source = { label: "Türk Dişhekimleri Birliği (meslek etiği ve oda duyuruları)", url: "https://www.tdb.org.tr/" };
const SB: Source = { label: "T.C. Sağlık Bakanlığı", url: "https://www.saglik.gov.tr/" };
const HWG: Source = { label: "Heilmittelwerbegesetz (HWG) — gesetze-im-internet.de", url: "https://www.gesetze-im-internet.de/heilmwerbg/" };
const BZAEK: Source = { label: "Bundeszahnärztekammer — Musterberufsordnung (MBO-Z), Abschnitt „Berufliche Kommunikation“ (§§ 20–22)", url: "https://www.bzaek.de/recht/musterberufsordnung/berufliche-kommunikation.html" };
const RIS: Source = { label: "RIS — Zahnärztegesetz (ZÄG), § 35", url: "https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20004372&Paragraf=35" };
const FEDLEX: Source = { label: "Fedlex — Medizinalberufegesetz (MedBG, SR 811.11), Art. 40", url: "https://www.fedlex.admin.ch/eli/cc/2007/537/de" };
const BOE: Source = { label: "Real Decreto 1907/1996, publicidad con pretendida finalidad sanitaria — BOE", url: "https://www.boe.es/eli/es/rd/1996/08/02/1907/con" };
const CGD: Source = { label: "Consejo General de Dentistas de España — Código Español de Ética y Deontología Dental", url: "https://consejodentistas.es/" };
const TS_FAMOSOS: Source = { label: "Poder Judicial — El Tribunal Supremo avala la prohibición de difundir publicidad de clínicas de odontología utilizando a personas famosas", url: "https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Noticias-Judiciales/El-Tribunal-Supremo-avala-la-prohibicion-de-difundir-publicidad-de-clinicas-de-odontologia-utilizando-a-personas-famosas" };
const COFEPRIS: Source = { label: "COFEPRIS (México) — publicidad de servicios de salud", url: "https://www.gob.mx/cofepris" };
const R4127_215_1: Source = { label: "Légifrance — Code de la santé publique, article R. 4127-215-1 (communication du chirurgien-dentiste)", url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000042743767" };
const ONCD: Source = { label: "Ordre national des chirurgiens-dentistes — Communication professionnelle des chirurgiens-dentistes", url: "https://www.ordre-chirurgiens-dentistes.fr/pour-le-chirurgien-dentiste/communication-professionnelle-des-chirurgiens-dentistes/" };
const KEL: Source = { label: "Naczelna Izba Lekarska — Kodeks Etyki Lekarskiej (obowiązuje od 1 stycznia 2025 r.)", url: "https://nil.org.pl/uploaded_images/1716532642_kel.pdf" };
const UDL: Source = { label: "Ustawa o działalności leczniczej, tekst jednolity Dz.U. 2026 poz. 156 (art. 14) — eli.gov.pl", url: "https://eli.gov.pl/eli/DU/2026/156" };
const MHLW: Source = { label: "厚生労働省「医療法における病院等の広告規制について」（医療広告ガイドライン）", url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/kenkou_iryou/iryou/kokokukisei/index.html" };
const DHA: Source = { label: "هيئة الصحة بدبي — معايير محتوى الإعلانات الطبية على وسائل التواصل الاجتماعي", url: "https://www.dha.gov.ae/uploads/042022/Standards%20for%20Medical%20Advertisement%20Content%20in%20Social%20Media2022433965.pdf" };
const MOH_SA: Source = { label: "وزارة الصحة السعودية — المادة العاشرة من نظام مزاولة المهن الصحية (حظر إعلان الممارس عن نفسه)", url: "https://www.moh.gov.sa/en/Ministry/MediaCenter/News/Pages/News-2024-04-21-003.aspx" };

export const CHECKER: Record<Locale, CheckerCopy> = {
  en: {
    nav: "Ad checker",
    seoTitle: "Dental ad checker: is my post allowed?",
    seoDescription: "Free checker for dentists: paste a caption, website text or ad and see which phrases risk breaking health-advertising rules, with safer wording.",
    h1: "Is my post allowed? A free ad checker for dentists",
    intro:
      "Paste an Instagram caption, a website paragraph or ad copy. The checker marks the phrases health-advertising rules most often object to — guarantees, “painless”-type absolutes, superlatives, prices and discounts, before-and-after results, testimonials, cure claims and fear — and suggests a calmer way to say each one. It runs in your browser: your text is never sent anywhere.",
    queries: ["dental advertising compliance checker", "is my dental post allowed", "can dentists say painless in ads", "dentist social media advertising rules checker", "GDC advertising guidance dentists"],
    ui: {
      label: "Your caption, website text or ad",
      placeholder: "Paste a post here, e.g. “Painless whitening, 50% off this month — the best dentist in town!”",
      sample: "Guaranteed painless whitening, 50% off this month only! The best dentist in town. Our patients say it changed their lives — see our before and after photos. Don't wait until it's too late.",
      trySample: "Try an example",
      check: "Check my text",
      clear: "Clear",
      privacy: "Checked in your browser. Your text is never sent anywhere or stored.",
      tooLong: "Only the first {max} characters are checked.",
      resultsHeading: "Result",
      found: "Risky phrases found: {n}",
      cleanTitle: "No risky phrases found",
      cleanText: "None of the phrases this checker knows appear in your text. That is a good sign, not a clearance: read it once more for promises, images and patient details before you publish.",
      why: "Why",
      instead: "Try instead",
      tip: "How to fix it",
      yourText: "Your text, with the risky phrases marked",
      quotes: ["“", "”"],
      rules: {
        guarantee: { name: "Guarantee", why: "No treatment result can be guaranteed; regulators read a guarantee as misleading.", tip: "Say results vary and that the dentist explains benefits and risks." },
        absolute: { name: "Absolute claim", why: "Words like painless, permanent, 100% or prevents promise an outcome no one can promise every patient.", tip: "Hedge it: “can help”, “for most patients”, “with good care”." },
        superlative: { name: "Superlative or comparison", why: "“Best”, “#1” or “cheapest” cannot be verified and compare you with other clinics.", tip: "State facts instead: what you offer, where, and who does it." },
        price: { name: "Price, discount or offer", why: "Prices, discounts, free offers and time limits turn information into a sales push; several markets ban them outright.", tip: "Leave prices and offers out; invite questions at the next visit." },
        before_after: { name: "Before-and-after", why: "Before-and-after results imply every patient will get the same outcome.", tip: "Explain what the treatment involves, step by step." },
        testimonial: { name: "Testimonial or review", why: "Patient testimonials, star ratings and celebrity endorsements are restricted in health advertising in many markets.", tip: "Answer a question patients often ask instead." },
        cure: { name: "Cure claim", why: "Claiming to cure or eliminate a condition overstates what treatment can promise.", tip: "Say the treatment “can help treat” or “can help relieve”." },
        fear: { name: "Fear or pressure", why: "Frightening people or pushing them to book now is restricted in health advertising.", tip: "Describe the sign calmly and suggest asking the dentist." },
      },
      cta: {
        title: "Want five videos a week already checked like this?",
        text: "DentVideo writes, narrates and captions five short patient-education videos a week in your language and colours. Every script passes these same rules and a second, closer review before you see it — and nothing is published without your approval.",
        button: "See your preview",
        secondary: "How DentVideo works",
      },
    },
    how: {
      heading: "What the checker looks for",
      paragraphs: [
        "It is the same set of rules DentVideo's own compliance step applies to every video script before a clinic sees it: patterns for guarantees, absolute claims, superlatives, prices and promotions, before-and-after results, testimonials and cure claims, written for English, German, Spanish, Turkish, French, Japanese, Arabic and Polish. A post in another of these languages is checked too, whatever page you are on.",
        "The patterns know the common false alarms. “Permanent teeth” are adult teeth, “brush before and after meals” is advice, and “does not guarantee whiter teeth” is the honest version of a claim — none of them is flagged.",
        "A pattern cannot read context. It will not see an implied promise, a misleading photo, or a patient who can be identified. Treat a clean result as “nothing obvious”, not as approval.",
      ],
    },
    rulesHeading: "Rules to check in the UK and the US",
    rules: [
      {
        heading: "United Kingdom: GDC and the CAP Code",
        text: "The General Dental Council expects advertising by dental professionals to be legal, decent, honest and truthful, and points to the CAP Code, which the Advertising Standards Authority enforces. Claims must be backed by evidence, and comparisons, testimonials and promises of results get particular scrutiny. Remember that prescription-only medicines cannot be advertised to the public.",
        sources: [GDC_ADV, CAP],
      },
      {
        heading: "United States: state dental boards and the FTC",
        text: "Each state's dental practice act and board sets its own advertising rules, so check your state board first. Nationally, the Federal Trade Commission requires health claims to be truthful and backed by competent evidence, and its rules on endorsements and reviews cover testimonials and incentivised reviews. The ADA Code of Ethics also addresses false or misleading advertising.",
        sources: [FTC_HEALTH, FTC_EIR, ADA],
      },
    ],
    notLegalAdvice: "General information, not legal advice. Rules change; check the current text with your regulator or professional body.",
    guide: { slug: "dental-social-media-advertising-rules", label: "Read the guide: dental advertising rules on social media" },
    faq: [
      {
        q: "Is my text sent to a server or stored?",
        a: "No. The checker runs entirely in your browser, so the text you paste never leaves your device and is not saved. We only count that a check happened and how many phrases were flagged — never the words.",
      },
      {
        q: "Can a dentist say “painless” in an ad?",
        a: "It is one of the words regulators object to most, because nobody can promise every patient a treatment without discomfort. Describe what you do instead: “with local anaesthesia; most patients feel only mild sensitivity afterwards”.",
      },
      {
        q: "Does a clean result mean my post is compliant?",
        a: "No. The checker finds risky phrases, not every risk: images, implied promises, patient consent and your platform's own rules still need a human read. It is general information, not legal advice.",
      },
      {
        q: "Which languages does it check?",
        a: "English, German, Spanish, Turkish, French, Japanese, Arabic and Polish, on every page — paste a German caption on the English page and it is still checked, with a German suggestion where one is known.",
      },
      {
        q: "How does this relate to DentVideo?",
        a: "DentVideo makes short patient-education videos for dental clinics. Every script passes these same rules, then a closer review that reads the whole text, before the clinic approves anything.",
      },
    ],
  },

  tr: {
    nav: "Reklam kontrolü",
    seoTitle: "Diş hekimi reklam kontrolü: bu paylaşım yasak mı?",
    seoDescription: "Diş hekimleri için ücretsiz kontrol aracı: metninizi yapıştırın, tanıtım yönetmeliğine takılabilecek ifadeleri ve daha güvenli karşılıklarını görün.",
    h1: "Bu paylaşım yasak mı? Diş hekimleri için reklam kontrol aracı",
    intro:
      "Instagram açıklamanızı, web sitesi metninizi ya da ilanınızı yapıştırın. Araç, sağlık tanıtım kurallarının en sık itiraz ettiği ifadeleri işaretler — garanti, “ağrısız” gibi kesin vaatler, “en iyi” gibi üstünlük iddiaları, fiyat ve kampanya, öncesi-sonrası, hasta yorumları, “tamamen iyileştirir” gibi iddialar ve korkutma — ve her biri için daha temkinli bir karşılık önerir. Kontrol tarayıcınızda yapılır: metniniz hiçbir yere gönderilmez.",
    queries: ["diş hekimi reklam yasağı", "diş hekimi reklam yönetmeliği", "diş hekimi instagram yasak kelimeler", "sağlık tanıtım yönetmeliği yasak ifadeler", "ağrısız implant reklam yasak mı"],
    ui: {
      label: "Paylaşım metniniz, web sitesi yazınız ya da ilanınız",
      placeholder: "Metni buraya yapıştırın, ör. “Ağrısız implant, bu ay %20 indirim — şehrin en iyi kliniği!”",
      sample: "Ağrısız implant tedavisi, garantili sonuç! İstanbul'un en iyi diş kliniği. Bu ay beyazlatmada indirim ve 12 taksit fırsatı. Öncesi sonrası fotoğraflarımıza ve hasta yorumlarına bakın. Geç olmadan hemen randevu alın!",
      trySample: "Örnek metni dene",
      check: "Metnimi kontrol et",
      clear: "Temizle",
      privacy: "Kontrol tarayıcınızda yapılır. Metniniz hiçbir yere gönderilmez ve saklanmaz.",
      tooLong: "Yalnızca ilk {max} karakter kontrol edilir.",
      resultsHeading: "Sonuç",
      found: "Riskli ifade sayısı: {n}",
      cleanTitle: "Riskli ifade bulunamadı",
      cleanText: "Bu aracın tanıdığı ifadelerin hiçbiri metninizde yok. Bu iyi bir işaret ama onay değildir: paylaşmadan önce vaatler, görseller ve hasta bilgileri için metni bir kez daha okuyun.",
      why: "Neden",
      instead: "Bunun yerine",
      tip: "Nasıl düzeltilir",
      yourText: "Metniniz, riskli ifadeler işaretli",
      quotes: ["“", "”"],
      rules: {
        guarantee: { name: "Garanti", why: "Hiçbir tedavi sonucu garanti edilemez; garanti ifadesi yanıltıcı sayılabilir.", tip: "Sonuçların kişiden kişiye değiştiğini ve hekimin fayda ile riskleri anlattığını söyleyin." },
        absolute: { name: "Kesin vaat", why: "Ağrısız, kalıcı, ömür boyu, %100 ya da “önler” gibi kelimeler herkese verilemeyecek bir sonucu vaat eder.", tip: "Temkinli söyleyin: “yardımcı olabilir”, “çoğu hastada”, “düzenli bakımla”." },
        superlative: { name: "Üstünlük iddiası ya da karşılaştırma", why: "“En iyi”, “bir numara”, “lider” gibi ifadeler doğrulanamaz ve sizi diğer kliniklerle karşılaştırır.", tip: "Doğrulanabilir bilgi verin: hangi hizmet, nerede, kim tarafından." },
        price: { name: "Fiyat, indirim ya da kampanya", why: "Ücret, indirim, kampanya, taksit, hediye ve ücretsiz teklifler 2025 tanıtım yönetmeliğine göre tanıtımda yer alamaz.", tip: "Fiyat ve özendirici teklifleri metinden çıkarın; soruları kontrol randevusuna davet edin." },
        before_after: { name: "Öncesi-sonrası", why: "Öncesi-sonrası sonuçlar, her hastanın aynı sonucu alacağı izlenimini verir ve talep yaratır.", tip: "Tedavinin adım adım nasıl yapıldığını anlatın." },
        testimonial: { name: "Hasta yorumu ya da teşekkür", why: "Hasta teşekkür ve memnuniyet ifadeleriyle tanıtım yapılamaz; mahremiyet riski de taşır.", tip: "Bunun yerine hastaların sık sorduğu bir soruyu yanıtlayın." },
        cure: { name: "İyileştirme iddiası", why: "Bir hastalığı tamamen iyileştireceğini ya da yok edeceğini söylemek tedavinin vaat edebileceğini aşar.", tip: "“Tedavisine yardımcı olabilir” deyin." },
        fear: { name: "Korkutma ya da yönlendirme", why: "İzleyeni korkutmak ya da “hemen randevu alın” diye acele ettirmek yönlendirici tanıtım sayılabilir.", tip: "Belirtiyi sakin anlatın, hekime danışmayı önerin." },
      },
      cta: {
        title: "Haftada beş video, her biri böyle kontrol edilmiş olarak gelsin mi?",
        text: "DentVideo, kliniğiniz için haftada beş kısa hasta bilgilendirme videosunu Türkçe yazar, seslendirir ve altyazılar. Her senaryo bu kurallardan ve daha dikkatli ikinci bir incelemeden geçer; onayınız olmadan hiçbir şey yayınlanmaz.",
        button: "Önizlemenizi görün",
        secondary: "DentVideo nasıl çalışır",
      },
    },
    how: {
      heading: "Araç neye bakıyor",
      paragraphs: [
        "DentVideo'nun her video senaryosuna klinik görmeden önce uyguladığı kuralların aynısıdır: garanti, kesin vaat, üstünlük iddiası, fiyat ve kampanya, öncesi-sonrası, hasta yorumu ve iyileştirme iddiası kalıpları; Türkçe, İngilizce, Almanca, İspanyolca, Fransızca, Japonca, Arapça ve Lehçe için.",
        "Kalıplar sık yapılan yanlış alarmları tanır. “Kalıcı dişler” ve “kalıcı dolgu” diş hekimliği terimidir, “yemeklerden önce ve sonra fırçalayın” bir öneridir; bunlar işaretlenmez.",
        "Bir kalıp bağlamı okuyamaz: örtülü bir vaadi, yanıltıcı bir görseli ya da tanınabilir bir hastayı göremez. Temiz bir sonucu “göze batan bir şey yok” diye okuyun, onay diye değil.",
      ],
    },
    rulesHeading: "Türkiye'de hangi kurallar geçerli?",
    rules: [
      {
        heading: "Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Yönetmeliği (2025)",
        text: "Sağlık Bakanlığı'nın 12 Kasım 2025 tarihli ve 33075 sayılı Resmî Gazete'de yayımladığı yönetmeliğe göre sağlık hizmetinin açık ya da örtülü reklamı yasaktır; yalnızca doğru bilgilendirme yapılabilir. Ücret, indirim, kampanya ve promosyon bilgisi, hasta teşekkür ve memnuniyet ifadeleriyle tanıtım, çekiliş ve hediye gibi özendirici faaliyetler sınırlanmıştır. Madde numaraları ve istisnalar için resmî metne bakın.",
        sources: [RG_TR, SB],
      },
      {
        heading: "Türk Dişhekimleri Birliği meslek etiği",
        text: "Yönetmelik çerçevenin tamamı değildir: Türk Dişhekimleri Birliği'nin meslek etiği kuralları da meslektaşları kötüleyen, hastayı yanıltan ya da mesleğin saygınlığına zarar veren paylaşımları sınırlar. Bağlı olduğunuz odanın duyurularını da takip edin.",
        sources: [TDB],
      },
    ],
    notLegalAdvice: "Genel bilgidir, hukuki danışmanlık değildir. Kurallar değişebilir; güncel metni Sağlık Bakanlığı ve odanızdan kontrol edin.",
    guide: { slug: "dis-hekimi-reklam-yasagi", label: "Rehberi okuyun: diş hekimi reklam yasağı ve 2025 yönetmeliği" },
    faq: [
      {
        q: "Metnim bir sunucuya gönderiliyor ya da saklanıyor mu?",
        a: "Hayır. Kontrol tamamen tarayıcınızda yapılır; yapıştırdığınız metin cihazınızdan çıkmaz ve kaydedilmez. Yalnızca bir kontrol yapıldığını ve kaç ifadenin işaretlendiğini sayarız, kelimeleri asla.",
      },
      {
        q: "Diş hekimi “ağrısız implant” diyebilir mi?",
        a: "“Ağrısız” ve “acısız”, herkese verilemeyecek kesin bir sonucu vaat ettiği için en riskli ifadeler arasındadır. Bunun yerine ne yaptığınızı anlatın: “İşlem lokal anestezi altında yapılır; çoğu hasta sonrasında hafif bir hassasiyet hisseder.”",
      },
      {
        q: "Temiz sonuç, paylaşımımın yönetmeliğe uygun olduğu anlamına mı gelir?",
        a: "Hayır. Araç riskli ifadeleri bulur, her riski değil: görseller, örtülü vaatler, hasta onamı ve sponsorlu paylaşım kuralları ayrıca değerlendirilmelidir. Genel bilgidir, hukuki danışmanlık değildir.",
      },
      {
        q: "Fiyat ya da kampanya paylaşabilir miyim?",
        a: "2025 tanıtım yönetmeliği tanıtım ve bilgilendirmede ücret, indirim, kampanya ve promosyon bilgisine yer verilmesini sınırlar (uluslararası sağlık turizmi için ayrı hükümler vardır). Araç bu yüzden fiyatları, “indirim”, “kampanya”, “taksit” ve “hediye” gibi kelimeleri işaretler.",
      },
      {
        q: "Bunun DentVideo ile ilgisi ne?",
        a: "DentVideo diş klinikleri için kısa hasta bilgilendirme videoları hazırlar. Her senaryo bu kurallardan ve metnin tamamını okuyan daha dikkatli bir incelemeden geçer; klinik onaylamadan hiçbir şey yayınlanmaz.",
      },
    ],
  },

  de: {
    nav: "Werbe-Check",
    seoTitle: "Zahnarzt-Werbung prüfen: kostenloser HWG-Check",
    seoDescription: "Kostenloser Check für Zahnarztpraxen: Post, Website-Text oder Anzeige einfügen und sehen, welche Formulierungen nach HWG und Berufsordnung riskant sind.",
    h1: "Ist mein Post erlaubt? Der kostenlose Werbe-Check für Zahnarztpraxen",
    intro:
      "Fügen Sie eine Instagram-Caption, einen Absatz Ihrer Website oder einen Anzeigentext ein. Der Check markiert die Formulierungen, an denen sich Heilmittelwerbegesetz und Berufsordnung am häufigsten stoßen — Garantien, absolute Aussagen wie „schmerzfrei“, Superlative, Preise und Rabatte, Vorher-Nachher, Patientenstimmen, Heilversprechen und Angstmache — und schlägt für jede eine ruhigere Formulierung vor. Alles läuft in Ihrem Browser: Ihr Text wird nirgendwohin gesendet.",
    queries: ["HWG Check Zahnarzt", "Zahnarzt Werbung was ist erlaubt", "Heilmittelwerbegesetz Zahnarzt Instagram", "Zahnarztwerbung prüfen", "schmerzfrei Werbung Zahnarzt verboten"],
    ui: {
      label: "Ihr Post, Website-Text oder Anzeigentext",
      placeholder: "Text hier einfügen, z. B. „Schmerzfreie Implantate, 20 % Rabatt — die beste Praxis der Stadt!“",
      sample: "Schmerzfreie Implantate mit Erfolgsgarantie! Die beste Zahnarztpraxis in München. Nur diesen Monat 20 % Rabatt mit Gutschein. Sehen Sie unsere Vorher-Nachher-Bilder und Patientenstimmen. Warten Sie nicht länger!",
      trySample: "Beispiel ausprobieren",
      check: "Text prüfen",
      clear: "Leeren",
      privacy: "Geprüft in Ihrem Browser. Ihr Text wird nirgendwohin gesendet und nicht gespeichert.",
      tooLong: "Nur die ersten {max} Zeichen werden geprüft.",
      resultsHeading: "Ergebnis",
      found: "Riskante Formulierungen: {n}",
      cleanTitle: "Keine riskanten Formulierungen gefunden",
      cleanText: "Keine der Formulierungen, die dieser Check kennt, steht in Ihrem Text. Ein gutes Zeichen, aber keine Freigabe: Lesen Sie ihn vor dem Posten noch einmal auf Versprechen, Bilder und Patientendaten.",
      why: "Warum",
      instead: "Stattdessen",
      tip: "So geht es besser",
      yourText: "Ihr Text, riskante Stellen markiert",
      quotes: ["„", "“"],
      rules: {
        guarantee: { name: "Garantie", why: "Kein Behandlungserfolg lässt sich garantieren; § 3 HWG verbietet, Erfolg als sicher darzustellen.", tip: "Sagen Sie, dass Ergebnisse individuell sind und Sie Nutzen und Risiken besprechen." },
        absolute: { name: "Absolute Aussage", why: "Schmerzfrei, dauerhaft, 100 % oder „verhindert“ versprechen ein Ergebnis, das niemand jedem Patienten versprechen kann.", tip: "Vorsichtig formulieren: „kann helfen“, „für die meisten“, „bei guter Pflege“." },
        superlative: { name: "Superlativ oder Vergleich", why: "„Beste“, „Nr. 1“ oder „führend“ sind nicht nachprüfbar und vergleichen Sie mit anderen Praxen — die Berufsordnung untersagt anpreisende und vergleichende Werbung.", tip: "Nennen Sie Fakten: was Sie anbieten, wo und durch wen." },
        price: { name: "Preis, Rabatt oder Angebot", why: "Rabatte, Gutscheine, Gewinnspiele und Gratisangebote sind nach § 7 HWG problematisch und machen aus Information einen Verkaufsdruck.", tip: "Preise und Aktionen weglassen; zu Fragen beim nächsten Termin einladen." },
        before_after: { name: "Vorher-Nachher", why: "Vorher-Nachher-Ergebnisse suggerieren, dass jeder Patient dasselbe erreicht; § 11 HWG schränkt sie ein.", tip: "Erklären Sie Schritt für Schritt, wie die Behandlung abläuft." },
        testimonial: { name: "Patientenstimme oder Bewertung", why: "Äußerungen Dritter, Patientenstimmen und Erfahrungsberichte zu Werbezwecken schränkt § 11 HWG ein.", tip: "Beantworten Sie stattdessen eine Frage, die Patienten oft stellen." },
        cure: { name: "Heilversprechen", why: "Zu versprechen, dass eine Behandlung heilt oder etwas beseitigt, geht über das hinaus, was sie zusagen kann.", tip: "Sagen Sie „kann bei der Behandlung helfen“." },
        fear: { name: "Angst oder Druck", why: "Werbung, die Angst macht oder zur sofortigen Buchung drängt, ist in der Heilmittelwerbung eingeschränkt.", tip: "Beschreiben Sie das Anzeichen ruhig und empfehlen Sie, es in der Praxis anzusprechen." },
      },
      cta: {
        title: "Fünf Videos pro Woche, schon so geprüft?",
        text: "DentVideo schreibt, vertont und untertitelt fünf kurze Aufklärungsvideos pro Woche in Ihrer Sprache und Ihren Farben. Jedes Skript durchläuft genau diese Regeln und eine zweite, genauere Prüfung, bevor Sie es sehen — und nichts erscheint ohne Ihre Freigabe.",
        button: "Ihre Vorschau ansehen",
        secondary: "So funktioniert DentVideo",
      },
    },
    how: {
      heading: "Worauf der Check achtet",
      paragraphs: [
        "Es sind dieselben Regeln, die DentVideos eigene Compliance-Prüfung auf jedes Videoskript anwendet, bevor eine Praxis es sieht: Muster für Garantien, absolute Aussagen, Superlative, Preise und Aktionen, Vorher-Nachher, Patientenstimmen und Heilversprechen — auf Deutsch, Englisch, Spanisch, Türkisch, Französisch, Japanisch, Arabisch und Polnisch.",
        "Die Muster kennen die üblichen Fehlalarme. „Bleibende Zähne“ und die „dauerhafte Füllung“ nach der provisorischen sind Fachbegriffe, „vorher und nachher gründlich putzen“ ist ein Rat, „macht die Zähne nicht dauerhaft empfindlich“ eine ehrliche Einschränkung — nichts davon wird markiert.",
        "Ein Muster liest keinen Zusammenhang: Es sieht kein verstecktes Versprechen, kein irreführendes Foto und keinen erkennbaren Patienten. Ein sauberes Ergebnis heißt „nichts Offensichtliches“, nicht „freigegeben“.",
      ],
    },
    rulesHeading: "Welche Regeln gelten in Deutschland, Österreich und der Schweiz?",
    rules: [
      {
        heading: "Deutschland: HWG und Berufsordnung",
        text: "Sachliche Information ist erlaubt, anpreisende, irreführende oder vergleichende Werbung nicht (Musterberufsordnung der Bundeszahnärztekammer, §§ 20–22, umgesetzt durch die Landeszahnärztekammern). Das Heilmittelwerbegesetz verbietet unter anderem, Erfolg als sicher darzustellen (§ 3), Werbegaben und Rabatte (§ 7) und bestimmte Publikumswerbung wie Vorher-Nachher-Vergleiche bei ästhetischen Eingriffen ohne medizinische Notwendigkeit und Äußerungen Dritter (§ 11).",
        sources: [HWG, BZAEK],
      },
      {
        heading: "Österreich und Schweiz",
        text: "In Österreich untersagt § 35 Zahnärztegesetz unwahre, unsachliche oder standesschädigende Werbung; die Werberichtlinie der Zahnärztekammer konkretisiert das. In der Schweiz muss Werbung nach Art. 40 Medizinalberufegesetz objektiv sein, einem öffentlichen Bedürfnis entsprechen und darf weder irreführen noch aufdringlich sein — in jeder Landessprache.",
        sources: [RIS, FEDLEX],
      },
    ],
    notLegalAdvice: "Allgemeine Information, keine Rechtsberatung. Regeln ändern sich; prüfen Sie den aktuellen Wortlaut bei Ihrer Kammer.",
    guide: { slug: "heilmittelwerbegesetz-zahnarzt-social-media", label: "Zum Ratgeber: Heilmittelwerbegesetz für Zahnärzte auf Social Media" },
    faq: [
      {
        q: "Wird mein Text an einen Server gesendet oder gespeichert?",
        a: "Nein. Der Check läuft vollständig in Ihrem Browser; der eingefügte Text verlässt Ihr Gerät nicht und wird nicht gespeichert. Wir zählen nur, dass geprüft wurde und wie viele Stellen markiert wurden — nie die Wörter.",
      },
      {
        q: "Darf eine Zahnarztpraxis mit „schmerzfrei“ werben?",
        a: "Das Wort gehört zu den heikelsten, weil es einen Erfolg als sicher darstellt, den niemand jedem Patienten zusagen kann (§ 3 HWG). Beschreiben Sie lieber, was Sie tun: „unter örtlicher Betäubung; die meisten spüren danach nur eine leichte Empfindlichkeit“.",
      },
      {
        q: "Heißt ein sauberes Ergebnis, dass mein Post HWG-konform ist?",
        a: "Nein. Der Check findet riskante Formulierungen, nicht jedes Risiko: Bilder, versteckte Versprechen, Einwilligungen und die Regeln Ihrer Kammer brauchen weiter einen menschlichen Blick. Allgemeine Information, keine Rechtsberatung.",
      },
      {
        q: "Sind Vorher-Nachher-Bilder beim Zahnarzt immer verboten?",
        a: "§ 11 HWG verbietet sie in der Publikumswerbung für operative plastisch-chirurgische Eingriffe ohne medizinische Notwendigkeit; der BGH zählt dazu auch Hyaluron-Unterspritzungen zur Formung von Nase oder Kinn. Für andere Behandlungen bleiben sie heikel, weil sie ein Ergebnis für alle suggerieren — der Check markiert sie deshalb immer.",
      },
      {
        q: "Was hat das mit DentVideo zu tun?",
        a: "DentVideo erstellt kurze Aufklärungsvideos für Zahnarztpraxen. Jedes Skript durchläuft diese Regeln und eine genauere Prüfung des ganzen Textes, bevor die Praxis etwas freigibt.",
      },
    ],
  },

  es: {
    nav: "Comprobador de anuncios",
    seoTitle: "¿Puedo publicar esto? Comprobador para dentistas",
    seoDescription: "Comprobador gratuito para dentistas: pega un post, un texto web o un anuncio y mira qué frases chocan con la publicidad sanitaria, con alternativas.",
    h1: "¿Puedo publicar esto? Comprobador de publicidad para clínicas dentales",
    intro:
      "Pega el texto de un post de Instagram, un párrafo de tu web o un anuncio. El comprobador marca las frases que más chocan con las normas de publicidad sanitaria — garantías, absolutos como “sin dolor”, superlativos, precios y descuentos, antes y después, testimonios, promesas de curación y miedo — y propone una forma más prudente de decir cada una. Funciona en tu navegador: tu texto no se envía a ningún sitio.",
    queries: ["publicidad sanitaria dentistas", "qué puede publicar un dentista en redes sociales", "publicidad clínica dental prohibida", "comprobar publicidad clínica dental", "se puede decir sin dolor en publicidad dental"],
    ui: {
      label: "Tu post, texto web o anuncio",
      placeholder: "Pega aquí el texto, p. ej. “Implantes sin dolor, 30 % de descuento — ¡la mejor clínica de la ciudad!”",
      sample: "Implantes sin dolor y resultados garantizados. La mejor clínica dental de Madrid. Descuento del 30 % y 2x1 en limpiezas solo este mes. Mira el antes y después de nuestros pacientes. ¡No esperes más!",
      trySample: "Probar un ejemplo",
      check: "Comprobar mi texto",
      clear: "Borrar",
      privacy: "Se comprueba en tu navegador. Tu texto no se envía a ningún sitio ni se guarda.",
      tooLong: "Solo se comprueban los primeros {max} caracteres.",
      resultsHeading: "Resultado",
      found: "Frases de riesgo: {n}",
      cleanTitle: "No se han encontrado frases de riesgo",
      cleanText: "Ninguna de las frases que conoce este comprobador aparece en tu texto. Es buena señal, no una autorización: vuelve a leerlo buscando promesas, imágenes y datos de pacientes antes de publicar.",
      why: "Por qué",
      instead: "Prueba con",
      tip: "Cómo arreglarlo",
      yourText: "Tu texto, con las frases de riesgo marcadas",
      quotes: ["«", "»"],
      rules: {
        guarantee: { name: "Garantía", why: "Ningún resultado se puede garantizar; el Real Decreto 1907/1996 no admite garantizar resultados ni la ausencia de efectos adversos.", tip: "Di que los resultados varían y que el dentista explica beneficios y riesgos." },
        absolute: { name: "Afirmación absoluta", why: "Sin dolor, para siempre, 100 % o “previene” prometen algo que nadie puede asegurar a todos los pacientes.", tip: "Matiza: “puede ayudar”, “en la mayoría de los casos”, “con un buen cuidado”." },
        superlative: { name: "Superlativo o comparación", why: "“El mejor”, “número uno” o “líderes” no se pueden verificar y te comparan con otras clínicas.", tip: "Da hechos: qué ofreces, dónde y quién lo hace." },
        price: { name: "Precio, descuento u oferta", why: "Descuentos, promociones, sorteos y ganchos de financiación convierten la información en presión comercial.", tip: "Deja fuera precios y ofertas; invita a preguntar en la próxima revisión." },
        before_after: { name: "Antes y después", why: "El antes y después sugiere que todos los pacientes obtendrán el mismo resultado.", tip: "Explica paso a paso en qué consiste el tratamiento." },
        testimonial: { name: "Testimonio u opinión", why: "Los testimonios de pacientes y de famosos están restringidos en la publicidad sanitaria; el Tribunal Supremo avaló prohibir famosos en anuncios de clínicas dentales.", tip: "Responde mejor a una pregunta que los pacientes hacen a menudo." },
        cure: { name: "Promesa de curación", why: "Prometer una curación definitiva va más allá de lo que un tratamiento puede asegurar.", tip: "Di que el tratamiento “puede ayudar a tratar”." },
        fear: { name: "Miedo o presión", why: "Asustar o meter prisa para pedir cita (“no esperes más”) no es información prudente.", tip: "Describe el síntoma con calma y sugiere consultarlo con el dentista." },
      },
      cta: {
        title: "¿Quieres cinco vídeos a la semana ya revisados así?",
        text: "DentVideo escribe, pone voz y subtitula cinco vídeos educativos cortos a la semana en tu idioma y tus colores. Cada guion pasa estas mismas reglas y una segunda revisión más atenta antes de que lo veas, y nada se publica sin tu aprobación.",
        button: "Ver tu vista previa",
        secondary: "Cómo funciona DentVideo",
      },
    },
    how: {
      heading: "Qué busca el comprobador",
      paragraphs: [
        "Son las mismas reglas que el control de cumplimiento de DentVideo aplica a cada guion antes de que la clínica lo vea: patrones de garantías, absolutos, superlativos, precios y promociones, antes y después, testimonios y promesas de curación, en español, inglés, alemán, turco, francés, japonés, árabe y polaco.",
        "Los patrones conocen las falsas alarmas habituales: los “dientes permanentes” y el “empaste definitivo” son términos clínicos, y “cepíllate antes y después de comer” es un consejo; no se marcan.",
        "Un patrón no lee el contexto: no ve una promesa implícita, una foto engañosa ni a un paciente identificable. Un resultado limpio significa “nada evidente”, no “aprobado”.",
      ],
    },
    rulesHeading: "Qué normas se aplican",
    rules: [
      {
        heading: "España",
        text: "El Real Decreto 1907/1996 sobre publicidad con finalidad sanitaria, la Ley General de Sanidad, las normas de cada comunidad autónoma y el Código Español de Ética y Deontología Dental piden información veraz, objetiva y prudente: sin garantizar resultados ni curaciones definitivas, sin testimonios de famosos y sin inducir a tratamientos innecesarios.",
        sources: [BOE, CGD, TS_FAMOSOS],
      },
      {
        heading: "México y otros países",
        text: "En México, la Ley General de Salud y su Reglamento en materia de publicidad, que aplica COFEPRIS, exigen que la publicidad sea veraz y corresponda a lo que hace el servicio. En otros países de habla hispana, revisa las normas de tu colegio o autoridad sanitaria.",
        sources: [COFEPRIS],
      },
    ],
    notLegalAdvice: "Información general, no asesoramiento jurídico. Las normas cambian; comprueba el texto vigente con tu colegio.",
    guide: { slug: "publicidad-sanitaria-dentistas", label: "Lee la guía: publicidad sanitaria para dentistas" },
    faq: [
      {
        q: "¿Mi texto se envía a un servidor o se guarda?",
        a: "No. El comprobador funciona por completo en tu navegador: el texto que pegas no sale de tu dispositivo ni se guarda. Solo contamos que se hizo una comprobación y cuántas frases se marcaron, nunca las palabras.",
      },
      {
        q: "¿Puede una clínica dental decir “sin dolor” en su publicidad?",
        a: "Es de las expresiones más delicadas, porque promete a todos un tratamiento sin molestias. Mejor describe lo que haces: “con anestesia local; la mayoría de los pacientes nota solo una ligera sensibilidad después”.",
      },
      {
        q: "¿Un resultado limpio significa que mi post cumple la normativa?",
        a: "No. El comprobador encuentra frases de riesgo, no todos los riesgos: las imágenes, las promesas implícitas, el consentimiento de los pacientes y las normas de tu colegio necesitan una lectura humana. Es información general, no asesoramiento jurídico.",
      },
      {
        q: "¿En qué idiomas funciona?",
        a: "En español, inglés, alemán, turco, francés, japonés, árabe y polaco, en cualquier página: un texto en inglés pegado aquí también se comprueba.",
      },
      {
        q: "¿Qué relación tiene con DentVideo?",
        a: "DentVideo crea vídeos educativos cortos para clínicas dentales. Cada guion pasa estas reglas y una revisión más atenta del texto completo antes de que la clínica apruebe nada.",
      },
    ],
  },

  fr: {
    nav: "Vérificateur",
    seoTitle: "Dentiste : puis-je publier ça ? Vérificateur gratuit",
    seoDescription: "Outil gratuit pour dentistes : collez une publication, un texte de site ou une annonce et repérez les formules à risque, avec une alternative.",
    h1: "Puis-je publier ça ? Le vérificateur de communication pour dentistes",
    intro:
      "Collez une légende Instagram, un paragraphe de votre site ou un texte d'annonce. Le vérificateur repère les formules que les règles de communication en santé visent le plus souvent — garanties, absolus comme « sans douleur », superlatifs, prix et promotions, avant/après, témoignages, promesses de guérison et peur — et propose pour chacune une formulation plus prudente. Tout se passe dans votre navigateur : votre texte n'est envoyé nulle part.",
    queries: ["communication chirurgien-dentiste réseaux sociaux", "publicité dentiste autorisée", "ce qu'un dentiste peut publier sur Instagram", "vérifier publication cabinet dentaire", "dentiste sans douleur publicité interdite"],
    ui: {
      label: "Votre publication, texte de site ou annonce",
      placeholder: "Collez votre texte ici, par ex. « Blanchiment sans douleur, -30 % ce mois-ci, le meilleur cabinet de la ville ! »",
      sample: "Blanchiment sans douleur garanti ! Le meilleur cabinet dentaire de Lyon. Offre spéciale ce mois-ci : consultation gratuite. Découvrez nos photos avant/après et les témoignages de nos patients. N'attendez plus !",
      trySample: "Essayer un exemple",
      check: "Vérifier mon texte",
      clear: "Effacer",
      privacy: "Vérifié dans votre navigateur. Votre texte n'est envoyé nulle part ni conservé.",
      tooLong: "Seuls les {max} premiers caractères sont vérifiés.",
      resultsHeading: "Résultat",
      found: "Formules à risque : {n}",
      cleanTitle: "Aucune formule à risque trouvée",
      cleanText: "Aucune des formules que connaît ce vérificateur ne figure dans votre texte. C'est bon signe, pas une validation : relisez-le pour les promesses, les images et les données de patients avant de publier.",
      why: "Pourquoi",
      instead: "Essayez plutôt",
      tip: "Comment corriger",
      yourText: "Votre texte, formules à risque surlignées",
      quotes: ["« ", " »"],
      rules: {
        guarantee: { name: "Garantie", why: "Aucun résultat de soin ne peut être garanti ; une garantie est trompeuse.", tip: "Dites que les résultats varient et que le praticien explique bénéfices et risques." },
        absolute: { name: "Affirmation absolue", why: "Sans douleur, à vie, 100 % ou « prévient » promettent un résultat que personne ne peut assurer à chaque patient.", tip: "Nuancez : « peut aider », « pour la plupart des patients », « avec un bon entretien »." },
        superlative: { name: "Superlatif ou comparaison", why: "« Le meilleur » ou « moins cher » ne sont pas vérifiables et vous comparent à d'autres praticiens, ce que la déontologie exclut.", tip: "Donnez des faits : ce que vous proposez, où et par qui." },
        price: { name: "Prix, promotion ou offre", why: "Promotions, réductions et offres gratuites font de l'information une démarche commerciale ; la profession ne s'exerce pas comme un commerce.", tip: "Retirez prix et offres ; invitez à poser la question au prochain contrôle." },
        before_after: { name: "Avant/après", why: "Un avant/après laisse croire que chaque patient obtiendra le même résultat.", tip: "Expliquez le déroulement du traitement, étape par étape." },
        testimonial: { name: "Témoignage ou avis", why: "Les témoignages de tiers ne peuvent pas servir à la communication du chirurgien-dentiste.", tip: "Répondez plutôt à une question que vos patients posent souvent." },
        cure: { name: "Promesse de guérison", why: "Promettre de guérir ou d'éliminer un problème dépasse ce qu'un soin peut garantir.", tip: "Dites que le traitement « peut aider à traiter »." },
        fear: { name: "Peur ou pression", why: "Faire peur ou pousser à prendre rendez-vous tout de suite incite à des soins, ce que la déontologie proscrit.", tip: "Décrivez le signe calmement et suggérez d'en parler au dentiste." },
      },
      cta: {
        title: "Cinq vidéos par semaine, déjà vérifiées ainsi ?",
        text: "DentVideo écrit, met en voix et sous-titre cinq courtes vidéos d'information patient par semaine, dans votre langue et vos couleurs. Chaque script passe ces mêmes règles et une seconde relecture plus attentive avant que vous le voyiez, et rien n'est publié sans votre accord.",
        button: "Voir votre aperçu",
        secondary: "Comment fonctionne DentVideo",
      },
    },
    how: {
      heading: "Ce que vérifie l'outil",
      paragraphs: [
        "Ce sont les mêmes règles que le contrôle de conformité de DentVideo applique à chaque script avant que le cabinet ne le voie : garanties, absolus, superlatifs, prix et promotions, avant/après, témoignages et promesses de guérison, en français, anglais, allemand, espagnol, turc, japonais, arabe et polonais.",
        "Les motifs connaissent les fausses alertes courantes : les « dents permanentes » sont les dents définitives, et « se brosser avant et après les repas » est un conseil ; rien de cela n'est signalé.",
        "Un motif ne lit pas le contexte : il ne voit ni une promesse implicite, ni une photo trompeuse, ni un patient reconnaissable. Un résultat propre veut dire « rien d'évident », pas « validé ».",
      ],
    },
    rulesHeading: "Les règles en France",
    rules: [
      {
        heading: "Code de la santé publique et Ordre",
        text: "Depuis le décret du 22 décembre 2020, le chirurgien-dentiste peut communiquer au public des informations loyales, honnêtes et utiles (article R. 4127-215-1 du Code de la santé publique), mais la profession ne s'exerce pas comme un commerce. Les recommandations de l'Ordre national précisent ce qui reste exclu : témoignages de tiers, comparaisons avec d'autres praticiens, promesses et incitation à des soins inutiles.",
        sources: [R4127_215_1, ONCD],
      },
    ],
    notLegalAdvice: "Information générale, pas un conseil juridique. Les règles évoluent ; vérifiez le texte en vigueur auprès de votre conseil de l'Ordre.",
    guide: { slug: "communication-chirurgien-dentiste-reseaux-sociaux", label: "Lire le guide : la communication du chirurgien-dentiste sur les réseaux sociaux" },
    faq: [
      {
        q: "Mon texte est-il envoyé à un serveur ou conservé ?",
        a: "Non. Le vérificateur fonctionne entièrement dans votre navigateur : le texte collé ne quitte pas votre appareil et n'est pas enregistré. Nous comptons seulement qu'une vérification a eu lieu et combien de formules ont été signalées, jamais les mots.",
      },
      {
        q: "Un dentiste peut-il écrire « sans douleur » ?",
        a: "C'est l'une des formules les plus délicates, car elle promet à chacun un soin sans inconfort. Décrivez plutôt ce que vous faites : « sous anesthésie locale ; la plupart des patients ne ressentent ensuite qu'une légère sensibilité ».",
      },
      {
        q: "Un résultat propre veut-il dire que ma publication est conforme ?",
        a: "Non. L'outil repère des formules à risque, pas tous les risques : images, promesses implicites, consentement des patients et recommandations de l'Ordre demandent une relecture humaine. Information générale, pas un conseil juridique.",
      },
      {
        q: "Quelles langues sont vérifiées ?",
        a: "Le français, l'anglais, l'allemand, l'espagnol, le turc, le japonais, l'arabe et le polonais, sur chaque page.",
      },
      {
        q: "Quel lien avec DentVideo ?",
        a: "DentVideo réalise de courtes vidéos d'information patient pour les cabinets dentaires. Chaque script passe ces règles puis une relecture plus attentive du texte entier, avant que le cabinet n'approuve quoi que ce soit.",
      },
    ],
  },

  ja: {
    nav: "広告表現チェッカー",
    seoTitle: "歯科の広告表現チェッカー｜この投稿は大丈夫？",
    seoDescription: "歯科医院向けのチェックツール（登録不要）。SNS投稿やホームページの文章を貼り付けると、医療広告ガイドラインで問題になりやすい表現と、その言い換え例を表示します。",
    h1: "この投稿、大丈夫？ 歯科医院のための広告表現チェッカー",
    intro:
      "Instagramの投稿文、ホームページの文章、広告文を貼り付けてください。医療広告の規制で問題になりやすい表現——保証、「無痛」などの断定、「地域No.1」などの比較優良表現、料金・割引、ビフォーアフター、体験談、「完治」などの表現、不安をあおる表現——に印を付け、より慎重な言い換えを示します。チェックはブラウザの中だけで行われ、文章はどこにも送信されません。",
    queries: ["歯科 医療広告ガイドライン チェック", "歯科医院 広告 NGワード", "医療広告 禁止表現 チェック", "歯科 インスタ 投稿 広告規制", "無痛治療 広告 違反"],
    ui: {
      label: "投稿文・ホームページの文章・広告文",
      placeholder: "ここに文章を貼り付けてください（例：「無痛治療で安心！地域No.1の歯科医院、初回無料」）",
      sample: "無痛治療で絶対安心！地域No.1の歯科医院です。ビフォーアフター写真と患者様の声をご覧ください。初回無料カウンセリング、ホワイトニング半額キャンペーン実施中。手遅れになる前に今すぐ予約を。",
      trySample: "例文で試す",
      check: "チェックする",
      clear: "クリア",
      privacy: "チェックはブラウザ内で行われます。文章は送信も保存もされません。",
      tooLong: "最初の{max}文字だけをチェックします。",
      resultsHeading: "結果",
      found: "注意が必要な表現：{n}件",
      cleanTitle: "注意が必要な表現は見つかりませんでした",
      cleanText: "このツールが知っている表現は文章に含まれていません。よい兆候ですが、承認ではありません。公開前に、約束になっていないか、画像や患者さんの情報に問題がないか、もう一度ご確認ください。",
      why: "理由",
      instead: "言い換え例",
      tip: "直し方",
      yourText: "文章（注意が必要な表現に印付き）",
      quotes: ["「", "」"],
      rules: {
        guarantee: { name: "保証", why: "治療の結果は保証できません。保証の表現は誇大広告とみなされるおそれがあります。", tip: "結果には個人差があること、リスクを事前に説明することを書きましょう。" },
        absolute: { name: "断定・誇大な表現", why: "「無痛」「絶対」「永久」「100％」「防ぎます」は、すべての患者さんに約束できない結果を約束します。", tip: "「〜に役立ちます」「多くの場合」「適切なお手入れで」と控えめに。" },
        superlative: { name: "比較優良表現", why: "「No.1」「日本一」「最高」「最先端」は客観的に確認できず、他院との比較になります。", tip: "事実を書きましょう：どんな診療を、どこで、誰が行うか。" },
        price: { name: "料金・割引・キャンペーン", why: "割引、キャンペーン、無料、モニター募集は受診を誘引する表現として問題になりやすい表現です。", tip: "料金や特典は載せず、受診時の相談を案内しましょう。" },
        before_after: { name: "ビフォーアフター", why: "術前術後の写真は、誰もが同じ結果になるような印象を与えます。", tip: "治療の一般的な流れを説明しましょう。" },
        testimonial: { name: "体験談・口コミ", why: "治療の内容や効果に関する患者さんの体験談は、医療広告では広告できない事項とされています。", tip: "患者さんからよくいただく質問に答える形にしましょう。" },
        cure: { name: "「完治」などの表現", why: "「完治」「必ず治る」は治療が約束できる範囲を超えています。", tip: "「治療に役立つことがあります」と表現しましょう。" },
        fear: { name: "不安をあおる表現", why: "「手遅れ」「今すぐ予約」など、不安をあおったり受診を急がせたりする表現は避けるべきです。", tip: "症状を落ち着いて説明し、歯科医師への相談をすすめましょう。" },
      },
      cta: {
        title: "このチェック済みの動画を、週に5本。",
        text: "DentVideoは、患者さん向けの短い説明動画を週に5本、医院の言語と色で作成し、ナレーションと字幕を付けます。すべての台本はこのルールと、より丁寧な二次チェックを通ってから届き、医院の承認なしに公開されることはありません。",
        button: "プレビューを見る",
        secondary: "DentVideoのしくみ",
      },
    },
    how: {
      heading: "チェックする内容",
      paragraphs: [
        "DentVideoが動画の台本を医院にお見せする前に必ず通すルールと同じものです。保証、断定、比較優良、料金・キャンペーン、ビフォーアフター、体験談、「完治」などのパターンを、日本語・英語・ドイツ語・スペイン語・トルコ語・フランス語・アラビア語・ポーランド語で確認します。",
        "よくある誤検知は除外しています。「永久歯」は大人の歯のこと、「保証できません」は誠実な表現、「治療前後の注意」は説明であり、いずれも印は付きません。",
        "パターンは文脈を読めません。暗黙の約束、誤解を招く写真、患者さんが特定できる情報は見つけられません。問題が見つからなくても「目立つ問題はない」という意味で、承認ではありません。",
      ],
    },
    rulesHeading: "日本の医療広告のルール",
    rules: [
      {
        heading: "医療法と医療広告ガイドライン",
        text: "医院のホームページやSNSも、医療法にもとづく広告規制と厚生労働省の医療広告ガイドラインの対象になり得ます。比較優良広告、誇大広告、治療の内容や効果に関する体験談、誤認を与えるおそれのある術前術後の写真などは広告できないとされています。自由診療を説明する場合は、費用やリスク・副作用などの情報もあわせて示す必要があります。",
        sources: [MHLW],
      },
    ],
    notLegalAdvice: "一般的な情報であり、法的助言ではありません。最新の内容は厚生労働省の資料や所属の歯科医師会でご確認ください。",
    guide: { slug: "iryo-kokoku-guideline-shika-sns", label: "ガイドを読む：歯科医院のSNSと医療広告ガイドライン" },
    faq: [
      {
        q: "入力した文章はサーバーに送信・保存されますか？",
        a: "いいえ。チェックはすべてブラウザの中で行われ、貼り付けた文章が端末の外に出ることも保存されることもありません。記録するのはチェックが行われたことと印の数だけで、文章そのものは記録しません。",
      },
      {
        q: "歯科医院の広告で「無痛治療」と書いてもよいですか？",
        a: "「無痛」は、すべての患者さんに痛みのない治療を約束する表現で、特に問題になりやすい言葉です。「局所麻酔を使い、痛みに配慮して行います（感じ方には個人差があります）」のように、実際に行っていることを書きましょう。",
      },
      {
        q: "問題が見つからなければ、ガイドラインに適合しているということですか？",
        a: "いいえ。このツールは注意が必要な表現を見つけるもので、すべてのリスクを見つけるものではありません。画像、暗黙の約束、患者さんの同意などは人の目で確認が必要です。一般的な情報であり、法的助言ではありません。",
      },
      {
        q: "どの言語に対応していますか？",
        a: "日本語、英語、ドイツ語、スペイン語、トルコ語、フランス語、アラビア語、ポーランド語です。どのページでも、すべての言語をチェックします。",
      },
      {
        q: "DentVideoとはどう関係していますか？",
        a: "DentVideoは歯科医院向けに患者さん向けの短い説明動画を作るサービスです。すべての台本はこのルールと、文章全体を読む二次チェックを通ってから医院に届きます。",
      },
    ],
  },

  ar: {
    nav: "فحص الإعلانات",
    seoTitle: "فحص إعلانات عيادات الأسنان: هل منشوري مسموح؟",
    seoDescription: "أداة لأطباء الأسنان بلا تسجيل: الصقوا نص المنشور أو الموقع أو الإعلان لتروا العبارات التي تخالف غالباً قواعد الإعلان الطبي، مع صياغة أكثر أماناً.",
    h1: "هل منشوري مسموح؟ أداة لفحص إعلانات عيادات الأسنان",
    intro:
      "الصقوا نص منشور إنستغرام أو فقرة من موقع العيادة أو نص إعلان. تحدد الأداة العبارات التي تعترض عليها قواعد الإعلان الطبي في أغلب الأحيان — الضمانات، والعبارات المطلقة مثل «بدون ألم»، وصيغ التفضيل، والأسعار والخصومات، وصور «قبل وبعد»، وآراء المرضى، ووعود الشفاء، والتخويف — وتقترح لكل منها صياغة أهدأ. يتم الفحص داخل متصفحكم: لا يُرسَل نصكم إلى أي مكان.",
    queries: ["قوانين الإعلان الطبي لعيادات الأسنان", "إعلانات عيادة الأسنان المسموح بها", "معايير الإعلانات الطبية هيئة الصحة بدبي", "فحص إعلان عيادة أسنان", "عبارات ممنوعة في الإعلان الطبي"],
    ui: {
      label: "نص المنشور أو الموقع أو الإعلان",
      placeholder: "الصقوا النص هنا، مثلاً: «تبييض بدون ألم، خصم 30% — أفضل عيادة في المدينة!»",
      sample: "علاج بدون ألم ونتائج مضمونة! أفضل عيادة أسنان في دبي. خصم 30% وعرض خاص لفترة محدودة. شاهدوا صور قبل وبعد وآراء المرضى. لا تنتظروا أكثر، احجزوا الآن.",
      trySample: "جرّبوا مثالاً",
      check: "افحص النص",
      clear: "مسح",
      privacy: "يتم الفحص داخل متصفحكم. لا يُرسَل نصكم إلى أي مكان ولا يُحفظ.",
      tooLong: "يتم فحص أول {max} حرف فقط.",
      resultsHeading: "النتيجة",
      found: "عبارات تحتاج إلى مراجعة: {n}",
      cleanTitle: "لم نجد عبارات تحتاج إلى مراجعة",
      cleanText: "لا يحتوي نصكم على أي من العبارات التي تعرفها هذه الأداة. هذه علامة جيدة وليست موافقة: اقرؤوا النص مرة أخرى بحثاً عن الوعود والصور وبيانات المرضى قبل النشر.",
      why: "السبب",
      instead: "بدلاً من ذلك",
      tip: "كيف تُصلَح",
      yourText: "نصكم، مع تمييز العبارات التي تحتاج إلى مراجعة",
      quotes: ["«", "»"],
      rules: {
        guarantee: { name: "ضمان", why: "لا يمكن ضمان نتيجة أي علاج، والجهات الصحية تعدّ الضمان ادعاءً مضللاً.", tip: "اذكروا أن النتائج تختلف من شخص لآخر وأن الطبيب يشرح الفوائد والمخاطر." },
        absolute: { name: "عبارة مطلقة", why: "«بدون ألم» و«مدى الحياة» و«100%» و«نتائج فورية» تَعِد بنتيجة لا يمكن ضمانها لكل مريض؛ ومعايير هيئة الصحة بدبي تذكر بعضها صراحة.", tip: "خففوا العبارة: «قد يساعد»، «لدى معظم المرضى»، «مع العناية الجيدة»." },
        superlative: { name: "تفضيل أو مقارنة", why: "«الأفضل» و«رقم 1» و«الأرخص» لا يمكن التحقق منها، وتقارنكم بعيادات أخرى.", tip: "اذكروا حقائق: ما الخدمة، وأين، ومن يقدمها." },
        price: { name: "سعر أو خصم أو عرض", why: "الأسعار والخصومات والعروض المجانية والمدد المحدودة تحوّل المعلومة إلى ترويج تجاري، وهي مقيدة في الإعلان الطبي.", tip: "احذفوا الأسعار والحوافز التجارية، وادعوا إلى السؤال في الزيارة القادمة." },
        before_after: { name: "قبل وبعد", why: "صور النتائج «قبل وبعد» توحي بأن كل مريض سيحصل على النتيجة نفسها.", tip: "اشرحوا خطوات العلاج كما تتم عادةً." },
        testimonial: { name: "آراء المرضى", why: "شهادات المرضى وتقييمات النجوم مقيدة في الإعلان الطبي، وقد تكشف هوية المريض.", tip: "أجيبوا بدلاً من ذلك عن سؤال يطرحه المرضى كثيراً." },
        cure: { name: "وعد بالشفاء", why: "الوعد بشفاء تام أو علاج نهائي يتجاوز ما يمكن أن يعد به أي علاج.", tip: "قولوا إن العلاج «قد يساعد في العلاج»." },
        fear: { name: "تخويف أو استعجال", why: "تخويف المشاهد أو استعجاله للحجز («احجزوا الآن») ليس معلومة هادئة ومتوازنة.", tip: "صفوا العَرَض بهدوء واقترحوا استشارة طبيب الأسنان." },
      },
      cta: {
        title: "خمسة فيديوهات أسبوعياً، مفحوصة بهذه الطريقة مسبقاً؟",
        text: "تكتب DentVideo خمسة فيديوهات توعوية قصيرة أسبوعياً بلغتكم وألوان عيادتكم، مع التعليق الصوتي والنص المكتوب. يمر كل نص بهذه القواعد نفسها وبمراجعة ثانية أدق قبل أن تروه، ولا يُنشر شيء دون موافقتكم.",
        button: "شاهدوا المعاينة",
        secondary: "كيف تعمل DentVideo",
      },
    },
    how: {
      heading: "ما الذي تفحصه الأداة",
      paragraphs: [
        "هي القواعد نفسها التي تطبقها DentVideo على كل نص فيديو قبل أن تراه العيادة: أنماط للضمانات والعبارات المطلقة والتفضيل والأسعار والعروض وصور قبل وبعد وآراء المرضى ووعود الشفاء، بالعربية والإنجليزية والألمانية والإسبانية والتركية والفرنسية واليابانية والبولندية.",
        "تعرف الأنماط الإنذارات الكاذبة الشائعة: «الأسنان الدائمة» و«الحشوة الدائمة» مصطلحات طبية، و«نظفوا أسنانكم قبل وبعد الأكل» نصيحة؛ ولا يُعلَّم أي منها.",
        "لا يقرأ النمط السياق: لا يرى وعداً ضمنياً أو صورة مضللة أو مريضاً يمكن التعرف عليه. النتيجة النظيفة تعني «لا شيء واضحاً»، لا «موافقة».",
      ],
    },
    rulesHeading: "القواعد في الخليج",
    rules: [
      {
        heading: "الإمارات: معايير هيئة الصحة بدبي والجهات الصحية",
        text: "تعامل الجهات الصحية في الإمارات معظم منشورات العيادات على أنها إعلان طبي. وتذكر معايير هيئة الصحة بدبي لمحتوى الإعلانات الطبية على وسائل التواصل عبارات مثل «الأفضل» و«100%» و«بدون آثار جانبية» و«نتائج فورية» بالاسم، وتقيد آراء المرضى وصور قبل وبعد والعروض. وفي أبوظبي والإمارات الأخرى قواعد مماثلة لدائرة الصحة ووزارة الصحة.",
        sources: [DHA],
      },
      {
        heading: "السعودية",
        text: "تحظر المادة العاشرة من نظام مزاولة المهن الصحية على الممارس الإعلان عن نفسه، لذلك يتحدث المحتوى باسم العيادة لا باسم الطبيب. تحققوا من متطلبات وزارة الصحة الحالية قبل النشر.",
        sources: [MOH_SA],
      },
    ],
    notLegalAdvice: "معلومات عامة وليست استشارة قانونية. القواعد تتغير؛ تحققوا من النص الحالي لدى الجهة الصحية المختصة.",
    guide: { slug: "dawabit-ilan-iyadat-al-asnan-al-khaleej", label: "اقرؤوا الدليل: ضوابط إعلانات عيادات الأسنان في الخليج" },
    faq: [
      {
        q: "هل يُرسَل نصي إلى خادم أو يُحفظ؟",
        a: "لا. يتم الفحص بالكامل داخل متصفحكم، فلا يغادر النص جهازكم ولا يُحفظ. نسجل فقط أن فحصاً تم وعدد العبارات التي حُددت، ولا نسجل الكلمات أبداً.",
      },
      {
        q: "هل يمكن لعيادة أسنان أن تكتب «علاج بدون ألم» في إعلانها؟",
        a: "هذه من أكثر العبارات حساسية لأنها تَعِد كل مريض بعلاج بلا انزعاج. صفوا ما تفعلونه بدلاً من ذلك: «يتم العلاج تحت التخدير الموضعي، ويشعر معظم المرضى بحساسية خفيفة بعده».",
      },
      {
        q: "هل تعني النتيجة النظيفة أن منشوري مطابق للقواعد؟",
        a: "لا. تجد الأداة العبارات الخطرة، لا كل المخاطر: الصور والوعود الضمنية وموافقة المرضى ومتطلبات الترخيص تحتاج إلى قراءة بشرية. هذه معلومات عامة وليست استشارة قانونية.",
      },
      {
        q: "ما اللغات التي تفحصها الأداة؟",
        a: "العربية والإنجليزية والألمانية والإسبانية والتركية والفرنسية واليابانية والبولندية، في كل صفحة.",
      },
      {
        q: "ما علاقة ذلك بـ DentVideo؟",
        a: "تصنع DentVideo فيديوهات توعوية قصيرة لعيادات الأسنان. يمر كل نص بهذه القواعد ثم بمراجعة أدق للنص كاملاً قبل أن توافق العيادة على أي شيء.",
      },
    ],
  },

  pl: {
    nav: "Sprawdzarka reklam",
    seoTitle: "Czy ten post jest dozwolony? Sprawdzarka dla dentystów",
    seoDescription: "Narzędzie dla gabinetów, bez rejestracji: wklej post, tekst ze strony lub reklamę i zobacz ryzykowne sformułowania wraz z bezpieczniejszą wersją.",
    h1: "Czy ten post jest dozwolony? Sprawdzarka reklam dla gabinetów stomatologicznych",
    intro:
      "Wklej opis posta z Instagrama, akapit ze strony gabinetu albo tekst reklamy. Sprawdzarka zaznacza sformułowania, do których zasady reklamy medycznej mają najczęściej zastrzeżenia — gwarancje, określenia absolutne jak „bezbolesny”, superlatywy, ceny i rabaty, efekty „przed i po”, opinie pacjentów, obietnice wyleczenia i straszenie — i dla każdego proponuje spokojniejsze sformułowanie. Działa w przeglądarce: tekst nie jest nigdzie wysyłany.",
    queries: ["reklama gabinetu stomatologicznego zasady", "czy dentysta może się reklamować", "kodeks etyki lekarskiej reklama dentysta", "co dentysta może publikować na Instagramie", "bezbolesne leczenie reklama zakaz"],
    ui: {
      label: "Twój post, tekst ze strony lub reklama",
      placeholder: "Wklej tekst tutaj, np. „Bezbolesne leczenie, rabat 20% — najlepszy gabinet w mieście!”",
      sample: "Bezbolesne leczenie z gwarancją efektu! Najlepszy gabinet w Warszawie. Promocja: rabat 20% i konsultacja za darmo. Zobacz efekty przed i po oraz opinie pacjentów. Nie czekaj dłużej!",
      trySample: "Wypróbuj przykład",
      check: "Sprawdź tekst",
      clear: "Wyczyść",
      privacy: "Sprawdzane w przeglądarce. Tekst nie jest nigdzie wysyłany ani zapisywany.",
      tooLong: "Sprawdzanych jest tylko pierwszych {max} znaków.",
      resultsHeading: "Wynik",
      found: "Ryzykowne sformułowania: {n}",
      cleanTitle: "Nie znaleziono ryzykownych sformułowań",
      cleanText: "W tekście nie ma żadnego ze sformułowań, które zna ta sprawdzarka. To dobry znak, a nie zgoda: przed publikacją przeczytaj tekst jeszcze raz pod kątem obietnic, zdjęć i danych pacjentów.",
      why: "Dlaczego",
      instead: "Zamiast tego",
      tip: "Jak to poprawić",
      yourText: "Twój tekst z zaznaczonymi ryzykownymi miejscami",
      quotes: ["„", "”"],
      rules: {
        guarantee: { name: "Gwarancja", why: "Efektu leczenia nie da się zagwarantować; gwarancja wprowadza w błąd.", tip: "Napisz, że efekty są różne, a lekarz omawia korzyści i ryzyko." },
        absolute: { name: "Określenie absolutne", why: "Bezbolesny, na zawsze, 100% czy „zapobiega” obiecują efekt, którego nikt nie zapewni każdemu pacjentowi.", tip: "Złagodź: „może pomóc”, „u większości pacjentów”, „przy dobrej higienie”." },
        superlative: { name: "Superlatyw lub porównanie", why: "„Najlepszy” czy „nr 1” są nieweryfikowalne i porównują Cię z innymi gabinetami, czego Kodeks Etyki Lekarskiej nie dopuszcza.", tip: "Podaj fakty: co oferujesz, gdzie i kto to robi." },
        price: { name: "Cena, rabat lub promocja", why: "Rabaty, promocje i darmowe oferty zamieniają informację w zachętę handlową.", tip: "Usuń ceny i zachęty handlowe; zaproś do pytań podczas wizyty." },
        before_after: { name: "Przed i po", why: "Efekty „przed i po” sugerują, że każdy pacjent uzyska ten sam wynik.", tip: "Wyjaśnij krok po kroku, jak wygląda zabieg." },
        testimonial: { name: "Opinia pacjenta", why: "Opinie i referencje pacjentów użyte w reklamie są ryzykowne i mogą naruszać prywatność.", tip: "Odpowiedz raczej na pytanie, które pacjenci często zadają." },
        cure: { name: "Obietnica wyleczenia", why: "Obietnica całkowitego wyleczenia wykracza poza to, co leczenie może zapewnić.", tip: "Napisz, że leczenie „może pomóc w leczeniu”." },
        fear: { name: "Straszenie lub presja", why: "Straszenie albo poganianie do zapisu („nie czekaj”) nie jest rzetelną informacją.", tip: "Opisz objaw spokojnie i zaproponuj rozmowę z dentystą." },
      },
      cta: {
        title: "Pięć filmów tygodniowo, sprawdzonych już w ten sposób?",
        text: "DentVideo pisze, nagrywa lektorem i opatruje napisami pięć krótkich filmów edukacyjnych tygodniowo, w Twoim języku i kolorach. Każdy scenariusz przechodzi te same zasady i drugą, dokładniejszą kontrolę, zanim go zobaczysz, a nic nie jest publikowane bez Twojej zgody.",
        button: "Zobacz podgląd",
        secondary: "Jak działa DentVideo",
      },
    },
    how: {
      heading: "Czego szuka sprawdzarka",
      paragraphs: [
        "To te same zasady, które kontrola zgodności DentVideo stosuje do każdego scenariusza, zanim zobaczy go gabinet: wzorce gwarancji, określeń absolutnych, superlatywów, cen i promocji, efektów „przed i po”, opinii pacjentów i obietnic wyleczenia — po polsku, angielsku, niemiecku, hiszpańsku, turecku, francusku, japońsku i arabsku.",
        "Wzorce znają typowe fałszywe alarmy: „trwałe wypełnienie” to termin kliniczny, a „szczotkuj przed i po jedzeniu” to rada; nie są zaznaczane.",
        "Wzorzec nie czyta kontekstu: nie zobaczy ukrytej obietnicy, mylącego zdjęcia ani pacjenta, którego da się rozpoznać. Czysty wynik oznacza „nic oczywistego”, a nie „zatwierdzone”.",
      ],
    },
    rulesHeading: "Jakie zasady obowiązują w Polsce",
    rules: [
      {
        heading: "Kodeks Etyki Lekarskiej i ustawa o działalności leczniczej",
        text: "Kodeks Etyki Lekarskiej obowiązujący od 1 stycznia 2025 r. (art. 71) pozwala lekarzowi dentyście informować o swoich usługach w sposób rzetelny i etyczny, bez porównań i treści wprowadzających w błąd. Ustawa o działalności leczniczej (art. 14) stanowi, że podmiot leczniczy podaje do wiadomości publicznej informacje o zakresie i rodzajach świadczeń, a treść i forma tych informacji nie mogą mieć cech reklamy.",
        sources: [KEL, UDL],
      },
    ],
    notLegalAdvice: "Informacja ogólna, nie porada prawna. Przepisy się zmieniają; aktualny tekst sprawdź w swojej izbie lekarskiej.",
    guide: { slug: "reklama-gabinetu-stomatologicznego-kodeks-etyki", label: "Przeczytaj poradnik: reklama gabinetu stomatologicznego i Kodeks Etyki Lekarskiej" },
    faq: [
      {
        q: "Czy mój tekst jest wysyłany na serwer albo zapisywany?",
        a: "Nie. Sprawdzarka działa w całości w przeglądarce: wklejony tekst nie opuszcza urządzenia i nie jest zapisywany. Liczymy tylko, że sprawdzenie się odbyło i ile sformułowań zaznaczono — nigdy słowa.",
      },
      {
        q: "Czy gabinet może napisać „bezbolesne leczenie”?",
        a: "To jedno z najbardziej ryzykownych określeń, bo obiecuje każdemu leczenie bez dyskomfortu. Lepiej opisać, co robisz: „w znieczuleniu miejscowym; większość pacjentów odczuwa potem tylko lekką nadwrażliwość”.",
      },
      {
        q: "Czy czysty wynik oznacza, że post jest zgodny z przepisami?",
        a: "Nie. Sprawdzarka znajduje ryzykowne sformułowania, nie każde ryzyko: zdjęcia, ukryte obietnice, zgody pacjentów i zasady izby wymagają ludzkiej oceny. To informacja ogólna, nie porada prawna.",
      },
      {
        q: "Jakie języki są sprawdzane?",
        a: "Polski, angielski, niemiecki, hiszpański, turecki, francuski, japoński i arabski — na każdej stronie.",
      },
      {
        q: "Jaki to ma związek z DentVideo?",
        a: "DentVideo tworzy krótkie filmy edukacyjne dla gabinetów stomatologicznych. Każdy scenariusz przechodzi te zasady i dokładniejszą kontrolę całego tekstu, zanim gabinet cokolwiek zatwierdzi.",
      },
    ],
  },
};
