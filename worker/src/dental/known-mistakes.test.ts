/**
 * The register of mistakes seen in rendered videos (docs/KNOWN_MISTAKES.md):
 * every one is pinned with the text that was seen, its good counterpart must
 * pass, and the published samples must pass apart from the flaws the register
 * lists as still live.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KNOWN_RULES, isClickbait, scanKnownMistakes, type KnownWhere } from "./known-mistakes.js";
import { BLOCKING_HOOK, hookProblems } from "./style.js";
import { captionProblems, scriptProblems } from "./week.js";
import { screenLines, type RubricScene } from "./rubric.js";
import { EXAMPLES, HOOK_BANK } from "./examples.js";
import type { ScenePlan } from "../remotion/scene-plan.js";
import type { ClinicProfile } from "./profile.js";

type Lang = ClinicProfile["language"];

const ids = (text: string, language: string, where: KnownWhere = "screen") =>
  [...new Set(scanKnownMistakes(where === "screen" ? { screen: [text] } : { [where]: text }, language).map((h) => h.id))];

describe("each known mistake is caught with the text that was seen", () => {
  it.each([
    ["KM-03", "tr", "Sonra: Asıl parça iyileşmeden gelir."],
    ["KM-03", "tr", "Asıl parça iyileşmeden sonra gelir."],
    ["KM-03", "en", "The final crown goes on before the implant heals."],
    ["KM-03", "de", "Die endgültige Krone kommt vor der Einheilung."],
    ["KM-10", "de", "Aligner raus beim Kaffee? Der Grund überrascht."],
    ["KM-10", "en", "You won't believe what coffee does to aligners."],
    ["KM-10", "tr", "Bunu bilmiyordunuz: çay plağı boyar."],
    ["KM-10", "es", "No vas a creer lo que hace el café."],
    ["KM-11", "fr", "La dent, elle, reste en place."],
    ["KM-12", "en", "Not the goal: Enamel thinning"],
    ["KM-13", "en", "Avoid strong colors briefly"],
    ["KM-13", "en", "Avoid strong colored foods for a day."],
    ["KM-13", "en", "Avoid strongly colored foods and drinks for a day or two."],
    ["KM-13", "en", "Skip strongly coloured drinks after whitening."],
    ["KM-13", "en", "Avoid strong-colored food."],
    ["KM-13", "en", "Afterward, skip strong colour briefly."],
    ["KM-14", "tr", "Temizlik: Gece sonrası dişi hazırlar."],
    ["KM-15", "es", "Aquí lo retiramos el dentista o el higienista con instrumentos."],
    ["KM-16", "es", "Llega al borde de la encía."],
    ["KM-17", "fr", "Évitez vin rouge"],
    ["KM-17", "fr", "Évitez café et thé"],
    ["KM-17", "fr", "Ensuite, évitez café, thé, vin rouge, et suivez bien les consignes."],
    ["KM-18", "de", "Nur Wasser im Tray"],
    ["KM-18", "de", "Darum im Tray nur Wasser, vorher ausspülen, nach dem Essen putzen."],
    ["KM-19", "tr", "Çayı yudumladınız, plağınızın rengi hemen dönmeye başladı mı?"],
    ["KM-20", "tr", "Çocuk dişlerinde çürük bazen burada başlıyor."],
    ["KM-20", "en", "Decay starts here."],
    ["KM-22", "tr", "Şeffaf plak günün çoğunda takılır."],
    ["KM-22", "en", "Wear your aligners most of the day."],
    ["KM-36", "de", "Andere Getränke bitte vorher rausnehmen."],
    ["KM-37", "de", "Kaffee pausiert also kurz."],
    ["KM-37", "tr", "Yumuşak başlama: kontrollü çiğneme olur."],
    ["KM-38", "tr", "Filmlerde görülen eksik kemik, herkeste aynı çıkmaz."],
  ])("%s (%s): %s", (id, lang, text) => {
    expect(ids(text, lang)).toContain(id);
  });

  it("reports where the line is and how to fix it", () => {
    const [hit] = scanKnownMistakes({ narration: "Fırça plağı alır. Çayı yudumladınız, plağınızın rengi hemen dönmeye başladı mı?" }, "tr");
    expect(hit).toMatchObject({ id: "KM-19", where: "narration", line: "Çayı yudumladınız, plağınızın rengi hemen dönmeye başladı mı?", match: "rengi hemen dönmeye" });
    expect(hit.fix).toMatch(/renk alır/);
  });
});

describe("the good version of each line passes", () => {
  it.each([
    ["tr", "Asıl diş, iyileşme tamamlandıktan sonra takılır."],
    ["tr", "Kalıcı diş iyileşmeden takılmaz."],
    ["tr", "Geçici diş iyileşmeden önce takılabilir."],
    ["en", "The final crown goes on after the implant has healed."],
    ["en", "A temporary crown can go on before the implant heals."],
    ["de", "Die Krone kommt erst nach der Einheilung."],
    ["de", "Kaffee macht Aligner schneller gelb als gedacht."],
    ["en", "Whitening your teeth? Not as harsh as you think."],
    ["fr", "Évitez le vin rouge"],
    ["fr", "Évitez le café et le thé ; buvez beaucoup d’eau."],
    ["fr", "Évitez-le pendant 48 heures."],
    ["fr", "Évitez de brosser juste après."],
    ["fr", "Limitez fortement le sucre le soir."],
    ["fr", "Préférez une brosse souple."],
    ["fr", "Le blanchiment, ça fragilise vraiment l’émail ? Pas tout à fait."],
    ["de", "Nur Wasser mit eingesetzter Schiene."],
    ["de", "Bleaching hellt die Zähne auf."],
    ["de", "Für andere Getränke die Aligner vorher herausnehmen."],
    ["es", "El dentista o el higienista lo retira con instrumentos."],
    ["es", "La limpieza llega al borde de la encía."],
    ["es", "Llamamos al dentista si duele."],
    ["tr", "Şeffaf plak çayla sandığınızdan çabuk renk alır."],
    ["tr", "Beyazlatmadan sonra dişlerin rengi geri döner mi?"],
    ["tr", "İmplant tamamlandı, bakım kısmı şimdi başlıyor."],
    ["tr", "Röntgende görülen kemik kaybı herkeste aynı değildir."],
    ["en", "Not typical: Enamel thinning"],
    ["en", "Skip dark drinks for a day or two."],
    ["en", "Skip coffee, tea and red wine for a day or two."],
    ["en", "Tooth-colored fillings blend in with your teeth."],
    ["en", "A strong habit: brush for two minutes, twice a day."],
    ["en", "Aligners are usually worn 20–22 hours a day."],
  ])("%s: %s", (lang, text) => {
    expect(ids(text, lang)).toEqual([]);
  });

  it("the hook bank and the reference scripts trip nothing", () => {
    for (const [lang, hooks] of Object.entries(HOOK_BANK)) for (const h of hooks) expect(scanKnownMistakes({ hook: h }, lang), `${lang}: ${h}`).toEqual([]);
    for (const e of EXAMPLES) {
      const hook = e.scenes.find((s) => s.kind === "hook")?.text ?? "";
      const lines = screenLines(e.scenes as unknown as RubricScene[]);
      expect(scanKnownMistakes({ hook, screen: lines.filter((l) => l !== hook), narration: e.narration }, e.language), e.language).toEqual([]);
    }
  });

  it("the 30 baseline scripts trip nothing (none of these mistakes is older than November)", () => {
    const base = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/baseline-scripts.json"), "utf8")) as {
      language: string;
      scenes: RubricScene[];
      narration?: string;
      caption?: string;
    }[];
    for (const b of base) {
      const hook = b.scenes.find((s) => s.kind === "hook")?.text ?? "";
      expect(scanKnownMistakes({ hook, screen: screenLines(b.scenes).filter((l) => l !== hook), narration: b.narration, caption: b.caption }, b.language)).toEqual([]);
    }
  });
});

type Sample = { id: string; status: "published" | "discarded"; language: Lang; country: string; scenes: RubricScene[]; narration: string; known: string[] };
const SAMPLES = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/published-samples.json"), "utf8")) as Sample[];
const RULE_IDS = new Set(KNOWN_RULES.map((r) => r.id));
/** Register rows no pattern can catch (the reviewers and the contact sheet do); pinned so a new check shows up here. */
const SEMANTIC_ONLY = new Set(["KM-21"]);

