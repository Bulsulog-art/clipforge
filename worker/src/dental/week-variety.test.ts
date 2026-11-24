import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type OpenAI from "openai";
import { DENTAL_PHOTOS, backgroundId, backgroundSrc, startingBackgrounds, type SuggestInput } from "../dentvid/backgrounds/suggest.js";
import type { ScenePlan } from "../remotion/scene-plan.js";
import { closingMove, closingMoves, ctaGuide, repeatedScreen } from "./style.js";
import { HOUSE_THEME, keptLook, keptPhotos, produceVideo, produceWeek, recentBackgrounds, rememberPhotos, scriptBrief, targetWeek, type WeekVisuals } from "./week.js";
import type { PastTopic, WeekVoice } from "./memory.js";
import type { ClinicProfile } from "./profile.js";
import type { Topic } from "./strategist.js";

/**
 * Week variety (docs/QUALITY.md, "Week variety"): a clinic's weeks must not
 * look or close alike. Background photos rotate through the clinic's recent
 * use, every video is made in one house look, and each video of a week
 * closes with a different move.
 */

type Sample = { id: string; status: string; language: string; country: string; scenes: { kind: string; text?: string }[]; narration: string };
const SAMPLES = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/published-samples.json"), "utf8")) as Sample[];

/** The clinic service each sample was written for, named the way a clinic in that language names it. */
const SERVICE: [RegExp, Record<string, string>][] = [
  [/implant/, { tr: "İmplant", en: "Dental implants", de: "Implantologie", es: "Implantes", fr: "Implants dentaires", pl: "Implanty" }],
  [/beyazlatma|whitening|bleaching|blanchiment|wybielanie/, { tr: "Diş beyazlatma", en: "Teeth whitening", de: "Bleaching", es: "Blanqueamiento", fr: "Blanchiment dentaire", pl: "Wybielanie zębów" }],
  [/aligner|plak/, { tr: "Şeffaf plak", en: "Clear aligners", de: "Aligner", es: "Alineadores", fr: "Aligneurs", pl: "Nakładki" }],
  [/temizl|limpieza|detartrage|cleaning/, { tr: "Diş taşı temizliği", en: "Hygienist cleaning", de: "Professionelle Zahnreinigung", es: "Limpieza dental", fr: "Détartrage", pl: "Higienizacja" }],
  [/kinder|primer-diente|children/, { tr: "Çocuk diş hekimliği", en: "Children's dentistry", de: "Kinderzahnheilkunde", es: "Odontopediatría", fr: "Pédodontie", pl: "Stomatologia dziecięca" }],
  [/encias|gencives/, { tr: "Diş eti tedavisi", en: "Gum care", de: "Parodontologie", es: "Periodoncia", fr: "Parodontologie", pl: "Periodontologia" }],
  [/brushing/, { tr: "Kontrol", en: "Check-ups", de: "Vorsorge", es: "Revisiones", fr: "Bilans", pl: "Przeglądy" }],
];

/** What produceVideo ranks photos from: the full plan text, the topic line and the service. */
function inputOf(id: string): SuggestInput {
  const s = SAMPLES.find((x) => x.id === id)!;
  const hook = s.scenes.find((x) => x.kind === "hook")?.text ?? "";
  const title = id.split("/")[1].replace(/-/g, " ");
  const service = SERVICE.find(([re]) => re.test(id))?.[1][s.language] ?? "";
  return { plan: { title, scenes: s.scenes, voiceover: { text: s.narration } }, topic: `${title} . ${hook} . ${hook}`, service, language: s.language };
}

/** Twenty videos, four weeks of five: every published sample plan, plus two more topics from the reviewed set. */
const MONTH: string[][] = (() => {
  const ids = [...SAMPLES.filter((s) => s.status === "published").map((s) => s.id), "discarded/en-brushing-v1", "discarded/tr-children-compare"];
  return [0, 1, 2, 3].map((w) => ids.slice(w * 5, w * 5 + 5));
})();
const MONDAYS = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23"];

type MonthResult = { weeks: string[][][]; distinct: number };

/**
 * The month as produceWeek runs it: each week starts from the photos of the
 * clinic's last two weeks (read from history, the way the job will pass
 * them), each video avoids what came before it, and the seed is the clinic
 * and the week's Monday. `varied: false` is the old fixed list per topic.
 */
function runMonth(varied: boolean): MonthResult {
  const history: PastTopic[] = [];
  const weeks: string[][][] = [];
  const all = new Set<string>();
  MONTH.forEach((ids, w) => {
    const used = recentBackgrounds(history, MONDAYS[w]);
    const visual: WeekVisuals = { avoid: used, seed: `Sample Dental|${MONDAYS[w]}` };
    const week: string[][] = [];
    for (const id of ids) {
      const photos = varied ? startingBackgrounds(inputOf(id), 30, undefined, visual) : startingBackgrounds(inputOf(id), 30);
      rememberPhotos(used, photos);
      week.push(photos);
      photos.forEach((p) => all.add(p));
      history.push({ title: id, weekOf: MONDAYS[w], backgrounds: photos.map(backgroundSrc) } as PastTopic);
    }
    weeks.push(week);
  });
  return { weeks, distinct: all.size };
}

const maxPerWeek = (week: string[][]) => Math.max(...Object.values(week.flat().reduce<Record<string, number>>((m, p) => ((m[p] = (m[p] ?? 0) + 1), m), {})));
const identicalSets = (week: string[][]) => week.length - new Set(week.map((p) => [...p].sort().join(","))).size;

