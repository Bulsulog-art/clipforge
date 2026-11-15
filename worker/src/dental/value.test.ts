/**
 * What a skeptical dentist found in a real week (review of 2026-11-15 and
 * bench/value-week.ts, Nov 2026), each pinned with the text that was seen.
 */
import { describe, expect, it } from "vitest";
import { droppedHedges, hedgeCount, hedgeRatio, offRegister, overHedged, practiceClaims, stackedHedges, wrongLanguage } from "./claims.js";
import { SPOKEN_CUES } from "./narrate.js";
import { captionProblems, dropEchoes, hedgingRule, lessHedged, practiceFactsRule, scriptBrief, scriptProblems, softScriptProblems } from "./week.js";
import { dentalQuery, guardFootage } from "./footage.js";
import { finalHashtags } from "./copywriter.js";
import { upcomingObservances, seasonalBrief } from "./calendar.js";
import { DENTAL_PHOTOS, startingBackgrounds } from "../dentvid/backgrounds/suggest.js";
import { BACKGROUND_LIBRARY } from "../dentvid/backgrounds/library.js";
import { buildPostKit, closingLineProblems, ctaVariants, postHashtags, postKitProblems, softCta } from "../dentvid/post-kit.js";
import { scanHardRules } from "./compliance.js";
import { ctaProblems } from "./style.js";
import { clinicProfileSchema } from "./profile.js";
import { scenePlanSchema, type ScenePlan } from "../remotion/scene-plan.js";

describe("statements about the practice that it never made", () => {
  it("catches the German children's video and the US after-hours line", () => {
    const de = "Ein kinderfreundliches Umfeld, interaktive Spiele und kleine Belohnungen helfen. Unser Team erklärt alles spielerisch.";
    expect(practiceClaims(de, "de")).toHaveLength(1);
    expect(practiceClaims("Bei uns gibt es kleine Belohnungen für tapfere Kinder.", "de")).toHaveLength(1);
    expect(practiceClaims("If you're not sure, call our office or after-hours line for guidance.", "en")).toHaveLength(1);
    expect(practiceClaims("Kliniğimizde çocuklar için oyun köşesi ve küçük hediyeler var.", "tr")).toHaveLength(1);
  });
  it("lets general statements and the clinic's own services through", () => {
    expect(practiceClaims("Many dentists use a gentle, playful approach with children.", "en")).toEqual([]);
    expect(practiceClaims("Fragen Sie bei der Kontrolle nach, wann Ihr Implantat belastet werden darf.", "de")).toEqual([]);
    expect(practiceClaims("We offer treatment with laughing gas for anxious patients.", "en", "Anxious patients | laughing gas sedation")).toEqual([]);
  });
  it("is a rule in the script brief and sent back by the post-check", () => {
    const profile = clinicProfileSchema.parse({ name: "Zahnarztpraxis Isartal", country: "DE", language: "de", services: ["Kinderzahnheilkunde"] });
    expect(practiceFactsRule(profile)).toMatch(/ONLY its name, city and services \(Kinderzahnheilkunde\)/);
    expect(scriptBrief(profile, { title: "t", pillar: "education", question: "q?", hook: "h", service: "Kinderzahnheilkunde" })).toContain(practiceFactsRule(profile));
    const p = scriptProblems(plan(["Der erste Besuch: ganz entspannt.", "Unser Team erklärt alles spielerisch, mit kleinen Belohnungen."], "Der erste Besuch beim Zahnarzt darf leicht sein. Unser Team erklärt alles spielerisch, mit kleinen Belohnungen."), profile);
    expect(p.join("\n")).toMatch(/never told us/);
    expect(captionProblems("Rufen Sie unseren Notdienst am Wochenende an.", undefined, "DE", profile).join("\n")).toMatch(/never told us/);
  });
});

