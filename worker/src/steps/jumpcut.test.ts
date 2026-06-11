import { describe, expect, test } from "vitest";
import { planJumpCut, selectExpr, type JumpWord } from "./jumpcut.js";

// A clip from 10s..20s. Two speech bursts with a ~3s silent gap in the middle.
const words: JumpWord[] = [
  { word: "hello", start: 10.0, end: 10.4 },
  { word: "there", start: 10.4, end: 10.9 },
  { word: "friends", start: 10.9, end: 11.5 },
  // …3.0s of dead air…
  { word: "welcome", start: 14.5, end: 15.0 },
  { word: "back", start: 15.0, end: 15.4 },
];

describe("jumpcut/planJumpCut", () => {
  test("splits at the long silence and reports the time removed", () => {
    const plan = planJumpCut(words, 10, 20);
    expect(plan).not.toBeNull();
    expect(plan!.segments.length).toBe(2);
    // ~3s gap removed (minus the small pads)
    expect(plan!.removedSec).toBeGreaterThan(2.5);
    expect(plan!.keptDuration).toBeLessThan(20 - 10);
  });

  test("remaps captions onto the compressed timeline (later words shift earlier)", () => {
    const plan = planJumpCut(words, 10, 20)!;
    // "welcome" originally at 4.5s clip-relative; after the gap is cut it must
    // land right after the first burst (~1.6s), not at 4.5s.
    const welcome = plan.words.find((w) => w.word === "welcome")!;
    expect(welcome.start).toBeLessThan(2.2);
    // monotonic, no overlaps
    for (let i = 1; i < plan.words.length; i++) {
      expect(plan.words[i].start).toBeGreaterThanOrEqual(plan.words[i - 1].start - 1e-6);
    }
  });

  test("returns null when there's no real silence to cut", () => {
    const tight: JumpWord[] = [
      { word: "a", start: 0.0, end: 0.4 },
      { word: "b", start: 0.4, end: 0.8 },
      { word: "c", start: 0.8, end: 1.2 },
    ];
    expect(planJumpCut(tight, 0, 1.3)).toBeNull();
  });

  test("returns null for fewer than two words", () => {
    expect(planJumpCut([{ word: "x", start: 0, end: 1 }], 0, 5)).toBeNull();
    expect(planJumpCut([], 0, 5)).toBeNull();
  });

  test("selectExpr builds a valid ffmpeg between() chain", () => {
    const expr = selectExpr([{ start: 0, end: 3.2 }, { start: 4.1, end: 7.8 }]);
    expect(expr).toBe("between(t,0.000,3.200)+between(t,4.100,7.800)");
  });
});
