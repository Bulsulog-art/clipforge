import { describe, expect, it } from "vitest";
import { gapsOf, lineLimit, pieces, sentences, speechSpans, subtitleCues, wrap, MIN_CUE_S } from "./subtitles.js";

const NARRATION =
  "Sensitive teeth after whitening are common. The feeling usually fades within a few days, and a toothpaste for sensitive teeth can help. If it lasts longer than a week, tell your dentist.";

describe("sentences and pieces", () => {
  it("splits on sentence ends in every script, keeping the punctuation", () => {
    expect(sentences("One. Two? Three!")).toEqual(["One.", "Two?", "Three!"]);
    expect(sentences("最初の文です。次の文です。")).toEqual(["最初の文です。", "次の文です。"]);
    expect(sentences("هل تؤلمك أسنانك؟ استشر طبيبك.")).toEqual(["هل تؤلمك أسنانك؟", "استشر طبيبك."]);
    expect(sentences("  ")).toEqual([]);
  });

  it("cuts a long sentence at a comma, else between words, never past two lines", () => {
    const long = "The feeling usually fades within a few days, and a toothpaste for sensitive teeth can help with the twinge.";
    const p = pieces(long, "en");
    expect(p.length).toBeGreaterThan(1);
    expect(p[0].endsWith(",")).toBe(true);
    for (const x of p) expect([...x].length).toBeLessThanOrEqual(lineLimit("en") * 2);
    expect(p.join(" ")).toBe(long);
    const ja = "ホワイトニングの後に歯がしみるのはよくあることで、たいていは数日でおさまりますが、長く続く場合は歯科医に相談してください。";
    for (const x of pieces(ja, "ja")) expect([...x].length).toBeLessThanOrEqual(lineLimit("ja") * 2);
  });

  it("wraps a cue into two balanced lines at a space", () => {
    const w = wrap("If it lasts longer than a week, tell your dentist.", "en");
    expect(w.split("\n")).toHaveLength(2);
    for (const line of w.split("\n")) expect(line.length).toBeLessThanOrEqual(42);
    expect(wrap("Short line.", "en")).toBe("Short line.");
  });
});

describe("subtitleCues", () => {
  // Measured pauses (detectPauses on the mastered narration): a lead-in, the two sentence gaps, a breath, the tail.
  const pauses = [
    { start: 0, end: 0.25 },
    { start: 2.9, end: 3.45 },
    { start: 6.2, end: 6.3 }, // a breath inside a sentence: too short to count
    { start: 8.4, end: 9.0 },
    { start: 11.6, end: 12.0 },
  ];

  it("puts every sentence end on a measured pause and the next cue where the voice starts again", () => {
    const subs = subtitleCues(NARRATION, 12, pauses, "en")!;
    expect(subs.source).toBe("pauses");
    expect(subs.cues[0].start).toBeCloseTo(0.25, 2);
    const ends = subs.cues.map((c) => c.end);
    expect(ends).toContain(2.9);
    expect(subs.cues.map((c) => c.start)).toContain(3.45);
    expect(ends).toContain(8.4);
    expect(subs.cues.map((c) => c.start)).toContain(9);
    // Nothing runs past the voice.
    expect(subs.cues.at(-1)!.end).toBeLessThanOrEqual(11.6 + 1e-9);
  });

  it("keeps cues in order, never overlapping, readable and with the whole text", () => {
    const subs = subtitleCues(NARRATION, 12, pauses, "en")!;
    for (let i = 0; i < subs.cues.length; i++) {
      const c = subs.cues[i];
      expect(c.end).toBeGreaterThan(c.start);
      if (i > 0) expect(c.start).toBeGreaterThanOrEqual(subs.cues[i - 1].end);
      expect(c.end - c.start).toBeGreaterThanOrEqual(MIN_CUE_S - 1e-9);
      for (const line of c.text.split("\n")) expect(line.length).toBeLessThanOrEqual(42);
    }
    expect(subs.cues.map((c) => c.text.replace(/\n/g, " ")).join(" ")).toBe(NARRATION);
  });

  it("without pauses (mastering failed) spreads the text over the voice's length", () => {
    const subs = subtitleCues(NARRATION, 12, [], "en")!;
    expect(subs.source).toBe("length");
    expect(subs.cues[0].start).toBe(0);
    expect(subs.cues.at(-1)!.end).toBeCloseTo(12, 5);
  });

  it("returns nothing without text or length", () => {
    expect(subtitleCues("", 10, pauses, "en")).toBeNull();
    expect(subtitleCues(NARRATION, 0, pauses, "en")).toBeNull();
    expect(subtitleCues(undefined, undefined, undefined, "en")).toBeNull();
  });

  it("merges a pause split by a breath into one gap, and the speech is what is left", () => {
    const gaps = gapsOf([{ start: 2, end: 2.15 }, { start: 2.25, end: 2.6 }, { start: 5, end: 5.05 }], 8);
    expect(gaps).toEqual([{ start: 2, end: 2.6 }]);
    expect(speechSpans(gaps, 8)).toEqual([
      { start: 0, end: 2 },
      { start: 2.6, end: 8 },
    ]);
  });

  it("times Japanese narration by characters", () => {
    const subs = subtitleCues("ホワイトニングの後にしみるのはよくあることです。数日でおさまることが多いです。", 6, [{ start: 2.8, end: 3.2 }], "ja")!;
    expect(subs.cues.length).toBeGreaterThanOrEqual(2);
    expect(subs.cues[0].end).toBeCloseTo(2.8, 2);
    expect(subs.cues[1].start).toBeCloseTo(3.2, 2);
  });
});
