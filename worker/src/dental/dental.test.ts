import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { scanHardRules, stricter } from "./compliance.js";
import { finalHashtags } from "./copywriter.js";
import { narrationProblems, planText, produceVideo, produceWeek, scriptBrief } from "./week.js";
import type { ClinicProfile } from "./profile.js";
import { planWeek, type Topic } from "./strategist.js";
import type { ScenePlan } from "../remotion/scene-plan.js";

const rules = (t: string) => scanHardRules(t).map((h) => h.rule);

describe("hard compliance rules", () => {
  it("catches the classic risky phrases in English", () => {
    expect(rules("Guaranteed results, completely painless!")).toEqual(["guarantee", "absolute"]);
    expect(rules("The best dentist in town")).toContain("superlative");
    expect(rules("Whitening 20% off this week")).toContain("price");
    expect(rules("Implants from $499")).toContain("price");
    expect(rules("See our before and after gallery")).toContain("before_after");
    expect(rules("Our patients say we are amazing")).toContain("testimonial");
    expect(rules("This rinse cures gum disease")).toContain("cure");
    expect(rules("100% success rate")).toContain("absolute");
  });

  it("catches them in Turkish", () => {
    expect(rules("Garantili ve acısız implant")).toEqual(["guarantee", "absolute"]);
    expect(rules("İstanbul'un en iyi kliniği")).toContain("superlative");
    expect(rules("Diş beyazlatmada büyük indirim")).toContain("price");
    expect(rules("Kampanyamızı kaçırmayın")).toContain("price");
    expect(rules("Öncesi ve sonrası fotoğraflar")).toContain("before_after");
    expect(rules("Kalıcı beyazlık")).toContain("absolute");
  });

  it("catches them in German, Spanish, French, Portuguese and Italian", () => {
    expect(rules("Garantiert schmerzfreie Implantate")).toEqual(["guarantee", "absolute"]);
    expect(rules("Die beste Zahnarztpraxis in Berlin")).toContain("superlative");
    expect(rules("Jetzt 20% Rabatt auf Bleaching")).toContain("price");
    expect(rules("Vorher-Nachher Bilder")).toContain("before_after");
    expect(rules("Blanqueamiento sin dolor y garantizado")).toEqual(["guarantee", "absolute"]);
    expect(rules("La mejor clínica de Madrid")).toContain("superlative");
    expect(rules("Descuento especial este mes")).toContain("price");
    expect(rules("Fotos de antes y después")).toContain("before_after");
    expect(rules("Un sourire parfait garanti, sans douleur")).toEqual(["guarantee", "absolute"]);
    expect(rules("Le meilleur dentiste de Paris")).toContain("superlative");
    expect(rules("Résultats à vie")).toContain("absolute");
    expect(rules("Clareamento sem dor com desconto")).toEqual(["absolute", "price"]);
    expect(rules("Il migliore studio dentistico, sconto del 30%")).toEqual(["superlative", "price"]);
    expect(rules("Prima e dopo il trattamento")).toContain("before_after");
  });

  it("only counts superlatives about the clinic, and lets negated guarantees through (seen in real runs)", () => {
    expect(rules("Consult your dentist for the best approach.")).toEqual([]);
    expect(rules("En iyi şekilde fırçalayın.")).toEqual([]);
    expect(rules("En iyi sonuç için hekiminize danışın.")).toEqual([]);
    expect(rules("Das beste ist, regelmäßig zu putzen.")).toEqual([]);
    expect(rules("Es lo mejor para tu salud.")).toEqual([]);
    expect(rules("The best dentist in Austin")).toContain("superlative");
    expect(rules("İzmir'in en iyi kliniği")).toContain("superlative");
    expect(rules("La mejor clínica de Madrid")).toContain("superlative");
    expect(rules("No garantiza dientes más blancos.")).toEqual([]);
    expect(rules("Whitening does not guarantee whiter teeth.")).toEqual([]);
    expect(rules("Beyazlık garanti etmez.")).toEqual([]);
    expect(rules("Garantizamos resultados")).toContain("guarantee");
  });

  it("flags the bare 'prevents' and lets the hedged form through", () => {
    expect(rules("Cleanings prevent gum disease.")).toEqual([]); // plural subject, still general advice
    expect(rules("Flossing prevents gum disease.")).toContain("absolute");
    expect(rules("Diş taşı temizliği diş eti hastalıklarını önler.")).toContain("absolute");
    expect(rules("Diş eti hastalıklarını önlemeye yardımcı olur.")).toEqual([]);
    expect(rules("Zahnseide verhindert Karies.")).toContain("absolute");
    expect(rules("La limpieza ayuda a prevenir caries.")).toEqual([]);
    expect(rules("La limpieza previene caries.")).toContain("absolute");
  });

  it("does not treat 'permanent teeth' (adult teeth) as a promise, in any language", () => {
    expect(rules("Permanent teeth usually start coming in around age six.")).toEqual([]);
    expect(rules("Kalıcı dişler genellikle 6 yaş civarında çıkmaya başlar.")).toEqual([]);
    expect(rules("Los dientes permanentes suelen salir hacia los seis años.")).toEqual([]);
    expect(rules("Die bleibenden Zähne kommen meist ab sechs Jahren.")).toEqual([]);
    expect(rules("Les dents permanentes apparaissent vers six ans.")).toEqual([]);
    // …but a permanent RESULT is still a promise.
    expect(rules("Permanent results after one visit")).toContain("absolute");
    expect(rules("Kalıcı beyazlık")).toContain("absolute");
  });

  it("lets ordinary, hedged education through", () => {
    expect(rules("Whitening can make teeth a few shades lighter. Ask your dentist if it suits you.")).toEqual([]);
    expect(rules("Diş eti hastalığı erken fark edilirse tedavi edilebilir.")).toEqual([]);
    expect(rules("Brush twice a day for two minutes.")).toEqual([]);
    // Words that merely contain a risky stem are not hits.
    expect(rules("Bestow care on your gums")).toEqual([]);
    expect(rules("Es mejor cepillarse dos veces al día.")).toEqual([]);
    expect(rules("Unser Leistungsangebot umfasst Prophylaxe.")).toEqual([]);
    expect(rules("Il est préférable de consulter votre dentiste.")).toEqual([]);
  });

  it("the stricter verdict wins", () => {
    expect(stricter("pass", "revise")).toBe("revise");
    expect(stricter("block", "revise")).toBe("block");
    expect(stricter("pass", "pass")).toBe("pass");
  });
});