describe("the screen is as careful as the voice", () => {
  it("catches the Turkish whitening card that dropped 'genelde'", () => {
    const d = droppedHedges(
      ["Hekim kontrolünde yapılan beyazlatma, mineyi inceltmez."],
      "Hekim kontrolünde yapılan beyazlatma diş minesini genelde inceltmez. Hassasiyet olabilir.",
      "tr",
    );
    expect(d).toHaveLength(1);
    expect(d[0].spoken).toMatch(/genelde/);
  });
  it("leaves alone lines that keep the qualifier, instructions after a hedged reason, and questions", () => {
    expect(droppedHedges(["Hekim kontrolünde beyazlatma mineyi genelde inceltmez."], "Hekim kontrolünde beyazlatma mineyi genelde inceltmez.", "tr")).toEqual([]);
    expect(droppedHedges(["O taraftan sert şey çiğnemeyin."], "Üstünde genellikle geçici bir dolgu var, o yüzden o taraftan sert şeyler çiğnememek daha güvenli.", "tr")).toEqual([]);
    expect(droppedHedges(["Whitening ruins enamel?"], "Many people worry that whitening ruins enamel.", "en")).toEqual([]);
  });
});

describe("hedging that piles up", () => {
  it("catches the Turkish tartar narration and a doubly hedged sentence", () => {
    const tartar = "Diş taşı temizliği yılda bir iki kez önerilebilir. Diş etinin sağlığına yardımcı olabilir. Ağız kokusunu azaltmaya katkı sağlayabilir. Evde bakımı kolaylaştırabilir. Hekiminiz size uygun aralığı söyler.";
    expect(stackedHedges(tartar, "tr")).toMatch(/4 of 5/);
    expect(stackedHedges("Bu genelde ilk günlerde görülebilir.", "tr")).toMatch(/stacks qualifiers/);
  });
  it("accepts ordinary hedging", () => {
    expect(stackedHedges("Some sensitivity can happen and it usually fades within a few days. Brush gently. Ask your dentist.", "en")).toBeUndefined();
  });
});

describe("Turkish over-hedging (TR whitening, 5 of 6 sentences)", () => {
  const whitening =
    "Beyazlatma sonrası ilk saatlerde yiyecek ve içecek seçimi önem taşıyabilir. İlk saatlerde renkli yiyecek ve içecekleri sınırlamak faydalı olabilir. Açık renkli, sade şeyler daha uygun olabilir. Yoğurt, peynir, sade ekmek genelde daha rahat seçeneklerdir. Koyu renkli içecekler ve soslar sınırlanabilir. Hassasiyet olursa hekiminize söyleyin; size uygun olanı kontrolünüzde o söyler.";
  const plain =
    "Beyazlatmadan sonraki ilk günlerde dişler renge daha açıktır. Koyu renkli içecekleri ve sosları bu günlerde sınırlayın. Yoğurt, peynir ve sade ekmek iyi seçeneklerdir. Hassasiyet olabilir, çoğu kişide birkaç günde geçer. Ne kadar beklemeniz gerektiğini hekiminize sorabilirsiniz.";
  it("measures the ratio and names the hedged sentences in the fix", () => {
    expect(hedgeRatio(whitening, "tr")).toMatchObject({ total: 6 });
    expect(hedgeRatio(whitening, "tr").hedged).toHaveLength(5);
    const fix = overHedged(whitening, "tr")!;
    expect(fix).toMatch(/5 of 6/);
    expect(fix).toMatch(/önem taşıyabilir/);
    expect(fix).toMatch(/at most 2/);
    // Plain, never absolute.
    expect(fix).toMatch(/never add .*guaranteed.*garanti/);
  });
  it("lets a narration through that hedges only what varies", () => {
    expect(overHedged(plain, "tr")).toBeUndefined();
    expect(stackedHedges(plain, "tr")).toBeUndefined();
  });
  it("does not count an invitation to the viewer as a hedge", () => {
    expect(hedgeCount("Hekiminize sorabilirsiniz.", "tr")).toBe(0);
    expect(hedgeCount("Kanal tedavisinden sonra yiyebilirsin.", "tr")).toBe(0);
    expect(hedgeCount("Hassasiyet görülebilir.", "tr")).toBe(1);
  });
  it("uses a lower bar in Turkish than elsewhere", () => {
    const three = "Bu sızlama olabilir. Birkaç gün sürebilir. Soğuk içecekler artırabilir. Yumuşak fırça kullanın.";
    expect(overHedged(three, "tr")).toMatch(/3 of 4/);
    expect(overHedged("It can sting. It may last days. Cold drinks can make it worse. Use a soft brush.", "en")).toBeUndefined();
  });
  it("is told to the writer and the narrator, Turkish only", () => {
    const tr = clinicProfileSchema.parse({ name: "Körfez Diş", country: "TR", language: "tr", services: ["Diş beyazlatma"] });
    const brief = scriptBrief(tr, { title: "t", pillar: "education", question: "q?", hook: "h", service: "Diş beyazlatma" });
    expect(brief).toContain(hedgingRule("tr"));
    expect(hedgingRule("tr")).toMatch(/kesin.*garanti/);
    expect(hedgingRule("en")).toBe("");
    expect(SPOKEN_CUES.tr).toMatch(/yalnızca sonucun kişiden kişiye/);
  });
  it("the narrator edits an over-hedged draft once and keeps the less hedged version", async () => {
    let calls = 0;
    const out = await lessHedged(whitening, async (fix) => (calls++, expect(fix).toMatch(/^narration: 5 of 6/), plain), "tr");
    expect(out).toBe(plain);
    expect(calls).toBe(1);
    // A rewrite that hedges as much is not taken; a fine draft is not rewritten.
    expect(await lessHedged(whitening, async () => whitening.replace("sınırlanabilir", "sınırlanabilir, olabilir"), "tr")).toBe(whitening);
    expect(await lessHedged(plain, async () => { throw new Error("not called"); }, "tr")).toBe(plain);
    expect(await lessHedged(whitening, async () => { throw new Error("down"); }, "tr")).toBe(whitening);
  });
});

