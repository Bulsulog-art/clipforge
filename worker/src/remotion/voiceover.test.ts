import { describe, it, expect, vi } from "vitest";
vi.mock("../steps/tts.js", () => ({ synthesizeSpeech: vi.fn() }));
const { fitPlanToVoice, TAIL_SECONDS, snapScenesToPauses, mergePauses, SNAP_RANGE } = await import("./voiceover.js");
import { totalSeconds, LIMITS, type ScenePlan } from "./scene-plan.js";

const plan = (secs: number[]): ScenePlan =>
  ({
    title: "t",
    aspect: "9:16",
    theme: "sunrise",
    music: "none",
    scenes: secs.map((seconds, i) => ({ kind: "statement", text: `Line ${i}`, seconds })),
  }) as ScenePlan;

describe("fitPlanToVoice", () => {
  it("stretches the video so narration is never cut off", () => {
    const fitted = fitPlanToVoice(plan([3, 4, 5, 3]), 24);
    expect(totalSeconds(fitted)).toBeGreaterThanOrEqual(24 + TAIL_SECONDS - 0.2);
    // proportions are kept: the longest scene stays the longest
    expect(fitted.scenes[2].seconds).toBeGreaterThan(fitted.scenes[0].seconds);
  });

  it("never shrinks a plan for a short narration (text must stay readable)", () => {
    const p = plan([3, 4, 5]);
    expect(fitPlanToVoice(p, 5)).toBe(p);
  });

  it("respects the per-scene ceiling by spreading time to scenes with room", () => {
    const fitted = fitPlanToVoice(plan([9, 2, 2]), 30);
    for (const s of fitted.scenes) expect(s.seconds).toBeLessThanOrEqual(LIMITS.sceneSeconds.max);
    expect(totalSeconds(fitted)).toBeGreaterThanOrEqual(29.5);
  });

  it("caps at the total limit", () => {
    const fitted = fitPlanToVoice(plan([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]), 500);
    expect(totalSeconds(fitted)).toBeLessThanOrEqual(LIMITS.totalSeconds.max + 0.5);
  });
});

describe("snapScenesToPauses: cards change when the voice does", () => {
  const cuts = (p: ScenePlan) => p.scenes.slice(0, -1).reduce<number[]>((a, s) => [...a, (a.at(-1) ?? 0) + s.seconds], []);
  // The English brushing sample: scenes 3/3/3/5/2/4 s, narration pauses measured on the published mp4.
  const brushing = plan([3, 3, 3, 5, 2, 4]);
  const brushingPauses = [
    { start: 2.07, end: 2.38 }, { start: 2.85, end: 3.45 }, { start: 5.35, end: 5.87 }, { start: 8.32, end: 9.13 },
    { start: 12.67, end: 13.19 }, { start: 14.34, end: 15.24 }, { start: 15.95, end: 16.21 }, { start: 17.58, end: 20.05 },
  ];

  it("moves every cut into the pause nearest it, just before the next words", () => {
    const snapped = snapScenesToPauses(brushing, brushingPauses);
    const got = cuts(snapped);
    // 3 → 3.3 (pause 2.85-3.45), 6 → 5.72 (5.35-5.87), 9 → 8.98, 14 → 13.04 (12.67-13.19), 16 → 16.06.
    expect(got.map((c) => Math.round(c * 10) / 10)).toEqual([3.3, 5.7, 9, 13, 16.1]);
    for (const c of got) {
      // In the second half of a pause, give or take the one frame the cut is rounded to.
      const inPause = brushingPauses.some((p) => c >= (p.start + p.end) / 2 - 1 / 30 && c <= p.end + 1 / 30);
      expect(inPause, `cut ${c}`).toBe(true);
    }
  });

  it("keeps the running time, the order of scenes and every scene's length limits", () => {
    const snapped = snapScenesToPauses(brushing, brushingPauses);
    expect(totalSeconds(snapped)).toBeCloseTo(totalSeconds(brushing), 5);
    expect(snapped.scenes.map((s) => (s as { text: string }).text)).toEqual(brushing.scenes.map((s) => (s as { text: string }).text));
    for (const s of snapped.scenes) {
      expect(s.seconds).toBeGreaterThanOrEqual(LIMITS.sceneSeconds.min);
      expect(s.seconds).toBeLessThanOrEqual(LIMITS.sceneSeconds.max);
      // Whole frames, so the composition's frame rounding cannot drift.
      expect(Math.abs(s.seconds * 30 - Math.round(s.seconds * 30))).toBeLessThan(0.05);
    }
  });

  it("prefers the long pause at the end of the hook to the short one after its question mark", () => {
    // The mastered English brushing narration (silencedetect -45 dB, 50 ms): "Missing spots when you brush?
    // [0.22 s] Here's a clue. [0.51 s, in three pieces split by breath noise] Start with...".
    const mastered = [
      { start: 2.153, end: 2.371 },
      { start: 2.978, end: 3.155 }, { start: 3.295, end: 3.364 }, { start: 3.372, end: 3.494 },
      { start: 4.338, end: 4.392 }, { start: 5.476, end: 5.852 },
    ];
    expect(cuts(snapScenesToPauses(plan([3, 3, 3]), mastered))[0]).toBeCloseTo(3.34, 1);
  });

  it("joins silences split by a click or breath into one pause", () => {
    expect(mergePauses([{ start: 3.34, end: 3.54 }, { start: 3.02, end: 3.27 }, { start: 5, end: 5.3 }])).toEqual([
      { start: 3.02, end: 3.54 },
      { start: 5, end: 5.3 },
    ]);
  });

  it("leaves a cut alone when no pause is within range, and ignores breaths", () => {
    const p = plan([4, 4, 4]);
    const far = snapScenesToPauses(p, [{ start: 4 + SNAP_RANGE + 0.5, end: 4 + SNAP_RANGE + 1 }]);
    expect(cuts(far)[0]).toBeCloseTo(4, 5);
    const breath = snapScenesToPauses(p, [{ start: 3.6, end: 3.7 }]);
    expect(cuts(breath)[0]).toBeCloseTo(4, 5);
  });

  it("never squeezes a scene under the minimum to reach a pause", () => {
    const p = plan([1.5, 1.5, 3]);
    const snapped = snapScenesToPauses(p, [{ start: 0.6, end: 0.9 }]);
    expect(snapped.scenes[0].seconds).toBeGreaterThanOrEqual(LIMITS.sceneSeconds.min);
    expect(totalSeconds(snapped)).toBeCloseTo(6, 5);
  });

  it("moves only the cut a pause is near, and is a no-op without pauses or with one scene", () => {
    const p = plan([3, 3, 3]);
    const snapped = snapScenesToPauses(p, [{ start: 3.4, end: 3.9 }]);
    const c = cuts(snapped);
    expect(c[0]).toBeCloseTo(3.75, 1); // the 3 s cut moves into the pause...
    expect(c[1]).toBeCloseTo(6, 5); // ...the 6 s one has none near it and stays
    expect(cuts(snapScenesToPauses(p, []))).toEqual([3, 6]);
    const one = plan([5]);
    expect(snapScenesToPauses(one, [{ start: 2, end: 3 }])).toBe(one);
  });
});