const PROFILE: ClinicProfile = {
  name: "Smile Studio",
  city: "Izmir",
  country: "TR",
  language: "en",
  services: ["whitening", "implants", "check-ups"],
  tone: "warm",
  address: "formal",
  handle: "smilestudio",
};

const TOPIC: Topic = {
  title: "Is whitening bad for enamel?",
  pillar: "myth",
  question: "Does whitening damage my teeth?",
  hook: "Whitening ruins enamel? Not quite.",
  service: "whitening",
};

function plan(lines: string[]): ScenePlan {
  return {
    title: "t",
    aspect: "9:16",
    theme: "sunrise",
    music: "none",
    scenes: [
      { kind: "hook", text: lines[0], seconds: 3 },
      { kind: "statement", text: lines[1], seconds: 4 },
      { kind: "list", heading: "Good to know", items: [lines[2], "Ask your dentist"], seconds: 5 },
      { kind: "cta", text: "Book a check-up", handle: "@smilestudio", seconds: 3 },
    ],
    voiceover: {
      text:
        "Many people worry that whitening damages enamel. When it is supervised by a dentist, whitening is considered safe for most people. " +
        "Some sensitivity can happen and it usually fades within a few days. If you have questions, ask your dentist or book a check-up with us.",
      voice: "nova",
    },
  } as ScenePlan;
}

/**
 * A fake OpenAI client that answers each agent by recognising its system
 * prompt, and records what it was asked.
 */
