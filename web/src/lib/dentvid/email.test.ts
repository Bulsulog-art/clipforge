import { describe, it, expect } from "vitest";
import { EMAIL_LANGUAGES, readyEmail } from "./email";
import { LANGUAGES } from "./profile";
import { lifecycleText } from "@/content/dentvideo-lifecycle";

describe("readyEmail", () => {
  it("speaks every language a clinic can choose", () => {
    expect(new Set(EMAIL_LANGUAGES)).toEqual(new Set(LANGUAGES.map((l) => l.code)));
  });
  it("counts ready and flagged videos and links to the library", () => {
    const m = readyEmail({ kind: "week", counts: { ready: 4, flagged: 1 }, clinicName: "Gülüş <Klinik>", language: "tr", appUrl: "https://dentvideo.com/app" })!;
    expect(m.subject).toBe("5 yeni video onayınızı bekliyor");
    expect(m.text).toContain("4 video onaya hazır");
    expect(m.text).toContain("https://dentvideo.com/app");
    expect(m.html).toContain("Gülüş &lt;Klinik&gt;");
    expect(m.html).not.toContain("<Klinik>");
  });
  it("is built for mail clients: language, preheader, a button Outlook draws, the link in plain sight", () => {
    const m = readyEmail({ kind: "week", counts: { ready: 5, flagged: 0 }, clinicName: "Praxis", language: "de", appUrl: "https://dentvideo.com/app" })!;
    expect(m.html).toContain('<html lang="de" dir="ltr">');
    expect(m.html).toContain('<meta charset="utf-8">');
    expect(m.html).toMatch(/display:none[^>]*>die Patientenvideos dieser Woche/);
    expect(m.html).toContain('bgcolor="#0f5c5c"');
    expect(m.html.match(/href="https:\/\/dentvideo\.com\/app"/g)).toHaveLength(2);
    expect(m.html).not.toContain("markiert"); // no flagged line when nothing is flagged
    expect(readyEmail({ kind: "week", counts: { ready: 1, flagged: 0 }, clinicName: "x", language: "nl", appUrl: "u" })!.html).toContain('<html lang="en" dir="ltr">');
  });
  it("is signed by the DentVideo team in every language, like the other emails", () => {
    for (const language of EMAIL_LANGUAGES) {
      const signoff = lifecycleText(language).copy.signoff;
      for (const kind of ["week", "recording"] as const) {
        const m = readyEmail({ kind, counts: { ready: 2, flagged: 1 }, clinicName: "x", language, appUrl: "https://dentvideo.com/app" })!;
        expect(m.text, `${language}/${kind}`).toContain(signoff);
      }
    }
    expect(readyEmail({ kind: "week", counts: { ready: 1, flagged: 0 }, clinicName: "x", language: "en", appUrl: "u" })!.text).toContain("The DentVideo team");
  });
  it("sends nothing when nothing was made, and falls back to English", () => {
    expect(readyEmail({ kind: "week", counts: { ready: 0, flagged: 0 }, clinicName: "x", language: "tr", appUrl: "u" })).toBeNull();
    expect(readyEmail({ kind: "recording", counts: { ready: 2, flagged: 0 }, clinicName: "x", language: "nl", appUrl: "u" })!.subject).toBe("2 clips from your recording are ready");
  });
});