describe("one language per video", () => {
  it("catches an English 'Not quite.' on a Turkish card and a Spanish opening in a US caption", () => {
    expect(wrongLanguage(["Not quite. Plak, dişe düzenli kuvvet vermek için takılır."], "tr")).toEqual(["Not quite."]);
    expect(wrongLanguage(["Lo importante: un filling y una crown no son lo mismo."], "en")).toHaveLength(1);
    expect(captionProblems("Lo importante: un filling y una crown no son lo mismo.\n\nA crown covers most of the tooth.", undefined, "US", { language: "en" }).join("\n")).toMatch(/not in en/);
  });
  it("does not flag normal sentences", () => {
    for (const [line, l] of [
      ["A filling fixes a small spot, and a crown covers most of the tooth.", "en"],
      ["Have a look at a filling in a minute.", "en"],
      ["Nach dem Bleaching sind die Zähne kurz empfindlicher für Farbstoffe.", "de"],
      ["Süt dişi de yer tutar, çiğnemeye ve konuşmaya yardım eder.", "tr"],
      ["El blanqueamiento no suele dañar el esmalte si lo supervisa un dentista.", "es"],
    ] as const)
      expect(wrongLanguage([line], l), line).toEqual([]);
  });
});

describe("register", () => {
  it("flags the stock openers and slang the reviewer heard", () => {
    expect(offRegister("Wissen Sie Kinder und Zahnarzt? Das passt.", "de")).toHaveLength(1);
    expect(offRegister("Most folks just get temporary sensitivity.", "en")).toHaveLength(1);
    expect(offRegister("That funky smell from your aligners? Here's how to dodge it.", "en").length).toBeGreaterThan(0);
    expect(offRegister("Sensitivity usually fades within a few days.", "en")).toEqual([]);
  });
});

