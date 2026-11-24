import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ScenePlan } from "../remotion/scene-plan.js";
import type { PexelsVideo } from "../remotion/stock.js";
import { memoryLiman } from "./memory-liman.js";

/**
 * A restyle (new photos, same video: jobs.ts runDentvidRestyle) keeps the
 * stock clip the dentist already saw. The job re-parses the stored plan,
 * which drops the clips it recorded (remotion/stock.ts withShownClips); a
 * render without them shows the top clip instead of the rotated one.
 * Stubbed: the narration, the database, Pexels and the video file. The stock
 * lookup is renderPlan's own. No network.
 */

vi.mock("openai", () => ({ default: class {} }));
const prepareNarration = vi.fn();
vi.mock("../dental/narration-audio.js", () => ({ prepareNarration }));
vi.mock("./notify.js", () => ({ notifyReady: vi.fn(async () => true), sendReadyAtCivilHour: vi.fn() }));
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
const renderPlan = vi.fn();
vi.mock("../remotion/render-plan.js", async (orig) => ({ ...(await orig<typeof import("../remotion/render-plan.js")>()), renderPlan }));

const liman = memoryLiman();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => liman }));
process.env.DENTVID_SUPABASE_URL = "http://liman.test";
process.env.DENTVID_SERVICE_ROLE_KEY = "x";

const { configureSpend, runDentvidRestyle } = await import("./jobs.js");
const { MemoryGuardStore, SpendGuard, guardConfig } = await import("./spend-guard.js");
const { resolveFootageClips } = await import("../remotion/render-plan.js");
const { chooseVideo, shownClipIds, withShownClips } = await import("../remotion/stock.js");
const { parseScenePlan } = await import("../remotion/scene-plan.js");

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";
const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const PROFILE = { name: "Live Oak Family Dentistry", city: "Austin", country: "US", language: "en", services: ["Hygienist cleaning"] };
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "restyle-footage-"));

const TEN: PexelsVideo[] = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110].map((id) => ({
  id,
  width: 1080,
  height: 1920,
  duration: 30,
  video_files: [{ link: `https://x/${id}.mp4`, width: 1080, height: 1920, file_type: "video/mp4", quality: "hd" }],
}));
const pexels = (async (url: string) =>
  String(url).includes("api.pexels.com")
    ? new Response(JSON.stringify({ videos: TEN }), { status: 200 })
    : new Response(new Uint8Array([1, 2, 3]), { status: 200 })) as unknown as typeof fetch;

const base = () =>
  parseScenePlan({
    title: "Brushing too hard",
    aspect: "9:16",
    theme: "editorial",
    music: "none",
    scenes: [
      { kind: "hook", text: "Scrubbing hard with your toothbrush?", seconds: 4 },
      { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, caption: "Small circles", seconds: 4 },
      { kind: "statement", text: "Gentle circles clean better than scrubbing.", seconds: 4 },
      { kind: "cta", text: "Your own dentist can say which brush suits your gums.", seconds: 4 },
    ],
    voiceover: { text: "Pressing hard feels thorough. Gentle circles with soft bristles clean well and are kinder to your gums.", voice: "nova" },
  });
/** A clip a week's rotation picked, not the top one. */
const rotated = chooseVideo(TEN, "toothbrush close up", 4, true, { rotation: { seed: "clinic:c-1", turn: 2917, avoid: new Set([101]) }, targetWidth: 1080 })!.id;

let shown: number[][];
function seed(plan: unknown) {
  liman.tables.clear();
  liman.files.clear();
  liman.tables.set("dentvid_clinics", [{ id: CLINIC, owner_id: OWNER, plan: "active", plan_tier: "starter", profile: PROFILE, logo_path: null }]);
  liman.tables.set("dentvid_items", [{ id: "item-a", clinic_id: CLINIC, owner_id: OWNER, kind: "generated", status: "ready", findings: null, plan, video_path: `${OWNER}/old.mp4`, thumb_path: null, restyle_status: "queued" }]);
  liman.files.set(`${OWNER}/old.mp4`, { size: 1, created_at: "" });
}

beforeEach(() => {
  vi.clearAllMocks();
  shown = [];
  configureSpend({ guard: new SpendGuard(new MemoryGuardStore(), () => guardConfig({})), alert: async () => true });
  prepareNarration.mockImplementation(async (plan: unknown) => ({ plan, voiceoverPath: "/tmp/v.wav", voiceSeconds: 16, pauses: [] }));
  renderPlan.mockImplementation(async (args: { plan: ScenePlan; workDir: string; outputPath: string }) => {
    const { clipIds } = await resolveFootageClips(args.plan, { workDir: args.workDir, userAssets: [], pexelsApiKey: "k", fetchImpl: pexels });
    shown.push(clipIds);
    const out = path.join(DIR, `${Math.random()}.mp4`);
    fs.writeFileSync(out, "");
    return { outputPath: out, footageIds: clipIds };
  });
});

describe("a restyle keeps the stock clip the dentist saw", () => {
  it("from the clips the stored plan recorded", async () => {
    expect(rotated).not.toBe(101);
    const stored = JSON.parse(JSON.stringify({ ...withShownClips(base(), [{ query: "toothbrush close up", id: rotated }]), backgrounds: ["/dentvideo/backgrounds/cleaning-02.jpg"] }));
    seed(stored);
    expect(await runDentvidRestyle({ itemId: "item-a" })).toEqual({ ok: true });
    expect(shown).toEqual([[rotated]]);
    const row = liman.rows("dentvid_items").find((r) => r.id === "item-a")!;
    expect(row.video_path).not.toBe(`${OWNER}/old.mp4`);
    // The stored plan still says what the new file shows.
    expect(shownClipIds(row.plan)).toEqual([rotated]);
  });

  it("a video stored before the clips were recorded gets the top clip, as it always did", async () => {
    seed(JSON.parse(JSON.stringify(base())));
    expect(await runDentvidRestyle({ itemId: "item-a" })).toEqual({ ok: true });
    expect(shown).toEqual([[101]]);
  });
});
