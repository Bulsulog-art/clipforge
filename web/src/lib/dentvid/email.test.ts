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
    // The inbox line says what is waiting (not the first sentence of the body again).
    expect(m.html).toMatch(/display:none[^>]*>5 bereit zur Freigabe\. Nichts wird veröffentlicht/);
    expect(m.html).toContain('bgcolor="#0f5c5c"');
    // Outlook's VML button, everyone else's button, and the link written out under it.
    expect(m.html).toContain("<v:roundrect");
    expect(m.html.match(/href="https:\/\/dentvideo\.com\/app"/g)).toHaveLength(3);
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

describe("deliveryAddress: test inboxes never get real mail", async () => {
  const { deliveryAddress, TEST_EMAIL_SINK } = await import("./email");
  it("routes QA, e2e and monitor addresses to Resend's sink", () => {
    for (const a of ["qa+appqa1@bulsulabs.com", "e2e-monitor+123@bulsulabs.com", "e2e7@example.com", "dvqa+x@bulsulabs.com"]) expect(deliveryAddress(a, {}), a).toBe(TEST_EMAIL_SINK);
  });
  it("keeps real clinics and the owner", () => {
    for (const a of ["dr.ayse@klinik.com.tr", "hello@dentvideo.com", "owner@gmail.com", "quality@clinic.de"]) expect(deliveryAddress(a, {}), a).toBe(a);
  });
  it("extra patterns from DENTVID_TEST_EMAIL_PATTERNS", () => {
    expect(deliveryAddress("tester+1@gmail.com", { DENTVID_TEST_EMAIL_PATTERNS: "tester+*@*" })).toBe(TEST_EMAIL_SINK);
  });
});