describe("stock footage is about teeth", () => {
  const p = (query: string) =>
    ({ title: "t", aspect: "9:16", theme: "midnight", music: "none", scenes: [{ kind: "hook", text: "h", seconds: 3 }, { kind: "footage", source: { type: "stock", query }, seconds: 3 }] }) as unknown as ScenePlan;
  const q = (x: ScenePlan) => (x.scenes[1] as { source: { query: string } }).source.query;
  it("replaces food, drinks, rooms and anything with a sign or logo", () => {
    expect(q(guardFootage(p("white plate food"), "Bleaching", new Set()))).toBe("teeth whitening tray");
    expect(q(guardFootage(p("ice pack on jaw"), "Emergency dental care", new Set()))).toBe("toothbrush close up");
    expect(q(guardFootage(p("coffee cup close up"), "Teeth whitening", new Set()))).toBe("teeth whitening tray");
    expect(q(guardFootage(p("dental clinic sign"), "Implantate", new Set()))).toBe("dental implant model");
    expect(dentalQuery("dental logo")).toBe(false);
  });
  it("keeps dental objects", () => {
    expect(q(guardFootage(p("clear aligner tray"), "Clear aligners", new Set()))).toBe("clear aligner tray");
    expect(q(guardFootage(p("tooth model close up"), "Fillings", new Set()))).toBe("tooth model close up");
  });
  it("has no non-dental object left in its own fallbacks", () => {
    for (const service of ["Implant", "Bleaching", "Aligner", "Kanal tedavisi", "Kinder", "Cleaning", "Anything"])
      for (let i = 0; i < 6; i++) {
        const used = new Set<string>();
        for (let k = 0; k < i; k++) guardFootage(p("sink"), service, used);
        expect(dentalQuery(q(guardFootage(p("sink"), service, used))), service).toBe(true);
      }
  });
});

describe("background photos a new video starts with", () => {
  it("are recognisably dental, never the apple, bread or stone arch", () => {
    for (const input of [
      { topic: "İmplant ne kadar sürer? Kemik iyileşir, çiğneme bekler", service: "İmplant", language: "tr" },
      { topic: "Diş taşı temizliği zararlı mı?", service: "Diş taşı temizliği", language: "tr" },
      { topic: "Is whitening bad for enamel? Coffee and ice cream", service: "Teeth whitening", language: "en" },
      { topic: "Kanal tedavisi sonrası hassasiyet", service: "Kanal tedavisi", language: "tr" },
      { topic: "Something unrelated", service: "Unknown", language: "en" },
    ]) {
      const ids = startingBackgrounds(input, 30);
      expect(ids.length, input.topic).toBe(3);
      for (const id of ids) expect(DENTAL_PHOTOS.has(id), `${input.topic}: ${id}`).toBe(true);
      expect(ids).not.toContain("implants-11");
      expect(ids).not.toContain("implants-18");
    }
  });
  it("lead with the topic's own photos", () => {
    expect(startingBackgrounds({ topic: "Clear aligners: how long?", service: "Clear aligners", language: "en" })[0]).toMatch(/^aligners-/);
    expect(startingBackgrounds({ topic: "Kids' first toothbrush", service: "Kids' dentistry", language: "en" })[0]).toMatch(/^(kids|hygiene)-/);
  });
  it("only name photos the library has", () => {
    const ids = new Set(BACKGROUND_LIBRARY.map((i) => i.id));
    for (const id of DENTAL_PHOTOS) expect(ids.has(id), id).toBe(true);
  });
});