describe("background photos over a month", () => {
  const after = runMonth(true);
  const before = runMonth(false);

  it("a 4-week month of 20 videos uses at least 14 distinct photos", () => {
    expect(MONTH.flat()).toHaveLength(20);
    expect(after.distinct).toBeGreaterThanOrEqual(14);
    expect(after.distinct).toBeGreaterThan(before.distinct);
  });

  it("no photo appears more than twice in a week, and no two videos of a week share the same set", () => {
    after.weeks.forEach((week, w) => {
      expect(maxPerWeek(week), `week ${w + 1}`).toBeLessThanOrEqual(2);
      expect(identicalSets(week), `week ${w + 1}`).toBe(0);
    });
    // The fixed lists failed both: the same three toothbrush photos behind every brushing and gum video.
    expect(before.weeks.some((week) => maxPerWeek(week) > 2)).toBe(true);
    expect(before.weeks.some((week) => identicalSets(week) > 0)).toBe(true);
  });

  it("every video still opens on its own topic's photo and shows only dental photos", () => {
    const opener: Record<string, RegExp> = { implant: /^implants-/, beyazlatma: /^whitening-/, bleaching: /^whitening-/, wybielanie: /^whitening-/, aligner: /^aligners-/, plak: /^aligners-/, kinder: /^kids-/, brushing: /^hygiene-/ };
    MONTH.forEach((ids, w) =>
      ids.forEach((id, i) => {
        const photos = after.weeks[w][i];
        expect(photos, id).toHaveLength(3);
        for (const p of photos) expect(DENTAL_PHOTOS.has(p), `${id}: ${p}`).toBe(true);
        const want = Object.entries(opener).find(([k]) => id.includes(k))?.[1];
        if (want) expect(photos[0], id).toMatch(want);
      }),
    );
  });
});

/** startingBackgrounds(input, seconds) on origin/main (9d12158), before weeks were varied. */
const BEFORE: Record<string, [string[], string[]]> = {
  "tr/implant-asamalari": [["implants-03", "clinic-01", "implants-04"], ["implants-03", "clinic-01", "implants-04", "cleaning-02"]],
  "tr/beyazlatma-hassasiyet": [["whitening-01", "clinic-13", "cleaning-02"], ["whitening-01", "clinic-13", "cleaning-02", "hygiene-13"]],
  "tr/dis-tasi-temizligi": [["hygiene-01", "cleaning-02", "hygiene-04"], ["hygiene-01", "cleaning-02", "hygiene-04", "hygiene-05"]],
  "tr-preview/implant-implant-sonrasi-bakim": [["implants-03", "implants-04", "hygiene-01"], ["implants-03", "implants-04", "hygiene-01", "hygiene-04"]],
  "tr-preview/aligners-seffaf-plak-ve-icecekler": [["aligners-02", "aligners-03", "clinic-13"], ["aligners-02", "aligners-03", "clinic-13", "cleaning-02"]],
  "en/caring-for-clear-aligners": [["aligners-02", "aligners-03", "hygiene-01"], ["aligners-02", "aligners-03", "hygiene-01", "hygiene-04"]],
  "en/proper-brushing-technique": [["hygiene-08", "hygiene-01", "hygiene-04"], ["hygiene-08", "hygiene-01", "hygiene-04", "hygiene-05"]],
  "en/whitening-myths-debunked": [["whitening-01", "clinic-13", "cleaning-02"], ["whitening-01", "clinic-13", "cleaning-02", "hygiene-13"]],
  "de/aligner-verfaerbung": [["aligners-02", "aligners-03", "whitening-01"], ["aligners-02", "aligners-03", "whitening-01", "clinic-13"]],
  "de/bleaching-zahnschmelz": [["whitening-01", "clinic-13", "cleaning-02"], ["whitening-01", "clinic-13", "cleaning-02", "hygiene-13"]],
  "de/kinder-zahnarztangst": [["kids-02", "kids-01", "clinic-01"], ["kids-02", "kids-01", "clinic-01", "kids-18"]],
  "pl/wybielanie-przed-slubem": [["whitening-01", "clinic-01", "clinic-07"], ["whitening-01", "clinic-01", "clinic-07", "clinic-13"]],
  "es/limpieza-dental": [["hygiene-01", "cleaning-02", "hygiene-04"], ["hygiene-01", "cleaning-02", "hygiene-04", "hygiene-05"]],
  "es/primer-diente": [["hygiene-01", "kids-18", "hygiene-04"], ["hygiene-01", "kids-18", "hygiene-04", "kids-01"]],
  "es/cuidado-encias": [["hygiene-01", "hygiene-04", "hygiene-05"], ["hygiene-01", "hygiene-04", "hygiene-05", "hygiene-08"]],
  "fr/gencives-qui-saignent": [["hygiene-01", "hygiene-04", "hygiene-05"], ["hygiene-01", "hygiene-04", "hygiene-05", "hygiene-08"]],
  "fr/blanchiment-email": [["whitening-01", "clinic-13", "cleaning-02"], ["whitening-01", "clinic-13", "cleaning-02", "hygiene-13"]],
  "fr/detartrage": [["hygiene-01", "hygiene-04", "hygiene-05"], ["hygiene-01", "hygiene-04", "hygiene-05", "cleaning-02"]],
  "discarded/en-brushing-v1": [["hygiene-01", "hygiene-04", "hygiene-05"], ["hygiene-01", "hygiene-04", "hygiene-05", "hygiene-08"]],
  "discarded/tr-children-compare": [["kids-18", "kids-01", "kids-02"], ["kids-18", "kids-01", "kids-02", "hygiene-08"]],
};

