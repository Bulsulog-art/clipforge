import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { scanHardRules } from "./compliance.js";
import {
  clinicalFlags,
  ctaProblems,
  fillerHits,
  hookProblems,
  hookShape,
  registerHits,
  spokenSeconds,
  unhedgedClaims,
} from "./style.js";
import { EXAMPLES, HOOK_BANK, exampleBlock, exampleFor } from "./examples.js";
import { gradeCorpus, gradeScript, gradeWeek, mixedAddress, readAloudShare, type RubricScript } from "./rubric.js";
import { agreement, examplesAsScripts, loadFixtures, loadHandGrades } from "./offline-eval.js";
import { dropRepeats, memoryBrief, weekVoiceBrief } from "./memory.js";
import { easter, seasonalBrief, upcomingObservances } from "./calendar.js";
import { balanceShapes, pastTopics, planWeek, sharpenHooks, usableHook, type Topic } from "./strategist.js";
import { produceWeek, scriptBrief, scriptProblems } from "./week.js";
import { addRubric, meterClient, spendCap, SpendCapError, summarise, type EvalRow, type Usage } from "./eval.js";
import type { ClinicProfile } from "./profile.js";
import type { ScenePlan } from "../remotion/scene-plan.js";

const codes = (h: string, l = "en") => hookProblems(h, l).map((p) => p.code);

describe("hook checks (style.ts)", () => {
  it("names the hook failures seen in the baseline", () => {
    expect(codes("Diş implantı süreci 3 aşamada gerçekleşir.", "tr")).toContain("gives_answer");
    expect(codes("Ihr Implantat: Ein Prozess in mehreren Schritten.", "de")).toContain("label");
    expect(codes("Blanqueamiento: ¿causa sensibilidad o es un mito?", "es")).toContain("label");
    expect(codes("Kanal tedavisi gerçekten acı verir mi? Hayır, hayır!", "tr")).toContain("flat_no");
    expect(codes("Tu cepillo quiere jubilarse, ¿lo sabías?", "es")).toContain("did_you_know");
    expect(codes("Ihre Zahnreinigung alle 6 Monate wichtig?", "de")).toContain("textbook");
    expect(codes("Şeffaf plaklar nasıl takılıp çıkarılır?", "tr")).toContain("textbook");
    expect(codes("What is a root canal?")).toContain("textbook");
    expect(codes("5 tips for whiter teeth")).toContain("listicle");
    expect(codes("Diş taşı, ağız sağlığınızı olumsuz etkiler.", "tr")).toEqual(["flat_statement"]);
  });

  it("lets good hooks through, in every language of the hook bank", () => {
    for (const [lang, hooks] of Object.entries(HOOK_BANK)) for (const h of hooks) expect(usableHook(h, lang), `${lang}: ${h}`).toBe(true);
    expect(codes("Ese escalofrío al morder el helado...", "es")).toEqual([]);
    expect(codes("Ihre Aligner im heißen Wasser? Lieber nicht.", "de")).toEqual([]);
    expect(codes("İlk randevuda implant bitmiyor!", "tr")).toEqual([]);
    expect(codes("El error que cometes después de la limpieza", "es")).toEqual([]);
  });

  it("classifies hook shapes", () => {
    expect(hookShape("That zing when you sip something cold…")).toBe("moment");
    expect(hookShape("Whitening thins enamel? Not quite.")).toBe("myth");
    expect(hookShape("¿Amanece con la mandíbula cansada?")).toBe("question");
    expect(hookShape("Brushing harder is a mistake")).toBe("mistake");
  });
});

