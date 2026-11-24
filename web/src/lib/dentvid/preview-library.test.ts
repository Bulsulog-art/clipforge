import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clinicSignature, formatHandle, libraryLanguage, personalisePlan, pickPreviews, previewControlsEdge, previewControlsSide, previewPlan, serviceCategory, CLINIC_NAME_MAX, NARRATION_HELD, PREVIEW_LANGUAGES, PREVIEW_LIBRARY } from "./preview-library";
import { PREVIEW_MANIFEST } from "./preview-manifest";
import { scanHardRules, scanMarketRules } from "./hard-rules";
import { ctaProblems } from "./closing-line";
import { splitServices, SERVICE_HINTS } from "./service-hints";
import { parseScenePlan, scenePlanSchema } from "@/remotion/scene-plan";
import { isRtl } from "@/remotion/script";

describe("preview player controls", () => {
  // The composition's logo: top right, mirrored to top left in a right-to-left video (remotion/Video.tsx).
  const logoSide = (lang: string) => (isRtl(lang) ? "left" : "right");

  it("never sit in the corner the clinic's logo is in, in any preview language", () => {
    for (const lang of PREVIEW_LANGUAGES) expect(previewControlsSide(lang)).not.toBe(logoSide(lang));
    expect(previewControlsSide("ar")).toBe("right");
    expect(previewControlsSide("en")).toBe("left");
    expect(previewControlsSide("ja")).toBe("left");
  });

  it("follow the video's language, not the page's — an English clinic on an Arabic page still has its logo top right", () => {
    // Italian / Portuguese clinics are previewed with the English library.
    expect(previewControlsSide("it")).toBe("left");
  });

  it("are placed by the player from the helper, with physical sides (not start/end, which flip with the page)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../components/dentvid/live-preview-player.tsx"), "utf8");
    expect(src).toContain("previewControlsSide(lang)");
    expect(src).not.toMatch(/absolute end-4 top-14/);
  });

  // The name chip (remotion/Video.tsx ClinicName) may be 60% of the frame wide; from ~28
  // characters it ran under the Pause button on a phone ("L…side Family…" at 38).
  it("move to the bottom corner while the clinic's name chip is drawn, and stay at the top beside a logo", () => {
    expect(previewControlsEdge({ logo: false, clinic: "Lakeside Family and Cosmetic Dentistry" })).toBe("bottom");
    expect(previewControlsEdge({ logo: false, clinic: "A" })).toBe("bottom");
    expect(previewControlsEdge({ logo: true, clinic: "Lakeside Family and Cosmetic Dentistry" })).toBe("top");
    for (const clinic of [undefined, "", "   "]) expect(previewControlsEdge({ logo: false, clinic })).toBe("top");
  });

  it("take their edge from the helper, from the same logo the composition draws", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../components/dentvid/live-preview-player.tsx"), "utf8");
    expect(src).toMatch(/previewControlsEdge\(\{ logo: Boolean\(logo\?\.url === logoUrl && logo\?\.drawable\), clinic: name \}\)/);
    expect(src).toMatch(/logoSrc: logo\?\.url === logoUrl && logo\?\.drawable \? logoUrl : undefined/);
    expect(src).toMatch(/controlsEdge === "top" \? "top-14" : "bottom-4"/);
    expect(src).toContain("data-controls-edge={controlsEdge}");
  });
});

const PUBLIC = path.resolve(__dirname, "../../../public/dentvideo/preview");

