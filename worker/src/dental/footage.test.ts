import { describe, it, expect } from "vitest";
import { guardFootage } from "./footage.js";
import type { ScenePlan } from "../remotion/scene-plan.js";

const plan = (query: string) =>
  ({
    title: "t",
    aspect: "9:16",
    theme: "midnight",
    music: "none",
    scenes: [
      { kind: "hook", text: "A hook here", seconds: 3 },
      { kind: "footage", source: { type: "stock", query }, caption: "c", seconds: 3 },
    ],
  }) as unknown as ScenePlan;
const q = (p: ScenePlan) => (p.scenes[1] as { source: { query: string } }).source.query;

describe("guardFootage", () => {
  it("replaces people and clinical settings with an object shot for the service", () => {
    expect(q(guardFootage(plan("dental implant process"), "Implantes", new Set()))).toBe("dental implant model");
    expect(q(guardFootage(plan("dentist examining patient"), "Bleaching", new Set()))).toBe("teeth whitening tray");
    expect(q(guardFootage(plan("smiling woman"), "Kanal tedavisi", new Set()))).toBe("tooth model close up");
  });
  it("keeps a safe object query", () => {
    expect(q(guardFootage(plan("Child Brushing Teeth"), "Children's dentistry", new Set()))).toBe("child brushing teeth");
  });
  it("never repeats a shot within a week", () => {
    const used = new Set<string>();
    const a = q(guardFootage(plan("brushing teeth close up"), "Limpieza dental", used));
    const b = q(guardFootage(plan("brushing teeth close up"), "Limpieza dental", used));
    expect(a).toBe("brushing teeth close up");
    expect(b).not.toBe(a);
    expect(b).toBe("toothbrush close up");
  });
  it("maps Japanese, Arabic and Polish service names to object shots", () => {
    expect(q(guardFootage(plan("dentist with patient"), "インプラント", new Set()))).toBe("dental implant model");
    expect(q(guardFootage(plan("dentist with patient"), "تبييض الأسنان", new Set()))).toBe("teeth whitening tray");
    expect(q(guardFootage(plan("dentist with patient"), "Leczenie kanałowe", new Set()))).toBe("tooth model close up");
  });
});