describe("without a week's options nothing changes", () => {
  it("startingBackgrounds without opts gives exactly the lists it gave before", () => {
    for (const [id, [short, long]] of Object.entries(BEFORE)) {
      expect(startingBackgrounds(inputOf(id), 30), id).toEqual(short);
      expect(startingBackgrounds(inputOf(id), 60), id).toEqual(long);
    }
  });
});

describe("the avoid set is soft", () => {
  const implant = inputOf("tr/implant-asamalari");

  it("an implant video whose implant photos were all used lately still opens on one of them", () => {
    const avoid = new Set(["implants-04", "implants-03"]);
    const photos = startingBackgrounds(implant, 30, undefined, { avoid, seed: "s" });
    expect(photos).toHaveLength(3);
    // The one used longest ago (first in the set) comes back; the rest are fresh.
    expect(photos[0]).toBe("implants-04");
    expect(photos.slice(1).some((p) => avoid.has(p))).toBe(false);
  });

  it("with every dental photo avoided, a video still gets a full set, least recently used first", () => {
    const avoid = new Set(DENTAL_PHOTOS);
    const photos = startingBackgrounds(implant, 30, undefined, { avoid, seed: "s" });
    expect(photos).toHaveLength(3);
    expect(photos[0]).toMatch(/^implants-/);
    for (const p of photos) expect(DENTAL_PHOTOS.has(p)).toBe(true);
  });

  it("another topic's treatment photo never fills a gap (no implant screw behind a children's video)", () => {
    for (const id of MONTH.flat()) {
      const photos = startingBackgrounds(inputOf(id), 60, undefined, { avoid: new Set(DENTAL_PHOTOS), seed: id });
      if (!/implant/.test(id)) expect(photos, id).not.toContain("implants-04");
      if (!/aligner|plak/.test(id)) expect(photos.filter((p) => p.startsWith("aligners-")), id).toEqual([]);
    }
  });
});

describe("photo memory from the clinic's history", () => {
  const src = (id: string) => backgroundSrc(id);
  const week = "2026-11-23";

  it("reads the last two weeks' plan photos, oldest first, and ignores anything else", () => {
    const history = [
      { title: "a", weekOf: "2026-11-16", backgrounds: [src("hygiene-01"), src("clinic-13")] },
      { title: "b", weekOf: "2026-11-09", backgrounds: [src("implants-03"), "kids-18"] },
      { title: "old", weekOf: "2026-10-26", backgrounds: [src("whitening-01")] },
      { title: "undated", backgrounds: [src("aligners-02")] },
      { title: "junk", weekOf: "2026-11-16", backgrounds: ["https://evil.example/x.jpg", "/dentvideo/backgrounds/nope-99.jpg", 7, null, "../../etc/passwd"] },
      { title: "not a list", weekOf: "2026-11-16", backgrounds: src("hygiene-05") },
      { title: "no photos", weekOf: "2026-11-16" },
    ] as unknown as PastTopic[];
    expect([...recentBackgrounds(history, week)]).toEqual(["implants-03", "kids-18", "hygiene-01", "clinic-13"]);
    expect(recentBackgrounds(undefined, week).size).toBe(0);
    expect(recentBackgrounds([{ title: "plain history, as today" }], week).size).toBe(0);
    // A week string that is not a date avoids nothing rather than everything.
    expect(recentBackgrounds(history, "not a week").size).toBe(0);
  });

  it("a photo used again moves to the end, so the least recently used stays first", () => {
    const used = new Set(["a-01", "b-01", "c-01"]);
    rememberPhotos(used, [src("hygiene-01"), "a-01"]);
    expect([...used]).toEqual(["b-01", "c-01", "hygiene-01", "a-01"]);
  });

  it("the week being made is the one the videos are for, not the day the job runs", () => {
    // During the week: that Monday.
    expect(targetWeek(new Date("2026-11-23T06:00:00Z"))).toBe("2026-11-23");
    expect(targetWeek(new Date("2026-11-28T17:59:00Z"))).toBe("2026-11-23");
    // The batch starts Saturday 18:00 UTC for the Monday after (dentvid/schedule.ts).
    expect(targetWeek(new Date("2026-11-21T18:00:00Z"))).toBe("2026-11-23");
    expect(targetWeek(new Date("2026-11-22T23:59:00Z"))).toBe("2026-11-23");
    expect(targetWeek(new Date("2026-11-23T00:01:00Z"))).toBe("2026-11-23");
    // The job's own week wins when it is a real date.
    expect(targetWeek(new Date("2026-11-21T18:00:00Z"), "2026-11-30")).toBe("2026-11-30");
    expect(targetWeek(new Date("2026-11-21T18:00:00Z"), "next week")).toBe("2026-11-23");
  });
});

// ---------------------------------------------------------------------------
// produceWeek / produceVideo with a fake client

const US: ClinicProfile = {
  name: "Live Oak Family Dentistry",
  city: "Austin",
  country: "US",
  language: "en",
  services: ["Check-ups", "Hygienist cleaning", "Teeth whitening"],
  tone: "warm",
  address: "informal",
  handle: "liveoakdental",
};

const BRUSHING: Topic[] = [
  { title: "Brushing too hard", pillar: "myth", question: "Can I brush too hard?", hook: "Scrubbing hard with your toothbrush?", service: "Check-ups" },
  { title: "Brushing the gumline", pillar: "education", question: "Where should the toothbrush go?", hook: "Your toothbrush skips the gumline…", service: "Check-ups" },
  { title: "When to change your toothbrush", pillar: "education", question: "When should I change my toothbrush?", hook: "That frayed toothbrush in your cup…", service: "Check-ups" },
];

