import { describe, it, expect } from "vitest";
import {
  parseScenePlan,
  ScenePlanError,
  totalFrames,
  totalSeconds,
  sceneOffsets,
  dimensions,
  stockQueries,
  maxUserAssetIndex,
  FPS,
  LIMITS,
} from "./scene-plan.js";

/**
 * The plan arrives from a language model, so it is untrusted input that
 * happens to be JSON. These tests are about what happens when it is wrong,
 * because that is the common case in production, not the happy path.
 */

const hook = { kind: "hook" as const, text: "Nobody tells you this", seconds: 3 };
const statement = { kind: "statement" as const, text: "It compounds daily", seconds: 4 };

function plan(overrides: Record<string, unknown> = {}) {
  return {
    title: "Morning routines",
    aspect: "9:16",
    theme: "midnight",
    scenes: [hook, statement],
    music: "calm",
    ...overrides,
  };
}

describe("a valid plan", () => {
  it("parses and keeps its scenes", () => {
    const p = parseScenePlan(plan());
    expect(p.scenes).toHaveLength(2);
    expect(p.title).toBe("Morning routines");
  });

  it("defaults music to none when omitted", () => {
    const { music, ...withoutMusic } = plan();
    expect(parseScenePlan(withoutMusic).music).toBe("none");
  });

  it("derives duration from the scenes", () => {
    const p = parseScenePlan(plan());
    expect(totalSeconds(p)).toBe(7);
    expect(totalFrames(p)).toBe(7 * FPS);
  });

  it("lays scenes out back to back", () => {
    const p = parseScenePlan(plan());
    expect(sceneOffsets(p)).toEqual([0, 3 * FPS]);
  });

  it("maps each aspect to real pixel dimensions", () => {
    expect(dimensions(parseScenePlan(plan({ aspect: "9:16" })))).toEqual({ width: 1080, height: 1920 });
    expect(dimensions(parseScenePlan(plan({ aspect: "1:1" })))).toEqual({ width: 1080, height: 1080 });
    expect(dimensions(parseScenePlan(plan({ aspect: "16:9" })))).toEqual({ width: 1920, height: 1080 });
  });
});

describe("rejects plans that would render badly", () => {
  it("refuses a scene too short to read", () => {
    expect(() => parseScenePlan(plan({ scenes: [{ ...hook, seconds: 0.4 }] })))
      .toThrow(ScenePlanError);
  });

  it("refuses a scene that sits there as dead air", () => {
    expect(() => parseScenePlan(plan({ scenes: [{ ...hook, seconds: 30 }] })))
      .toThrow(ScenePlanError);
  });

  it("refuses a video longer than short-form tolerates", () => {
    const many = Array.from({ length: 12 }, () => ({ ...statement, seconds: 9 }));
    expect(() => parseScenePlan(plan({ scenes: many }))).toThrow(/90s|outside/);
  });

  it("refuses a video too short to be worth posting", () => {
    expect(() => parseScenePlan(plan({ scenes: [{ ...hook, seconds: 2 }] })))
      .toThrow(ScenePlanError);
  });

  it("refuses an empty plan", () => {
    expect(() => parseScenePlan(plan({ scenes: [] }))).toThrow(ScenePlanError);
  });

  it("refuses a hook too long to fit on a phone", () => {
    const tooLong = "x".repeat(LIMITS.hookChars + 1);
    expect(() => parseScenePlan(plan({ scenes: [{ ...hook, text: tooLong }] })))
      .toThrow(ScenePlanError);
  });

  it("refuses an unknown scene kind", () => {
    expect(() => parseScenePlan(plan({ scenes: [{ kind: "karaoke", seconds: 3 }] })))
      .toThrow(ScenePlanError);
  });

  it("refuses an unknown theme", () => {
    expect(() => parseScenePlan(plan({ theme: "vaporwave" }))).toThrow(ScenePlanError);
  });

  it("carries a message that can be shown to the person who asked", () => {
    try {
      parseScenePlan(plan({ scenes: [] }));
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ScenePlanError);
      const message = (e as ScenePlanError).userMessage;
      expect(message.length).toBeGreaterThan(10);
      expect(message).not.toMatch(/zod|schema|undefined|\bat\b.*\./i);
    }
  });
});

describe("footage sources", () => {
  const stock = {
    kind: "footage" as const,
    source: { type: "stock" as const, query: "sunrise over city" },
    seconds: 4,
  };
  const userClip = (assetIndex: number) => ({
    kind: "footage" as const,
    source: { type: "user" as const, assetIndex },
    seconds: 4,
  });

  it("collects stock queries, de-duplicated", () => {
    const p = parseScenePlan(plan({ scenes: [hook, stock, { ...stock }] }));
    expect(stockQueries(p)).toEqual(["sunrise over city"]);
  });

  it("reports no stock queries when the plan is pure motion graphics", () => {
    expect(stockQueries(parseScenePlan(plan()))).toEqual([]);
  });

  it("accepts a user clip the caller actually has", () => {
    const p = parseScenePlan(plan({ scenes: [hook, userClip(0)] }), 1);
    expect(maxUserAssetIndex(p)).toBe(0);
  });

  it("refuses a user clip that was never uploaded", () => {
    expect(() => parseScenePlan(plan({ scenes: [hook, userClip(3)] }), 1))
      .toThrow(/asset 3 but only 1/);
  });

  it("refuses any user clip when nothing was uploaded", () => {
    expect(() => parseScenePlan(plan({ scenes: [hook, userClip(0)] }), 0))
      .toThrow(ScenePlanError);
  });

  it("gives the model no way to point at an arbitrary url", () => {
    const evil = {
      kind: "footage" as const,
      source: { type: "url", url: "https://example.com/someone-elses.mp4" },
      seconds: 4,
    };
    expect(() => parseScenePlan(plan({ scenes: [hook, evil] }))).toThrow(ScenePlanError);
  });
});

describe("list scenes", () => {
  const list = (items: string[]) => ({
    kind: "list" as const,
    heading: "Three rules",
    items,
    seconds: 6,
  });

  it("accepts a normal listicle", () => {
    const p = parseScenePlan(plan({ scenes: [hook, list(["One", "Two", "Three"])] }));
    expect(p.scenes[1]).toMatchObject({ kind: "list" });
  });

  it("refuses a one-item list, which is just a statement", () => {
    expect(() => parseScenePlan(plan({ scenes: [hook, list(["One"])] }))).toThrow(ScenePlanError);
  });

  it("refuses more items than fit on screen", () => {
    const tooMany = Array.from({ length: LIMITS.listItems.max + 1 }, (_, i) => `Item ${i}`);
    expect(() => parseScenePlan(plan({ scenes: [hook, list(tooMany)] }))).toThrow(ScenePlanError);
  });
});