describe("post kit closings", () => {
  const TR = { name: "Körfez Diş Polikliniği", city: "İzmir", language: "tr" as const, country: "TR", address: "formal" as const };
  const US = { name: "Live Oak Family Dentistry", city: "Austin", language: "en" as const, country: "US", address: "informal" as const };
  it("rotate by video, and every variant passes the rules in its market", () => {
    for (const profile of [TR, US, { ...US, language: "de" as const, country: "DE", address: "formal" as const }, { ...US, language: "es" as const, country: "ES" }, { ...US, language: "fr" as const, country: "FR" }, { ...US, language: "pl" as const, country: "PL" }])
      for (const v of ctaVariants(profile)) {
        expect(scanHardRules(v), v).toEqual([]);
        expect(ctaProblems(v, profile.country), v).toEqual([]);
      }
    const seen = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((seed) => softCta(US, seed)));
    expect(seen.size).toBeGreaterThan(1);
    expect(softCta(US, "same caption")).toBe(softCta(US, "same caption"));
  });
  it("use the clinic's own closing line when it is compliant, and ignore it when not", () => {
    expect(softCta({ ...US, closingLine: "Questions about your teeth? We read every message." })).toBe("Questions about your teeth? We read every message.");
    expect(closingLineProblems("Randevu alın, kliniğimize bekleriz!", "TR").length).toBeGreaterThan(0);
    expect(softCta({ ...TR, closingLine: "Randevu alın, kliniğimize bekleriz!" })).not.toMatch(/Randevu/);
    expect(softCta({ ...US, closingLine: "Book now — 20% off whitening!" })).not.toMatch(/20%/);
  });
  it("carry the booking link outside Türkiye only", () => {
    const us = buildPostKit({ caption: "A crown covers most of the tooth.", hashtags: ["liveoak"] }, { ...US, bookingUrl: "https://example.com/book" });
    expect(us.instagram).toContain("https://example.com/book");
    expect(postKitProblems(us, "US")).toEqual([]);
    const tr = buildPostKit({ caption: "Süt dişi de yer tutar.", hashtags: ["korfezdis"] }, { ...TR, bookingUrl: "https://example.com/book" });
    expect(tr.instagram).not.toContain("https://example.com/book");
    expect(postKitProblems(tr, "TR")).toEqual([]);
  });
});

describe("hashtags", () => {
  it("never tag the clinic's own name twice, whatever the model did with ö and ş", () => {
    expect(finalHashtags(["korfezdispoliklinigi", "kanaltedavisi"], { name: "Körfez Diş Polikliniği", handle: "korfezdis" })).toEqual(["korfezdis", "kanaltedavisi"]);
  });
  it("spell Turkish tags one way, without diacritics", () => {
    const tags = postHashtags(["korfezdis", "sütdişi", "çocukdişsağlığı", "şeffafplak"], { city: "İzmir", language: "tr" });
    expect(tags).toContain("sutdisi");
    expect(tags).toContain("cocukdissagligi");
    expect(tags.some((t) => /[çğıöşü]/.test(t))).toBe(false);
  });
});

describe("this week in the market", () => {
  const nov16 = new Date("2026-11-16T08:00:00Z");
  it("knows Thanksgiving, the US plan year, the Bonusheft and winter sensitivity", () => {
    expect(upcomingObservances("US", "en", nov16).map((u) => u.id)).toEqual(expect.arrayContaining(["us-thanksgiving", "us-plan-year", "winter-sensitivity"]));
    expect(upcomingObservances("US", "en", nov16).find((u) => u.id === "us-thanksgiving")?.end).toBe("2026-11-26");
    expect(upcomingObservances("DE", "de", nov16).map((u) => u.id)).toEqual(expect.arrayContaining(["de-bonusheft", "winter-sensitivity"]));
    expect(upcomingObservances("DE", "de", new Date("2027-01-20")).map((u) => u.id)).toContain("winter-sensitivity");
    expect(upcomingObservances("DE", "de", new Date("2027-06-20")).map((u) => u.id)).not.toContain("winter-sensitivity");
  });
  it("never invites urgency around them", () => {
    expect(seasonalBrief("US", "en", nov16)).toMatch(/never 'use it or lose it' urgency/);
    expect(seasonalBrief("US", "en", nov16)).toMatch(/AT MOST ONE video.*never an offer/);
  });
});

describe("the clinic signs its video", () => {
  it("the plan carries the clinic's name, set by code", () => {
    const parsed = scenePlanSchema.parse({ ...plan(["Ein Hook hier", "Eine Aussage hier."], "Eine Erzählung."), clinic: "Körfez Diş Polikliniği" });
    expect(parsed.clinic).toBe("Körfez Diş Polikliniği");
  });
});

