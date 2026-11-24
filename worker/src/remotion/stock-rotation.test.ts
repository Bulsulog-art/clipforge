import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ROTATION_POOL,
  chooseVideo,
  clipIds,
  footageChoice,
  noteFootage,
  resolveStockClip,
  scoreVideo,
  shownClipIds,
  takeFootage,
  withShownClips,
  withoutClipIds,
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

  it("when the best five were all shown lately, takes a fitting clip further down that was not, a different one each week", () => {
    const avoid = new Set([101, 102, 103, 104, 105]);
    const picks = MONDAYS.map((m) => chooseVideo(TEN, "toothbrush close up", 4, true, { rotation: { seed, turn: turnOf(m), avoid } })!.id);
    for (const id of picks) expect([106, 107, 108, 109, 110]).toContain(id);
    for (let i = 1; i < picks.length; i++) expect(picks[i], MONDAYS[i]).not.toBe(picks[i - 1]);
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

describe("when the scene's length changes from week to week (no history)", () => {
  /** Seven results in Pexels' order, long and short ones mixed: a longer scene rules the short ones out. */
  const MIXED = [clip(201), clip(202, { duration: 5 }), clip(203), clip(204, { duration: 5 }), clip(205), clip(206, { duration: 5 }), clip(207)];

  it("a 4 s scene one week and an 8 s scene the next (or the other way round) never show the same clip", () => {
    for (let c = 0; c < 200; c++) {
      const seed = `Clinic ${c}|City|US`;
      const pick = (seconds: number, turn: number) => chooseVideo(MIXED, "toothbrush close up", seconds, true, { rotation: { seed, turn } })!;
      const t = turnOf("2026-11-30");
      expect(pick(8, t + 1).id, seed).not.toBe(pick(4, t).id);
      expect(pick(4, t + 1).id, seed).not.toBe(pick(8, t).id);
      // Whatever the length, the clip always covers the scene.
      expect(pick(8, t).duration).toBeGreaterThanOrEqual(8);
    }
  });

  it("over many result lists and scene lengths, the same clip two weeks running stays rare", () => {
    const rnd = lcg(42);
    let repeats = 0;
    let pairs = 0;
    for (let c = 0; c < 400; c++) {
      const videos = Array.from({ length: 10 }, (_, i) => clip(1000 + i, { duration: rnd() < 0.4 ? 3 + rnd() * 5 : 8 + rnd() * 30 }));
      const seed = `Clinic ${c}|City|US`;
      let last: number | undefined;
      for (let turn = 2900; turn < 2912; turn++) {
        const id = chooseVideo(videos, "toothbrush close up", 3 + Math.floor(rnd() * 6), true, { rotation: { seed, turn } })!.id;
        if (last !== undefined) {
          pairs++;
          if (id === last) repeats++;
        }
        last = id;
      }
    }
    // Measured 0.4 %; a rotation whose place depends on how many clips fit the scene repeated about 9 % of the time here.
    expect(repeats / pairs).toBeLessThan(0.01);
  });
});

describe("a rotated clip is as sharp as the best one", () => {
  /** A clip whose only mp4 is 540 wide: it would be upscaled into a 1080-wide frame. */
  const sd = (id: number) => clip(id, { video_files: [{ link: `https://x/${id}.mp4`, width: 540, height: 960, file_type: "video/mp4", quality: "sd" }] });
  const videos = [clip(601), sd(602), sd(603), clip(604), clip(605), clip(606)];

  it("when the best clip has a file wide enough for the frame, never picks one that has not", () => {
    const picks = new Set<number>();
    for (let c = 0; c < 40; c++)
      for (const m of MONDAYS) picks.add(chooseVideo(videos, "q", 4, true, { rotation: { seed: `Clinic ${c}`, turn: turnOf(m) }, targetWidth: 1080 })!.id);
    expect([...picks].sort()).toEqual([601, 604, 605, 606]);
    // Told nothing about the frame, the SD clips stay in the rotation.
    const loose = new Set(Array.from({ length: 40 }, (_, c) => chooseVideo(videos, "q", 4, true, { rotation: { seed: `Clinic ${c}`, turn: 1 } })!.id));
    expect(loose.has(602) || loose.has(603)).toBe(true);
  });

  it("when no clip is that wide, the rotation still turns through them", () => {
    const all = [sd(701), sd(702), sd(703)];
    const picks = new Set(Array.from({ length: 6 }, (_, turn) => chooseVideo(all, "q", 4, true, { rotation: { seed: "s", turn }, targetWidth: 1080 })!.id));
    expect(picks.size).toBe(3);
  });

  it("resolveStockClip tells chooseVideo the frame's width", async () => {
    for (let turn = 0; turn < 8; turn++) {
      const { fetchImpl, seen } = pexels(videos);
      const got = await resolveStockClip("q", 4, { ...opts(fetchImpl), rotation: { seed: "Clinic 7", turn } });
      expect([602, 603]).not.toContain(got!.id);
      expect(seen[1]).toBe(`https://x/${got!.id}.mp4`);
    }
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
    expect(clipIds([1, 2, 1], "newest")).toEqual([2, 1]);
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

  it("keep the newest clips of a long avoid list: it is oldest first, and the clips shown last matter most", () => {
    const avoid = Array.from({ length: 250 }, (_, i) => i + 1);
    const kept = [...(footageChoice({ footageSeed: "s", footageTurn: 1, footageAvoid: avoid }).rotation?.avoid ?? [])];
    expect(kept).toHaveLength(200);
    expect(kept[0]).toBe(51);
    expect(kept.at(-1)).toBe(250);
    expect(kept).not.toContain(1);
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
    const rotation = { seed: "Clinic|City|US", turn: 2917, avoid: new Set([101, 102, 103, 104]) };
    const want = chooseVideo(TEN, "toothbrush close up", 4, true, { rotation, targetWidth: 1080 })!.id;
    expect([101, 102, 103, 104]).not.toContain(want);
    expect(out.clipIds).toEqual([want]);
    expect(out.shown).toEqual([{ query: "toothbrush close up", id: want }]);
    expect(out.footage["1"]).toBe(`r1/stock-${want}.mp4`);
  });
});

describe("the clips a render showed, by its output file", () => {
  it("are read once, by the same path however it is written", () => {
    noteFootage(path.join(workDir, "v-1", "video.mp4"), [
      { query: "toothbrush close up", id: 12 },
      { query: "dental floss close up", id: 13 },
    ]);
    expect(takeFootage(`${workDir}/v-1/./video.mp4`)).toEqual([
      { query: "toothbrush close up", id: 12 },
      { query: "dental floss close up", id: 13 },
    ]);
    expect(takeFootage(path.join(workDir, "v-1", "video.mp4"))).toEqual([]);
    expect(takeFootage(undefined)).toEqual([]);
    expect(takeFootage("/nonexistent/video.mp4")).toEqual([]);
  });

  it("keep only valid ids", () => {
    noteFootage("/tmp/garbage/video.mp4", [
      { query: "a", id: -1 },
      { query: "b", id: 1.5 },
      { query: "c", id: 7 },
    ]);
    expect(takeFootage("/tmp/garbage/video.mp4")).toEqual([{ query: "c", id: 7 }]);
  });

  it("forget renders nobody asked about, oldest first", () => {
    for (let i = 0; i < 70; i++) noteFootage(`/tmp/forgotten-${i}/video.mp4`, [{ query: "q", id: i + 1 }]);
    expect(takeFootage("/tmp/forgotten-0/video.mp4")).toEqual([]);
    expect(takeFootage("/tmp/forgotten-69/video.mp4")).toEqual([{ query: "q", id: 70 }]);
  });
});

describe("the stored plan records its clips twice: footageIds, and on each footage scene", () => {
  const stored = () =>
    parseScenePlan({
      title: "This week",
      aspect: "9:16",
      theme: "editorial",
      music: "none",
      scenes: [
        { kind: "hook", text: "A hook here", seconds: 3 },
        { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, caption: "c", seconds: 4 },
        { kind: "statement", text: "Small circles clean better", seconds: 4 },
        { kind: "footage", source: { type: "stock", query: "dental floss close up" }, caption: "d", seconds: 4 },
        { kind: "footage", source: { type: "stock", query: "toothbrush close up" }, caption: "e", seconds: 4 },
      ],
    });

  it("each scene gets the clip its own query got", () => {
    const plan = withShownClips(stored(), [
      { query: "toothbrush close up", id: 104 },
      { query: "dental floss close up", id: 207 },
    ]);
    expect(plan.footageIds).toEqual([104, 207]);
    const ids = plan.scenes.map((s) => (s.kind === "footage" ? (s.source as { clipId?: number }).clipId : undefined));
    expect(ids).toEqual([undefined, 104, undefined, 207, 104]);
    // Nothing else on the scene moves.
    expect(plan.scenes[1]).toEqual({ kind: "footage", source: { type: "stock", query: "toothbrush close up", clipId: 104 }, caption: "c", seconds: 4 });
  });

  it("a render that showed no clip leaves the plan exactly as it was", () => {
    const plan = stored();
    expect(withShownClips(plan, [])).toBe(plan);
    expect(withShownClips(plan, [{ query: "toothbrush close up", id: 0 }])).toBe(plan);
  });

  it("are read back from either place, each once, and from stored JSON", () => {
    const plan = JSON.parse(JSON.stringify(withShownClips(stored(), [{ query: "toothbrush close up", id: 104 }, { query: "dental floss close up", id: 207 }])));
    expect(shownClipIds(plan)).toEqual([104, 207]);
    // A change request's base: the scenes and narration only.
    expect(shownClipIds({ scenes: plan.scenes, voiceover: plan.voiceover })).toEqual([104, 207]);
    // The plan-level list alone.
    expect(shownClipIds({ footageIds: [5], scenes: stored().scenes })).toEqual([5]);
    // Plans stored before, and garbage.
    expect(shownClipIds(stored())).toEqual([]);
    expect(shownClipIds(undefined)).toEqual([]);
    expect(shownClipIds("plan")).toEqual([]);
    expect(shownClipIds({ scenes: [null, 3, { source: null }, { source: { clipId: "104" } }, { source: { clipId: -4 } }] })).toEqual([]);
  });

  it("the parser drops them, so nothing that draws a video ever sees them", () => {
    const plan = withShownClips(stored(), [{ query: "toothbrush close up", id: 104 }]);
    const reparsed = parseScenePlan(plan);
    expect(shownClipIds(reparsed)).toEqual([]);
    expect(reparsed).toEqual(stored());
  });

  it("a writer is shown the scenes without them; scenes without any are handed back untouched", () => {
    const plan = withShownClips(stored(), [{ query: "toothbrush close up", id: 104 }]);
    const shown = withoutClipIds(plan.scenes);
    expect(JSON.stringify(shown)).not.toContain("clipId");
    expect(shown).toEqual(stored().scenes);
    const plain = stored().scenes;
    expect(withoutClipIds(plain)).toBe(plain);
    expect(withoutClipIds(undefined)).toBeUndefined();
  });
});
