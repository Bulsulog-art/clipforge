import { describe, it, expect } from "vitest";
import type { Transcript, Word } from "./transcribe.js";

// score.ts → winning-patterns.ts → supabase.ts constructs a Supabase client at
// import time. Provide dummy creds and import the pure helper dynamically so the
// unit test never needs real credentials or touches any network/API.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test-service-role-key";
process.env.OPENAI_API_KEY ||= "test-openai-key";
const { buildSentenceSegments } = await import("./score.js");

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