function plan(lines: string[], narration: string): ScenePlan {
  return {
    title: "t",
    aspect: "9:16",
    theme: "editorial",
    music: "none",
    scenes: [
      { kind: "hook", text: lines[0], seconds: 3 },
      { kind: "statement", text: lines[1], seconds: 4 },
      { kind: "list", heading: "Gut zu wissen", items: ["Früh beginnen", "Ruhig erklären"], seconds: 4 },
      { kind: "cta", text: "Fragen Sie beim nächsten Termin nach dem ersten Besuch.", seconds: 3 },
    ],
    voiceover: { text: narration, voice: "nova" },
  } as ScenePlan;
}

describe("echoes the planner wrote twice are removed before review", () => {
  it("drops a repeated statement and a footage caption that repeats a line", () => {
    const p = {
      title: "t",
      aspect: "9:16",
      theme: "editorial",
      music: "none",
      scenes: [
        { kind: "hook", text: "How long is a cleaning?", seconds: 3 },
        { kind: "statement", text: "Usually about 45 to 60 minutes.", seconds: 3 },
        { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, caption: "Usually about 45 to 60 minutes.", seconds: 3 },
        { kind: "statement", text: "Usually about 45 to 60 minutes.", seconds: 3 },
        { kind: "list", heading: "What happens", items: ["A check of gums", "Tartar removed", "A polish"], seconds: 4 },
        { kind: "cta", text: "Ask us what your visit includes.", seconds: 3 },
      ],
    } as unknown as ScenePlan;
    const d = dropEchoes(p);
    expect(d.scenes.map((s) => s.kind)).toEqual(["hook", "statement", "footage", "list", "cta"]);
    expect((d.scenes[2] as { caption?: string }).caption).toBeUndefined();
    expect(dropEchoes(d)).toBe(d);
  });
});

describe("soft wording fixes", () => {
  it("leave labels and 'you can ask' alone", () => {
    expect(droppedHedges(["Gut: helle Speisen"], "Nach dem Bleaching sind helle, milde Speisen oft gut.", "de")).toEqual([]);
    expect(droppedHedges(["Ask what your visit includes before you come in."], "You can always ask what's included before you come in.", "en")).toEqual([]);
  });
  it("are reported for the first draft by softScriptProblems", () => {
    const p = {
      title: "t",
      aspect: "9:16",
      theme: "editorial",
      music: "none",
      scenes: [
        { kind: "hook", text: "Beyazlatma mineyi inceltir mi?", seconds: 3 },
        { kind: "statement", text: "Hekim kontrolünde yapılan beyazlatma mineyi inceltmez.", seconds: 4 },
        { kind: "cta", text: "Hassasiyet olursa bir sonraki kontrolde hekiminize söyleyin.", seconds: 3 },
      ],
      voiceover: { text: "Beyazlatma mineyi inceltir mi? Hekim kontrolünde yapılan beyazlatma mineyi genelde inceltmez.", voice: "nova" },
    } as unknown as ScenePlan;
    expect(softScriptProblems(p, { language: "tr" }).join("\n")).toMatch(/genelde/);
  });
});

describe("another language's 'not quite'", () => {
  it("catches the Turkish phrase on a German card, and the brief names only the clinic's own phrase", () => {
    expect(wrongLanguage(["Pek sayılmaz: Die frische Zahnoberfläche nimmt Farbe leichter an."], "de")).toHaveLength(1);
    expect(wrongLanguage(["Nicht ganz: Die frische Zahnoberfläche nimmt Farbe leichter an."], "de")).toEqual([]);
    const de = clinicProfileSchema.parse({ name: "Praxis", country: "DE", language: "de", services: ["Bleaching"] });
    const brief = scriptBrief(de, { title: "t", pillar: "myth", question: "q?", hook: "h", service: "Bleaching" });
    expect(brief).toContain('"Nicht ganz"');
    expect(brief).not.toContain("Pek sayılmaz");
  });
});