function check(s: Sample) {
  const plan = { title: s.id, aspect: "9:16", scenes: s.scenes, voiceover: { text: s.narration, voice: "nova" } } as unknown as ScenePlan;
  const hook = s.scenes.find((x) => x.kind === "hook")?.text ?? "";
  const found = new Set(scanKnownMistakes({ hook, screen: screenLines(s.scenes).filter((l) => l !== hook), narration: s.narration }, s.language).map((h) => h.id));
  return { problems: scriptProblems(plan, { language: s.language, country: s.country, name: "Demo" }), found };
}

describe("rendered samples (fixtures/published-samples.json, the text of each render plan)", () => {
  it("covers every published sample and every discarded render with a known reason", () => {
    expect(SAMPLES.filter((s) => s.status === "published").length).toBeGreaterThanOrEqual(18);
    expect(SAMPLES.filter((s) => s.status === "discarded").length).toBeGreaterThanOrEqual(13);
  });

  it.each(SAMPLES.filter((s) => s.status === "published").map((s) => [s.id, s] as const))("published %s passes, apart from the live flaws the register lists", (_id, s) => {
    const { problems, found } = check(s);
    expect([...found].sort()).toEqual(s.known.filter((k) => RULE_IDS.has(k)).sort());
    // Nothing else the post-check knows about.
    expect(problems.filter((p) => !/\(known mistake KM-\d+\)$/.test(p))).toEqual([]);
  });

  it.each(SAMPLES.filter((s) => s.status === "discarded").map((s) => [s.id, s] as const))("discarded %s is sent back by the post-check", (_id, s) => {
    const { problems, found } = check(s);
    for (const k of s.known.filter((x) => RULE_IDS.has(x))) expect(found).toContain(k);
    if (s.known.every((k) => SEMANTIC_ONLY.has(k))) expect(problems).toEqual([]);
    else expect(problems.length).toBeGreaterThan(0);
  });
});

