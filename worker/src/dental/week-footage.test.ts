import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type OpenAI from "openai";
import type { ScenePlan } from "../remotion/scene-plan.js";
import { resolveFootageClips } from "../remotion/render-plan.js";
import { noteFootageIds, ROTATION_POOL, type FootageFields, type PexelsVideo } from "../remotion/stock.js";
import { FOOTAGE_MEMORY_WEEKS, footageSeed, produceVideo, produceWeek, recentFootage, rememberClips, weekNumber, type VideoPackage } from "./week.js";
import type { PastTopic } from "./memory.js";
import type { ClinicProfile } from "./profile.js";
import type { Topic } from "./strategist.js";

/**
 * Stock clips across weeks and clinics (week.ts → plan → render-plan.ts →
 * stock.ts): each week's plan carries the clinic's rotation, the render
 * reports the clip it showed, the stored plan keeps it, and the next weeks
 * avoid it. The render here is the real stock lookup of renderPlan
 * (resolveFootageClips + noteFootageIds) against a stubbed Pexels; no
 * network, no model.
 */

let workDir: string;
beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "week-footage-"));
});
afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

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

const TOPICS: Topic[] = [
  { title: "Brushing too hard", pillar: "myth", question: "Can I brush too hard?", hook: "Scrubbing hard with your toothbrush?", service: "Hygienist cleaning" },
  { title: "Brushing the gumline", pillar: "education", question: "Where should the toothbrush go?", hook: "Your toothbrush skips the gumline…", service: "Hygienist cleaning" },
  { title: "When to change your toothbrush", pillar: "education", question: "When should I change my toothbrush?", hook: "That frayed toothbrush in your cup…", service: "Hygienist cleaning" },
];

/** Closing lines different enough that no one echoes another (scriptProblems sends an echo back). */
const CTA_POOL = [
  "A soft brush and light hands protect the gumline for years.",
  "Frayed bristles mean the brush has done its job.",
  "Two minutes, twice a day, small circles.",
  "Your own dentist can say which brush suits your gums.",
];

/** A plan for the topic with one stock footage scene asking for `query`. */
function plan(topic: Topic, query: string, cta: string): ScenePlan {
  return {
    title: topic.title,
    aspect: "9:16",
    theme: "editorial",
    music: "none",
    scenes: [
      { kind: "hook", text: topic.hook, seconds: 3 },
      { kind: "footage", source: { type: "stock", query }, seconds: 4 },
      { kind: "statement", text: "Gentle circles with a soft toothbrush usually clean better than scrubbing.", seconds: 4 },
      { kind: "list", heading: "At the sink", items: ["Soft bristles", "Small circles", "Angle at the gumline"], seconds: 5 },
      { kind: "cta", text: cta, seconds: 3 },
    ],
    voiceover: {
      text: "Pressing hard with your toothbrush feels thorough, but it usually is not. Gentle circles with soft bristles clean the surface and are kinder to your gums. Tilt the brush toward the gumline, keep the circles small, and let the bristles do the work.",
      voice: "nova",
    },
  } as ScenePlan;
}

