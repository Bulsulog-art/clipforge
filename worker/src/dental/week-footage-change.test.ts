import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScenePlan } from "../remotion/scene-plan.js";
import type { PexelsVideo } from "../remotion/stock.js";

/**
 * A clinic's "Ask for a change" on a week video, through the job itself
 * (dentvid/jobs.ts runDentvidChange) and the real writer, reviewers and stock
 * lookup (dental/week.ts produceVideo, remotion/render-plan.ts
 * resolveFootageClips). The job hands produceVideo the stored scenes and
 * narration only, so the clip the dentist saw has to come back from the
 * stored scenes. Stubbed: the model (answers by system prompt), the
 * narration, the database, Pexels and the video file. No network.
 */

const ai = vi.hoisted(() => {
  const TOPIC = { title: "Brushing too hard", pillar: "myth", question: "Can I brush too hard?", hook: "Scrubbing hard with your toothbrush?", service: "Hygienist cleaning" };
  const prompts: string[] = [];
  /** A plan for the topic with one stock footage scene, as the planner writes it. */
  const plan = (cta: string) => ({
    title: TOPIC.title,
    aspect: "9:16",
    theme: "editorial",
    music: "none",
    scenes: [
      { kind: "hook", text: TOPIC.hook, seconds: 3 },
      { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, seconds: 4 },
      { kind: "statement", text: "Gentle circles with a soft toothbrush usually clean better than scrubbing.", seconds: 4 },
      { kind: "list", heading: "At the sink", items: ["Soft bristles", "Small circles", "Angle at the gumline"], seconds: 5 },
      { kind: "cta", text: cta, seconds: 3 },
    ],
    voiceover: {
      text: "Pressing hard with your toothbrush feels thorough, but it usually is not. Gentle circles with soft bristles clean the surface and are kinder to your gums. Tilt the brush toward the gumline, keep the circles small, and let the bristles do the work.",
      voice: "nova",
    },
  });
  let ctas = 0;
  const CTA_POOL = ["A soft brush and light hands protect the gumline for years.", "Frayed bristles mean the brush has done its job.", "Two minutes, twice a day, small circles."];
  const create = async (req: { messages: { role: string; content: string }[] }) => {
    const system = req.messages[0].content;
    prompts.push(...req.messages.map((m) => m.content));
    let body: unknown;
    if (system.startsWith("You write scene plans")) body = plan(CTA_POOL[ctas++ % CTA_POOL.length]);
    else if (system.startsWith("You review")) body = { verdict: "pass", issues: [] };
    else if (system.startsWith("You are a careful general dentist")) body = { verdict: "pass", issues: [] };
    else if (system.startsWith("You write the Instagram")) body = { caption: "Soft bristles and small circles clean well without wearing the gums.", hashtags: ["dentist", "austin", "brushing"] };
    return { choices: [{ message: { content: JSON.stringify(body) } }] };
  };
  return { TOPIC, prompts, create };
});

vi.mock("openai", () => ({
  default: class {
    chat = { completions: { create: ai.create } };
  },
}));
const prepareNarration = vi.fn();
vi.mock("../dental/narration-audio.js", () => ({ prepareNarration }));
vi.mock("../dental/questions.js", () => ({ patientSearches: vi.fn(async () => []) }));
vi.mock("../dentvid/notify.js", () => ({ notifyReady: vi.fn(async () => true), sendReadyAtCivilHour: vi.fn() }));
vi.mock("fluent-ffmpeg", () => {
  const chain: Record<string, unknown> = {};
  for (const m of ["seekInput", "frames", "size"]) chain[m] = () => chain;
  chain.on = (ev: string, cb: (e?: Error) => void) => {
    if (ev === "error") setTimeout(() => cb(new Error("no ffmpeg")), 0);
    return chain;
  };
  chain.save = () => chain;
  return { default: Object.assign(() => chain, { ffprobe: (_f: string, cb: (e: Error) => void) => cb(new Error("no ffprobe")) }) };
});
/** The render, as far as stock clips go: renderPlan's own lookup and note, then an empty file. */
const renderPlan = vi.fn();
vi.mock("../remotion/render-plan.js", async (orig) => ({ ...(await orig<typeof import("../remotion/render-plan.js")>()), renderPlan }));

const { memoryLiman } = await import("../dentvid/memory-liman.js");
const liman = memoryLiman();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => liman }));
process.env.DENTVID_SUPABASE_URL = "http://liman.test";
process.env.DENTVID_SERVICE_ROLE_KEY = "x";

const { configureSpend, runDentvidChange } = await import("../dentvid/jobs.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("../dentvid/spend-guard.js");
const { configureOps } = await import("../dentvid/ops.js");
const { MemoryOpsStore, _resetLocalOnce } = await import("../dentvid/ops-alert.js");
const { resolveFootageClips } = await import("../remotion/render-plan.js");
const { noteFootage, shownClipIds } = await import("../remotion/stock.js");
const { produceWeek } = await import("./week.js");
const OpenAI = (await import("openai")).default;

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const PROFILE = { name: "Live Oak Family Dentistry", city: "Austin", country: "US", language: "en", services: ["Hygienist cleaning"], tone: "warm", address: "informal", handle: "liveoakdental" };
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "week-footage-change-"));