describe("CTA, filler, register and clinical checks (style.ts)", () => {
  it("flags steering in Türkiye, pressure and exclamation everywhere", () => {
    const tr = ctaProblems("Daha fazla bilgi için kliniğimizle iletişime geçin veya randevu alın!", "TR").map((p) => p.code);
    expect(tr).toEqual(expect.arrayContaining(["steering", "exclamation", "generic"]));
    expect(ctaProblems("Kontrolünüzde hekiminize sorabilirsiniz.", "TR")).toEqual([]);
    expect(ctaProblems("Jetzt Termin buchen", "DE").map((p) => p.code)).toContain("pressure");
    expect(ctaProblems("¿Le suena? Coméntelo en su próxima consulta.", "MX")).toEqual([]);
    expect(ctaProblems(undefined, "ES").map((p) => p.code)).toEqual(["missing"]);
    // Booking is fine outside Türkiye.
    expect(ctaProblems("Pregunta en tu próxima revisión o reserva una cita.", "ES")).toEqual([]);
  });

  it("finds AI filler and written register", () => {
    expect(fillerHits("Recuerda: tu salud bucal es clave. ¡Estamos aquí para ayudarte!", "es")).toEqual(["tu salud bucal es clave", "estamos aquí para ayudarte"]);
    expect(fillerHits("Wissen Sie was? Ihr Lächeln ist uns wichtig.", "de")).toHaveLength(2);
    expect(registerHits("Bu işlem diş hekimi tarafından gerçekleştirilir.", "tr")).toHaveLength(1);
    expect(fillerHits("Köpüğü tükürün, suyla çalkalamayın.", "tr")).toEqual([]);
  });

  it("catches procedure mix-ups, medication without the dentist and invented statistics", () => {
    expect(clinicalFlags("Kanal tedavisinden sonra tuzlu su ile çalkalayın.")).toHaveLength(1);
    expect(clinicalFlags("Implant sonrası 24 saat sonra tuzlu su ile çalkalayabilirsiniz.")).toEqual([]);
    expect(clinicalFlags("Nehmen Sie ein Schmerzmittel.")).toHaveLength(1);
    expect(clinicalFlags("Ein Schmerzmittel nur nach Rücksprache mit Ihrem Zahnarzt.")).toEqual([]);
    expect(clinicalFlags("80% of people have gum disease.")).toHaveLength(1);
    // A discount is the price rule's job (compliance.ts), not a statistic.
    expect(clinicalFlags("20% off this week")).toEqual([]);
  });

  it("finds effects stated as certain, and lets hedged ones pass", () => {
    expect(unhedgedClaims("Diş eti sağlığını korur. Ağız kokusunu azaltabilir.", "tr")).toEqual(["Diş eti sağlığını korur."]);
    expect(unhedgedClaims("Generalmente no daña el esmalte.", "es")).toEqual([]);
  });

  it("estimates speaking time per language", () => {
    const words = (n: number) => Array.from({ length: n }, () => "kelime").join(" ");
    expect(spokenSeconds(words(60), "tr")).toBe(30);
    expect(spokenSeconds(words(60), "es")).toBeLessThan(spokenSeconds(words(60), "de"));
  });
});

describe("reference examples (examples.ts)", () => {
  it("cover the launch markets and pass every check a pattern can make", () => {
    expect(new Set(EXAMPLES.map((e) => e.country))).toEqual(new Set(["TR", "ES", "MX", "DE"]));
    for (const s of examplesAsScripts()) {
      expect(scanHardRules(`${s.scenes.map((x) => JSON.stringify(x)).join(" ")} ${s.narration}`), s.id).toEqual([]);
      const g = gradeScript(s);
      expect(g.findings, s.id).toEqual([]);
      expect(g.overall).toBe(5);
    }
  });

  it("are picked by language, preferring the market, and never on the video's own service", () => {
    expect(exampleFor({ language: "es", country: "MX", address: "formal" })?.id).toBe("mx-bruxism-guard");
    expect(exampleFor({ language: "es", country: "ES", address: "informal" })?.id).toBe("es-acid-then-brush");
    expect(exampleFor({ language: "tr", country: "TR", address: "formal" }, { service: "Kanal tedavisi" })?.id).toBe("tr-spit-dont-rinse");
    expect(exampleFor({ language: "ja", country: "JP" })).toBeUndefined();
    expect(exampleBlock(EXAMPLES[0])).toMatch(/never reuse its subject/);
  });
});