describe("the pipeline sends a known mistake back (never publishes it)", () => {
  const scenes = (body: string) => [
    { kind: "hook", text: "Whitening your teeth? Not as harsh as you think.", seconds: 3 },
    { kind: "statement", text: body, seconds: 3 },
    { kind: "cta", text: "Ask your dentist which whitening plan fits your teeth.", handle: "@demo", seconds: 3 },
  ];
  const planOf = (body: string, narration = "Whitening done as directed usually doesn't thin enamel. Skip dark drinks for a day or two.") =>
    ({ title: "t", aspect: "9:16", scenes: scenes(body), voiceover: { text: narration, voice: "nova" } }) as unknown as ScenePlan;
  const US = { language: "en" as Lang, country: "US", name: "Demo Dental Studio" };

  it("scriptProblems names the line, the fix and the register id", () => {
    const p = scriptProblems(planOf("Avoid strong colors briefly"), US);
    expect(p).toHaveLength(1);
    expect(p[0]).toMatch(/^screen: "Avoid strong colors briefly" — .*dark drinks.*\(known mistake KM-13\)$/);
    expect(scriptProblems(planOf("Skip dark drinks for a day or two."), US)).toEqual([]);
  });

  it("checks the narration too, not only the screen", () => {
    expect(scriptProblems(planOf("Skip dark drinks for a day or two.", "Afterward, skip strong colors briefly."), US).join(" ")).toMatch(/narration: .*KM-13/);
  });

  it("a clickbait hook is a blocking hook problem (the hook editor never picks it) and is reported once", () => {
    expect(isClickbait("Aligner raus beim Kaffee? Der Grund überrascht.")).toBe(true);
    const codes = hookProblems("Aligner raus beim Kaffee? Der Grund überrascht.", "de").map((p) => p.code);
    expect(codes).toContain("clickbait");
    expect(BLOCKING_HOOK.has("clickbait")).toBe(true);
    const de = { title: "t", aspect: "9:16", scenes: [{ kind: "hook", text: "Aligner raus beim Kaffee? Der Grund überrascht.", seconds: 3 }, { kind: "statement", text: "Mit Aligner im Mund nur Wasser.", seconds: 3 }], voiceover: { text: "Mit Aligner im Mund nur Wasser.", voice: "nova" } } as unknown as ScenePlan;
    expect(scriptProblems(de, { language: "de", country: "DE" }).filter((p) => /clickbait/.test(p))).toHaveLength(1);
  });

  it("the caption is checked as well", () => {
    expect(captionProblems("Nur Wasser im Tray, dann bleibt die Schiene klar.", undefined, "DE", { language: "de" }).join(" ")).toMatch(/KM-18/);
    expect(captionProblems("Nur Wasser mit eingesetzter Schiene, dann bleibt sie klar.", undefined, "DE", { language: "de" })).toEqual([]);
  });

  it("a number the reviewer asked for is to be put on screen, not only dropped", () => {
    const p = { ...planOf("Aligners stay in most hours."), voiceover: { text: "Wear them 20 to 22 hours a day.", voice: "nova" } } as unknown as ScenePlan;
    expect(scriptProblems(p, US).join(" ")).toMatch(/put it on screen as well/);
  });
});

describe("the register (docs/KNOWN_MISTAKES.md)", () => {
  const doc = () => fs.readFileSync(path.join(__dirname, "../../../docs/KNOWN_MISTAKES.md"), "utf8");
  it("has a row for every rule and every sample flaw", () => {
    for (const id of [...RULE_IDS, ...SAMPLES.flatMap((s) => s.known)]) expect(doc(), id).toMatch(new RegExp(`^\\| ${id} \\|`, "m"));
  });
  it("names this test or the check for every row", () => {
    const rows = doc().split("\n").filter((l) => /^\| KM-\d+ \|/.test(l));
    expect(rows.length).toBeGreaterThanOrEqual(40);
    for (const r of rows) expect(r, r.slice(0, 40)).toMatch(/\.test\.ts|reviewer|contact sheet/);
  });
});
