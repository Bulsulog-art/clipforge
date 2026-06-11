import { describe, expect, test } from "vitest";
import { planBroll } from "./broll.js";
import { smoothCropX } from "./reframe.js";

describe("broll/planBroll", () => {
  test("spaces cutaways past the lead guard, in keyword order", () => {
    const cuts = planBroll(["money", "freedom"], 40);
    expect(cuts.length).toBe(2);
    expect(cuts[0].start).toBeGreaterThanOrEqual(6);
    expect(cuts[0].query).toBe("money");
    expect(cuts[1].start).toBeGreaterThan(cuts[0].start);
    expect(cuts[1].end).toBeLessThanOrEqual(40);
  });

  test("nothing to cut to → empty", () => {
    expect(planBroll([], 40)).toEqual([]);
    expect(planBroll(["x"], 40)).toEqual([]); // keyword too short
    expect(planBroll(["money"], 5)).toEqual([]); // clip too short
  });
});

describe("reframe/smoothCropX", () => {
  test("centres the crop when no faces are detected", () => {
    expect(smoothCropX([], 1920, 1080)).toBe(420); // (1920-1080)/2
  });

  test("shifts the crop toward the speaker (median of detections)", () => {
    const x = smoothCropX([1400, 1420, 1410], 1920, 1080);
    expect(x).toBeGreaterThan(420); // right of centre
    expect(x).toBeLessThanOrEqual(1920 - 1080);
  });

  test("clamps within the frame", () => {
    expect(smoothCropX([1900], 1920, 1080)).toBe(1920 - 1080); // face far right → clamp right
    expect(smoothCropX([0], 1920, 1080)).toBe(0); // face far left → clamp left
  });
});