describe("rubric over the baseline (fixtures)", () => {
  it("grades the 30 baseline scripts and agrees with the hand grades", async () => {
    const scripts = await loadFixtures();
    expect(scripts).toHaveLength(30);
    const { summary } = gradeCorpus(scripts, (s) => (s as { week?: string }).week ?? "all");
    // The baseline the prompt changes are measured against (docs/QUALITY.md).
    // 4.12 before round 2 (docs/QUALITY.md); 4.01 since the rubric also sees repeated lines, spoken tics,
    // captions that copy the narration and Turkish captions that steer to booking.
    expect(summary.overall).toBe(4.01);
    expect(summary.byDimension.variety).toBe(3.03);
    expect(summary.topFindings[0]).toEqual({ code: "same_cta", count: 25 });
    const agree = agreement(scripts, await loadHandGrades());
    expect(agree.n).toBe(30);
    expect(agree.handMean).toBe(3.29);
    expect(agree.overall).toBeGreaterThanOrEqual(0.6);
  });

  it("scores the reference examples above every baseline script", async () => {
    const scripts = await loadFixtures();
    const best = Math.max(...scripts.map((s) => gradeScript(s).overall));
    expect(best).toBeLessThan(5);
  });

  it("sees a week that opens and closes the same way", () => {
    const base: RubricScript = { language: "de", country: "DE", topic: { title: "A" }, scenes: [{ kind: "hook", text: "Zahnfleischbluten? Bloß nicht aufhören." }, { kind: "cta", text: "Haben Sie Fragen? Kontaktieren Sie uns." }], narration: "Wissen Sie was? Das ist so." };
    const w = gradeWeek([base, { ...base, topic: { title: "B völlig anders" } }]);
    expect(w.findings.map((f) => f.code)).toEqual(expect.arrayContaining(["same_cta", "same_opener"]));
    expect(w.variety).toBeLessThan(5);
    const h = gradeWeek([{ ...base, topic: { title: "Bleeding gums while brushing" } }], [{ title: "Bleeding gums while brushing" }]);
    expect(h.findings.map((f) => f.code)).toContain("repeats_history");
  });

  it("detects mixed address and narration that reads the screen", () => {
    expect(mixedAddress("Putzen Sie sanft. Dann kannst du ruhig weitermachen, dein Zahnfleisch dankt es.", "de")).toBe(true);
    expect(mixedAddress("Sie putzen sanft, und das Zahnfleisch beruhigt sich.", "de")).toBe(false);
    expect(readAloudShare("Diş taşı birikir. Bu da başka bir cümle.", ["Diş taşı birikir."])).toBe(0.5);
  });
});

describe("anti-repetition memory (memory.ts)", () => {
  const t = (title: string, question = title): Topic => ({ title, question, hook: `${title}?`, pillar: "education", service: "x" });

  it("drops topics the clinic already posted, but never leaves the week short", () => {
    const history = [{ title: "Diş beyazlatma mineye zarar verir mi" }];
    const topics = [t("Diş beyazlatma mineye zarar verir mi?"), t("Kanal tedavisi sonrası"), t("Diş ipi nasıl kullanılır")];
    expect(dropRepeats(topics, history, 2).map((x) => x.title)).toEqual(["Kanal tedavisi sonrası", "Diş ipi nasıl kullanılır"]);
    expect(dropRepeats(topics, history, 3)).toHaveLength(3);
    // Two topics in the same week that ask the same thing.
    expect(dropRepeats([t("Whitening and enamel safety"), t("Whitening and enamel safety facts"), t("Floss")], [], 2).map((x) => x.title)).toEqual(["Whitening and enamel safety", "Floss"]);
  });

  it("tells the strategist what was covered and what was not", () => {
    const now = new Date("2026-11-12");
    const brief = memoryBrief(
      [1, 2, 3].map((i) => ({ title: `Implant ${i}`, service: "İmplant", hook: `Implant ${i}?`, weekOf: "2026-11-02" })),
      ["İmplant", "Diş beyazlatma"],
      now,
    );
    expect(brief).toMatch(/Not covered in the last four weeks — favour these: Diş beyazlatma/);
    expect(brief).toMatch(/at most one video each this week: i̇mplant|İmplant/i);
    expect(brief).toMatch(/"question" shape/);
    expect(pastTopics({ avoidTitles: ["A", "B"], history: [{ title: "A", hook: "h" }] })).toHaveLength(2);
    expect(weekVoiceBrief({ openers: ["Wissen Sie was?"], closings: [] })).toMatch(/open differently/);
  });
});

