import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as compliance from "./compliance.js";
import { CHECKER_RULES, HARD_RULES, MARKET_HARD_RULES, findHardSpans, scanHardRules, scanMarketRules } from "./hard-rules.js";

/**
 * Golden cases for the hard rules and the market packs. The same file is read by the web's mirror
 * test (web/src/lib/dentvid/hard-rules.test.ts), so the free public checker
 * and the video pipeline are proven to flag exactly the same phrases.
 *
 * Regenerate after changing a rule on purpose:
 *   UPDATE_GOLDEN=1 OPENAI_API_KEY=x npx vitest run src/dental/hard-rules.test.ts
 * then run `node scripts/sync-hard-rules.mjs` from the repo root.
 */
const FILE = path.join(__dirname, "fixtures/hard-rules-golden.json");

type Golden = {
  input: string;
  scan: ReturnType<typeof scanHardRules>;
  spans: ReturnType<typeof findHardSpans>;
  checker: ReturnType<typeof findHardSpans>;
  /** Market packs (MARKET_HARD_RULES) that flag this input, by market. */
  markets: Record<string, ReturnType<typeof scanMarketRules>>;
};

/** Clean, hedged, educational: no rule and no market pack may flag these. */
const CLEAN = [
  "Whitening can make teeth a few shades lighter for many people; ask your dentist whether it suits you.",
  "Diş taşı temizliği diş eti sağlığını korumaya yardımcı olabilir; hekiminize danışın.",
  "Brush before and after meals and floss once a day.",
  "Children's permanent teeth usually start coming in around age six.",
  "Kalıcı dolgu bir sonraki randevuda yapılır.",
  "Professionelle Zahnreinigung kann helfen, Zahnfleischentzündungen vorzubeugen.",
  "",
  // The education the US/UK promo patterns must leave alone: "no pain" as a symptom, "leading"
  // as a cause, "call your dentist" as advice.
  "Gum disease often causes no pain in its early stages.",
  "No pain doesn't mean no problem.",
  "Gum disease is a leading cause of tooth loss.",
  "Call your dentist if your gums bleed.",
  // Urgent-care advice: "call us today" is the right instruction here, not a push (review, Nov 2026).
  "Knocked-out tooth? Call us today: the first hour matters.",
  "If a tooth is knocked out, call us today and keep the tooth in milk.",
  "If your face is swelling, call us today.",
  "Dental emergency? Call us now.",
  "Give us a call today if your filling feels high.",
  // "Leading" as a verb or about a problem, not a claim about the clinic.
  "Tooth decay is the leading problem dentists see in children.",
  "Gum disease is a leading reason dentists remove adult teeth.",
  "Tooth decay can reach the nerve, leading your dentist to recommend a root canal.",
  "Plaque hardens into tartar, leading many dentists to suggest a cleaning every six months.",
  // Stars on a brushing chart, negated or educational "perfect smile" and "zero pain", patients in general.
  "Kids can earn five stars on their brushing chart.",
  "Whitening alone won't give you your perfect smile.",
  "Your perfect smile does not need to be bright white.",
  "Zero pain doesn't mean zero problems.",
  "On a scale from zero to ten, zero pain means you feel nothing at all.",
  "Happy patients are more likely to keep their check-ups.",
  "Many patients love how quick a clear aligner check-up is.",
  "Read patient reviews when you choose a new dentist.",
];

