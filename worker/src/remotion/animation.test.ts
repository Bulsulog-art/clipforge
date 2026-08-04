import { describe, it, expect } from "vitest";
import {
  easeOut,
  easeInOut,
  overshoot,
  enterProgress,
  stagger,
  entrance,
  sceneOpacity,
  wordsVisible,
  countUp,
  countUpText,
  kenBurns,
  drift,
} from "./animation.js";

/**
 * Motion is expensive to check by eye — a frame that is wrong for 200ms is
 * invisible in review and obvious to a viewer. These are pure functions of the
 * frame number precisely so the timing can be pinned here instead.
 */

describe("easing", () => {
  it("starts at 0 and lands on 1", () => {
    for (const fn of [easeOut, easeInOut]) {
      expect(fn(0)).toBe(0);
      expect(fn(1)).toBe(1);
    }
  });

  it("clamps outside 0..1 so an early or late frame never inverts a transform", () => {
    for (const fn of [easeOut, easeInOut]) {
      expect(fn(-3)).toBe(0);
      expect(fn(4)).toBe(1);
    }
  });

  it("eases out fast then slow", () => {
    expect(easeOut(0.25)).toBeGreaterThan(0.5);
    expect(easeOut(0.75) - easeOut(0.5)).toBeLessThan(easeOut(0.25) - easeOut(0));
  });

  it("never goes backwards", () => {
    for (const fn of [easeOut, easeInOut]) {
      let previous = -1;
      for (let t = 0; t <= 1.0001; t += 0.05) {
        const v = fn(t);
        expect(v).toBeGreaterThanOrEqual(previous - 1e-9);
        previous = v;
      }
    }
  });
});

describe("overshoot", () => {
  it("settles exactly on 1", () => {
    expect(overshoot(1)).toBe(1);
  });

  it("starts at rest", () => {
    expect(overshoot(0)).toBeCloseTo(0, 5);
  });

  it("overshoots, but mildly enough not to read as bouncy", () => {
    let peak = 0;
    for (let t = 0; t <= 1; t += 0.01) peak = Math.max(peak, overshoot(t));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.2);
  });
});

describe("entrance timing", () => {
  it("is invisible before its delay", () => {
    expect(enterProgress(4, 10)).toBe(0);
    expect(entrance(4, { delay: 10 }).opacity).toBe(0);
  });

  it("has fully arrived after delay + duration", () => {
    expect(enterProgress(40, 10, 18)).toBe(1);
    const e = entrance(40, { delay: 10, duration: 18 });
    expect(e.opacity).toBe(1);
    expect(Math.abs(e.translateY)).toBeLessThan(0.5);
  });

  it("reaches full opacity before it finishes moving, so text is readable while it settles", () => {
    const mid = entrance(9, { delay: 0, duration: 18, distance: 48 });
    expect(mid.opacity).toBeGreaterThan(0.9);
    expect(Math.abs(mid.translateY)).toBeGreaterThan(0.5);
  });

  it("treats a zero duration as already arrived rather than dividing by zero", () => {
    expect(enterProgress(0, 0, 0)).toBe(1);
  });

  it("staggers items evenly", () => {
    expect(stagger(0, 6)).toBe(0);
    expect(stagger(3, 6)).toBe(18);
    expect(stagger(2, 6, 12)).toBe(24);
  });
});

describe("scene fades", () => {
  it("is fully opaque through the middle", () => {
    expect(sceneOpacity(45, 90, 8)).toBe(1);
  });

  it("fades in from nothing and out to nothing", () => {
    expect(sceneOpacity(0, 90, 8)).toBe(0);
    expect(sceneOpacity(90, 90, 8)).toBe(0);
  });

  it("never dips in the middle of a scene", () => {
    for (let f = 10; f <= 80; f++) expect(sceneOpacity(f, 90, 8)).toBe(1);
  });

  it("stays visible for a scene too short to fade", () => {
    for (let f = 0; f <= 10; f++) expect(sceneOpacity(f, 10, 8)).toBe(1);
  });
});

describe("word-by-word reveal", () => {
  it("shows the first word immediately", () => {
    expect(wordsVisible(0, 5, 3)).toBe(1);
  });

  it("adds a word every interval", () => {
    expect(wordsVisible(3, 5, 3)).toBe(2);
    expect(wordsVisible(6, 5, 3)).toBe(3);
  });

  it("never exceeds the words available", () => {
    expect(wordsVisible(999, 5, 3)).toBe(5);
  });

  it("shows nothing before its delay", () => {
    expect(wordsVisible(5, 5, 3, 10)).toBe(0);
  });

  it("handles an empty line", () => {
    expect(wordsVisible(10, 0)).toBe(0);
  });
});

describe("count up", () => {
  it("starts at zero and finishes on target", () => {
    expect(countUp(0, 30, 100)).toBe(0);
    expect(countUp(30, 30, 100)).toBe(100);
  });

  it("decelerates into the final value", () => {
    const early = countUp(8, 30, 100) - countUp(4, 30, 100);
    const late = countUp(28, 30, 100) - countUp(24, 30, 100);
    expect(late).toBeLessThan(early);
  });

  it("counts in the shape the target is written in", () => {
    expect(countUpText(30, 30, "1.2M")).toBe("1.2M");
    expect(countUpText(0, 30, "1.2M")).toBe("0.0M");
    expect(countUpText(30, 30, "$4,500")).toBe("$4,500");
    expect(countUpText(30, 30, "87%")).toBe("87%");
  });

  it("keeps thousands separators while counting", () => {
    expect(countUpText(15, 30, "$4,500")).toMatch(/^\$[\d,]+$/);
  });

  it("passes through anything it cannot parse", () => {
    expect(countUpText(15, 30, "sold out")).toBe("sold out");
  });
});

describe("footage motion", () => {
  it("pushes in slowly across the shot", () => {
    expect(kenBurns(0, 120)).toBeCloseTo(1.0, 5);
    expect(kenBurns(120, 120)).toBeCloseTo(1.06, 5);
    expect(kenBurns(60, 120)).toBeGreaterThan(kenBurns(0, 120));
  });

  it("survives a one-frame shot", () => {
    expect(kenBurns(0, 1)).toBe(1.0);
  });

  it("drifts around 1 without ever collapsing or ballooning", () => {
    for (let f = 0; f < 200; f++) {
      const d = drift(f);
      expect(d).toBeGreaterThan(0.98);
      expect(d).toBeLessThan(1.02);
    }
  });
});
