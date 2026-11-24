import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ROTATION_POOL,
  chooseVideo,
  clipIds,
  footageChoice,
  noteFootageIds,
  resolveStockClip,
  scoreVideo,
  takeFootageIds,
  withoutFootageFields,
  type ClipRotation,
  type PexelsVideo,
} from "./stock.js";
import { resolveFootage, resolveFootageClips } from "./render-plan.js";
import { parseScenePlan, type ScenePlan } from "./scene-plan.js";

/**
 * Stock clip rotation: the same query must not show a clinic the same clip
 * week after week, nor every clinic the same clip in the same week. No
 * network: every Pexels answer here is a stub.
 */

let workDir: string;
beforeEach(async () => {
  workDir = await fs.mkdtemp(path.join(os.tmpdir(), "stock-rotation-"));
});
afterEach(async () => {
  await fs.rm(workDir, { recursive: true, force: true });
});

/** A portrait clip long enough for any scene here, with one usable mp4 named after its id. */
const clip = (id: number, over: Partial<PexelsVideo> = {}): PexelsVideo => ({
  id,
  width: 1080,
  height: 1920,
  duration: 12,
  video_files: [{ link: `https://x/${id}.mp4`, width: 1080, height: 1920, file_type: "video/mp4", quality: "hd" }],
  ...over,
});

/** What Pexels answers for "toothbrush close up": ten fitting clips, in its own order. */
const TEN = [101, 102, 103, 104, 105, 106, 107, 108, 109, 110].map((id) => clip(id));

/** A stub Pexels: the search answers `videos`, a download answers a few bytes; every URL is recorded. */
function pexels(videos: PexelsVideo[]) {
  const seen: string[] = [];
  const fetchImpl = (async (url: string) => {
    seen.push(String(url));
    if (String(url).includes("api.pexels.com")) return new Response(JSON.stringify({ videos }), { status: 200 });
    return new Response(new Uint8Array([0, 1, 2]), { status: 200 });
  }) as unknown as typeof fetch;
  return { fetchImpl, seen };
}

const opts = (fetchImpl: typeof fetch) => ({ apiKey: "test-key", workDir, aspect: "9:16" as const, targetWidth: 1080, fetchImpl });

/** The Mondays of eight weeks in a row, and their turn (week.ts weekNumber: whole weeks since 1970-01-05). */
const MONDAYS = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30", "2026-12-07", "2026-12-14", "2026-12-21"];
const turnOf = (monday: string) => Math.floor((Date.parse(`${monday}T00:00:00Z`) - Date.UTC(1970, 0, 5)) / (7 * 86_400_000));

/** The rule before rotation existed, written out: the best score, ties in Pexels' order. */
const before = (videos: PexelsVideo[], seconds: number, portrait: boolean) =>
  [...videos].sort((a, b) => scoreVideo(b, seconds, portrait) - scoreVideo(a, seconds, portrait))[0];