const INPUTS = [
  ...CLEAN,
  // English
  "Guaranteed painless whitening, 50% off this month only! The best dentist in town. Our patients say it's life-changing. See our before and after photos.",
  "Risk-free implants that last forever, 100% success. Cures gum disease. $99 special offer, limited time.",
  "Don't wait until it's too late — you could lose your teeth. Book now before the offer ends. 5-star reviews!",
  // False urgency (checker only: scan and spans stay empty)
  "Last chance: our whitening offer ends soon, only 3 spots left this week. Limited time only!",
  "Beyazlatmada son fırsat! Nur heute. Última oportunidad. Dernière chance. Ostatnia szansa. آخر فرصة. 期間限定。",
  // Turkish
  "Ağrısız implant tedavisi, %100 garantili sonuç! İstanbul'un en iyi diş kliniği. Kampanya: beyazlatmada indirim, 12 taksit. Öncesi sonrası fotoğraflarımıza bakın, hasta yorumları sayfamızda.",
  "Ömür boyu kalıcı gülüş, kesin sonuç. Geç olmadan hemen randevu alın! Diş eti hastalıklarını önler.",
  "Ücretsiz muayene fırsatı, 1500 TL'den başlayan fiyatlarla.",
  // KM-52: patient satisfaction in a plain sentence, marked clean on the TR checker.
  "Hastalarımız çok memnun.",
  // German
  "Schmerzfreie Behandlung mit Erfolgsgarantie! Die beste Zahnarztpraxis in München. Vorher-Nachher-Bilder und Patientenstimmen. 20 % Rabatt mit Gutschein.",
  "Bleaching wirkt dauerhaft und verhindert Karies. Warten Sie nicht länger, bevor es zu spät ist.",
  // Spanish
  "Implantes sin dolor, resultados garantizados. La mejor clínica dental de Madrid. Antes y después de nuestros pacientes. Descuento del 30% y 2x1 en limpiezas.",
  "Ortodoncia para siempre, solución definitiva. No esperes más, podrías perder tus dientes.",
  // French
  "Blanchiment sans douleur garanti, le meilleur cabinet de Lyon. Photos avant/après et témoignages. Offre spéciale, consultation gratuite.",
  "Résultat à vie. N'attendez plus, avant qu'il ne soit trop tard.",
  // Polish
  "Bezbolesne leczenie z gwarancją! Najlepszy gabinet w Warszawie. Efekty przed i po, opinie pacjentów. Promocja: rabat 20%, konsultacja za darmo.",
  "Licówki na zawsze. Nie czekaj dłużej — zanim będzie za późno.",
  // Arabic
  "علاج بدون ألم ونتائج مضمونة 100%! أفضل عيادة أسنان في دبي. صور قبل وبعد وآراء المرضى. خصم 30% وعرض خاص لفترة محدودة.",
  "ابتسامة مدى الحياة ونتائج فورية. لا تنتظروا أكثر، قبل فوات الأوان احجزوا الآن.",
  "تنظيف الأسنان قبل وبعد الأكل مفيد، ويمكن أن يساعد على الوقاية من التسوس.",
  // Japanese
  "無痛治療で絶対安心！地域No.1の歯科医院。ビフォーアフター写真と患者様の声をご覧ください。初回無料カウンセリング、ホワイトニング半額キャンペーン。",
  "永久に白い歯を。手遅れになる前に今すぐ予約を。",
  "永久歯は6歳頃から生えてきます。",
  // Market packs (MARKET_HARD_RULES): Türkiye, DACH, UK/US, Mexico
  "Bu içerik sponsorlu bir paylaşımdır. Sorularınızı yorumlara yazın, çekilişe katılın!",
  "Sorularınız için bize ulaşın veya randevu alın!",
  "Her cerrahi veya girişimsel işlemde sonuçlar kişiden kişiye değişiklik gösterebilir. İşlem öncesinde hekiminizden detaylı görüş almanız önerilir.",
  "Unser Team sind Spezialisten für Implantate. Hallo Kinder, heute lernt ihr Zähneputzen!",
  "Nous sommes spécialistes des implants. Siamo specialisti in ortodonzia.",
  "Our implant specialists also offer Botox. A board-certified team.",
  "Your dentist may refer you to a specialist if a root canal is complex.",
  "Clínica autorizada por COFEPRIS, aviso de publicidad No. 123456.",
  // US and UK promo phrases the checker used to pass (Nov 2026 audit of dentvideo.com/ad-checker).
  "Best dentist in Austin, rated 5 stars by our happy patients.",
  "Read our five-star Google reviews.",
  "Award-winning dental care in Leeds.",
  "Voted top dentist in Manchester.",
  "London's leading implant clinic.",
  "Patients love our gentle hygienists.",
  "No pain, no fuss: completely pain-free fillings.",
  "Get the perfect smile you deserve.",
  "Call now to book your check-up.",
];