describe("serviceCategory", () => {
  it.each([
    ["Teeth whitening", "whitening"],
    ["Bleaching", "whitening"],
    ["Diş beyazlatma", "whitening"],
    ["İmplant tedavisi", "implant"],
    ["Implants dentaires", "implant"],
    ["Şeffaf plak tedavisi", "aligners"],
    ["Ortodoncia invisible", "aligners"],
    ["Kanal tedavisi", "rootcanal"],
    ["Wurzelbehandlung", "rootcanal"],
    ["Kinderzahnheilkunde", "children"],
    ["Odontopediatría", "children"],
    ["Tratamiento de encías", "gum"],
    ["Parodontitis-Behandlung", "gum"],
    ["Professionelle Zahnreinigung", "cleaning"],
    ["Détartrage", "cleaning"],
    ["Diş taşı temizliği", "cleaning"],
    ["インプラント", "implant"],
    ["マウスピース矯正", "aligners"],
    ["根管治療", "rootcanal"],
    ["小児歯科", "children"],
    ["歯周病の予防", "gum"],
    ["歯のクリーニング", "cleaning"],
    ["زراعة الأسنان", "implant"],
    ["التقويم الشفاف", "aligners"],
    ["علاج اللثة", "gum"],
    ["طب أسنان الأطفال", "children"],
    ["تنظيف الأسنان", "cleaning"],
    ["Leczenie kanałowe", "rootcanal"],
    ["Leczenie nakładkami", "aligners"],
    ["Stomatologia dziecięca", "children"],
    ["Higienizacja", "cleaning"],
    ["Krwawienie dziąseł", "gum"],
    ["Veneers", undefined],
  ])("%s → %s", (service, category) => expect(serviceCategory(service)).toBe(category));
});

describe("example services", () => {
  it.each(["ja", "ar", "pl"])("every %s example maps to a topic, split on the language's own comma", (l) => {
    const services = splitServices(SERVICE_HINTS[l]);
    expect(services).toHaveLength(6);
    for (const s of services) expect(serviceCategory(s), s).toBeDefined();
  });
});

describe("pickPreviews", () => {
  it("previews Japanese, Arabic and Polish clinics in their own language", () => {
    for (const l of ["ja", "ar", "pl"] as const) {
      expect(libraryLanguage(l)).toBe(l);
      const picks = pickPreviews(splitServices(SERVICE_HINTS[l]), l, 3);
      expect(picks).toHaveLength(3);
      expect(picks.every((p) => PREVIEW_LIBRARY[l].includes(p))).toBe(true);
    }
  });
  it("leads with the clinic's own services, in its order, without repeating a topic", () => {
    const picks = pickPreviews(["İmplant tedavisi", "Diş beyazlatma"], "tr", 3);
    expect(picks.map((p) => p.category).slice(0, 2)).toEqual(["implant", "whitening"]);
    expect(new Set(picks.map((p) => p.category)).size).toBe(3);
  });
  it("fills from the library when nothing matches, and falls back to English for it/pt", () => {
    expect(pickPreviews(["Veneers"], "de", 3)).toHaveLength(3);
    expect(libraryLanguage("it")).toBe("en");
    expect(pickPreviews([], "pt", 3).map((p) => p.id)).toEqual(pickPreviews([], "en", 3).map((p) => p.id));
  });
});

describe("personalisePlan", () => {
  const plan = {
    scenes: [
      { kind: "hook", text: "Hi", seconds: 3 },
      { kind: "cta", text: "Ask {handle} or visit {name}", handle: "{handle}", seconds: 4 },
    ],
  };
  it("puts the visitor's handle and name where the sample clinic's were", () => {
    const p = personalisePlan(plan, { name: "Sample Dental Practice", handle: " example_handle " });
    expect(p.scenes[1]).toEqual({ kind: "cta", text: "Ask @example_handle or visit Sample Dental Practice", handle: "@example_handle", seconds: 4 });
  });
  it("drops the handle chip when there is none, and names the clinic instead", () => {
    const p = personalisePlan(plan, { name: "Sample Dental Practice" });
    expect(p.scenes[1]).toEqual({ kind: "cta", text: "Ask Sample Dental Practice or visit Sample Dental Practice", seconds: 4 });
  });
  it("formats handles", () => {
    expect(formatHandle("@@a b")).toBe("@ab");
    expect(formatHandle("  ")).toBeUndefined();
  });
});

