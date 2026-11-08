import { describe, it, expect } from "vitest";
process.env.OPENAI_API_KEY ||= "test-openai-key";
const { restorePunctuation } = await import("./transcribe.js");

const w = (words: string[]) => words.map((word, i) => ({ word, start: i, end: i + 0.5 }));

describe("restorePunctuation", () => {
  it("gives timed words their punctuation and case from the full text (German, as seen live)", () => {
    const out = restorePunctuation(
      w(["Zuerst", "solange", "die", "Betäubung", "wirkt", "essen", "Sie", "bitte", "nichts"]),
      "Zuerst: Solange die Betäubung wirkt, essen Sie bitte nichts.",
    );
    expect(out.map((x) => x.word).join(" ")).toBe("Zuerst: Solange die Betäubung wirkt, essen Sie bitte nichts.");
    expect(out[4].start).toBe(4); // timings untouched
  });

  it("skips over tokens the words do not have, and leaves unmatched words alone", () => {
    const out = restorePunctuation(w(["Hallo", "Welt", "xyz"]), "Hallo, — liebe Welt!");
    expect(out.map((x) => x.word)).toEqual(["Hallo,", "Welt!", "xyz"]);
  });

  it("handles Turkish letters", () => {
    const out = restorePunctuation(w(["diş", "hekiminize", "danışın"]), "Diş hekiminize danışın.");
    expect(out.map((x) => x.word).join(" ")).toBe("Diş hekiminize danışın.");
  });
});