/** Answers each agent by its system prompt; the planner writes `queries[n]` into the n-th plan. */
function fakeClient(queries: string[]) {
  let n = 0;
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
            body = plan(topic, queries[n % queries.length], CTA_POOL[n % CTA_POOL.length]);
            n++;
          } else if (system.startsWith("You review")) body = { verdict: "pass", issues: [] };
          else if (system.startsWith("You are a careful general dentist")) body = { verdict: "pass", issues: [] };
          else if (system.startsWith("You write the Instagram")) body = { caption: "Soft bristles and small circles clean well without wearing the gums.", hashtags: ["dentist", "austin", "brushing"] };
          return { choices: [{ message: { content: JSON.stringify(body) } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return client;
}

/** Ten fitting clips, the same for every query, in Pexels' own order. */
const TEN: PexelsVideo[] = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110].map((id) => ({
  id,
  width: 1080,
  height: 1920,
  duration: 12,
  video_files: [{ link: `https://x/${id}.mp4`, width: 1080, height: 1920, file_type: "video/mp4", quality: "hd" }],
}));
const pexels = (async (url: string) =>
  String(url).includes("api.pexels.com")
    ? new Response(JSON.stringify({ videos: TEN }), { status: 200 })
    : new Response(new Uint8Array([1, 2, 3]), { status: 200 })) as unknown as typeof fetch;

/**
 * The job's render callback, as far as stock clips go: renderPlan resolves the
 * footage from the plan it is handed and notes the clips by output file, and
 * the callback returns that file's path only (dentvid/jobs.ts).
 */
function stockRender() {
  const seen: (ScenePlan & FootageFields)[] = [];
  let n = 0;
  const render = async (p: ScenePlan) => {
    seen.push(p as ScenePlan & FootageFields);
    const dir = path.join(workDir, `v-${n++}`);
    await fs.mkdir(dir, { recursive: true });
    const { clipIds } = await resolveFootageClips(p, { workDir: dir, userAssets: [], pexelsApiKey: "k", fetchImpl: pexels });
    const outputPath = path.join(dir, "video.mp4");
    noteFootageIds(outputPath, clipIds);
    return outputPath;
  };
  return { render, seen };
}

const ready = (week: VideoPackage[]) => week.filter((v): v is Extract<VideoPackage, { status: "ready" }> => v.status === "ready");

/** Eight Mondays in a row, and a Saturday-evening run before each (the weekly batch). */
const MONDAYS = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21"];

/**
 * One clinic's eight weeks, one video a week asking for the same shot.
 * `withHistory`: each week's history carries the stored plans' clip ids, the
 * way the job will pass them once it reads plan->footageIds.
 */
async function eightWeeks(withHistory: boolean, profile = US) {
  const history: PastTopic[] = [];
  const shown: number[] = [];
  const rendered: (ScenePlan & FootageFields)[] = [];
  const stored: VideoPackage[] = [];
  for (const monday of MONDAYS) {
    const r = stockRender();
    const week = await produceWeek({ client: fakeClient(["toothbrush close up"]), render: r.render }, profile, {
      count: 1,
      topics: TOPICS.slice(0, 1),
      history: withHistory ? history : [],
      weekOf: monday,
    });
    const [video] = ready(week);
    expect(video, monday).toBeDefined();
    stored.push(video);
    rendered.push(...r.seen);
    shown.push(...(video.plan.footageIds ?? []));
    history.push({ title: `${video.topic.title} ${monday}`, weekOf: monday, footageIds: video.plan.footageIds } as PastTopic);
  }
  return { shown, rendered, stored };
}

describe("the rotation's inputs", () => {
  it("the turn is one more every week, and stays put within a week", () => {
    const turns = MONDAYS.map(weekNumber);
    for (let i = 1; i < turns.length; i++) expect(turns[i] - turns[i - 1]).toBe(1);
    expect(weekNumber("1970-01-05")).toBe(0);
    expect(weekNumber("not a date")).toBe(0);
  });

  it("the seed is the clinic, not the week", () => {
    expect(footageSeed(US)).toBe("Live Oak Family Dentistry|Austin|US");
    expect(footageSeed({ name: "Körfez Dental", city: undefined, country: "TR" })).toBe("Körfez Dental||TR");
  });

  it("the clips of the last eight weeks and of this week are avoided, oldest first; older ones and garbage are not", () => {
    const history = [
      { title: "nine weeks ago", weekOf: "2026-09-21", footageIds: [1] },
      { title: "eight weeks ago", weekOf: "2026-09-28", footageIds: [2, 3] },
      { title: "last week", weekOf: "2026-11-16", footageIds: [4, "5", -6] },
      { title: "earlier this week (a top-up)", weekOf: "2026-11-23", footageIds: [2] },
      { title: "no ids", weekOf: "2026-11-09" },
      { title: "no date", footageIds: [7] },
      { title: "ids not a list", weekOf: "2026-11-09", footageIds: "8" },
    ] as unknown as PastTopic[];
    expect([...recentFootage(history, "2026-11-23")]).toEqual([3, 4, 2]);
    expect(FOOTAGE_MEMORY_WEEKS).toBe(8);
    expect(recentFootage(undefined, "2026-11-23").size).toBe(0);
    const used = new Set([1, 2, 3]);
    rememberClips(used, [1]);
    expect([...used]).toEqual([2, 3, 1]);
  });
});

describe("one clinic over eight weeks, the same shot asked for every week", () => {
  it("with the stored clip ids in its history: a different clip every week, never one from the last eight weeks", async () => {
    const { shown, rendered, stored } = await eightWeeks(true);
    expect(shown).toHaveLength(8);
    expect(new Set(shown).size).toBe(8);
    // Each week's render was told to avoid exactly what the weeks before it showed.
    rendered.forEach((p, w) => expect(p.footageAvoid, MONDAYS[w]).toEqual(shown.slice(0, w)));
    // The render is told the clinic's rotation; the stored plan only keeps what it showed.
    for (const [w, p] of rendered.entries()) {
      expect(p.footageSeed).toBe(footageSeed(US));
      expect(p.footageTurn).toBe(weekNumber(MONDAYS[w]));
    }
    for (const v of ready(stored)) {
      const keys = Object.keys(v.plan);
      expect(keys).toContain("footageIds");
      for (const k of ["footageSeed", "footageTurn", "footageAvoid"]) expect(keys).not.toContain(k);
    }
  });

  it("with no clip ids in its history (the job today): the turn alone, so never the same clip two weeks running and none again within five weeks", async () => {
    const { shown, rendered } = await eightWeeks(false);
    expect(shown).toHaveLength(8);
    for (let i = 0; i < shown.length; i++)
      for (let j = i + 1; j < Math.min(shown.length, i + ROTATION_POOL); j++) expect(shown[j], `${MONDAYS[i]} and ${MONDAYS[j]}`).not.toBe(shown[i]);
    for (const p of rendered) expect(p.footageAvoid).toEqual([]);
  });
});

describe("within one week", () => {
  it("two videos never show the same clip, even when their different queries return the same clips", async () => {
    // A rotation where both queries start at the same clip this week would show it twice without the week's avoid list.
    for (const monday of MONDAYS) {
      const r = stockRender();
      const week = await produceWeek({ client: fakeClient(["toothbrush close up", "toothbrush and toothpaste", "dental floss close up"]), render: r.render }, US, {
        count: 3,
        topics: TOPICS,
        weekOf: monday,
      });
      const ids = ready(week).map((v) => v.plan.footageIds?.[0]);
      expect(ids.every((id) => typeof id === "number"), monday).toBe(true);
      expect(new Set(ids).size, monday).toBe(3);
      // The later videos were told what the earlier ones showed.
      expect(r.seen[2].footageAvoid).toEqual(ids.slice(0, 2));
    }
  });
});

describe("two clinics in the same week", () => {
  it("asking for the same shot, usually get different clips", async () => {
    const clinics = Array.from({ length: 12 }, (_, i) => ({ ...US, name: `Family Dental ${i + 1}`, city: ["Austin", "Leeds", "İzmir"][i % 3] }));
    const picks: number[] = [];
    for (const clinic of clinics) {
      const week = await produceWeek({ client: fakeClient(["toothbrush close up"]), render: stockRender().render }, clinic, { count: 1, topics: TOPICS.slice(0, 1), weekOf: "2026-11-23" });
      picks.push(ready(week)[0].plan.footageIds![0]);
    }
    let differ = 0;
    for (let i = 1; i < picks.length; i++) if (picks[i] !== picks[i - 1]) differ++;
    expect(differ).toBeGreaterThanOrEqual(7);
    expect(new Set(picks).size).toBeGreaterThanOrEqual(3);
  });
});

describe("outside a week (a change request, the eval, the cli)", () => {
  it("the render gets no rotation and shows the best clip, exactly as before; the stored plan still records it", async () => {
    const r = stockRender();
    const pkg = await produceVideo({ client: fakeClient(["toothbrush close up"]), render: r.render }, US, TOPICS[0]);
    expect(pkg.status).toBe("ready");
    for (const k of ["footageSeed", "footageTurn", "footageAvoid"]) expect(Object.keys(r.seen[0])).not.toContain(k);
    expect(pkg.status === "ready" && pkg.plan.footageIds).toEqual([101]);
  });

  it("a render that shows no clip (no Pexels key, nothing found) leaves the stored plan as it was", async () => {
    const pkg = await produceVideo({ client: fakeClient(["toothbrush close up"]), render: async () => "/nonexistent/video.mp4" }, US, TOPICS[0]);
    expect(pkg.status).toBe("ready");
    expect(pkg.status === "ready" && "footageIds" in pkg.plan).toBe(false);
  });
});