const MARKETS = Object.keys(MARKET_HARD_RULES);

function compute(input: string): Golden {
  const markets = Object.fromEntries(MARKETS.map((c) => [c, scanMarketRules(input, c)]).filter(([, hits]) => hits.length));
  return { input, scan: scanHardRules(input), spans: findHardSpans(input), checker: findHardSpans(input, CHECKER_RULES), markets };
}

describe("hard rules: shared module", () => {
  it("compliance.ts re-exports the shared module unchanged", () => {
    expect(compliance.HARD_RULES).toBe(HARD_RULES);
    expect(compliance.scanHardRules).toBe(scanHardRules);
  });

  it("imports nothing, so it can be mirrored into the web app", () => {
    const src = fs.readFileSync(path.join(__dirname, "hard-rules.ts"), "utf8");
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/\brequire\(|process\.|window\.|document\./);
  });

  it("matches the golden cases (shared with the web mirror)", () => {
    const actual = INPUTS.map(compute);
    if (process.env.UPDATE_GOLDEN) fs.writeFileSync(FILE, `${JSON.stringify(actual, null, 1)}\n`);
    const golden = JSON.parse(fs.readFileSync(FILE, "utf8")) as Golden[];
    expect(actual).toEqual(golden);
  });

  it("the golden cases exercise every rule, and clean texts stay clean", () => {
    const golden = JSON.parse(fs.readFileSync(FILE, "utf8")) as Golden[];
    const seen = new Set(golden.flatMap((g) => g.checker.map((s) => s.rule)));
    for (const r of CHECKER_RULES) expect(seen, r.id).toContain(r.id);
    for (const g of golden.slice(0, CLEAN.length)) expect(g.checker, g.input).toEqual([]);
    for (const g of golden.slice(0, CLEAN.length)) expect(g.markets, g.input).toEqual({});
    const marketSeen = new Set(golden.flatMap((g) => Object.values(g.markets).flat().map((h) => h.rule)));
    for (const rules of Object.values(MARKET_HARD_RULES)) for (const r of rules) expect(marketSeen, r.id).toContain(r.id);
  });

  it("spans agree with scanHardRules: every rule it reports is highlighted at least once", () => {
    for (const input of INPUTS) {
      const spans = findHardSpans(input);
      for (const hit of scanHardRules(input)) {
        // Overlap resolution may give the characters to another rule; the match text still occurs.
        expect(input, hit.rule).toContain(hit.match);
      }
      for (const s of spans) expect(input.slice(s.start, s.end)).toBe(s.match);
    }
  });

  it("spans never overlap and come in reading order", () => {
    for (const input of INPUTS) {
      const spans = findHardSpans(input, CHECKER_RULES);
      for (let i = 1; i < spans.length; i++) expect(spans[i].start).toBeGreaterThanOrEqual(spans[i - 1].end);
    }
  });
});