/** A small deterministic generator, so the "many random result lists" below are the same on every run. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

describe("without a rotation nothing changes", () => {
  it("chooseVideo picks exactly the clip the old rule picked, over many result lists with ties", () => {
    const rnd = lcg(7);
    for (let n = 0; n < 300; n++) {
      const videos = Array.from({ length: 1 + Math.floor(rnd() * 10) }, (_, i) => {
        const portrait = rnd() < 0.7;
        return clip(1000 + i, { width: portrait ? 1080 : 1920, height: portrait ? 1920 : 1080, duration: [2, 3, 4, 6, 12][Math.floor(rnd() * 5)] });
      });
      const seconds = 3 + Math.floor(rnd() * 4);
      const portrait = rnd() < 0.8;
      expect(chooseVideo(videos, "toothbrush close up", seconds, portrait)).toBe(before(videos, seconds, portrait));
      expect(chooseVideo(videos, "toothbrush close up", seconds, portrait, {})).toBe(before(videos, seconds, portrait));
    }
  });

  it("resolveStockClip asks Pexels the same question and downloads the same clip as before", async () => {
    // A shorter clip first: the old rule skipped it for the long one, and so does the new one.
    const videos = [clip(201, { duration: 2 }), clip(202), clip(203)];
    const { fetchImpl, seen } = pexels(videos);
    const got = await resolveStockClip("toothbrush close up", 4, opts(fetchImpl));
    expect(got?.id).toBe(202);
    expect(seen[0]).toBe("https://api.pexels.com/videos/search?query=toothbrush+close+up&orientation=portrait&per_page=10");
    expect(seen[1]).toBe("https://x/202.mp4");
    expect(path.basename(got!.path)).toBe("stock-202.mp4");
  });

  it("a stored plan without footage fields resolves to the same clip as before, through the render's own path", async () => {
    const plan = parseScenePlan({
      title: "Old video",
      aspect: "9:16",
      theme: "editorial",
      music: "none",
      scenes: [
        { kind: "hook", text: "Old hook here", seconds: 3 },
        { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, caption: "c", seconds: 4 },
      ],
    });
    expect(footageChoice(plan)).toEqual({});
    const { fetchImpl } = pexels(TEN);
    const out = await resolveFootageClips(plan, { workDir, renderId: "r1", userAssets: [], pexelsApiKey: "k", fetchImpl });
    expect(out.clipIds).toEqual([101]);
    expect(out.footage).toEqual({ "1": "r1/stock-101.mp4" });
    expect(await resolveFootage(plan, { workDir, renderId: "r1", userAssets: [], pexelsApiKey: "k", fetchImpl })).toEqual(out.footage);
  });
});

describe("one clinic over eight weeks", () => {
  const seed = "Live Oak Family Dentistry|Austin|US";

  it("with the clinic's last eight weeks avoided, the same query shows a different clip every week, never one from the window", async () => {
    const shown: number[] = [];
    for (const monday of MONDAYS) {
      // The window: every clip of the eight weeks before this one, oldest first.
      const avoid = new Set(shown.slice(-8));
      const rotation: ClipRotation = { seed, turn: turnOf(monday), avoid };
      const got = await resolveStockClip("toothbrush close up", 4, { ...opts(pexels(TEN).fetchImpl), rotation });
      expect(got, monday).toBeDefined();
      expect(avoid.has(got!.id), `${monday} repeated ${got!.id}`).toBe(false);
      shown.push(got!.id);
    }
    expect(new Set(shown).size).toBe(8);
    // Week to week, never the same clip twice in a row.
    for (let i = 1; i < shown.length; i++) expect(shown[i]).not.toBe(shown[i - 1]);
  });

  it("with no history at all, the turn alone moves the clip along: no repeat within five weeks, and only the best five are used", () => {
    const shown = MONDAYS.map((m) => chooseVideo(TEN, "toothbrush close up", 4, true, { rotation: { seed, turn: turnOf(m) } })!.id);
    for (let i = 0; i < shown.length; i++)
      for (let j = i + 1; j < Math.min(shown.length, i + ROTATION_POOL); j++) expect(shown[j], `weeks ${i} and ${j}`).not.toBe(shown[i]);
    for (const id of shown) expect(id).toBeLessThanOrEqual(100 + ROTATION_POOL);
  });

  it("when the best five were all shown lately, takes the next fitting clip that was not", () => {
    const avoid = new Set([101, 102, 103, 104, 105]);
    for (const m of MONDAYS) expect(chooseVideo(TEN, "toothbrush close up", 4, true, { rotation: { seed, turn: turnOf(m), avoid } })!.id).toBe(106);
  });

  it("when every fitting clip was shown lately, repeats the one shown longest ago rather than showing nothing", () => {
    const five = TEN.slice(0, 5);
    // Oldest first: 104 was shown longest ago.
    const avoid = new Set([104, 102, 105, 101, 103]);
    expect(chooseVideo(five, "toothbrush close up", 4, true, { rotation: { seed, turn: 3, avoid } })!.id).toBe(104);
  });

  it("never trades a fitting repeat for a clip that does not fit: the wrong orientation or too short for the scene", () => {
    const fitting = [clip(301), clip(302)];
    const landscape = clip(303, { width: 1920, height: 1080 });
    const short = clip(304, { duration: 2 });
    const got = chooseVideo([...fitting, landscape, short], "toothbrush close up", 4, true, { rotation: { seed, turn: 9, avoid: new Set([302, 301]) } });
    expect([301, 302]).toContain(got!.id);
    // 302 was shown longest ago.
    expect(got!.id).toBe(302);
  });

  it("never picks a clip without a usable mp4 when another fits", () => {
    const webm = (id: number) => clip(id, { video_files: [{ link: `https://x/${id}.webm`, width: 1080, height: 1920, file_type: "video/webm", quality: "hd" }] });
    const videos = [webm(401), webm(402), clip(403), webm(404)];
    for (let turn = 0; turn < 10; turn++) expect(chooseVideo(videos, "q", 4, true, { rotation: { seed, turn } })!.id).toBe(403);
  });

  it("when no clip covers the scene, chooses among the ones nearly as long as the best", () => {
    const videos = [clip(501, { duration: 6 }), clip(502, { duration: 5.5 }), clip(503, { duration: 2 })];
    const picks = new Set(Array.from({ length: 12 }, (_, turn) => chooseVideo(videos, "q", 8, true, { rotation: { seed, turn } })!.id));
    expect([...picks].sort()).toEqual([501, 502]);
  });
});

describe("two clinics in the same week", () => {
  it("get different clips for the same query most of the time, and the clinics spread over the best five", () => {
    const turn = turnOf("2026-11-23");
    const clinics = Array.from({ length: 200 }, (_, i) => `Clinic ${i}|City ${i % 17}|${["US", "TR", "DE", "GB"][i % 4]}`);
    const picks = clinics.map((seed) => chooseVideo(TEN, "toothbrush close up", 4, true, { rotation: { seed, turn } })!.id);
    let differ = 0;
    for (let i = 1; i < picks.length; i++) if (picks[i] !== picks[i - 1]) differ++;
    // Five equally likely clips: about four pairs in five differ.
    expect(differ / (picks.length - 1)).toBeGreaterThan(0.7);
    const counts = TEN.slice(0, ROTATION_POOL).map((v) => picks.filter((p) => p === v.id).length);
    for (const c of counts) expect(c).toBeGreaterThan(20);
  });

  it("and the same clinic gets different clips for different queries in one week", () => {
    const seed = "Körfez Dental|İzmir|TR";
    const queries = ["toothbrush close up", "dental floss close up", "clear aligner case", "tooth model close up", "teeth whitening tray", "child toothbrush"];
    const picks = queries.map((q) => chooseVideo(TEN, q, 4, true, { rotation: { seed, turn: 2917 } })!.id);
    expect(new Set(picks).size).toBeGreaterThan(2);
  });
});

describe("a re-render keeps the clip the stored video showed", () => {
  it("prefers plan.footageIds while the search still returns the clip, rotation or not", async () => {
    const { fetchImpl } = pexels(TEN);
    expect((await resolveStockClip("q", 4, { ...opts(fetchImpl), keep: new Set([107]) }))?.id).toBe(107);
    expect((await resolveStockClip("q", 4, { ...opts(fetchImpl), keep: new Set([107]), rotation: { seed: "s", turn: 1, avoid: new Set([107]) } }))?.id).toBe(107);
  });

  it("falls back to the usual choice when the kept clip is gone", async () => {
    const { fetchImpl } = pexels(TEN);
    expect((await resolveStockClip("q", 4, { ...opts(fetchImpl), keep: new Set([999]) }))?.id).toBe(101);
  });
});

describe("the plan's footage fields", () => {
  it("are read defensively: garbage is ignored, ids are whole positive numbers, each once", () => {
    expect(clipIds([3, 3, "4", -1, 0, 2.5, null, 9])).toEqual([3, 9]);
    expect(clipIds("101")).toEqual([]);
    expect(clipIds(Array.from({ length: 500 }, (_, i) => i + 1))).toHaveLength(200);
    expect(footageChoice(null)).toEqual({});
    expect(footageChoice({ footageSeed: "  ", footageTurn: 3 })).toEqual({});
    expect(footageChoice({ footageSeed: 7, footageAvoid: [1] })).toEqual({});
    const read = footageChoice({ footageSeed: "Clinic|City|US", footageTurn: 2917, footageAvoid: [5, "x", 6], footageIds: [8] });
    expect(read.rotation?.seed).toBe("Clinic|City|US");
    expect(read.rotation?.turn).toBe(2917);
    expect([...(read.rotation?.avoid ?? [])]).toEqual([5, 6]);
    expect([...(read.keep ?? [])]).toEqual([8]);
    expect(footageChoice({ footageSeed: "s", footageTurn: 1.5 }).rotation).toEqual({ seed: "s", avoid: new Set() });
  });

  it("never reach the composition", () => {
    const plan = { title: "t", footageSeed: "s", footageTurn: 1, footageAvoid: [1], footageIds: [2], theme: "editorial" };
    expect(withoutFootageFields(plan)).toEqual({ title: "t", theme: "editorial" });
  });

  it("steer the render's own lookup: the rotation picks among the best five and the ids come back in scene order", async () => {
    const plan = {
      ...parseScenePlan({
        title: "This week",
        aspect: "9:16",
        theme: "editorial",
        music: "none",
        scenes: [
          { kind: "hook", text: "A hook here", seconds: 3 },
          { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, caption: "c", seconds: 4 },
        ],
      }),
      footageSeed: "Clinic|City|US",
      footageTurn: 2917,
      footageAvoid: [101, 102, 103, 104],
    } as ScenePlan;
    const out = await resolveFootageClips(plan, { workDir, renderId: "r1", userAssets: [], pexelsApiKey: "k", fetchImpl: pexels(TEN).fetchImpl });
    expect(out.clipIds).toEqual([105]);
    expect(out.footage["1"]).toBe("r1/stock-105.mp4");
  });
});

describe("the ids a render showed, by its output file", () => {
  it("are read once, by the same path however it is written", () => {
    noteFootageIds(path.join(workDir, "v-1", "video.mp4"), [12, 12, 13]);
    expect(takeFootageIds(`${workDir}/v-1/./video.mp4`)).toEqual([12, 13]);
    expect(takeFootageIds(path.join(workDir, "v-1", "video.mp4"))).toEqual([]);
    expect(takeFootageIds(undefined)).toEqual([]);
    expect(takeFootageIds("/nonexistent/video.mp4")).toEqual([]);
  });

  it("forget renders nobody asked about, oldest first", () => {
    for (let i = 0; i < 70; i++) noteFootageIds(`/tmp/forgotten-${i}/video.mp4`, [i + 1]);
    expect(takeFootageIds("/tmp/forgotten-0/video.mp4")).toEqual([]);
    expect(takeFootageIds("/tmp/forgotten-69/video.mp4")).toEqual([70]);
  });
});
