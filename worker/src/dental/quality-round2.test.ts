import { describe, expect, it } from "vitest";
import type { ScenePlan } from "../remotion/scene-plan.js";
import { copiedShare, ctaGuide, namesClinic, overlap, repeatedScreen, spokenTics, trSteering, ctaProblems } from "./style.js";
import { captionProblems, scriptProblems, scriptBrief } from "./week.js";
import { historyFromRows, memoryBrief } from "./memory.js";
import { marketRules, variantRule } from "./locale.js";
import { speechText } from "./speech-text.js";
import { voiceInstructions, resolveVoice } from "./voice.js";
import { gradeScript, type RubricScript } from "./rubric.js";
import { EXAMPLES } from "./examples.js";

/**
 * Round 2 of the script quality work (docs/QUALITY.md, "Round 2"): every
 * check here comes from a flaw in the Nov 2026 live week for three clinics
 * (TR implant clinic, DE prophylaxis/aligner practice, UK family practice).
 */

const TR = { language: "tr" as const, country: "TR", name: "Boğaziçi İmplant ve Ağız Sağlığı" };
const NARRATION =
  "İmplant yerleştirildi, ama o tarafla hemen çiğnemek doğru mu? Çoğu zaman implantın kemikle kaynaşması için birkaç ay gerekir. " +
  "Bu sürede o tarafta yumuşak yiyecekler daha güvenli olabilir. Sert kabuklu şeyleri bir süre öbür tarafta çiğneyin. " +
  "Kendi durumunuz için hekiminizin talimatı esas.";

function plan(scenes: ScenePlan["scenes"], narration = NARRATION): ScenePlan {
  return { title: "t", aspect: "9:16", theme: "sunrise", music: "none", scenes, voiceover: { text: narration, voice: "nova" } } as ScenePlan;
}

const CLEAN: ScenePlan["scenes"] = [
  { kind: "hook", text: "İmplant yapıldı, o tarafla hemen çiğniyor musunuz?", seconds: 3 },
  { kind: "statement", text: "İmplantın kemikle kaynaşması çoğu zaman birkaç ay sürer.", seconds: 4 },
  { kind: "list", heading: "Bu sürede", items: ["Yumuşak yiyecekler", "Sert kabuklular öbür tarafta"], seconds: 5 },
  { kind: "cta", text: "İmplantınıza ne zaman yük binebileceğini hekiminize sorabilirsiniz.", seconds: 3 },
] as ScenePlan["scenes"];

describe("repetition inside a script", () => {
  it("sees a recap list and a line said twice", () => {
    expect(repeatedScreen(["Kemik yetersizse kemik tozu gerekebilir.", "Kısaca", "Her hastada gerekmez."])[0]).toMatch(/recap/);
    expect(repeatedScreen(["Mit Alignern am besten nur Wasser trinken.", "Kaffee kann verfärben.", "Nur Wasser mit Alignern"])[0]).toMatch(/repeats/);
    // The hook may share words with the line that answers it.
    expect(repeatedScreen(["Kemik yetersizse ne olur?", "Kemik yetersizse kemik tozu gerekebilir.", "Yumuşak yiyecekler"], ["Kemik yetersizse ne olur?"])).toEqual([]);
    expect(repeatedScreen(["Kemik az ise ek işlem gerekebilir.", "Yumuşak yiyecekler", "Hekiminize sorun."])).toEqual([]);
  });

  it("overlap is token Jaccard, case- and punctuation-blind", () => {
    expect(overlap("Nur Wasser mit Alignern!", "nur wasser mit alignern")).toBe(1);
    expect(overlap("", "x")).toBe(0);
  });

  it("finds tag questions and a bare No, not a real question", () => {
    expect(spokenTics("Yani hemen normal çiğneme her zaman olmaz, değil mi?")[0]).toMatch(/değil mi/);
    expect(spokenTics("Fallen Milchzähne sowieso aus? Nein. Sie halten Platz.")[0]).toMatch(/Nein/);
    expect(spokenTics("Das klingt logisch, oder?")).toHaveLength(1);
    expect(spokenTics("İmplant hemen yüklenir mi? Çoğu zaman beklemek gerekir.")).toEqual([]);
    // "no" inside a sentence is not a bare answer.
    expect(spokenTics("There is no need to rinse.")).toEqual([]);
  });

  it("knows when the closing says the clinic's name — not when it says 'implant'", () => {
    expect(namesClinic("If that edge feels rough, ask Elm Tree Family Dental.", "Elm Tree Family Dental")).toBe(true);
    expect(namesClinic("Fragen Sie uns in der Praxis am Viktualienmarkt.", "Zahnpraxis am Viktualienmarkt")).toBe(true);
    expect(namesClinic("İmplantınızı hekiminize sorabilirsiniz.", "Boğaziçi İmplant ve Ağız Sağlığı")).toBe(false);
    expect(namesClinic("Boğaziçi İmplant olarak…", "Boğaziçi İmplant ve Ağız Sağlığı")).toBe(true);
  });

  it("measures how much of a caption is the narration again", () => {
    const n = "Trinken Sie Kaffee mit Alignern? Kaffee, Tee oder Softdrinks können die Aligner verfärben. Wasser belastet das Material am wenigsten.";
    expect(copiedShare("Kaffee, Tee oder Softdrinks können die Aligner verfärben. Wasser belastet das Material am wenigsten.", n)).toBe(1);
    expect(copiedShare("Mit Schienen im Mund: nur Wasser. Zucker unter der Schiene bleibt lange an den Zähnen.", n)).toBe(0);
  });
});