describe("seasonal hooks (calendar.ts)", () => {
  it("computes Easter", () => {
    expect(easter(2026)).toBe("2026-04-05");
    expect(easter(2027)).toBe("2027-03-28");
  });

  it("offers each market its own dates, in the clinic's language", () => {
    expect(upcomingObservances("TR", "tr", new Date("2026-11-12")).map((o) => o.id)).toEqual(["tr-agiz-dis-sagligi-haftasi"]);
    expect(upcomingObservances("DE", "de", new Date("2026-09-20")).map((o) => o.id)).toEqual(expect.arrayContaining(["de-tag-der-zahngesundheit", "back-to-school"]));
    expect(upcomingObservances("ES", "es", new Date("2026-03-15"))[0].name).toMatch(/Día Mundial de la Salud Bucodental/);
    expect(upcomingObservances("TR", "tr", new Date("2027-02-10")).map((o) => o.id)).toContain("ramadan");
    expect(upcomingObservances("DE", "de", new Date("2026-02-10")).map((o) => o.id)).not.toContain("ramadan");
    expect(upcomingObservances("ES", "es", new Date("2026-06-15"))).toEqual([]);
    expect(seasonalBrief("ES", "es", new Date("2026-06-15"))).toBe("");
    expect(seasonalBrief("TR", "tr", new Date("2026-11-12"))).toMatch(/AT MOST ONE video.*never an offer/);
  });
});

const PROFILE: ClinicProfile = { name: "Gülüş", city: "İzmir", country: "TR", language: "tr", services: ["Diş beyazlatma", "Kanal tedavisi"], tone: "warm", address: "formal" };