describe("hard rules: US and UK promo phrases", () => {
  const checker = (t: string) => findHardSpans(t, CHECKER_RULES).map((s) => `${s.rule}:${s.match}`);

  it.each([
    ["Rated 5 stars by our patients.", "testimonial:Rated 5 stars"],
    ["Rated 4.9 stars on Google.", "testimonial:Rated 4.9 stars"],
    ["Read our five-star Google reviews.", "testimonial:our five-star Google reviews"],
    ["Five-star Google reviews.", "testimonial:Five-star Google reviews"],
    ["See our 5-star reviews.", "testimonial:5-star reviews"],
    ["A five-star practice in Leeds.", "testimonial:five-star"],
    ["5 stars on Google.", "testimonial:5 stars on Google"],
    ["Real patient reviews.", "testimonial:Real patient reviews"],
    ["Thank you to all our happy patients.", "testimonial:our happy patients"],
    ["Join thousands of happy patients.", "testimonial:thousands of happy patients"],
    ["Satisfied patients recommend us.", "testimonial:Satisfied patients recommend"],
    ["Patients love our gentle hygienists.", "testimonial:Patients love our"],
    ["Award-winning dental care in Leeds.", "superlative:Award-winning"],
    ["Voted top dentist in Manchester.", "superlative:Voted top dentist"],
    ["Voted #1 practice in Dallas.", "superlative:Voted #1 practice"],
    ["Top dentists in Chicago.", "superlative:Top dentists"],
    ["One of the top dental practices in Ohio.", "superlative:top dental practices"],
    ["London's leading implant clinic.", "superlative:leading implant clinic"],
    ["The leading dental team in Bath.", "superlative:The leading dental team"],
    ["We are leading dentists in Leeds.", "superlative:leading dentists"],
    ["The leading dental practice in Leeds.", "superlative:The leading dental practice"],
    ["No pain, no fuss.", "absolute:No pain, no fuss"],
    ["No pain, no needles.", "absolute:No pain, no needles"],
    ["Zero pain whitening.", "absolute:Zero pain"],
    ["Zero pain, zero stress.", "absolute:Zero pain"],
    ["Completely pain-free treatment.", "absolute:Completely pain-free"],
    ["Get the perfect smile you deserve.", "absolute:Get the perfect smile"],
    ["Your perfect smile starts here.", "absolute:Your perfect smile"],
    ["Get your perfect smile today.", "absolute:Get your perfect smile"],
    ["Perfect smiles in one visit.", "absolute:Perfect smiles in one visit"],
  ])("%s → %s, in the checker and in the scripts' gate", (text, want) => {
    expect(checker(text)).toContain(want);
    expect(scanHardRules(text).map((h) => h.rule)).toContain(want.split(":")[0]);
  });

  it("'Call now' is pressure in the checker, but not a hard rule for the scripts", () => {
    for (const [t, m] of [
      ["Call now to book your check-up.", "Call now"],
      ["Call us today for a check-up.", "Call us today"],
      ["Spaces are limited, call now!", "call now"],
      ["Want whiter teeth? Call now!", "Call now"],
    ]) {
      expect(checker(t)).toEqual([`fear:${m}`]);
      expect(scanHardRules(t)).toEqual([]);
    }
  });

  it.each([
    "Knocked-out tooth? Call us today: the first hour matters.",
    "If your face is swelling, call us today.",
    "Dental emergency? Call us now.",
    "If your face swells and you have a fever, call us now.",
    "Severe toothache that keeps you up at night? Call us today.",
    "In pain? Call us today.",
    "Lost a filling? Call us today.",
    "Call us today for emergency care.",
    "Give us a call today if your filling feels high.",
  ])("urgent-care advice to call is not pressure: %s", (text) => {
    expect(checker(text)).toEqual([]);
  });

  it.each([
    "Gum disease often causes no pain in its early stages.",
    "No pain doesn't mean no problem.",
    "Toothache that comes and goes, or no pain at all, can both hide decay.",
    "Gum disease is a leading cause of tooth loss.",
    "Leading up to the appointment, avoid coffee.",
    "Call your dentist if your gums bleed.",
    "If the swelling grows, call the practice or your doctor.",
    "Top practices for healthy gums: brush twice a day and floss.",
    "Your top teeth and bottom teeth meet when you bite.",
    "Nobody has a perfect smile, and that is fine.",
    "Braces will not give you a perfect smile overnight, but they can straighten crowded teeth.",
    "Whitening does not give you a perfect smile; it lightens the colour of your teeth.",
    "Five minutes of brushing a day is plenty.",
    "Most patients feel little discomfort after a filling.",
    "Missing teeth can shift your bite, leading most dentists to suggest replacing them.",
    "Grinding can wear enamel, leading your dental team to suggest a night guard.",
    "Sugary drinks feed bacteria, leading to cavities and leading dentists to warn parents about juice.",
    "Brush twice a day and give yourself a star. Five stars by Friday means a sticker.",
    "Veneers won't give you a perfect smile overnight.",
    "There is no such thing as a perfect smile.",
    "Leave us a Google review.",
  ])("leaves education alone: %s", (text) => {
    expect(findHardSpans(text, CHECKER_RULES)).toEqual([]);
    expect(scanHardRules(text)).toEqual([]);
  });
});