/** Ten fitting clips for every query, in Pexels' own order: a plain render picks 101. */
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

/** What every render was handed, and the clips it showed. */
let renders: { plan: ScenePlan & { footageIds?: number[] }; shown: number[] }[];

async function render(args: { plan: ScenePlan; workDir: string; outputPath: string }) {
  const { clipIds, shown } = await resolveFootageClips(args.plan, { workDir: args.workDir, userAssets: [], pexelsApiKey: "k", fetchImpl: pexels });
  noteFootage(args.outputPath, shown);
  renders.push({ plan: args.plan, shown: clipIds });
  fs.mkdirSync(path.dirname(args.outputPath), { recursive: true });
  fs.writeFileSync(args.outputPath, "");
  return { outputPath: args.outputPath, footageIds: clipIds };
}

/** A week video whose rotated clip is not the top one, as the database stores it. */
async function rotatedWeekPlan(): Promise<Record<string, unknown>> {
  for (const monday of ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21"]) {
    const [video] = await produceWeek(
      {
        client: new OpenAI(),
        render: async (plan) => {
          const dir = fs.mkdtempSync(path.join(DIR, "w-"));
          return (await render({ plan, workDir: dir, outputPath: path.join(dir, "video.mp4") })).outputPath;
        },
      },
      PROFILE as never,
      { count: 1, topics: [ai.TOPIC as never], weekOf: monday, clinicId: CLINIC },
    );
    if (video.status === "ready" && video.plan.footageIds?.[0] !== 101) return JSON.parse(JSON.stringify(video.plan));
  }
  throw new Error("no week picked a clip other than the top one");
}

function seed(plan: Record<string, unknown>) {
  liman.tables.clear();
  liman.files.clear();
  liman.tables.set("dentvid_clinics", [{ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "starter", profile: PROFILE, logo_path: null }]);
  liman.tables.set("dentvid_items", [
    { id: "item-a", clinic_id: CLINIC, owner_id: OWNER, kind: "generated", status: "ready", approval: "approved", topic: ai.TOPIC, plan, video_path: `${OWNER}/old.mp4`, thumb_path: null },
  ]);
  liman.files.set(`${OWNER}/old.mp4`, { size: 1, created_at: "" });
  liman.tables.set("dentvid_change_requests", [{ id: "r1", clinic_id: CLINIC, owner_id: OWNER, item_id: "item-a", note: "Please say it a little shorter.", status: "queued" }]);
}
const item = () => liman.rows("dentvid_items").find((r) => r.id === "item-a")!;

beforeEach(() => {
  vi.clearAllMocks();
  _resetLocalOnce();
  renders = [];
  ai.prompts.length = 0;
  configureOps({ store: new MemoryOpsStore(), send: async () => true, env: {} });
  configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({})), alert: async () => true });
  prepareNarration.mockImplementation(async (plan: unknown) => ({ plan, voiceoverPath: "/tmp/v.wav", voiceSeconds: 19, pauses: [{ start: 2.9, end: 3.3 }] }));
  renderPlan.mockImplementation(render);
});

describe("a change request through the job keeps the stock clip the dentist saw", () => {
  it("from the stored scenes, although the job passes no footageIds", async () => {
    const stored = await rotatedWeekPlan();
    const saw = shownClipIds(stored);
    expect(saw).toHaveLength(1);
    expect(saw[0]).not.toBe(101);
    seed(stored);
    renders = [];
    ai.prompts.length = 0;

    expect(await runDentvidChange({ requestId: "r1" })).toEqual({ status: "done" });
    // The changed video's render was told to keep the clip, and showed it.
    expect(renders).toHaveLength(1);
    expect(renders[0].plan.footageIds).toEqual(saw);
    expect(renders[0].shown).toEqual(saw);
    // The row now holds the changed video, which records the same clip for the next change.
    const row = item();
    expect(row.video_path).not.toBe(`${OWNER}/old.mp4`);
    expect(shownClipIds(row.plan)).toEqual(saw);
    expect((row.plan as { footageIds?: number[] }).footageIds).toEqual(saw);
    // The writer was shown the previous version, without the ids.
    expect(ai.prompts.some((p) => p.includes("The previous version, to start from"))).toBe(true);
    expect(ai.prompts.join("\n")).not.toContain("clipId");
  });

  it("a video stored before the clips were recorded gets the top clip, as it always did", async () => {
    const stored = await rotatedWeekPlan();
    // What a row made before this change holds: no ids anywhere.
    const legacy = JSON.parse(JSON.stringify(stored, (k, v) => (k === "clipId" || k === "footageIds" ? undefined : v)));
    expect(shownClipIds(legacy)).toEqual([]);
    seed(legacy);
    renders = [];

    expect(await runDentvidChange({ requestId: "r1" })).toEqual({ status: "done" });
    expect("footageIds" in renders[0].plan).toBe(false);
    expect(renders[0].shown).toEqual([101]);
    expect(shownClipIds(item().plan)).toEqual([101]);
  });
});
