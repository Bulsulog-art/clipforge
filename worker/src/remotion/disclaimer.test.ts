import { describe, expect, it } from "vitest";
import { DISCLAIMER_SECONDS, disclaimerFrom } from "./Disclaimer.js";
import { scenePlanSchema } from "./scene-plan.js";

describe("on-screen disclaimer (plan.disclaimer)", () => {
  it("comes up with the last scene, or earlier so it stays readable for DISCLAIMER_SECONDS", () => {
    const fps = 30;
    // A 3 s closing scene in a 30 s video: up 6 s before the end, not 3.
    expect(disclaimerFrom(810, 900, fps)).toBe(900 - DISCLAIMER_SECONDS * fps);
    // A long closing scene: from its start.
    expect(disclaimerFrom(600, 900, fps)).toBe(600);
    // A very short video: from the start, never before frame 0.
    expect(disclaimerFrom(90, 120, fps)).toBe(0);
  });
  it("is optional plan data, bounded in length", () => {
    const base = {
      title: "t",
      aspect: "9:16",
      theme: "sunrise",
      scenes: [
        { kind: "hook", text: "A hook", seconds: 3 },
        { kind: "statement", text: "A statement", seconds: 4 },
        { kind: "cta", text: "Ask us", seconds: 3 },
      ],
    };
    expect(scenePlanSchema.safeParse(base).success).toBe(true);
    expect(scenePlanSchema.safeParse({ ...base, disclaimer: "Sonuçlar kişiden kişiye değişebilir." }).success).toBe(true);
    expect(scenePlanSchema.safeParse({ ...base, disclaimer: "x".repeat(241) }).success).toBe(false);
  });
});
