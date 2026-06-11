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

describe("captions/style library", () => {
  const styleSize = (id: string) => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14, id);
    return ass.match(/Style: Caption,Inter Bold,(\d+),/)?.[1];
  };

  test("each style renders a distinct typographic treatment", () => {
    // bold-pop 84, clean 76, neon 82, hype 94, minimal 72 — all different sizes
    const sizes = ["bold-pop", "clean", "neon", "hype", "minimal"].map(styleSize);
    expect(new Set(sizes).size).toBe(5);
  });

  test("hype style upper-cases the caption words", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14, "hype");
    expect(ass).toContain("SECONDS");
    expect(ass).not.toMatch(/\bseconds\b/);
  });

  test("non-hype styles keep original casing", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14, "clean");
    expect(ass).toContain("seconds");
  });

  test("minimal style drops the outline (Outline=0)", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14, "minimal");
    // …Shadow tuple: ",1,0,4,2," → BorderStyle=1, Outline=0, Shadow=4
    expect(ass).toMatch(/,1,0,4,2,/);
  });

  test("neon style paints the outline with the niche accent (not black)", () => {
    const neon = buildKaraokeASS(fakeWords, "motivation", 10, 14, "neon");
    const bold = buildKaraokeASS(fakeWords, "motivation", 10, 14, "bold-pop");
    // bold-pop outlines black (&H00000000); neon outlines the accent → differs
    expect(neon).not.toContain("&H00000000,&H64000000");
    expect(bold).toContain("&H00000000,&H64000000");
  });

  test("unknown style id falls back to the default (bold-pop, size 84)", () => {
    expect(styleSize("does-not-exist")).toBe("84");
  });
});

describe("captions/keyword highlight", () => {
  test("scales up a keyword word", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14, "bold-pop", ["seconds"]);
    expect(ass).toContain("\\fscx118");
  });

  test("only the keyword is scaled, not every word", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14, "bold-pop", ["seconds"]);
    expect((ass.match(/\\fscx118/g) ?? []).length).toBe(1);
  });

  test("no keywords → no scaling", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14, "bold-pop", []);
    expect(ass).not.toContain("\\fscx118");
  });

  test("matches across case + punctuation ('WILD' → 'wild.')", () => {
    const ass = buildKaraokeASS(fakeWords, "motivation", 10, 14, "bold-pop", ["WILD"]);
    expect(ass).toContain("\\fscx118");
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
