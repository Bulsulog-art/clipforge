import { describe, it, expect } from "vitest";
import { normalisePlanShape } from "./normalise-plan.js";

/**
 * These are written from what the model actually produced in production, not
 * from what it might produce in theory. The first live job failed on the very
 * first case here.
 */

const kinds = (out: unknown) =>
  ((out as { scenes: unknown[] }).scenes ?? []).map((s) =>
    // Scenes are passed through untouched when they are not objects, so this
    // has to survive reading a kind off a null.
    typeof s === "object" && s !== null ? (s as { kind?: string }).kind : undefined,
  );

function plan(scenes: unknown[]) {
  return { title: "T", aspect: "9:16", theme: "midnight", music: "none", scenes };
}

describe("the discriminator the model reached for", () => {
  it("accepts `type` where we asked for `kind`", () => {
    const out = normalisePlanShape(plan([{ type: "hook", text: "Hi", seconds: 3 }]));
    expect(kinds(out)).toEqual(["hook"]);
  });

  it("drops the alias so it cannot contradict the resolved kind", () => {
    const out = normalisePlanShape(plan([{ type: "outro", text: "Bye", seconds: 3 }]));
    expect((out as { scenes: Record<string, unknown>[] }).scenes[0]).not.toHaveProperty("type");
  });

  it("leaves a correct plan exactly as it was", () => {
    const input = plan([{ kind: "hook", text: "Hi", seconds: 3 }]);
    expect(normalisePlanShape(input)).toEqual(input);
  });
});

describe("words that mean one of ours", () => {
  it.each([
    ["intro", "hook"],
    ["Outro", "cta"],
    ["call to action", "cta"],
    ["B-Roll", "footage"],
    ["comparison", "compare"],
    ["statistic", "stat"],
    ["bullets", "list"],
  ])("maps %s to %s", (given, expected) => {
    expect(kinds(normalisePlanShape(plan([{ kind: given, seconds: 3 }])))).toEqual([expected]);
  });

  it("passes an unrecognised kind through for the parser to reject", () => {
    const out = normalisePlanShape(plan([{ kind: "carousel", seconds: 3 }]));
    expect(kinds(out)).toEqual(["carousel"]);
  });
});

describe("what it must not touch", () => {
  it("leaves a footage scene's source.type alone", () => {
    const out = normalisePlanShape(
      plan([{ kind: "footage", source: { type: "stock", query: "sunrise" }, seconds: 3 }]),
    );
    const scene = (out as { scenes: { source: { type: string } }[] }).scenes[0];
    expect(scene.source.type).toBe("stock");
  });

  it("returns anything that is not a plan untouched", () => {
    expect(normalisePlanShape(null)).toBeNull();
    expect(normalisePlanShape("nope")).toBe("nope");
    expect(normalisePlanShape({ scenes: "not an array" })).toEqual({ scenes: "not an array" });
  });

  it("survives a scene that is not an object", () => {
    const out = normalisePlanShape(plan([null, "x", { type: "hook", seconds: 3 }]));
    expect(kinds(out)).toEqual([undefined, undefined, "hook"]);
  });
});
