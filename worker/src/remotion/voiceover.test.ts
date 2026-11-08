import { describe, it, expect, vi } from "vitest";
vi.mock("../steps/tts.js", () => ({ synthesizeSpeech: vi.fn() }));
const { fitPlanToVoice, TAIL_SECONDS } = await import("./voiceover.js");
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