const CLOSINGS = ["Ask us about a softer brush at your next cleaning.", "Keep this for your next trip to the bathroom mirror.", "Send this to the friend who scrubs like they're sanding wood."];

function brushingPlan(i: number, theme: ScenePlan["theme"] = "midnight"): ScenePlan {
  return {
    title: BRUSHING[i].title,
    aspect: "9:16",
    theme,
    music: "none",
    scenes: [
      { kind: "hook", text: BRUSHING[i].hook, seconds: 3 },
      { kind: "statement", text: "Gentle circles with a soft toothbrush usually clean better than scrubbing.", seconds: 4 },
      { kind: "list", heading: "At the sink", items: ["Soft bristles", "Small circles", "Angle at the gumline"], seconds: 5 },
      { kind: "cta", text: CLOSINGS[i], seconds: 3 },
    ],
    voiceover: {
      text: "Pressing hard with your toothbrush feels thorough, but it usually is not. Gentle circles with soft bristles clean the surface and are kinder to your gums. Tilt the brush toward the gumline, keep the circles small, and let the bristles do the work.",
      voice: "nova",
    },
  } as ScenePlan;
}

/** Answers each agent by its system prompt, like dental.test.ts; records the planner's requests. */
function fakeClient(plans: ScenePlan[]) {
  const planner: string[] = [];
  const queue = [...plans];
  const client = {
    chat: {
      completions: {
        create: async (req: { messages: { role: string; content: string }[] }) => {
          const system = req.messages[0].content;
          const user = req.messages[1].content;
          let body: unknown;
          if (system.startsWith("You write scene plans")) {
            planner.push(user);
            body = queue.shift();
          } else if (system.startsWith("You review")) body = { verdict: "pass", issues: [] };
          else if (system.startsWith("You are a careful general dentist")) body = { verdict: "pass", issues: [] };
          else if (system.startsWith("You write the Instagram")) body = { caption: "Soft bristles and small circles clean well without wearing the gums.", hashtags: ["dentist", "austin", "brushing"] };
          return { choices: [{ message: { content: JSON.stringify(body) } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, planner };
}

const photoIds = (plan: { backgrounds?: string[] }) => (plan.backgrounds ?? []).map((p) => backgroundId(p)!);

describe("produceWeek: photos, look and closings across a real week", () => {
  const today = new Date("2026-11-23T06:00:00Z");
  // What a brushing video got every time before (the fixed list).
  const lastWeek = ["hygiene-08", "hygiene-01", "hygiene-04"];
  const history = [
    { title: "Last week's brushing video", weekOf: "2026-11-16", backgrounds: lastWeek.map(backgroundSrc) },
    { title: "A month ago", weekOf: "2026-10-19", backgrounds: ["hygiene-05", "hygiene-13", "hygiene-17"].map(backgroundSrc) },
  ] as unknown as PastTopic[];

  it("avoids last week's photos, varies the week, and makes every video in the house look", async () => {
    const { client, planner } = fakeClient([0, 1, 2].map((i) => brushingPlan(i, i === 1 ? "candy" : "midnight")));
    const rendered: ScenePlan[] = [];
    const week = await produceWeek({ client, render: async (p) => (rendered.push(p), "/nonexistent/video.mp4") }, US, { count: 3, topics: BRUSHING, history, today });
    expect(week.map((v) => v.status)).toEqual(["ready", "ready", "ready"]);
    const plans = week.map((v) => (v.status === "ready" ? v.plan : undefined)!);
    const photos = plans.map(photoIds);

    // History seeds the avoid set: nothing from last week while fresh toothbrush photos exist;
    // photos from a month ago are free again.
    for (const p of lastWeek) expect(photos[0]).not.toContain(p);
    expect(photos[0][0]).toMatch(/^hygiene-/);
    expect(photos[0]).toContain("hygiene-05");
    // Within the week: no identical sets, no photo more than twice.
    expect(identicalSets(photos)).toBe(0);
    expect(maxPerWeek(photos)).toBeLessThanOrEqual(2);

    // One look, whatever the planner returned ("midnight", "candy").
    expect(HOUSE_THEME).toBe("editorial");
    for (const p of [...plans, ...rendered]) expect(p.theme).toBe(HOUSE_THEME);
    for (const u of planner) expect(u).toContain(`theme must be "${HOUSE_THEME}"`);

    // Three videos, three closing moves, each told to the planner.
    const moves = planner.map((u) => u.match(/Close this video with this move: (.*)/)?.[1]);
    expect(moves.every(Boolean)).toBe(true);
    expect(new Set(moves).size).toBe(3);
  });

  it("without history, the week still rotates within itself", async () => {
    const { client } = fakeClient([0, 1, 2].map((i) => brushingPlan(i)));
    const week = await produceWeek({ client }, US, { count: 3, topics: BRUSHING, today });
    const photos = week.map((v) => (v.status === "ready" ? photoIds(v.plan) : []));
    expect(photos.every((p) => p.length === 3)).toBe(true);
    expect(identicalSets(photos)).toBe(0);
    expect(new Set(photos.flat()).size).toBeGreaterThanOrEqual(7);
  });
});

describe("produceVideo keeps its callers' parameters", () => {
  it("a change request (jobs.ts: deps, profile, topic, usedFootage, week, change) still works, in the house look, and keeps its closing", async () => {
    const { client, planner } = fakeClient([brushingPlan(0, "midnight")]);
    const pkg = await produceVideo({ client }, US, BRUSHING[0], new Set(), undefined, { note: "Shorter please" });
    expect(pkg.status).toBe("ready");
    if (pkg.status !== "ready") return;
    expect(pkg.plan.theme).toBe(HOUSE_THEME);
    // No week options: the topic's fixed photos, exactly as before.
    expect(photoIds(pkg.plan)).toEqual(
      startingBackgrounds({ plan: pkg.plan, topic: `${BRUSHING[0].title} . ${BRUSHING[0].question} . ${BRUSHING[0].hook}`, service: BRUSHING[0].service, language: "en" }, 15),
    );
    expect(planner[0]).not.toContain("Close this video with this move");
  });

  it("an eval call with four parameters gets the house look and a closing move", async () => {
    const { client, planner } = fakeClient([brushingPlan(0, "sunrise")]);
    const pkg = await produceVideo({ client }, US, BRUSHING[0], new Set(), { openers: [], closings: [] });
    expect(pkg.status === "ready" && pkg.plan.theme).toBe(HOUSE_THEME);
    expect(planner[0]).toMatch(/Close this video with this move: /);
  });
});

// ---------------------------------------------------------------------------
// Closing moves

const TR: ClinicProfile = { name: "Körfez Diş Polikliniği", city: "İzmir", country: "TR", language: "tr", services: ["Diş beyazlatma", "İmplant"], tone: "warm", address: "formal" };
const DE: ClinicProfile = { name: "Zahnpraxis am Viktualienmarkt", city: "München", country: "DE", language: "de", services: ["Aligner"], tone: "warm", address: "formal" };
const JP: ClinicProfile = { name: "さくら歯科", city: "東京", country: "JP", language: "ja", services: ["ホワイトニング"], tone: "calm", address: "formal" };
const TOPIC: Topic = { title: "t", pillar: "myth", question: "q?", hook: "h", service: "s" };

const moveIn = (brief: string) => brief.match(/Close this video with this move: (.*)/)?.[1];

/** The closing move each of five delivered videos of one week is told, as produceWeek briefs them. */
function weekOfMoves(profile: ClinicProfile, seed: string): string[] {
  const week: WeekVoice = { openers: [], closings: [] };
  return [0, 1, 2, 3, 4].map((index) => moveIn(scriptBrief(profile, TOPIC, [], week, undefined, { seed, index }))!);
}

const ASK_OR_ENGAGE = /ask us|ask the practice|pass it on|sending the video|saving the video|keep it for later|likes|comments|follows/i;

describe("closing moves", () => {
  it("five consecutive briefs of a week carry five different moves, in every market", () => {
    for (const profile of [US, TR, DE, JP, { ...US, country: "GB" }])
      for (const seed of ["a", `${profile.name}|2026-11-23`, `${profile.name}|2026-11-30`]) {
        const moves = weekOfMoves(profile, seed);
        expect(new Set(moves).size, `${profile.country} ${seed}`).toBe(5);
      }
  });

  it("a single video without an index (eval, cli) still moves on with the week's closings", () => {
    const week: WeekVoice = { openers: [], closings: [] };
    const first = moveIn(scriptBrief(US, TOPIC, [], week, undefined, { seed: "s" }));
    week.closings.push("Soft bristles are kinder to the gumline.");
    const second = moveIn(scriptBrief(US, TOPIC, [], week, undefined, { seed: "s" }));
    expect(first).toBe(closingMove("US", "en", "s", 0));
    expect(second).toBe(closingMove("US", "en", "s", 1));
  });

  it("a top-up run continues the week's moves after the videos already made", async () => {
    const today = new Date("2026-11-23T06:00:00Z");
    const seed = `${US.name}|2026-11-23`;
    const history = [
      { title: "Made this week", weekOf: "2026-11-23" },
      { title: "Also this week", weekOf: "2026-11-23" },
      { title: "Last week", weekOf: "2026-11-16" },
    ] as PastTopic[];
    const { client, planner } = fakeClient([brushingPlan(0), brushingPlan(1)]);
    await produceWeek({ client }, US, { count: 2, topics: BRUSHING.slice(0, 2), history, today });
    const moves = planner.map((u) => u.match(/Close this video with this move: (.*)/)?.[1]);
    expect(moves).toEqual([closingMove("US", "en", seed, 2), closingMove("US", "en", seed, 3)]);
    expect(moves).not.toContain(closingMove("US", "en", seed, 0));
  });

  it("the week's moves start at a different place from week to week", () => {
    const starts = new Set(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07"].map((d) => closingMove("US", "en", `${US.name}|${d}`, 0)));
    expect(starts.size).toBeGreaterThan(1);
  });

  it("Türkiye never gets an 'ask us', booking or share move, whatever the seed or position", () => {
    const tr = closingMoves("TR", "tr");
    expect(tr.length).toBeGreaterThanOrEqual(5);
    for (const m of tr) {
      expect(m).not.toMatch(ASK_OR_ENGAGE);
      expect(m).not.toMatch(/randevu|book/i);
    }
    for (const seed of ["a", "b", "Körfez Diş Polikliniği|2026-11-23"])
      for (const m of weekOfMoves(TR, seed)) expect(m).not.toMatch(ASK_OR_ENGAGE);
    // A Turkish-language clinic with no country set is treated the same way.
    expect(closingMoves(undefined, "tr")).toEqual(tr);
    // Elsewhere the invitation to ask the practice is one move among several.
    expect(closingMoves("US", "en").some((m) => /ask us/i.test(m))).toBe(true);
    expect(closingMoves("DE", "tr").some((m) => /ask us/i.test(m))).toBe(true);
  });

  it("no move asks for urgency, a price or a promise", () => {
    for (const country of ["US", "TR", "DE", "JP", "SA"])
      for (const m of closingMoves(country, "en")) {
        expect(m).not.toMatch(/\b(now|today|hurry|don't wait|discount|free|guarantee)\b/i);
        expect(m).not.toMatch(/!/);
      }
  });

  it("the CTA guide names several moves, not only the check-up one, and keeps every rule", () => {
    for (const [country, address] of [["US", "informal"], ["DE", "formal"], ["TR", "formal"]] as const) {
      const g = ctaGuide(country, address);
      expect(g).toMatch(/the one thing to remember/);
      expect(g).toMatch(/a small step at home/);
      expect(g).toMatch(/never the clinic's name/);
      expect(g).toMatch(/no urgency/);
    }
    expect(ctaGuide("US", "informal")).toMatch(/ask the practice/);
    expect(ctaGuide("TR")).not.toMatch(/ask the practice|passing the video on/);
    expect(ctaGuide("TR")).toMatch(/never ask viewers to like, comment on or share/);
  });
});

// ---------------------------------------------------------------------------
// Review round 1: moves follow the delivered videos, the week is the one being
// made, Türkiye's moves agree with its market rule, changes keep their look.

const TOPICS: Topic[] = [
  ...BRUSHING,
  { title: "Electric or manual toothbrush", pillar: "myth", question: "Is an electric toothbrush better?", hook: "Electric toothbrush or the old manual one?", service: "Check-ups" },
  { title: "Brushing before or after breakfast", pillar: "education", question: "Should I brush before breakfast?", hook: "Toothbrush before breakfast, or after?", service: "Check-ups" },
  { title: "How long to brush", pillar: "education", question: "How long should I brush?", hook: "Thirty seconds of brushing feels like enough…", service: "Check-ups" },
  { title: "Storing your toothbrush", pillar: "education", question: "Where should my toothbrush dry?", hook: "Where does your toothbrush dry overnight?", service: "Check-ups" },
  { title: "Brushing with braces", pillar: "education", question: "How do I brush with braces?", hook: "Braces turn brushing into a puzzle…", service: "Check-ups" },
];

/** Closing lines different enough that no one echoes another (scriptProblems sends an echo back). */
const CTA_POOL = [
  "A soft brush and light hands protect the gumline for years.",
  "Frayed bristles mean the brush has done its job.",
  "Two minutes, twice a day, small circles.",
  "Your own dentist can say which brush suits your gums.",
  "Bleeding while brushing is worth mentioning at a check-up.",
  "Electric or manual, the angle matters more than the motor.",
  "Rinse the brush and let it air dry upright.",
  "Children copy what they see you do at the sink.",
  "Flossing first lets fluoride reach between teeth.",
  "Spit, do not rinse, after brushing at night.",
  "Swap the head after a cold or flu.",
  "Night guards need a gentle clean every morning.",
  "Brackets hide plaque where bristles rarely reach.",
  "Pressure sensors beep when hands push too firmly.",
];

/**
 * A fake client for whole weeks: the planner answers each brief with a plan
 * for the brief's own topic and a closing line no other plan uses, and
 * records which move the brief told it. `failCaption` makes the caption
 * writer fail for one topic (a video turned down after its script passed).
 */
function weekClient(failCaption?: RegExp) {
  const briefs: { topic: string; move?: string; cta: string }[] = [];
  const client = {
    chat: {
      completions: {
        create: async (req: { messages: { role: string; content: string }[] }) => {
          const system = req.messages[0].content;
          const user = req.messages[1].content;
          let body: unknown;
          if (system.startsWith("You write scene plans")) {
            const title = user.match(/Topic: (.*?)\. It answers/)![1];
            const topic = TOPICS.find((t) => t.title === title)!;
            const cta = CTA_POOL[briefs.length];
            if (!cta) throw new Error("the fake planner ran out of closing lines");
            briefs.push({ topic: title, move: moveIn(user), cta });
            const plan = brushingPlan(0);
            body = { ...plan, title, scenes: plan.scenes.map((s) => (s.kind === "hook" ? { ...s, text: topic.hook } : s.kind === "cta" ? { ...s, text: cta } : s)) };
          } else if (system.startsWith("You review")) body = { verdict: "pass", issues: [] };
          else if (system.startsWith("You are a careful general dentist")) body = { verdict: "pass", issues: [] };
          else if (system.startsWith("You write the Instagram")) {
            if (failCaption?.test(user)) throw new Error("caption writer timed out");
            body = { caption: "Soft bristles and small circles clean well without wearing the gums.", hashtags: ["dentist", "brushing", "toothbrush"] };
          }
          return { choices: [{ message: { content: JSON.stringify(body) } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, briefs };
}

/** A render that fails on the given calls (1-based), like a render timeout. */
function flakyRender(failOn: number[]) {
  let calls = 0;
  return {
    render: async () => {
      calls++;
      if (failOn.includes(calls)) throw new Error("render timed out");
      return "/nonexistent/video.mp4";
    },
    calls: () => calls,
  };
}

/** The move each delivered video was briefed with, found through its closing line. */
function deliveredMoves(week: Awaited<ReturnType<typeof produceWeek>>, briefs: { move?: string; cta: string }[]): string[] {
  return week.flatMap((v) => {
    if (v.status !== "ready") return [];
    const cta = v.plan.scenes.find((s) => s.kind === "cta") as { text: string };
    return [briefs.find((b) => b.cta === cta.text)!.move!];
  });
}

const TR_EN: ClinicProfile = { ...US, name: "Körfez Dental", city: "İzmir", country: "TR" };
const MONDAY = new Date("2026-11-23T06:00:00Z");

describe("closing moves follow the videos actually delivered", () => {
  it("Türkiye (five moves): a render that fails once does not make the fifth video repeat the first one's move", async () => {
    const { client, briefs } = weekClient();
    const r = flakyRender([3]);
    const week = await produceWeek({ client, render: r.render }, TR_EN, { count: 5, topics: TOPICS, today: MONDAY });
    expect(week.filter((v) => v.status === "ready")).toHaveLength(5);
    // The failure path really ran: a sixth render, for a script that had passed.
    expect(r.calls()).toBe(6);
    expect(briefs.length).toBeGreaterThan(5);
    const moves = deliveredMoves(week, briefs);
    expect(new Set(moves).size).toBe(5);
    expect(new Set(moves)).toEqual(new Set(closingMoves("TR", "en")));
  });

  it("a topic turned down after its script passed hands its move to the next video (US: copy failures and a render failure)", async () => {
    const { client, briefs } = weekClient(/Electric or manual toothbrush/);
    const r = flakyRender([2]);
    const week = await produceWeek({ client, render: r.render }, US, { count: 5, topics: TOPICS, today: MONDAY });
    expect(week.filter((v) => v.status === "ready")).toHaveLength(5);
    const given = week.find((v) => v.status === "rejected");
    expect(given?.topic.title).toBe("Electric or manual toothbrush");
    const moves = deliveredMoves(week, briefs);
    expect(new Set(moves).size).toBe(5);
    // The move told to the topic that was given up went to the video after it.
    const lost = briefs.find((b) => b.topic === "Electric or manual toothbrush")!.move;
    const next = briefs.find((b) => b.topic === "Brushing before or after breakfast")!.move;
    expect(next).toBe(lost);
    const seed = `${US.name}|2026-11-23`;
    expect(moves).toEqual([0, 1, 2, 3, 4].map((i) => closingMove("US", "en", seed, i)));
  });

  it("Türkiye: a short week and its top-up together still carry five different moves", async () => {
    const main = weekClient(/Brushing the gumline/);
    const first = await produceWeek({ client: main.client, render: flakyRender([]).render }, TR_EN, { count: 5, topics: TOPICS.slice(0, 4), today: MONDAY });
    const made = first.filter((v) => v.status === "ready");
    expect(made).toHaveLength(3);
    // jobs.ts: the top-up's history holds this week's usable videos.
    const history = made.map((v) => ({ title: v.topic.title, weekOf: "2026-11-23" })) as PastTopic[];
    const top = weekClient();
    const more = await produceWeek({ client: top.client, render: flakyRender([]).render }, TR_EN, { count: 2, topics: TOPICS.slice(4, 6), history, today: new Date("2026-11-23T09:00:00Z") });
    const moves = [...deliveredMoves(first, main.briefs), ...deliveredMoves(more, top.briefs)];
    expect(moves).toHaveLength(5);
    expect(new Set(moves).size).toBe(5);
  });
});

describe("the week is the one being made, not the day the job runs", () => {
  const lastWeekPhotos = ["hygiene-08", "hygiene-01", "hygiene-04"];
  const threeWeeksAgo = ["hygiene-05", "hygiene-13", "hygiene-17"];
  // Last week's five delivered videos, and one from three weeks before the coming Monday.
  const history = [
    ...[1, 2, 3, 4, 5].map((i) => ({ title: `Last week ${i}`, weekOf: "2026-11-16", backgrounds: lastWeekPhotos.map(backgroundSrc) })),
    { title: "Three weeks ago", weekOf: "2026-11-02", backgrounds: threeWeeksAgo.map(backgroundSrc) },
  ] as unknown as PastTopic[];

  it("the Saturday batch keys the coming Monday: its seed, its two-week photo memory, and no videos made yet", async () => {
    const { client, briefs } = weekClient();
    const saturday = new Date("2026-11-21T18:30:00Z");
    const week = await produceWeek({ client, render: flakyRender([]).render }, US, { count: 2, topics: TOPICS, history, today: saturday });
    // Seed of the coming Monday, starting at the first move (last week's five rows are not "this week").
    expect(briefs.map((b) => b.move)).toEqual([0, 1].map((i) => closingMove("US", "en", `${US.name}|2026-11-23`, i)));
    const photos = week.map((v) => (v.status === "ready" ? photoIds(v.plan) : []));
    // Last week's photos are avoided; three weeks back is outside the two-week memory, so free again.
    for (const p of lastWeekPhotos) expect(photos[0]).not.toContain(p);
    expect(photos[0]).toContain("hygiene-05");
  });

  it("a job whose main run and top-up straddle Monday 00:00 UTC keeps one seed and continues its moves", async () => {
    // A clinic whose seeds for the two Mondays start on different moves, so a wrong week shows.
    const clinic = { ...US, name: "Maple Street Dental" };
    expect(closingMove("US", "en", `${clinic.name}|2026-11-16`, 0)).not.toBe(closingMove("US", "en", `${clinic.name}|2026-11-23`, 0));
    const main = weekClient();
    const first = await produceWeek({ client: main.client, render: flakyRender([]).render }, clinic, { count: 2, topics: TOPICS.slice(0, 2), today: new Date("2026-11-22T23:50:00Z") });
    const history = first.map((v) => ({ title: v.topic.title, weekOf: "2026-11-23" })) as PastTopic[];
    const top = weekClient();
    await produceWeek({ client: top.client, render: flakyRender([]).render }, clinic, { count: 2, topics: TOPICS.slice(2, 4), history, today: new Date("2026-11-23T00:10:00Z") });
    const seed = `${clinic.name}|2026-11-23`;
    expect([...main.briefs, ...top.briefs].map((b) => b.move)).toEqual([0, 1, 2, 3].map((i) => closingMove("US", "en", seed, i)));
  });

  it("the job's own week, when given, wins over the clock", async () => {
    const { client, briefs } = weekClient();
    await produceWeek({ client, render: flakyRender([]).render }, US, { count: 1, topics: TOPICS, today: MONDAY, weekOf: "2026-11-30" });
    expect(briefs[0].move).toBe(closingMove("US", "en", `${US.name}|2026-11-30`, 0));
  });
});

describe("Türkiye's moves agree with its market rule", () => {
  it("every Turkish move ends on the viewer's own dentist, never this clinic", () => {
    for (const moves of [closingMoves("TR", "tr"), closingMoves("TR", "en"), closingMoves(undefined, "tr")]) {
      expect(moves).toHaveLength(5);
      for (const m of moves) {
        expect(m).toMatch(/their own dentist \(hekiminiz\)/);
        expect(m).toMatch(/never (to )?this clinic|not this clinic/);
      }
    }
    expect(ctaGuide("TR")).toMatch(/always ends by pointing the viewer to their own dentist \(hekiminiz\), never to this clinic/);
  });

  it("each Turkish brief carries the market rule and a move that ends where it says", () => {
    const week: WeekVoice = { openers: [], closings: [] };
    for (const index of [0, 1, 2, 3, 4]) {
      const brief = scriptBrief(TR, TOPIC, [], week, undefined, { seed: `${TR.name}|2026-11-23`, index });
      expect(brief).toMatch(/close by pointing the viewer to their own dentist/);
      expect(moveIn(brief)).toMatch(/own dentist \(hekiminiz\)/);
    }
  });
});

describe("the takeaway move", () => {
  it("asks for a plain statement, never a recap opener, in every market", () => {
    for (const [country, language] of [["US", "en"], ["TR", "tr"], ["DE", "de"], ["JP", "ja"], ["FR", "fr"]] as const) {
      const m = closingMoves(country, language).find((x) => x.startsWith("the one thing to remember"))!;
      expect(m, country).toMatch(/as a plain statement, never opened with "in short", "Kısaca", "Özetle", "Kurz gesagt", "En bref" or another recap word/);
      expect(m, country).toMatch(/add no recap scene/);
      expect(m, country).not.toMatch(/the scenes above may not/);
    }
  });

  it("because a short closing opened with a recap word is sent back as a recap", () => {
    expect(repeatedScreen(["In short: brush gently."]).join()).toMatch(/recap/);
    expect(repeatedScreen(["Kısaca: nazik fırçalayın."]).join()).toMatch(/recap/);
    expect(repeatedScreen(["Gentle circles protect the gumline."])).toEqual([]);
  });
});

describe("a change request keeps the video's own look and photos", () => {
  const base = { scenes: brushingPlan(0).scenes, voiceover: brushingPlan(0).voiceover };
  const picked = ["kids-01", "clinic-07"].map(backgroundSrc);

  it("keeps the stored theme and photos when the caller passes them", async () => {
    const { client, planner } = fakeClient([brushingPlan(0, "midnight")]);
    const pkg = await produceVideo({ client }, US, BRUSHING[0], new Set(), undefined, { note: "Shorter please", base: { ...base, theme: "sunrise", backgrounds: picked } });
    expect(pkg.status).toBe("ready");
    if (pkg.status !== "ready") return;
    expect(pkg.plan.theme).toBe("sunrise");
    expect(pkg.plan.backgrounds).toEqual(picked);
    expect(planner[0]).toContain(`theme must be "sunrise"`);
  });

  it("anything else in the stored plan is ignored: the house look and the topic's photos", async () => {
    const { client } = fakeClient([brushingPlan(0, "midnight")]);
    const pkg = await produceVideo({ client }, US, BRUSHING[0], new Set(), undefined, {
      note: "Shorter please",
      base: { ...base, theme: "neon", backgrounds: ["https://evil.example/x.jpg", 7, "../../etc/passwd"] },
    });
    expect(pkg.status === "ready" && pkg.plan.theme).toBe(HOUSE_THEME);
    expect(pkg.status === "ready" && photoIds(pkg.plan)).toEqual(
      startingBackgrounds({ plan: (pkg as { plan: ScenePlan }).plan, topic: `${BRUSHING[0].title} . ${BRUSHING[0].question} . ${BRUSHING[0].hook}`, service: BRUSHING[0].service, language: "en" }, 15),
    );
  });

  it("reads the stored values defensively", () => {
    expect(keptLook(undefined)).toBeUndefined();
    expect(keptLook({ note: "x", base: { ...base, theme: "editorial" } })).toBe("editorial");
    expect(keptLook({ note: "x", base: { ...base, theme: 3 } })).toBeUndefined();
    expect(keptPhotos({ note: "x", base: { ...base, backgrounds: [...picked, picked[0], "x", null, "/dentvideo/backgrounds/nope-99.jpg"] } })).toEqual(picked);
    expect(keptPhotos({ note: "x", base: { ...base, backgrounds: "kids-01" } })).toEqual([]);
    const many = ["hygiene-01", "hygiene-04", "hygiene-05", "hygiene-08", "hygiene-13"].map(backgroundSrc);
    expect(keptPhotos({ note: "x", base: { ...base, backgrounds: many } })).toHaveLength(4);
  });
});
