import { describe, it, expect } from "vitest";
import type OpenAI from "openai";
import { scanHardRules, stricter } from "./compliance.js";
import { finalHashtags } from "./copywriter.js";
import { planText, produceVideo, produceWeek, scriptBrief } from "./week.js";
import type { ClinicProfile } from "./profile.js";
import type { Topic } from "./strategist.js";
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

  it("lets ordinary, hedged education through", () => {
    expect(rules("Whitening can make teeth a few shades lighter. Ask your dentist if it suits you.")).toEqual([]);
    expect(rules("Diş eti hastalığı erken fark edilirse tedavi edilebilir.")).toEqual([]);
    expect(rules("Brush twice a day for two minutes.")).toEqual([]);
    // Words that merely contain a risky stem are not hits.
    expect(rules("Bestow care on your gums")).toEqual([]);
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
  } as ScenePlan;
}

/**
 * A fake OpenAI client that answers each agent by recognising its system
 * prompt, and records what it was asked.
 */
function fakeClient(script: {
  plans: ScenePlan[];
  reviews: ("pass" | "revise" | "block")[];
  copies?: { caption: string; hashtags: string[] }[];
  topics?: Topic[];
}) {
  const calls: { system: string; user: string }[] = [];
  const plans = [...script.plans];
  const reviews = [...script.reviews];
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
          } else if (system.startsWith("You write the Instagram")) body = copies.shift();
          else if (system.startsWith("You plan short")) body = { topics: script.topics ?? [TOPIC] };
          return { choices: [{ message: { content: JSON.stringify(body) } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, calls };
}

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
      expect(pkg.checks.script.verdict).toBe("pass");
      expect(pkg.checks.copy.verdict).toBe("pass");
    }
  });

  it("rewrites once with the reviewer's fixes, then ships", async () => {
    const { client, calls } = fakeClient({ plans: [clean, clean], reviews: ["revise", "pass", "pass"] });
    const pkg = await produceVideo({ client }, PROFILE, TOPIC);
    expect(pkg.status).toBe("ready");
    const secondPlanPrompt = calls.filter((c) => c.system.startsWith("You write scene plans"))[1].user;
    expect(secondPlanPrompt).toContain("compliance reviewer required");
  });

  it("never ships a script the hard rules flag, even if the model says pass", async () => {
    const risky = plan(["Painless whitening, guaranteed", "The best results in Izmir", "20% off this week"]);
    const { client } = fakeClient({ plans: [risky, risky], reviews: ["pass", "pass"] });
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
      reviews: ["pass", "pass", "pass"],
      copies: [
        { caption: "Best whitening in town, 30% off!", hashtags: ["dentist", "deal", "izmir"] },
        { caption: "Still the best price, guaranteed.", hashtags: ["dentist", "deal", "izmir"] },
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
      // First topic: both plan attempts invalid → throws. Second topic: clean.
      plans: [broken, broken, plan(["Implant aftercare", "Keep the area clean.", "Follow your dentist's advice."])],
      reviews: ["pass", "pass"],
    });
    const week = await produceWeek({ client }, PROFILE, { count: 5 });
    expect(week.map((w) => w.status)).toEqual(["rejected", "ready"]);
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
