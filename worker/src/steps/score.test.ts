import { describe, it, expect } from "vitest";
import type { Transcript, Word } from "./transcribe.js";

// score.ts → winning-patterns.ts → supabase.ts constructs a Supabase client at
// import time. Provide dummy creds and import the pure helper dynamically so the
// unit test never needs real credentials or touches any network/API.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.OPENAI_API_KEY ||= "test-openai-key";
const { buildSentenceSegments, expandToMinimum } = await import("./score.js");

// Helper: build a Transcript from (word, start, end) tuples.
function tx(words: Array<[string, number, number]>): Transcript {
  const w: Word[] = words.map(([word, start, end]) => ({ word, start, end }));
  return { language: "en", text: w.map((x) => x.word).join(" "), words: w };
}

describe("buildSentenceSegments", () => {
  it("splits on terminal punctuation into sentence segments", () => {
    const t = tx([
      ["Hello", 0, 0.5],
      ["world.", 0.5, 1.0],
      ["This", 1.0, 1.3],
      ["is", 1.3, 1.5],
      ["great!", 1.5, 2.0],
    ]);
    const segs = buildSentenceSegments(t, 60);
    expect(segs).toHaveLength(2);
    expect(segs[0]).toMatchObject({ start: 0, end: 1.0, text: "Hello world." });
    expect(segs[1]).toMatchObject({ start: 1.0, end: 2.0, text: "This is great!" });
  });

  it("treats ? and trailing quotes/brackets as sentence ends", () => {
    const t = tx([
      ["Really", 0, 0.4],
      ['"yes?"', 0.4, 0.9],
      ["Next", 0.9, 1.2],
      ["one.", 1.2, 1.6],
    ]);
    const segs = buildSentenceSegments(t, 60);
    expect(segs).toHaveLength(2);
    expect(segs[0].end).toBe(0.9);
  });

  it("force-splits a runaway unpunctuated stretch at maxSec", () => {
    const words: Array<[string, number, number]> = [];
    for (let i = 0; i < 10; i++) words.push([`w${i}`, i * 2, i * 2 + 2]); // 20s, no punctuation
    const segs = buildSentenceSegments(tx(words), 6);
    expect(segs.length).toBeGreaterThan(1);
    for (const s of segs) expect(s.end - s.start).toBeLessThanOrEqual(6 + 2);
  });

  it("splits an unpunctuated (OpenAI whisper-1) transcript on pauses, not just at maxSec", () => {
    // 3 spoken sentences of ~8s, separated by 1s pauses, no punctuation at all.
    const words: Array<[string, number, number]> = [];
    for (const sentenceStart of [0, 9, 18]) {
      for (let k = 0; k < 16; k++) {
        words.push([`w${sentenceStart}_${k}`, sentenceStart + k * 0.5, sentenceStart + k * 0.5 + 0.45]);
      }
    }
    const segs = buildSentenceSegments(tx(words), 70);
    expect(segs).toHaveLength(3);
    expect(segs.map((s) => s.start)).toEqual([0, 9, 18]);
  });

  it("does not split a punctuated transcript on ordinary pauses", () => {
    const t = tx([
      ["Wait", 0, 0.4],
      ["for", 1.5, 1.8],
      ["it.", 1.9, 2.2],
    ]);
    expect(buildSentenceSegments(t, 60)).toHaveLength(1);
  });

  it("caps segment count for very long sources by merging", () => {
    const words: Array<[string, number, number]> = [];
    for (let i = 0; i < 600; i++) words.push([`x${i}.`, i, i + 1]); // 600 one-word sentences
    const segs = buildSentenceSegments(tx(words), 60);
    expect(segs.length).toBeLessThanOrEqual(240);
    expect(segs[0].start).toBe(0);
    expect(segs[segs.length - 1].end).toBe(600);
  });

  it("returns [] for an empty transcript", () => {
    expect(buildSentenceSegments(tx([]), 60)).toEqual([]);
  });
});

describe("expandToMinimum", () => {
  const segs = [
    { start: 0, end: 4, text: "a" },
    { start: 5, end: 10, text: "b" },
    { start: 11, end: 17, text: "c" },
    { start: 18, end: 23, text: "d" },
  ];

  it("grows a one-sentence moment forward over whole sentences until it is long enough", () => {
    expect(expandToMinimum({ start: 5, end: 10 }, segs, 12, 60)).toEqual({ start: 5, end: 17 });
  });

  it("grows backwards when there is nothing after it", () => {
    expect(expandToMinimum({ start: 18, end: 23 }, segs, 12, 60)).toEqual({ start: 11, end: 23 });
  });

  it("leaves a long-enough moment alone, and gives up rather than exceed maxSec", () => {
    const ok = { start: 0, end: 17 };
    expect(expandToMinimum(ok, segs, 12, 60)).toBe(ok);
    const short = { start: 5, end: 10 };
    expect(expandToMinimum(short, segs, 30, 20)).toBe(short);
  });
});
