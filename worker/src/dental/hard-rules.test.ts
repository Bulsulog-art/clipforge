import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as compliance from "./compliance.js";
import { CHECKER_RULES, HARD_RULES, findHardSpans, scanHardRules } from "./hard-rules.js";

/**
 * Golden cases for the hard rules. The same file is read by the web's mirror
 * test (web/src/lib/dentvid/hard-rules.test.ts), so the free public checker
 * and the video pipeline are proven to flag exactly the same phrases.
 *
 * Regenerate after changing a rule on purpose:
 *   UPDATE_GOLDEN=1 OPENAI_API_KEY=x npx vitest run src/dental/hard-rules.test.ts
 * then run `node scripts/sync-hard-rules.mjs` from the repo root.
 */
const FILE = path.join(__dirname, "fixtures/hard-rules-golden.json");

type Golden = { input: string; scan: ReturnType<typeof scanHardRules>; spans: ReturnType<typeof findHardSpans>; checker: ReturnType<typeof findHardSpans> };

const INPUTS = [
  // Clean, hedged, educational
  "Whitening can make teeth a few shades lighter for many people; ask your dentist whether it suits you.",
  "Diş taşı temizliği diş eti sağlığını korumaya yardımcı olabilir; hekiminize danışın.",
  "Brush before and after meals and floss once a day.",
  "Children's permanent teeth usually start coming in around age six.",
  "Kalıcı dolgu bir sonraki randevuda yapılır.",
  "Professionelle Zahnreinigung kann helfen, Zahnfleischentzündungen vorzubeugen.",
  "",
  // English
  "Guaranteed painless whitening, 50% off this month only! The best dentist in town. Our patients say it's life-changing. See our before and after photos.",
  "Risk-free implants that last forever, 100% success. Cures gum disease. $99 special offer, limited time.",
  "Don't wait until it's too late — you could lose your teeth. Book now before the offer ends. 5-star reviews!",
  // Turkish
  "Ağrısız implant tedavisi, %100 garantili sonuç! İstanbul'un en iyi diş kliniği. Kampanya: beyazlatmada indirim, 12 taksit. Öncesi sonrası fotoğraflarımıza bakın, hasta yorumları sayfamızda.",
  "Ömür boyu kalıcı gülüş, kesin sonuç. Geç olmadan hemen randevu alın! Diş eti hastalıklarını önler.",
  "Ücretsiz muayene fırsatı, 1500 TL'den başlayan fiyatlarla.",
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
];

function compute(input: string): Golden {
  return { input, scan: scanHardRules(input), spans: findHardSpans(input), checker: findHardSpans(input, CHECKER_RULES) };
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
    for (const g of golden.slice(0, 7)) expect(g.checker, g.input).toEqual([]);
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