describe("Türkiye: information only, everywhere in the post", () => {
  it("catches every polite booking form, not just 'randevu alın'", () => {
    for (const s of ["Gerekirse bir kontrol randevusu planlayabilirsiniz.", "Uygun yaklaşım için bir muayene planlayabilirsiniz.", "Kontrol randevusu oluşturabilirsiniz.", "Bize yazabilirsiniz.", "Randevunuzu alın."])
      expect(trSteering(s), s).toBeTruthy();
    for (const s of ["Bir sonraki kontrol randevunuzda hekiminize sorun.", "Kendi hekiminiz size uygun olanı söyleyebilir."]) expect(trSteering(s), s).toBeUndefined();
    expect(ctaProblems("Kontrol randevusu planlayabilirsiniz.", "TR").map((p) => p.code)).toContain("steering");
  });

  it("sends a steering caption back, and a caption that pastes the narration", () => {
    expect(captionProblems("İmplant sonrası çiğneme kişiye göre değişir. Gerekirse bir kontrol randevusu planlayabilirsiniz.", NARRATION, "TR")[0]).toMatch(/RG 33075/);
    expect(captionProblems("İmplantın kemikle kaynaşması için çoğu zaman birkaç ay gerekir; bu sürede o tarafı zorlamayın.", NARRATION, "TR")).toEqual([]);
    const copied = NARRATION.split(". ").slice(1, 4).join(". ");
    expect(captionProblems(copied, NARRATION, "DE")[0]).toMatch(/repeats the narration/);
    // Outside Türkiye a calm booking invitation is fine.
    expect(captionProblems("Spit, don't rinse — the fluoride keeps working. Book a check-up if your gums bleed.", "Rinse after brushing? Not quite.", "GB")).toEqual([]);
  });

  it("the CTA guide gives no sentence to copy and forbids the clinic's name", () => {
    expect(ctaGuide("TR")).not.toMatch(/Merak ettiğiniz bir şey varsa/);
    expect(ctaGuide("TR")).toMatch(/randevu alın\/planlayın/);
    expect(ctaGuide("GB", "informal")).toMatch(/never the clinic's name/);
  });
});

describe("post-check (scriptProblems) round 2", () => {
  it("passes a clean Turkish script", () => {
    expect(scriptProblems(plan(CLEAN), TR, { openers: [], closings: [] })).toEqual([]);
  });

  it("sends back a recap, a tag question, a copied or repeated closing, the clinic's name and steering narration", () => {
    const recap = [...CLEAN.slice(0, 3), { kind: "list", heading: "Kısaca", items: ["Yumuşak yiyecekler", "Birkaç ay"], seconds: 4 }, CLEAN[3]] as ScenePlan["scenes"];
    expect(scriptProblems(plan(recap), TR).join("\n")).toMatch(/recap/);
    expect(scriptProblems(plan(CLEAN, `${NARRATION} Bu kadar basit, değil mi?`), TR).join("\n")).toMatch(/tag question/);
    const template = CLEAN.map((s) => (s.kind === "cta" ? { ...s, text: "Merak ettiğiniz bir şey varsa bir sonraki kontrolünüzde hekiminize sorabilirsiniz." } : s)) as ScenePlan["scenes"];
    expect(scriptProblems(plan(template), TR).join("\n")).toMatch(/repeats "Merak ettiğiniz/);
    const week = { openers: [], closings: ["İmplantınıza ne zaman yük binebileceğini hekiminize sorabilirsiniz."] };
    expect(scriptProblems(plan(CLEAN), TR, week).join("\n")).toMatch(/repeats/);
    const named = CLEAN.map((s) => (s.kind === "cta" ? { ...s, text: "Sorularınızı Boğaziçi İmplant ekibine iletebilirsiniz." } : s)) as ScenePlan["scenes"];
    expect(scriptProblems(plan(named), TR).join("\n")).toMatch(/do not name the clinic/);
    expect(scriptProblems(plan(CLEAN, `${NARRATION} İsterseniz bize yazabilirsiniz.`), TR).join("\n")).toMatch(/narration: "bize yaz/);
  });

  it("sends back lines too long to read and too many scenes", () => {
    const long = CLEAN.map((s) => (s.kind === "statement" ? { ...s, text: "İmplantın yerleşeceği kemik yeterliyse ve o bölgede enfeksiyon, ileri doku kaybı ya da ek cerrahi gereksinimi yoksa tek seansta planlanabilir." } : s)) as ScenePlan["scenes"];
    expect(scriptProblems(plan(long), TR).join("\n")).toMatch(/too long to read/);
    const many = [CLEAN[0], ...Array.from({ length: 6 }, (_, i) => ({ kind: "statement", text: `Farklı bir nokta numara ${"abcdef"[i]}xyz.`, seconds: 3 })), CLEAN[3]] as ScenePlan["scenes"];
    expect(scriptProblems(plan(many), TR).join("\n")).toMatch(/8 scenes/);
  });

  it("the brief bans recaps and bare answers, and carries the market's variety of the language", () => {
    const gb = { name: "Elm Tree Family Dental", country: "GB", language: "en" as const, tone: "warm" as const, address: "informal" as const, services: ["Fillings"] };
    const brief = scriptBrief(gb, { title: "t", pillar: "myth", question: "q", hook: "h", service: "Fillings" });
    expect(brief).toMatch(/never end the body with a recap/);
    expect(brief).toMatch(/British English/);
    expect(brief).toMatch(/CAP Code/);
  });
});

describe("rubric round 2", () => {
  const base: RubricScript = {
    language: "tr",
    country: "TR",
    topic: { title: "İmplant ve çiğneme" },
    scenes: CLEAN as unknown as RubricScript["scenes"],
    narration: NARRATION,
    caption: "İmplantın kemikle kaynaşması zaman alır; bu sürede o tarafı zorlamamak daha güvenli olabilir.",
    clinic: TR.name,
  };
  it("a clean script loses nothing to the new checks", () => {
    const codes = gradeScript(base).findings.map((f) => f.code);
    for (const c of ["repeats_itself", "spoken_tic", "caption_copies_narration", "tr_steering", "cta_template", "cta_names_clinic"]) expect(codes).not.toContain(c);
  });
  it("marks down the Nov 2026 flaws", () => {
    const bad: RubricScript = {
      ...base,
      scenes: [...base.scenes.slice(0, 3), { kind: "list", heading: "Kısaca", items: ["a"] }, { kind: "cta", text: "Merak ettiğiniz bir şey varsa bir sonraki kontrolünüzde hekiminize sorabilirsiniz." }],
      narration: `${NARRATION} Basit, değil mi?`,
      caption: `${NARRATION} Gerekirse bir kontrol randevusu planlayabilirsiniz.`,
    };
    const codes = gradeScript(bad).findings.map((f) => f.code);
    expect(codes).toEqual(expect.arrayContaining(["repeats_itself", "spoken_tic", "caption_copies_narration", "tr_steering", "cta_template"]));
    expect(gradeScript(bad).scores.compliance).toBeLessThan(gradeScript(base).scores.compliance);
  });
  it("the reference examples still pass every new check", () => {
    for (const e of EXAMPLES) {
      const g = gradeScript({ language: e.language, country: e.country, address: e.address, topic: { title: e.title, hook: e.hook }, scenes: e.scenes, narration: e.narration, caption: e.takeaway });
      expect(g.findings.map((f) => f.code), e.id).toEqual([]);
    }
  });
});

describe("clinic history for the strategist (jobs.ts → produceWeek)", () => {
  it("keeps what the clinic received, oldest first, with hooks, services and weeks", () => {
    const h = historyFromRows([
      { title: "B", topic: { hook: "Hook B?", service: "Aligner", pillar: "myth", question: "q?" }, week_of: "2026-11-09", status: "ready" },
      { title: "Rejected", topic: { hook: "x" }, week_of: "2026-11-09", status: "rejected" },
      { title: "Failed", topic: null, week_of: "2026-11-02", status: "failed" },
      { title: "A", topic: { hook: "Hook A", service: 42 }, week_of: "2026-10-26", status: "flagged" },
      { title: "  ", topic: { title: "From topic" }, week_of: "2026-10-19", status: "ready" },
      { title: "Odd topic", topic: ["not", "an", "object"], week_of: "not a date", status: "ready" },
    ]);
    expect(h).toEqual([
      { title: "Odd topic" },
      { title: "From topic", weekOf: "2026-10-19" },
      { title: "A", hook: "Hook A", weekOf: "2026-10-26" },
      { title: "B", hook: "Hook B?", service: "Aligner", pillar: "myth", question: "q?", weekOf: "2026-11-09" },
    ]);
  });

  it("turns on the service and hook memory that titles alone never could", () => {
    const rows = [
      { title: "Implant ömrü", topic: { hook: "İmplant ömür boyu mu?", service: "İmplant" }, week_of: "2026-11-02", status: "ready" },
      { title: "İmplant bakımı", topic: { hook: "İmplantı fırçalamak yetmez.", service: "İmplant" }, week_of: "2026-11-09", status: "ready" },
      { title: "İmplant ağrısı", topic: { hook: "O ilk gece…", service: "İmplant" }, week_of: "2026-11-09", status: "ready" },
    ];
    const services = ["İmplant", "Zirkonyum kaplama"];
    const today = new Date("2026-11-16");
    const titlesOnly = memoryBrief(rows.map((r) => ({ title: r.title })), services, today);
    const full = memoryBrief(historyFromRows(rows), services, today);
    expect(titlesOnly).not.toMatch(/favour these|Recent hooks/);
    expect(full).toMatch(/Not covered in the last four weeks — favour these: Zirkonyum kaplama/);
    expect(full).toMatch(/at most one video each this week: i̇mplant|at most one video each this week: implant/i);
    expect(full).toMatch(/Recent hooks — do not reuse/);
  });
});

describe("markets and voice", () => {
  it("UK rules exist and are stricter than none", () => {
    expect(marketRules("GB")).toMatch(/CAP Code/);
    expect(marketRules("GB")).toMatch(/specialist list/);
    expect(marketRules("US")).toBe("");
  });
  it("writes the market's variety", () => {
    expect(variantRule({ language: "en", country: "GB" })).toMatch(/British/);
    expect(variantRule({ language: "en", country: "US" })).toMatch(/American/);
    expect(variantRule({ language: "de", country: "CH" })).toMatch(/ß/);
    expect(variantRule({ language: "tr", country: "TR" })).toBe("");
  });
  it("PZR is read out, not mumbled", () => {
    expect(speechText("Eine PZR dauert meist eine knappe Stunde.", "de")).toBe("Eine professionelle Zahnreinigung dauert meist eine knappe Stunde.");
    expect(speechText("Mit Alignern nur Wasser.", "de")).toBe("Mit Alignern nur Wasser.");
  });
  it("a UK clinic's steerable voice is British", () => {
    expect(voiceInstructions("en", "GB")).toMatch(/British English/);
    expect(voiceInstructions("en", "US")).toMatch(/American English/);
    expect(resolveVoice("en", { DENTVID_TTS_MODEL: "gpt-4o-mini-tts" }, "GB").instructions).toMatch(/British/);
  });
});
