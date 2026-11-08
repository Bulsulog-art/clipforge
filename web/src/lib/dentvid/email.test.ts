import { describe, it, expect } from "vitest";
import { EMAIL_LANGUAGES, readyEmail } from "./email";

describe("readyEmail", () => {
  it("speaks every language a clinic can choose", () => {
    expect(new Set(EMAIL_LANGUAGES)).toEqual(new Set(["en", "de", "es", "fr", "it", "pt", "tr"]));
  });
  it("counts ready and flagged videos and links to the library", () => {
    const m = readyEmail({ kind: "week", counts: { ready: 4, flagged: 1 }, clinicName: "Gülüş <Klinik>", language: "tr", appUrl: "https://dentvideo.com/app" })!;
    expect(m.subject).toBe("5 yeni video onayınızı bekliyor");
    expect(m.text).toContain("4 video onaya hazır");
    expect(m.text).toContain("https://dentvideo.com/app");
    expect(m.html).toContain("Gülüş &lt;Klinik&gt;");
    expect(m.html).not.toContain("<Klinik>");
  });
  it("sends nothing when nothing was made, and falls back to English", () => {
    expect(readyEmail({ kind: "week", counts: { ready: 0, flagged: 0 }, clinicName: "x", language: "tr", appUrl: "u" })).toBeNull();
    expect(readyEmail({ kind: "recording", counts: { ready: 2, flagged: 0 }, clinicName: "x", language: "nl", appUrl: "u" })!.subject).toBe("2 clips from your recording are ready");
  });
});
