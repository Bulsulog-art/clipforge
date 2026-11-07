import { describe, expect, test } from "vitest";
import { planBroll } from "./broll.js";
import { faceCropOffset, smoothCropX } from "./reframe.js";

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

describe("reframe/faceCropOffset", () => {
  // 1920x1080 source → 9:16: scaled to 3414x1920, a 1080-wide window is cropped.
  const src = { srcW: 1920, srcH: 1080, outW: 1080, outH: 1920 };

  test("follows a speaker sitting right of centre", () => {
    const x = faceCropOffset({ ...src, centresSrcX: [1587, 1590, 1585] });
    // face at 1587 src px → 2821 scaled; the 1080 window is centred on it.
    expect(x).toBe(Math.round(1587 * (1920 / 1080) - 540));
    expect(x).toBeGreaterThan(Math.round(3414 / 2 - 540)); // right of centre
  });

  test("a speaker at the far edge clamps the window inside the frame", () => {
    expect(faceCropOffset({ ...src, centresSrcX: [1900] })).toBe(3414 - 1080);
  });

  test("a speaker in the middle gives the centre crop", () => {
    expect(faceCropOffset({ ...src, centresSrcX: [960] })).toBe(Math.round(3414 / 2 - 540));
  });

  test("no faces → undefined (centre crop)", () => {
    expect(faceCropOffset({ ...src, centresSrcX: [] })).toBeUndefined();
  });

  test("no horizontal overflow (vertical source) → undefined", () => {
    expect(faceCropOffset({ srcW: 1080, srcH: 1920, outW: 1080, outH: 1920, centresSrcX: [500] })).toBeUndefined();
  });
});
