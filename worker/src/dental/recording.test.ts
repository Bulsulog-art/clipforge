import { describe, it, expect } from "vitest";
process.env.NEXT_PUBLIC_SUPABASE_URL ||= "http://localhost:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY ||= "test";
const { spokenText, findingsOf } = await import("./recording.js");

describe("recording helpers", () => {
  const t = {
    language: "de",
    text: "",
    words: [
      { word: "Putzen", start: 0, end: 0.4 },
      { word: "Sie", start: 0.4, end: 0.6 },
      { word: "normal", start: 0.6, end: 1 },
      { word: "weiter", start: 1, end: 1.4 },
      { word: "danach", start: 5, end: 5.4 },
    ],
  };

  it("takes exactly the words spoken inside the clip", () => {
    expect(spokenText(t, 0, 1.4)).toBe("Putzen Sie normal weiter");
    expect(spokenText(t, 4.9, 6)).toBe("danach");
  });

  it("lists every reason the dentist should look at a clip", () => {
    const f = findingsOf(
      { verdict: "revise", hard: [{ rule: "absolute", match: "schmerzfrei", why: "absolute" }], issues: [] },
      { verdict: "revise", issues: [{ quote: "q", problem: "p", fix: "f" }] },
    );
    expect(f).toHaveLength(2);
    expect(f[0]).toContain("schmerzfrei");
  });
});