describe("a reflexive 'Not quite' after a hook that denies nothing", () => {
  it("is sent back when the hook is a statement or names a mistake", () => {
    const us = { language: "en" as const, country: "US", name: "Demo Dental Studio" };
    const p = (hook: string, next: string) =>
      ({
        title: "t",
        aspect: "9:16",
        theme: "editorial",
        music: "none",
        scenes: [
          { kind: "hook", text: hook, seconds: 3 },
          { kind: "statement", text: next, seconds: 4 },
          { kind: "list", heading: "Clean them", items: ["Soft brush", "Cool water"], seconds: 4 },
          { kind: "cta", text: "Ask about your aligner cleaning routine at your next check-up.", seconds: 3 },
        ],
      }) as unknown as ScenePlan;
    expect(scriptProblems(p("Rinsing aligners with water? That's the mistake.", "Not quite. Rinse them every time you take them out."), us).join("\n")).toMatch(/states no belief to deny/);
    expect(scriptProblems(p("Whitening thins your enamel? Not quite.", "Not quite. Dentists usually don't see enamel thinning."), us).join("\n")).not.toMatch(/states no belief to deny/);
    const de = { language: "de" as const, country: "DE", name: "Demo Zahnarztpraxis" };
    expect(scriptProblems(p("Kaffee drin? Aligner sehen es sofort.", "Nicht ganz: Meist färben sich Aligner durch Beläge und Getränke."), de).join("\n")).toMatch(/states no belief to deny/);
    expect(scriptProblems(p("Bleaching macht den Zahnschmelz kaputt?", "Nicht ganz: Fachgerecht gemacht greift es den Schmelz meist nicht an."), de).join("\n")).not.toMatch(/states no belief to deny/);
    const withFootage = (hook: string, caption: string, next: string) => {
      const plan = p(hook, next) as unknown as { scenes: unknown[] };
      plan.scenes.splice(1, 0, { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, caption, seconds: 3 });
      return plan as unknown as ScenePlan;
    };
    expect(scriptProblems(withFootage("Your gumline after brushing? Take a look.", "Aim at the gumline.", "Not quite. Tilt the brush toward the gums."), us).join("\n")).toMatch(/states no belief to deny/);
    expect(scriptProblems(p("Brushing twice a day and still missing spots?", "Not quite if you only scrub the middle of the teeth."), us).join("\n")).toMatch(/inside a sentence/);
    const tr = { language: "tr" as const, country: "TR", name: "Demo Diş Kliniği" };
    expect(scriptProblems(p("Fırçalasanız da diş taşı neden kalıyor?", "Pek sayılmaz; sertleşen tabakayı fırça çıkaramaz."), tr).join("\n")).toMatch(/states no belief to deny/);
    expect(scriptProblems(p("Beyazlatma mineyi inceltir mi?", "Pek sayılmaz: hekim kontrolünde mine genelde incelmez."), tr).join("\n")).not.toMatch(/states no belief to deny/);
    expect(offRegister("Sensitivity can feel zippy, then settle down.", "en")).toEqual(["zippy"]);
  });
});

describe("a clinic's own closing line (settings form → profile → post kit)", () => {
  it("gives the reasons the app shows, and the post kit uses only a line with none", async () => {
    const { closingLineFindings, closingLineReasons } = await import("./closing-line.js");
    expect(closingLineReasons("Hemen randevu alın!", "TR")).toEqual(["booking", "pressure", "exclamation"]);
    expect(closingLineFindings("Diş etlerinizle ilgili sorularınızı bir sonraki kontrolünüzde hekiminize sorabilirsiniz.", "TR")).toEqual([]);
    expect(closingLineReasons("Painless implants, guaranteed.", "US")).toContain("claim");
    const own = "Fragen zum Zahnfleisch? Sprechen Sie sie bei der nächsten Kontrolle an.";
    const profile = clinicProfileSchema.parse({ name: "Isartal", country: "DE", language: "de", services: ["PZR"], closingLine: own });
    expect(softCta(profile)).toBe(own);
    expect(softCta({ ...profile, closingLine: "Jetzt Termin buchen!" })).not.toMatch(/Jetzt/);
  });
});