describe("previewPlan: the plan the live preview plays", () => {
  const PUBLIC_EN = path.resolve(__dirname, "../../../public/dentvideo/preview/en");
  const raw = () => JSON.parse(fs.readFileSync(path.join(PUBLIC_EN, `${PREVIEW_LIBRARY.en[0].id}.json`), "utf8"));

  it("is signed with the clinic's name, as a real week is (corner without a logo, and the sign-off)", () => {
    const p = previewPlan(raw(), { name: "  Sample Dental Practice ", handle: "example_handle", brandColor: "#0f766e", backgrounds: ["/dentvideo/backgrounds/clinic-01.jpg"] });
    expect(p.clinic).toBe("Sample Dental Practice");
    expect(p.brandColor).toBe("0F766E");
    expect(p.backgrounds).toEqual(["/dentvideo/backgrounds/clinic-01.jpg"]);
    const parsed = scenePlanSchema.parse(p);
    expect(parsed.clinic).toBe("Sample Dental Practice");
    expect(parsed.scenes.find((s) => s.kind === "cta")).toMatchObject({ handle: "@example_handle" });
    expect(JSON.stringify(parsed.scenes)).not.toMatch(/\{name\}|\{handle\}/);
  });

  it.each(["", "   ", "\t\n"])("adds no clinic for an empty or blank name (%j), and still parses", (name) => {
    const p = previewPlan(raw(), { name });
    expect(p).not.toHaveProperty("clinic");
    expect(() => scenePlanSchema.parse(p)).not.toThrow();
  });

  it("cuts a long name to what the composition takes", () => {
    const long = "Sample Dental Practice and Family Dentistry ".repeat(4);
    const p = previewPlan(raw(), { name: long });
    expect(p.clinic!.length).toBeLessThanOrEqual(CLINIC_NAME_MAX);
    expect(p.clinic).toBe(p.clinic!.trim());
    expect(scenePlanSchema.parse(p).clinic).toBe(p.clinic);
  });

  it("never cuts a character in half: an emoji at the limit is kept whole or left out", () => {
    const at79 = "A".repeat(79);
    for (const tail of ["🦷", "👩🏽‍⚕️", "🇩🇪"]) {
      const sig = clinicSignature(`${at79}${tail} Dental`);
      expect(sig).toBe(at79);
      expect(sig).not.toMatch(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/);
      expect(scenePlanSchema.parse(previewPlan(raw(), { name: `${at79}${tail}` })).clinic).toBe(at79);
    }
    // One that fits stays whole, with its skin tone (7 UTF-16 units); one that does not is left out whole.
    expect(clinicSignature(`${"B".repeat(72)} 👩🏽‍⚕️ Care`)).toBe(`${"B".repeat(72)} 👩🏽‍⚕️`);
    expect(clinicSignature(`${"B".repeat(75)} 👩🏽‍⚕️`)).toBe("B".repeat(75));
    expect(clinicSignature("  Sample Dental Practice 🦷 ")).toBe("Sample Dental Practice 🦷");
    expect(clinicSignature(" \t ")).toBe("");
    // The old cut, for the record: it left a lone high surrogate.
    expect(`${at79}🦷`.slice(0, CLINIC_NAME_MAX)).toMatch(/[\uD800-\uDBFF]$/);
  });

  it("leaves the library plan alone and adds no colour, accent or photos it was not given", () => {
    const original = raw();
    const before = JSON.stringify(original);
    const p = previewPlan(original, { name: "Sample Dental Practice", brandColor: " ", brandAccent: "", backgrounds: [] });
    expect(JSON.stringify(original)).toBe(before);
    expect(p).not.toHaveProperty("brandColor");
    expect(p).not.toHaveProperty("brandAccent");
    expect(p).not.toHaveProperty("backgrounds");
  });

  it("is what the player draws (no plan assembled anywhere else)", () => {
    const src = fs.readFileSync(path.join(__dirname, "../../components/dentvid/live-preview-player.tsx"), "utf8");
    expect(src).toMatch(/previewPlan\(raw, \{ name, handle,/);
    expect(src).not.toContain("personalisePlan(");
  });
});

type LibraryPlan = { title: string; theme: string; scenes: Record<string, unknown>[] };
const readPlan = (l: string, id: string) => JSON.parse(fs.readFileSync(path.join(PUBLIC, l, `${id}.json`), "utf8")) as LibraryPlan;
/**
 * Every line a viewer reads: every string a scene carries (text, hook sub-line,
 * caption, heading, list items, stat value and label, context, attribution,
 * compare sides…), whatever fields scenes grow later. Left out: the scene kind,
 * the handle chip (the visitor's own), footage search words and `emphasis`
 * (words picked out of the text, already read with it).
 */
const NOT_READ = new Set(["kind", "handle", "source", "emphasis", "seconds"]);
function strings(v: unknown): string[] {
  if (typeof v === "string") return [v];
  if (Array.isArray(v)) return v.flatMap(strings);
  if (v && typeof v === "object") return Object.values(v).flatMap(strings);
  return [];
}
function onScreen(plan: LibraryPlan): string[] {
  return plan.scenes.flatMap((s) => Object.entries(s).flatMap(([k, v]) => (NOT_READ.has(k) ? [] : strings(v))));
}
const closingLine = (plan: LibraryPlan) => String(plan.scenes.findLast((s) => s.kind === "cta")?.text ?? "");
/**
 * Too casual for a practice's feed. Mirrors worker/src/dental/claims.ts
 * OFF_REGISTER (which every new script passes) plus what the old English
 * library showed on screen ("super important").
 */
const OFF_REGISTER: Partial<Record<string, RegExp>> = {
  en: /\b(most folks|folks|funky|zippy|dodge|gonna|wanna|y'all|super (easy|important|simple)|no biggie|totally)\b/i,
  de: /^\s*wissen sie\b|\bwissen sie was\b|\bkrass\b|\bmega\b|\bsuper easy\b/i,
  tr: /^\s*biliyor muydunuz|\bsüper kolay\b|\bkanka\b/i,
  es: /^\s*¿sabías que|\bsúper fácil\b|\bguay\b/i,
};
/** The old English and German closing: a push to book. Their videos now close on a question for the viewer's own visit. */
const BOOKING_PUSH: Partial<Record<string, RegExp>> = {
  en: /\bbook (a|an|your)\b|\bask us or\b/i,
  de: /\b(buchen|vereinbaren) sie\b/i,
};

/** Videos per language when the library was last reviewed (docs/PREVIEW_RERENDER.md). */
const EXPECTED_COUNTS: Record<(typeof PREVIEW_LANGUAGES)[number], number> = { en: 3, de: 3, es: 4, fr: 5, tr: 5, ja: 5, ar: 5, pl: 5 };

/**
 * Two closings a clinic would read as the same line: one contains the other,
 * or they share an opening or an ending that is at least three quarters of
 * the shorter one (case, punctuation and spacing aside). Catches a line made
 * "different" by a few words added at either end.
 */
function nearlySameClosing(a: string, b: string): boolean {
  const norm = (s: string) => [...s.toLowerCase().normalize("NFC").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ").trim()];
  const [x, y] = [norm(a), norm(b)];
  const [sx, sy] = [x.join(""), y.join("")];
  if (sx.includes(sy) || sy.includes(sx)) return true;
  const shared = (p: string[], q: string[]) => {
    let n = 0;
    while (n < p.length && n < q.length && p[n] === q[n]) n++;
    return n;
  };
  const shorter = Math.min(x.length, y.length);
  return Math.max(shared(x, y), shared([...x].reverse(), [...y].reverse())) >= 0.75 * shorter;
}

describe("the library on disk", () => {
  const all = PREVIEW_LANGUAGES.flatMap((l) => PREVIEW_LIBRARY[l].map((e) => ({ l, e })));
  it("has 3–6 videos per language", () => {
    for (const l of PREVIEW_LANGUAGES) {
      const lib = PREVIEW_LIBRARY[l];
      expect(lib.length, l).toBeGreaterThanOrEqual(3);
      expect(lib.length, l).toBeLessThanOrEqual(6);
    }
  });
  // Pinned, so taking a video out is a decision written here, not a side effect of a rebuild.
  it("has the videos it was last reviewed with, per language", () => {
    const counts = Object.fromEntries(PREVIEW_LANGUAGES.map((l) => [l, PREVIEW_LIBRARY[l].length]));
    expect(counts).toEqual(EXPECTED_COUNTS);
  });
  it("has every manifest entry's plan and narration on disk, and nothing on disk outside the manifest", () => {
    for (const l of PREVIEW_LANGUAGES) {
      const want = new Set<string>();
      for (const e of PREVIEW_LIBRARY[l]) {
        want.add(`${e.id}.json`);
        expect(fs.existsSync(path.join(PUBLIC, l, `${e.id}.json`)), `${l}/${e.id}.json`).toBe(true);
        if (e.narrated !== false || NARRATION_HELD[l]?.includes(e.id)) {
          want.add(`${e.id}.mp3`);
          expect(fs.existsSync(path.join(PUBLIC, l, `${e.id}.mp3`)), `${l}/${e.id}.mp3`).toBe(true);
        }
      }
      expect(fs.readdirSync(path.join(PUBLIC, l)).sort(), l).toEqual([...want].sort());
    }
    expect(Object.keys(PREVIEW_MANIFEST).sort()).toEqual([...PREVIEW_LANGUAGES].sort());
  });
  it.each(all.map(({ l, e }) => [`${l}/${e.id}`, l, e]))("%s is a valid plan with no sample-clinic text, narrated unless marked silent", (_, l, e) => {
    const json = fs.readFileSync(path.join(PUBLIC, l, `${e.id}.json`), "utf8");
    expect(json).not.toMatch(/demo/i);
    const plan = personalisePlan(JSON.parse(json), { name: "Sample Dental Practice", handle: "example_handle" });
    expect(() => parseScenePlan(plan)).not.toThrow();
    const mp3 = path.join(PUBLIC, l, `${e.id}.mp3`);
    if (e.narrated === false) {
      // A held narration stays on disk until the video is re-rendered; a silent video never had one.
      expect(fs.existsSync(mp3)).toBe(Boolean(NARRATION_HELD[l]?.includes(e.id)));
      // A silent plan names its language, so the player sets lang/dir and the script's fonts.
      expect(plan.language).toBe(l);
    } else expect(fs.statSync(mp3).size).toBeGreaterThan(20_000);
  });
  it("holds only narrations that exist, and plays them silent", () => {
    for (const [l, ids] of Object.entries(NARRATION_HELD) as [keyof typeof NARRATION_HELD, string[]][]) {
      for (const id of ids) {
        const e = PREVIEW_LIBRARY[l].find((x) => x.id === id);
        expect(e, `${l}/${id}`).toBeDefined();
        expect(e!.narrated).toBe(false);
      }
    }
  });
  // RG 33075: information only. The library's Turkish closings used to say
  // "Sorularınız için bize ulaşın veya randevu alın!".
  it.each(PREVIEW_LIBRARY.tr.map((e) => [e.id]))("tr/%s shows nothing that steers to booking or the clinic", (id) => {
    expect(scanMarketRules(onScreen(readPlan("tr", id)).join("\n"), "TR")).toEqual([]);
  });

  // Until 24.11.2026 the English and German previews all closed on "Got
  // questions? Ask us or book a check-up!" / "… buchen Sie einen Termin!",
  // with "funky smell" and "super important" on screen, and this was only
  // checked for Turkish.
  it.each(all.map(({ l, e }) => [`${l}/${e.id}`, l, e.id]))("%s: no exclamation mark, no claim, a closing that is not pushy or generic", (_, l, id) => {
    const plan = readPlan(l, id);
    const text = onScreen(plan).join("\n");
    expect(text).not.toMatch(/[!！¡]/);
    expect(scanHardRules(text)).toEqual([]);
    const closing = closingLine(plan);
    expect(closing, "every preview closes on a line").toBeTruthy();
    expect(ctaProblems(closing, undefined).map((p) => p.code)).toEqual([]);
    if (BOOKING_PUSH[l]) expect(closing).not.toMatch(BOOKING_PUSH[l]!);
  });
  it.each(PREVIEW_LANGUAGES.map((l) => [l]))("%s: no closing line is used twice, not even with a few words added", (l) => {
    const closings = PREVIEW_LIBRARY[l].map((e) => ({ id: e.id, line: closingLine(readPlan(l, e.id)) }));
    const pairs: string[] = [];
    for (let i = 0; i < closings.length; i++)
      for (let j = i + 1; j < closings.length; j++)
        if (nearlySameClosing(closings[i].line, closings[j].line)) pairs.push(`${closings[i].id} / ${closings[j].id}: "${closings[i].line}" ~ "${closings[j].line}"`);
    expect(pairs).toEqual([]);
  });
  it("the closing check sees a closing padded with a few words, either end, and lets different ones through", () => {
    // French gum videos, Nov 2026: the same line with "avec nous." or "pour un contrôle." added.
    expect(nearlySameClosing("Posez vos questions ou prenez rendez-vous avec nous.", "Posez vos questions ou prenez rendez-vous pour un contrôle.")).toBe(true);
    expect(nearlySameClosing("Posez vos questions ou prenez rendez-vous.", "Posez vos questions ou prenez rendez-vous avec nous.")).toBe(true);
    expect(nearlySameClosing("Got questions? Ask us.", "got questions ask us")).toBe(true);
    // Japanese adds its topic in front.
    expect(nearlySameClosing("気軽にご相談ください", "しみたら、気軽にご相談ください")).toBe(true);
    expect(nearlySameClosing("Ask if your brushing angle looks right at your next checkup.", "Ask your dentist which whitening plan fits your teeth.")).toBe(false);
    expect(nearlySameClosing("Une question sur le blanchiment ? Demandez-nous ou prenez rendez-vous.", "Vos gencives saignent ? Posez-nous la question ou prenez rendez-vous.")).toBe(false);
  });
  it.each(all.map(({ l, e }) => [`${l}/${e.id}`, l, e.id]))("%s: nothing too casual for a practice's feed", (_, l, id) => {
    const re = OFF_REGISTER[l];
    if (!re) return;
    const hits = onScreen(readPlan(l, id)).flatMap((t) => t.match(re)?.[0] ?? []);
    expect(hits).toEqual([]);
  });
  // KM-13 (known-mistakes.ts) is English only. The German whitening preview said the
  // same vague thing on screen, "stark gefärbte Getränke … eher ungünstig", until 24.11.2026;
  // its narration still says "Kräftige Farben …" (docs/PREVIEW_RERENDER.md).
  const VAGUE_COLOUR: Partial<Record<string, RegExp>> = { de: /stark gefärbt|kräftige[nr]? farben/i, en: /strong(ly)?[ -]colou?r/i };
  it.each(all.map(({ l, e }) => [`${l}/${e.id}`, l, e.id]))("%s: aftercare names the drinks, not 'strong colours'", (_, l, id) => {
    const re = VAGUE_COLOUR[l];
    if (re) expect(onScreen(readPlan(l, id)).filter((t) => re.test(t))).toEqual([]);
  });
  it("the colour check sees the German line the whitening preview used to show", () => {
    expect("Nach dem Bleaching sind stark gefärbte Getränke kurz eher ungünstig.").toMatch(VAGUE_COLOUR.de!);
    expect("Kräftige Farben sind kurz danach oft ungünstig.").toMatch(VAGUE_COLOUR.de!);
    expect("Verzichten Sie nach dem Bleaching ein, zwei Tage auf Kaffee, Tee und Rotwein.").not.toMatch(VAGUE_COLOUR.de!);
  });
  it("the register check sees what the old English library showed", () => {
    expect("That funky smell from your aligners? Avoid it this way.").toMatch(OFF_REGISTER.en!);
    expect("Cleaning your aligners is super important.").toMatch(OFF_REGISTER.en!);
    expect("Got questions? Ask us or book a check-up!").toMatch(BOOKING_PUSH.en!);
    expect("Haben Sie Fragen? Fragen Sie uns oder buchen Sie einen Termin!").toMatch(BOOKING_PUSH.de!);
    expect("Fragen Sie uns gerne oder vereinbaren Sie einen Termin!").toMatch(BOOKING_PUSH.de!);
    expect(ctaProblems("Got questions? Ask us or book a check-up!", undefined).map((p) => p.code)).toEqual(["exclamation"]);
    expect(ctaProblems("Pour plus d'informations, demandez à notre clinique ou prenez rendez-vous.", undefined).map((p) => p.code)).toEqual(["generic"]);
  });
  it("English titles, headings and labels are in sentence case", () => {
    const bad: string[] = [];
    for (const e of PREVIEW_LIBRARY.en) {
      const plan = readPlan("en", e.id);
      const labels = [e.title, plan.title, ...plan.scenes.flatMap((s) => [s.heading, (s.left as { label?: string })?.label, (s.right as { label?: string })?.label])];
      for (const t of labels) if (typeof t === "string" && /\s[A-Z][a-z]/.test(t)) bad.push(`${e.id}: ${t}`);
    }
    expect(bad).toEqual([]);
  });
  // One look across the library, the house theme the published samples use.
  // A language whose still showed text overflowing in it would be listed here.
  const OTHER_THEME: Partial<Record<(typeof PREVIEW_LANGUAGES)[number], string>> = {};
  it.each(all.map(({ l, e }) => [`${l}/${e.id}`, l, e.id]))("%s uses the editorial theme", (_, l, id) => {
    expect(readPlan(l, id).theme).toBe(OTHER_THEME[l] ?? "editorial");
  });
  // Eight languages of 5–6 narrated videos (~1.5 MB each); a visitor only ever loads three.
  it("stays small enough to ship (≤ 12 MB)", () => {
    const size = (dir: string): number =>
      fs.readdirSync(dir, { withFileTypes: true }).reduce((n, f) => n + (f.isDirectory() ? size(path.join(dir, f.name)) : fs.statSync(path.join(dir, f.name)).size), 0);
    expect(size(PUBLIC)).toBeLessThan(12 * 1024 * 1024);
  });
});

import { servicesWithoutSample as missingSamples } from "./preview-library";
describe("servicesWithoutSample: the preview says when a chosen treatment has no sample", () => {
  it("lists the clinic's own words for categories the language lacks, once each", () => {
    const lib = { tr: [{ id: "a", category: "implant" as const, service: "İmplant", title: "x", seconds: 20 }] };
    expect(missingSamples(["İmplant tedavisi", "Çocuk diş hekimliği", "çocuk", "Kanal tedavisi", "Botoks"], "tr", lib)).toEqual(["Çocuk diş hekimliği", "Kanal tedavisi"]);
    expect(missingSamples(["İmplant"], "tr", lib)).toEqual([]);
  });
  it("knows the real gaps: no Turkish children's sample, no root canal sample anywhere", () => {
    expect(missingSamples(["Çocuk diş hekimliği"], "tr")).toEqual(["Çocuk diş hekimliği"]);
    for (const l of ["en", "de", "es", "fr", "tr", "ja", "ar", "pl"]) expect(missingSamples(["Root canal"], l)).toEqual(["Root canal"]);
  });
});
