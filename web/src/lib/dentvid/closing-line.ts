// GENERATED from worker/src/dental/closing-line.ts by scripts/sync-hard-rules.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/lib/dentvid/hard-rules.sync.test.ts checks they match.
/**
 * Closing lines: the checks a call to action must pass, and whether a
 * clinic's OWN closing line (profile.closingLine, set in the app's clinic
 * settings) can go out under its posts.
 *
 * Mirrored byte for byte (bar import suffixes) into the web app by
 * scripts/sync-hard-rules.mjs, so the settings form and the clinic API route
 * refuse exactly what the worker would ignore. Pure and dependency-free
 * except for the hard rules, which are mirrored the same way.
 */
import { scanHardRules, scanMarketRules } from "./hard-rules";

const L = "[\\p{L}\\p{N}]";
/** Word-bounded, case-insensitive, Unicode-aware (\b only knows ASCII). */
const w = (s: string) => new RegExp(`(?<!${L})(?:${s})(?!${L})`, "iu");

/** Urgency and pressure — banned in every market's rules and in good taste. */
const PRESSURE = w(
  "now|today|hurry|don't wait|do not wait|limited|last chance|right away|hemen|şimdi|bugün|kaçırmayın|acele|son fırsat|beklemeyin|jetzt|sofort|heute noch|nicht warten|warten sie nicht|nur noch|schnell|ya mismo|ahora mismo|hoy mismo|no esperes|no espere|date prisa|corre|últimas plazas|maintenant|dès aujourd'hui|n'attendez pas|subito|oggi stesso|non aspettare|já|agora|não esperes|não espere|teraz|dziś|nie czekaj|الآن|فوراً|لا تنتظروا|今すぐ|お急ぎ",
);
/** Generic, interchangeable closings that say nothing about this video. */
const GENERIC_CTA = w(
  "for more information|contact us|daha fazla bilgi|bizimle iletişime geçin|bize ulaşın|für weitere informationen|kontaktieren sie uns|para más información|contáctanos|contáctenos|pour plus d'informations|contactez-nous|per maggiori informazioni|contattaci|para mais informações|contacte-nos|skontaktuj|لمزيد من المعلومات|お問い合わせください",
);
/** In Türkiye the close must not send the viewer to this clinic (RG 33075: informative only). */
const TR_STEERING = w(
  // Booking verbs in every polite form ("randevu alın", "randevu planlayabilirsiniz",
  // "kontrol randevusu oluşturabilirsiniz", "muayene planlayabilirsiniz" — the last
  // two were seen live in captions), and sending the viewer to this clinic.
  "randevu(su|nuzu)? (al|planla|oluştur|ayarla)\\p{L}*|muayene (planla|ayarla)\\p{L}*|bize ulaş\\p{L}*|kliniğimiz\\p{L}*|iletişime geç\\p{L}*|bizi ara\\p{L}*|bize yaz\\p{L}*|bize sor\\p{L}*|bize danış\\p{L}*|bize gel\\p{L}*",
);

/**
 * Anything in a Turkish text that sends the viewer to book or to this
 * clinic. The closing line was checked for it; the caption and the narration
 * were not, and the caption writer was even told to "end with a soft call to
 * book" — so Turkish captions ended "kontrol randevusu planlayabilirsiniz".
 */
export function trSteering(text: string): string | undefined {
  return text.match(new RegExp(TR_STEERING.source, "giu"))?.[0];
}

export type CtaFinding = { code: "missing" | "pressure" | "exclamation" | "generic" | "steering"; detail: string };

export function ctaProblems(cta: string | undefined, country: string | undefined): CtaFinding[] {
  if (!cta?.trim()) return [{ code: "missing", detail: "no closing call to action" }];
  const out: CtaFinding[] = [];
  const m = cta.match(PRESSURE);
  if (m) out.push({ code: "pressure", detail: `urgency in the CTA: "${m[0]}"` });
  if (/[!！]/.test(cta)) out.push({ code: "exclamation", detail: "exclamation mark in the CTA reads as a sales push" });
  const g = cta.match(GENERIC_CTA);
  if (g) out.push({ code: "generic", detail: `generic closing: "${g[0]}"` });
  if ((country ?? "").toUpperCase() === "TR") {
    const s = cta.match(TR_STEERING);
    if (s) out.push({ code: "steering", detail: `steers the viewer to the clinic ("${s[0]}") — RG 33075 allows information only` });
  }
  return out;
}

/** The CTA findings the post-check acts on (the rest only lower the score). */
export const BLOCKING_CTA = new Set<CtaFinding["code"]>(["pressure", "steering"]);

/** Longest closing line a clinic can set (it follows the caption, so it stays one sentence). */
export const CLOSING_LINE_MAX = 120;

/**
 * Why a clinic's line was refused, in words a clinic understands (the app
 * shows one calm sentence per reason, in its own language):
 *  - claim: a guarantee, "painless", a price or another promise the hard rules forbid everywhere
 *  - booking: steers the viewer to book or to this clinic where that is not allowed (Türkiye, RG 33075)
 *  - market: another of this country's advertising rules
 *  - pressure: urgency ("today", "don't wait")
 *  - exclamation: an exclamation mark, which reads as a sales push
 *  - generic: "for more information, contact us" — says nothing
 *  - length: longer than CLOSING_LINE_MAX
 */
export type ClosingLineReason = "claim" | "booking" | "market" | "pressure" | "exclamation" | "generic" | "length";
export type ClosingLineFinding = { reason: ClosingLineReason; detail: string };

/** Everything that stops a clinic's own closing line from going out as written (empty: it can). */
export function closingLineFindings(line: string, country: string | undefined): ClosingLineFinding[] {
  const text = line.trim();
  if (!text) return [];
  const out: ClosingLineFinding[] = [];
  if (text.length > CLOSING_LINE_MAX) out.push({ reason: "length", detail: `longer than ${CLOSING_LINE_MAX} characters` });
  for (const h of scanHardRules(text)) out.push({ reason: "claim", detail: `${h.rule}: "${h.match}"` });
  for (const h of scanMarketRules(text, country)) out.push({ reason: h.rule === "booking" ? "booking" : "market", detail: `${h.rule}: "${h.match}"` });
  for (const p of ctaProblems(text, country)) {
    if (!(BLOCKING_CTA.has(p.code) || p.code === "generic" || p.code === "exclamation")) continue;
    const reason: ClosingLineReason = p.code === "steering" ? "booking" : p.code === "pressure" ? "pressure" : p.code === "generic" ? "generic" : "exclamation";
    out.push({ reason, detail: `cta ${p.code}: ${p.detail}` });
  }
  return out;
}

/** The distinct reasons, in a stable order, for the message a clinic sees. */
export function closingLineReasons(line: string, country: string | undefined): ClosingLineReason[] {
  const order: ClosingLineReason[] = ["booking", "claim", "market", "pressure", "exclamation", "generic", "length"];
  const found = new Set(closingLineFindings(line, country).map((f) => f.reason));
  return order.filter((r) => found.has(r));
}
