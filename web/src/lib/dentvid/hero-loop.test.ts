import { describe, expect, it } from "vitest";
import { HERO_TAIL, heroSeek, heroSrc, type HeroLoop } from "./hero-loop";
import { SAMPLE_VIDEOS } from "@/content/dentvideo-samples";
import { LOCALES } from "@/content/dentvideo";

const LOOP: HeroLoop = { start: 0.9, skip: [[3.3, 8.4]] };

describe("hero loop", () => {
  it("starts on the hook, not on the fade-in", () => {
    expect(heroSeek(0, 38, LOOP)).toBe(0.9);
    expect(heroSeek(0.5, 38, LOOP)).toBe(0.9);
    expect(heroSeek(0.9, 38, LOOP)).toBeNull();
    expect(heroSeek(2, 38, LOOP)).toBeNull();
  });

  it("jumps over the dark scene", () => {
    expect(heroSeek(3.3, 38, LOOP)).toBe(8.4);
    expect(heroSeek(5, 38, LOOP)).toBe(8.4);
    expect(heroSeek(8.4, 38, LOOP)).toBeNull();
  });

  it("turns back to the hook before the closing fade", () => {
    expect(heroSeek(38 - HERO_TAIL, 38, LOOP)).toBe(0.9);
    expect(heroSeek(37, 38, LOOP)).toBeNull();
    // A skipped range that runs into the tail goes straight back to the start.
    expect(heroSeek(30, 31, { start: 1, skip: [[29.5, 31]] })).toBe(1);
  });

  it("ignores a time or duration the browser does not know yet", () => {
    expect(heroSeek(Number.NaN, 38, LOOP)).toBeNull();
    expect(heroSeek(2, Number.NaN, LOOP)).toBeNull();
    expect(heroSeek(100, Number.NaN, LOOP)).toBeNull();
  });

  it("loads from the start through a media fragment", () => {
    expect(heroSrc("/a.mp4", LOOP)).toBe("/a.mp4#t=0.9");
    expect(heroSrc("/a.mp4", undefined)).toBe("/a.mp4");
  });

  it("every landing's hero sample has a loop inside the video", () => {
    for (const l of LOCALES) {
      const week = SAMPLE_VIDEOS[l];
      if (!week) continue;
      const [hero] = week;
      expect(hero.hero, l).toBeDefined();
      const loop = hero.hero!;
      expect(loop.start, l).toBeGreaterThan(0);
      let last = loop.start;
      for (const [from, to] of loop.skip) {
        expect(from, l).toBeGreaterThan(last);
        expect(to, l).toBeGreaterThan(from);
        expect(to, l).toBeLessThan(hero.seconds - HERO_TAIL);
        last = to;
      }
      // Most of the video still plays.
      const skipped = loop.skip.reduce((n, [a, b]) => n + (b - a), 0);
      expect(skipped / hero.seconds, l).toBeLessThan(0.3);
    }
  });
});