function fakeClient(script: {
  plans: ScenePlan[];
  reviews: ("pass" | "revise" | "block")[];
  accuracy?: ("pass" | "revise" | "block")[];
  copies?: { caption: string; hashtags: string[] }[];
  topics?: Topic[];
}) {
  const calls: { system: string; user: string }[] = [];
  const plans = [...script.plans];
  const reviews = [...script.reviews];
  const accuracy = [...(script.accuracy ?? [])];
  const copies = [...(script.copies ?? [{ caption: "Whitening can lighten teeth safely when supervised. Book a check-up.", hashtags: ["dentist", "izmir", "whitening"] }])];
  const client = {
    chat: {
      completions: {
        create: async (req: { messages: { role: string; content: string }[] }) => {
          const system = req.messages[0].content;
          const user = req.messages[1].content;
          calls.push({ system, user });
          let body: unknown;
          if (system.startsWith("You write scene plans")) body = plans.shift();
          else if (system.startsWith("You review")) {
            const v = reviews.shift() ?? "pass";
            body = { verdict: v, issues: v === "pass" ? [] : [{ quote: "x", problem: "too strong", fix: "soften" }] };
          } else if (system.startsWith("You are a careful general dentist")) {
            const v = accuracy.shift() ?? "pass";
            body = { verdict: v, issues: v === "pass" ? [] : [{ quote: "protects teeth", problem: "not true", fix: "can lighten teeth" }] };
          } else if (system.startsWith("You write a filming card"))
            body = { opening: "Let's talk whitening.", points: ["Supervised whitening is considered safe.", "Sensitivity can happen."], closing: "Ask us.", avoid: ["prices"], setup: ["Film vertically"], minutes: 3 };
          else if (system.startsWith("You write the Instagram")) body = copies.shift();
          else if (system.startsWith("You plan short")) body = { topics: script.topics ?? [TOPIC] };
          return { choices: [{ message: { content: JSON.stringify(body) } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, calls };
}

describe("narrationProblems", () => {
  it("rejects a voice name typed into the text field (seen live)", () => {
    const p = { ...plan(["a hook", "a statement", "an item"]), voiceover: { text: "nova", voice: "nova" } } as ScenePlan;
    expect(narrationProblems(p)[0]).toMatch(/full narration/);
  });
  it("asks for narration when there is none", () => {
    const p = { ...plan(["a hook", "a statement", "an item"]), voiceover: undefined } as ScenePlan;
    expect(narrationProblems(p)[0]).toMatch(/add "voiceover"/);
  });
  it("accepts a real narration", () => {
    expect(narrationProblems(plan(["a hook", "a statement", "an item"]))).toEqual([]);
  });
});

describe("planText", () => {
  it("collects every on-screen word", () => {
    const text = planText(plan(["Hook line", "Statement line", "Item line"]));
    expect(text).toContain("Hook line");
    expect(text).toContain("Statement line");
    expect(text).toContain("Item line");
    expect(text).toContain("Book a check-up");
  });
});

describe("the orchestrator", () => {
  const clean = plan(["Whitening ruins enamel?", "Supervised whitening is considered safe for enamel.", "Sensitivity can happen and usually fades."]);

  it("ships a video only after script and caption both pass review", async () => {
    const { client } = fakeClient({ plans: [clean], reviews: ["pass", "pass"] });
    const pkg = await produceVideo({ client }, PROFILE, TOPIC);
    expect(pkg.status).toBe("ready");
    if (pkg.status === "ready") {
      expect(pkg.checks.script.compliance.verdict).toBe("pass");
      expect(pkg.checks.script.accuracy.verdict).toBe("pass");
      expect(pkg.checks.copy.compliance.verdict).toBe("pass");
    }
  });

  it("rewrites once with the reviewer's fixes, then ships", async () => {
    const { client, calls } = fakeClient({ plans: [clean, clean], reviews: ["revise", "pass", "pass"] });
    const pkg = await produceVideo({ client }, PROFILE, TOPIC);
    expect(pkg.status).toBe("ready");
    const secondPlanPrompt = calls.filter((c) => c.system.startsWith("You write scene plans"))[1].user;
    expect(secondPlanPrompt).toContain("reviewer required these changes");
  });

  it("never ships a script the hard rules flag, even if the model says pass", async () => {
    const risky = plan(["Painless whitening, guaranteed", "The best results in Izmir", "20% off this week"]);
    const { client } = fakeClient({ plans: [risky, risky, risky], reviews: ["pass", "pass", "pass"] });
    const pkg = await produceVideo({ client }, PROFILE, TOPIC);
    expect(pkg.status).toBe("rejected");
    if (pkg.status === "rejected") {
      expect(pkg.stage).toBe("script");
      expect(pkg.reasons.join(" ")).toMatch(/guarantee|painless|best|off/i);
    }
  });

  it("drops a topic the reviewer blocks, without a rewrite", async () => {
    const { client, calls } = fakeClient({ plans: [clean], reviews: ["block"] });
    const pkg = await produceVideo({ client }, PROFILE, TOPIC);
    expect(pkg.status).toBe("rejected");
    expect(calls.filter((c) => c.system.startsWith("You write scene plans"))).toHaveLength(1);
  });

  it("rejects a caption that keeps failing review", async () => {
    const { client } = fakeClient({
      plans: [clean],
      reviews: ["pass", "pass", "pass", "pass"],
      copies: [
        { caption: "Best whitening in town, 30% off!", hashtags: ["dentist", "deal", "izmir"] },
        { caption: "Still the best price, guaranteed.", hashtags: ["dentist", "deal", "izmir"] },
        { caption: "The best, guaranteed, painless.", hashtags: ["dentist", "deal", "izmir"] },
      ],
    });
    const pkg = await produceVideo({ client }, PROFILE, TOPIC);
    expect(pkg.status).toBe("rejected");
    if (pkg.status === "rejected") expect(pkg.stage).toBe("copy");
  });

  it("runs the week: strategist topics → packages, rendering when asked", async () => {
    const other: Topic = { ...TOPIC, title: "Implant aftercare", service: "implants", pillar: "aftercare" };
    const offMenu: Topic = { ...TOPIC, title: "Braces 101", service: "orthodontics", pillar: "education" };
    const { client } = fakeClient({
      topics: [TOPIC, other, offMenu],
      plans: [clean, clean],
      reviews: ["pass", "pass", "pass", "pass"],
      copies: [
        { caption: "Supervised whitening is considered safe. Book a check-up.", hashtags: ["dentist", "izmir", "whitening"] },
        { caption: "Keep the area clean and follow your dentist's advice.", hashtags: ["dentist", "izmir", "implants"] },
      ],
    });
    const rendered: string[] = [];
    const week = await produceWeek(
      { client, render: async (_p, t) => { rendered.push(t.title); return `/tmp/${t.title}.mp4`; } },
      PROFILE,
      { count: 5 },
    );
    // The off-menu topic (a service the clinic does not offer) is dropped by the strategist.
    expect(week.map((w) => w.topic.title)).toEqual([TOPIC.title, other.title]);
    expect(week.every((w) => w.status === "ready")).toBe(true);
    expect(rendered).toEqual([TOPIC.title, other.title]);
  });

  it("keeps going when one topic throws, and reports it", async () => {
    const other: Topic = { ...TOPIC, title: "Implant aftercare", service: "implants", pillar: "aftercare" };
    const broken = { ...plan(["a", "b", "c"]), music: "warm and inviting" } as unknown as ScenePlan;
    const { client } = fakeClient({
      topics: [TOPIC, other],
      // First topic: both plan attempts and the fresh retry's two invalid → throws. Second topic: clean.
      plans: [broken, broken, broken, broken, plan(["Implant aftercare", "Keep the area clean.", "Follow your dentist's advice."])],
      reviews: ["pass", "pass"],
    });
    const week = await produceWeek({ client }, PROFILE, { count: 5 });
    expect(week.map((w) => w.status)).toEqual(["rejected", "ready"]);
  });

  it("retries an invalid plan once with the error instead of losing the topic", async () => {
    const broken = { ...clean, scenes: [] } as unknown as ScenePlan;
    const { client, calls } = fakeClient({ plans: [broken, broken, clean], reviews: ["pass", "pass", "pass"] });
    const pkg = await produceVideo({ client }, PROFILE, TOPIC);
    expect(pkg.status).toBe("ready");
    const plans = calls.filter((c) => c.system.startsWith("You write scene plans"));
    expect(plans.at(-1)!.user).toContain("previous attempt was invalid");
  });

  it("sends a clinically wrong script back with the dentist-reviewer's fix, then ships it pending approval", async () => {
    const { client, calls } = fakeClient({ plans: [clean, clean], reviews: ["pass", "pass", "pass"], accuracy: ["revise", "pass", "pass"] });
    const pkg = await produceVideo({ client }, PROFILE, TOPIC);
    expect(pkg.status).toBe("ready");
    if (pkg.status === "ready") {
      expect(pkg.approval).toBe("pending");
      expect(pkg.checks.script.accuracy.verdict).toBe("pass");
      expect(pkg.shootCard?.points.length).toBeGreaterThan(0);
    }
    const plans = calls.filter((c) => c.system.startsWith("You write scene plans"));
    expect(plans[1].user).toContain("can lighten teeth");
  });

  it("writes the caption from the approved script, so they cannot disagree", async () => {
    const { client, calls } = fakeClient({ plans: [clean], reviews: ["pass", "pass"] });
    await produceVideo({ client }, PROFILE, TOPIC);
    const copyPrompt = calls.find((c) => c.system.startsWith("You write the Instagram"))!.user;
    expect(copyPrompt).toContain("Supervised whitening is considered safe for enamel.");
    const reviews = calls.filter((c) => c.system.startsWith("You are a careful general dentist"));
    // script → caption (against the script) → shoot card
    expect(reviews).toHaveLength(3);
    const captionReview = reviews.find((c) => c.user.includes("CAPTION:"))!.user;
    expect(captionReview).toContain("VIDEO SCRIPT:");
  });

  it("briefs the scriptwriter with the clinic's language, handle and the rules", () => {
    const brief = scriptBrief({ ...PROFILE, language: "tr" }, TOPIC);
    expect(brief).toContain("in tr");
    expect(brief).toContain("@smilestudio");
    expect(brief).toMatch(/Never mention prices/);
  });
});

describe("finalHashtags", () => {
  it("puts the clinic's real tag first and drops invented brand tags", () => {
    const tags = finalHashtags(["#gülüşstudio", "DişSağlığı", "izmir", "smilestudio", "diş sağlığı", "bad-tag!"], {
      name: "Smile Studio",
      handle: "smilestudio.izmir",
    });
    expect(tags[0]).toBe("smilestudioizmir");
    expect(tags).not.toContain("gülüşstudio");
    expect(tags).toContain("dişsağlığı");
    expect(tags).toContain("izmir");
    expect(tags.filter((t) => t === "dişsağlığı")).toHaveLength(1);
    expect(tags).not.toContain("bad-tag!");
  });
});

describe("planWeek", () => {
  it("keeps at most two topics per service", async () => {
    const t = (service: string, i: number) => ({ title: `Topic ${i}`, pillar: "myth", question: "A real question?", hook: "A short hook here", service });
    const content = JSON.stringify({ topics: [t("Implants", 1), t("Implants", 2), t("Implants", 3), t("Cleanings", 4)] });
    const client = { chat: { completions: { create: async () => ({ choices: [{ message: { content } }] }) } } } as never;
    const topics = await planWeek(client, { ...PROFILE, services: ["Implants", "Cleanings"] }, { count: 5 });
    expect(topics.map((x) => x.title)).toEqual(["Topic 1", "Topic 2", "Topic 4"]);
  });
});

describe("before/after rule reads time, not results", () => {
  it.each([
    "Lávalos antes y después de comer.",
    "Brush before and after meals.",
    "Yemek öncesi ve sonrası ağzınızı çalkalayın.",
    "Nettoyez-les avant et après les repas.",
    "Escove antes e depois das refeições.",
  ])("passes %s", (t) => expect(scanHardRules(t).map((h) => h.rule)).not.toContain("before_after"));
  it.each([
    "See our before and after photos!",
    "Fotos de antes y después.",
    "Antes y después del tratamiento",
    "Vorher-Nachher-Bilder unserer Patienten",
    "Beyazlatma öncesi sonrası farkı",
    "Our before/after gallery",
  ])("flags %s", (t) => expect(scanHardRules(t).map((h) => h.rule)).toContain("before_after"));
});

describe("compliance no-op issues", () => {
  it("drops fixes that change nothing and padding on a question", async () => {
    const { noOpIssue } = await import("./compliance.js");
    expect(noOpIssue({ quote: "Diş taşı kalp sağlığınızı etkileyebilir mi?", fix: "Diş taşı kalp sağlığınızı etkileyebilir mi? Hekiminize danışın." })).toBe(true);
    expect(noOpIssue({ quote: "Most people can.", fix: "most people can" })).toBe(true);
    expect(noOpIssue({ quote: "Whitening is safe.", fix: "Whitening is usually safe." })).toBe(false);
  });
  it("lets a negated 'permanent' through", () => {
    expect(scanHardRules("Bleaching macht die Zähne nicht dauerhaft empfindlich.").map((h) => h.rule)).not.toContain("absolute");
    expect(scanHardRules("Bleaching wirkt dauerhaft.").map((h) => h.rule)).toContain("absolute");
  });
});

describe("permanent restorations are a dental term", () => {
  it.each(["Kalıcı dolgu yapılana kadar o tarafla çiğnemeyin.", "until the permanent filling is placed", "hasta la restauración permanente", "bis zur dauerhaften Füllung"])("passes %s", (t) =>
    expect(scanHardRules(t).map((h) => h.rule)).not.toContain("absolute"));
});

describe("hedge stacking is not a fix", () => {
  it("treats added hedge words as a no-op", async () => {
    const { noOpIssue } = await import("./compliance.js");
    expect(noOpIssue({ quote: "Sie können Ihre Zähne sanft und effektiv bewegen.", fix: "Sie können möglicherweise Ihre Zähne sanft und möglicherweise effektiv bewegen." })).toBe(true);
    expect(noOpIssue({ quote: "Durulamamak diş sağlığınızı artırabilir.", fix: "Durulamamak diş sağlığınızı destekleyebilir." })).toBe(false);
  });
});

describe("sharpenHooks", () => {
  it("keeps the best-scored clean candidate, and the original when the editor fails", async () => {
    const { sharpenHooks } = await import("./strategist.js");
    const content = JSON.stringify({
      hooks: [{ index: 0, candidates: [
        { hook: "Painless whitening in one hour!", score: 5 },
        { hook: "That twinge after whitening? Here's why.", score: 4 },
        { hook: "Whitening: a short overview.", score: 2 },
      ] }],
    });
    const ok = { chat: { completions: { create: async () => ({ choices: [{ message: { content } }] }) } } } as never;
    expect((await sharpenHooks(ok, PROFILE, [TOPIC]))[0].hook).toBe("That twinge after whitening? Here's why.");
    const broken = { chat: { completions: { create: async () => { throw new Error("down"); } } } } as never;
    expect((await sharpenHooks(broken, PROFILE, [TOPIC]))[0].hook).toBe(TOPIC.hook);
  });
});

describe("per-language agent material", () => {
  it("covers every language a clinic can choose", async () => {
    const { SPOKEN_CUES } = await import("./narrate.js");
    const { AVOID_WORDS } = await import("./compliance.js");
    // The languages the sign-up form offers (web/src/lib/dentvid/profile.ts).
    const langs = ["en", "de", "es", "fr", "it", "pt", "tr"];
    for (const l of langs) {
      expect(SPOKEN_CUES[l], `spoken cues for ${l}`).toBeTruthy();
      expect(AVOID_WORDS[l], `avoid words for ${l}`).toBeTruthy();
    }
  });
});

describe("new markets: Japanese, Arabic, Polish hard rules", () => {
  it("catches the 医療広告ガイドライン classics in Japanese (no spaces, no word boundaries)", () => {
    expect(rules("無痛で安心のインプラント")).toContain("absolute");
    expect(rules("当院は地域一番の歯科医院です")).toContain("superlative");
    expect(rules("日本一のクリニック")).toContain("superlative");
    expect(rules("ホワイトニングのキャンペーン中")).toContain("price");
    expect(rules("インプラント 300,000円")).toContain("price");
    expect(rules("ビフォーアフター写真をご覧ください")).toContain("before_after");
    expect(rules("患者様の声をご紹介します")).toContain("testimonial");
    expect(rules("歯周病が完治します")).toContain("cure");
    expect(rules("効果を保証します")).toContain("guarantee");
    expect(rules("フロスは歯周病を防ぎます")).toContain("absolute");
    expect(rules("１００％白くなります")).toContain("absolute");
  });
  it("lets ordinary Japanese dental language through", () => {
    expect(rules("永久歯は6歳ごろから生えてきます")).toEqual([]);
    expect(rules("フロスは歯周病を防ぐのに役立ちます")).toEqual([]);
    expect(rules("治療前後の注意点をお伝えします")).toEqual([]);
    expect(rules("効果を保証できません")).toEqual([]);
    expect(rules("必ず歯科医師に相談してください")).toEqual([]);
    expect(rules("しみることがありますが、多くの場合は一時的です")).toEqual([]);
  });
  it("catches DHA-listed claims in Arabic, with attached prefixes", () => {
    expect(rules("زراعة أسنان بدون ألم ومضمونة")).toEqual(["guarantee", "absolute"]);
    expect(rules("أفضل عيادة أسنان في دبي")).toContain("superlative");
    expect(rules("خصم 20% على التبييض")).toContain("price");
    expect(rules("التبييض بـ 500 درهم")).toContain("price");
    expect(rules("شاهدوا صور قبل وبعد")).toContain("before_after");
    expect(rules("نتائج فورية")).toContain("absolute");
    expect(rules("بدون آثار جانبية")).toContain("absolute");
    expect(rules("الخيط يمنع التسوس")).toContain("absolute");
    expect(rules("مرضانا يقولون")).toContain("testimonial");
    expect(rules("علاج نهائي للألم")).toContain("cure");
    expect(rules("ابتسامة دائمة")).toContain("absolute");
  });
  it("lets ordinary Arabic dental language through", () => {
    expect(rules("الأسنان الدائمة تظهر عادة في سن السادسة")).toEqual([]);
    expect(rules("بعد علاج العصب توضع الحشوة الدائمة")).toEqual([]);
    expect(rules("نظفوا أسنانكم قبل وبعد الأكل")).toEqual([]);
    expect(rules("نظفوا أسنانكم دائماً بلطف")).toEqual([]);
    expect(rules("قد يساعد الخيط على الوقاية من التسوس")).toEqual([]);
    expect(rules("لا نضمن النتائج")).toEqual([]);
  });
  it("catches the classics in Polish and lets the hedged forms through", () => {
    expect(rules("Bezbolesne leczenie z gwarancją")).toEqual(["guarantee", "absolute"]);
    expect(rules("Najlepszy gabinet stomatologiczny w Krakowie")).toContain("superlative");
    expect(rules("Wybielanie 20% rabatu")).toContain("price");
    expect(rules("Implant 3000 zł")).toContain("price");
    expect(rules("Zdjęcia przed i po")).toContain("before_after");
    expect(rules("Nić dentystyczna zapobiega próchnicy")).toContain("absolute");
    expect(rules("Efekt na zawsze")).toContain("absolute");
    expect(rules("Opinie naszych pacjentów")).toContain("testimonial");
    expect(rules("Nić może pomóc zapobiegać próchnicy")).toEqual([]);
    expect(rules("Myj zęby przed i po jedzeniu")).toEqual([]);
    expect(rules("Zęby stałe wyrastają około 6. roku życia")).toEqual([]);
    expect(rules("Trwałe wypełnienie po leczeniu kanałowym")).toEqual([]);
    expect(rules("Nie gwarantujemy efektów")).toEqual([]);
  });
});

describe("narration length in the language's own unit", () => {
  const jaPlan = (text: string) => ({ ...plan(["フック", "説明", "項目"]), voiceover: { text, voice: "nova" } }) as ScenePlan;
  it("counts Japanese in characters, not space-separated words", () => {
    const long = "実は、ホワイトニングのあとに歯がしみるのはよくあることなんです。".repeat(6);
    expect(narrationProblems(jaPlan(long), "ja")).toEqual([]);
    // The same text counted in words is a single "word" and was always rejected.
    expect(narrationProblems(jaPlan(long), "en")[0]).toMatch(/1 words/);
    expect(narrationProblems(jaPlan("短すぎます。"), "ja")[0]).toMatch(/characters/);
  });
  it("tells Japanese writers characters and Japanese limits", () => {
    const brief = scriptBrief({ ...PROFILE, language: "ja", country: "JP" }, TOPIC);
    expect(brief).toMatch(/Japanese characters per second/);
    expect(brief).toMatch(/hook at most 20 characters/);
    expect(brief).toMatch(/医療広告ガイドライン/);
  });
});

describe("per-language agent material (new markets)", () => {
  it("covers ja, ar and pl", async () => {
    const { SPOKEN_CUES } = await import("./narrate.js");
    const { AVOID_WORDS } = await import("./compliance.js");
    for (const l of ["ja", "ar", "pl"]) {
      expect(SPOKEN_CUES[l], `spoken cues for ${l}`).toBeTruthy();
      expect(AVOID_WORDS[l], `avoid words for ${l}`).toBeTruthy();
    }
  });
});