function agentClient(answer: (system: string, user: string) => unknown) {
  const calls: { system: string; user: string }[] = [];
  const client = {
    chat: {
      completions: {
        create: async (req: { messages: { content: string }[] }) => {
          const [system, user] = [req.messages[0].content, req.messages[1].content];
          calls.push({ system, user });
          return { choices: [{ message: { content: JSON.stringify(answer(system, user)) } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, calls };
}

describe("strategist with memory, season and hook balance", () => {
  it("briefs the strategist with history, the season and native hooks, and drops repeats", async () => {
    const topics: Topic[] = [
      { title: "Beyazlatma mineye zarar verir mi", pillar: "myth", question: "Beyazlatma mineye zarar verir mi?", hook: "Beyazlatma mineyi inceltir mi? Pek sayılmaz.", service: "Diş beyazlatma" },
      { title: "Kanal sonrası ilk günler", pillar: "aftercare", question: "Kanal sonrası ne yapmalı?", hook: "Kanal bitti ama diş daha hazır değil.", service: "Kanal tedavisi", takeaway: "Kalıcı dolguya kadar o taraftan çiğnemeyin." },
      { title: "Beyazlatma sonrası kahve", pillar: "aftercare", question: "Beyazlatmadan sonra kahve içilir mi?", hook: "Beyazlatmadan sonra ilk kahve…", service: "Diş beyazlatma" },
    ];
    const { client, calls } = agentClient(() => ({ topics }));
    const out = await planWeek(client, PROFILE, { count: 2, avoidTitles: ["Beyazlatma mineye zarar verir mi"], today: new Date("2026-11-12") });
    expect(out.map((t) => t.title)).toEqual(["Kanal sonrası ilk günler", "Beyazlatma sonrası kahve"]);
    expect(out[0].takeaway).toMatch(/Kalıcı dolguya/);
    expect(calls[0].user).toMatch(/Already published/);
    expect(calls[0].user).toMatch(/Ağız ve Diş Sağlığı Haftası/);
    expect(calls[0].system).toContain(HOOK_BANK.tr[0]);
  });

  it("never picks a label or textbook hook, and evens out a week of questions", async () => {
    const t = (i: number): Topic => ({ title: `T${i}`, pillar: "education", question: "q?", hook: "old", service: "s" });
    const ranked = new Map([
      [0, [{ hook: "Is it safe?", score: 5 }, { hook: "That twinge after a cold sip…", score: 4 }]],
      [1, [{ hook: "Does it hurt?", score: 5 }, { hook: "Brushing harder doesn't clean better.", score: 3 }]],
      [2, [{ hook: "How long does it last?", score: 4 }]],
    ]);
    const out = balanceShapes([t(0), t(1), t(2)], ranked);
    expect(out.map((x) => x.hook)).toEqual(["That twinge after a cold sip…", "Does it hurt?", "How long does it last?"]);

    const content = { hooks: [{ index: 0, candidates: [{ hook: "Whitening: a short overview.", score: 5 }, { hook: "What is whitening?", score: 5 }, { hook: "That twinge after whitening? Here's why.", score: 3 }] }] };
    const { client } = agentClient(() => content);
    expect((await sharpenHooks(client, { ...PROFILE, language: "en" }, [t(0)]))[0].hook).toBe("That twinge after whitening? Here's why.");
  });
});

function plan(cta: string, narration: string, hook = "Kanal bitti ama diş daha hazır değil."): ScenePlan {
  return {
    title: "t",
    aspect: "9:16",
    theme: "sunrise",
    music: "none",
    scenes: [
      { kind: "hook", text: hook, seconds: 3 },
      { kind: "list", heading: "Kalıcı dolguya kadar", items: ["O taraftan sert şey çiğnemeyin.", "Hafif hassasiyet olabilir."], seconds: 5 },
      { kind: "statement", text: "Geçici dolgu uzun süre dayanmak için yapılmaz.", seconds: 4 },
      { kind: "cta", text: cta, seconds: 3 },
    ],
    voiceover: { text: narration, voice: "nova" },
  } as ScenePlan;
}
const GOOD_NARRATION =
  "Kanal tedavisi bitti, her şey yolunda görünüyor. Ama diş çoğu zaman henüz hazır değil. Üstünde genellikle geçici bir dolgu var, o yüzden o taraftan sert şeyler çiğnememek daha güvenli. " +
  "Birkaç gün hafif bir hassasiyet olabilir. Geçici dolgu uzun süre dayanmak için yapılmaz. Size özel talimatları hekiminize sorun.";

describe("deterministic post-check (week.ts scriptProblems)", () => {
  it("passes a clean script", () => {
    expect(scriptProblems(plan("Size özel talimatları hekiminize sorun.", GOOD_NARRATION), PROFILE)).toEqual([]);
  });

  it("sends back steering CTAs, filler, label hooks and invented numbers", () => {
    const bad = plan("Daha fazla bilgi için kliniğimizle iletişime geçin!", `${GOOD_NARRATION} Yüzde 90 hasta 3 gün içinde iyileşir.`, "Kanal tedavisi: aşamalar ve bakım");
    const p = scriptProblems(bad, PROFILE).join("\n");
    expect(p).toMatch(/hook: "Topic: description" label/);
    expect(p).toMatch(/cta: steers the viewer/);
    expect(p).toMatch(/daha fazla bilgi için/);
    expect(p).toMatch(/numbers that are not on screen \(90, 3\)/);
  });

  it("briefs the writer with the takeaway, the market's CTA rule and a reference script", () => {
    const brief = scriptBrief(PROFILE, { title: "Beyazlatma", pillar: "myth", question: "q", hook: "h", service: "Diş beyazlatma", takeaway: "Hassasiyet genellikle geçicidir." }, [], { openers: ["Bakın, şöyle."], closings: [] });
    expect(brief).toMatch(/ONE takeaway.*Hassasiyet genellikle geçicidir/);
    expect(brief).toMatch(/Never "randevu alın/);
    expect(brief).toMatch(/REFERENCE — the standard to match/);
    expect(brief).toMatch(/Earlier videos this week opened with: "Bakın, şöyle\."/);
  });

  it("tells each later video of the week how the earlier ones opened and closed", async () => {
    const topics: Topic[] = [
      { title: "Kanal sonrası", pillar: "aftercare", question: "Kanal sonrası ne yapmalı?", hook: "Kanal bitti ama diş daha hazır değil.", service: "Kanal tedavisi" },
      { title: "Beyazlatma ve kahve", pillar: "myth", question: "Beyazlatmadan sonra kahve içilir mi?", hook: "Beyazlatmadan sonra ilk kahve…", service: "Diş beyazlatma" },
    ];
    let planned = 0;
    const { client, calls } = agentClient((system) => {
      if (system.startsWith("You plan short")) return { topics };
      if (system.startsWith("You are the editor")) throw new Error("skip");
      // Each video closes differently (a closing that echoes an earlier one is sent back).
      if (system.startsWith("You write scene plans")) return plan(++planned === 1 ? "Size özel talimatları hekiminize sorun." : "Kahve konusunu kontrolde hekiminizle konuşabilirsiniz.", GOOD_NARRATION);
      if (system.startsWith("You are the dentist")) return { text: GOOD_NARRATION };
      if (system.startsWith("You review") || system.startsWith("You are a careful general dentist")) return { verdict: "pass", issues: [] };
      if (system.startsWith("You write the Instagram")) return { caption: "Kanal sonrası ilk günler hakkında kısa bilgi.", hashtags: ["dis", "izmir", "kanal"] };
      if (system.startsWith("You write a filming card")) return { opening: "Merhaba.", points: ["Bir.", "İki."], closing: "Sorun.", avoid: [], setup: ["Dikey çekin"], minutes: 2 };
      return {};
    });
    const week = await produceWeek({ client }, PROFILE, { count: 2, today: new Date("2026-06-15") });
    expect(week.filter((w) => w.status === "ready")).toHaveLength(2);
    const plans = calls.filter((c) => c.system.startsWith("You write scene plans"));
    expect(plans[0].user).not.toMatch(/Earlier videos this week/);
    expect(plans[1].user).toMatch(/Earlier videos this week closed with: "Size özel talimatları hekiminize sorun\."/);
  });
});

describe("live eval spend cap and rubric columns (eval.ts)", () => {
  it("stops calling once the cap is reached and refuses models it cannot price", () => {
    const usage: Usage = { "gpt-5.4": { calls: 1, input: 1_000_000, output: 0 } }; // $2.50
    expect(() => spendCap(3, usage).check("gpt-5.4")).not.toThrow();
    expect(() => spendCap(2, usage).check("gpt-5.4")).toThrow(SpendCapError);
    expect(() => spendCap(10, usage).check("mystery-model")).toThrow(/no price/);
  });

  it("vetoes the call before it is sent", async () => {
    let sent = 0;
    const raw = { chat: { completions: { create: async () => { sent++; return { choices: [], usage: { prompt_tokens: 1_000_000, completion_tokens: 0 } }; } } } } as unknown as OpenAI;
    const usage: Usage = {};
    const cap = spendCap(2, usage);
    const client = meterClient(raw, usage, (m) => cap.check(m));
    await client.chat.completions.create({ model: "gpt-5.4", messages: [] });
    await expect(client.chat.completions.create({ model: "gpt-5.4", messages: [] })).rejects.toThrow(SpendCapError);
    expect(sent).toBe(1);
  });

  it("adds rubric and variety scores to ready rows", async () => {
    const [a, b] = examplesAsScripts();
    const rows: EvalRow[] = [
      { clinic: "C", language: "tr", topic: "a", service: "x", status: "ready", rewrites: 0, notes: [], hookScore: 4, voiceScore: 4, script: a },
      { clinic: "C", language: "tr", topic: "b", service: "y", status: "ready", rewrites: 0, notes: [], hookScore: 4, voiceScore: 4, script: b },
      { clinic: "C", language: "tr", topic: "c", service: "z", status: "rejected", rewrites: 0, notes: [] },
    ];
    addRubric(rows);
    expect(rows[0].rubric).toBe(5);
    expect(rows[0].variety).toBe(5);
    expect(summarise(rows).rubric).toBe(5);
  });
});
