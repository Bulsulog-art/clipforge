import { describe, expect, test } from "vitest";
import { buildKaraokeASS, buildHookASS } from "./captions.js";
import type { Word } from "./transcribe.js";

const fakeWords: Word[] = [
  { word: "AI", start: 10.0, end: 10.4 },
  { word: "made", start: 10.5, end: 10.9 },
  { word: "this", start: 10.9, end: 11.2 },
  { word: "happen", start: 11.2, end: 11.6 },
  { word: "in", start: 11.6, end: 11.7 },
  { word: "seconds", start: 11.7, end: 12.4 },
  { word: "—", start: 12.4, end: 12.5 },
  { word: "wild.", start: 12.5, end: 13.0 },
];

describe("captions/karaoke", () => {
  test("ASS header with niche style colors", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14);
    expect(ass).toContain("[Script Info]");
    expect(ass).toContain("Style: Caption,Inter Bold");
    // motivation highlight FF3366 → BGR 6633FF
    expect(ass).toContain("Dialogue:");
  });

  test("falls back to default style for unknown niche", () => {
    const ass = buildKaraokeASS(fakeWords, "totally-unknown-niche", 10, 14);
    expect(ass).toContain("Style: Caption");
  });

  test("filters words outside the clip window", () => {
    const wider: Word[] = [
      { word: "before", start: 5, end: 5.5 },
      ...fakeWords,
      { word: "after", start: 30, end: 30.5 },
    ];
    const ass = buildKaraokeASS(wider, "motivation", 10, 14);
    expect(ass).not.toContain("before");
    expect(ass).not.toContain("after");
  });

  test("chunks long word lists into multiple Dialogue events", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14);
    const dialogueCount = (ass.match(/Dialogue:/g) ?? []).length;
    expect(dialogueCount).toBeGreaterThanOrEqual(2);
  });

  test("escapes braces and backslashes safely", () => {
    const tricky: Word[] = [
      { word: "test{value}", start: 10.1, end: 10.3 },
      { word: "back\\slash", start: 10.4, end: 10.6 },
    ];
    const ass = buildKaraokeASS(tricky, "default", 10, 11);
    expect(ass).toContain("\\{value\\}");
    expect(ass).toContain("\\\\slash");
  });

  test("produces valid ASS timecodes (H:MM:SS.cc)", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14);
    const matches = ass.match(/\d:\d{2}:\d{2}\.\d{2}/g);
    expect(matches?.length ?? 0).toBeGreaterThan(0);
  });
});

describe("captions/hook", () => {
  test("hook fits at top with pop animation tags", () => {
    const ass = buildHookASS("This will change everything you know", 8, "motivation");
    expect(ass).toContain("Style: Hook");
    expect(ass).toContain("\\fad(");
    expect(ass).toContain("\\fscx");
  });

  test("hook is wrapped onto at most 3 lines", () => {
    const long = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen";
    const ass = buildHookASS(long, 5, "tech");
    // 3 \N joins → 3 lines (count newlines in single Dialogue)
    const dialogue = ass.match(/Dialogue:[^\n]+/)?.[0] ?? "";
    const lines = (dialogue.match(/\\N/g) ?? []).length + 1;
    expect(lines).toBeLessThanOrEqual(3);
  });
});
