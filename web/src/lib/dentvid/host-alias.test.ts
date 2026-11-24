import { describe, expect, it } from "vitest";
import { aliasFor } from "./host-alias";

describe("aliasFor: guessed dentvideo.com addresses", () => {
  it("sends /pricing (with or without a language) to the landing's plans", () => {
    expect(aliasFor("/pricing", "")).toBe("/#pricing");
    expect(aliasFor("/pricing", "?utm_source=x")).toBe("/?utm_source=x#pricing");
    expect(aliasFor("/en/pricing", "")).toBe("/#pricing");
    expect(aliasFor("/tr/pricing", "")).toBe("/tr#pricing");
    expect(aliasFor("/de/plans/", "")).toBe("/de#pricing");
  });

  it("sends sign-in and sign-up guesses to the account form, in the prefix's language", () => {
    expect(aliasFor("/login", "")).toBe("/start?mode=signin");
    expect(aliasFor("/de/login", "")).toBe("/start?mode=signin&lang=de");
    expect(aliasFor("/signup", "")).toBe("/start");
    expect(aliasFor("/tr/start", "")).toBe("/start?lang=tr");
    expect(aliasFor("/register", "?lang=es")).toBe("/start?lang=es");
    expect(aliasFor("/en", "")).toBe("/");
  });

  it("sends /samples and /demo guesses to the examples and the samples section", () => {
    expect(aliasFor("/samples", "")).toBe("/examples");
    expect(aliasFor("/tr/samples", "")).toBe("/tr/examples");
    expect(aliasFor("/demo", "?utm_source=x")).toBe("/?utm_source=x#samples");
    // The examples showcase is a real page in every language: never redirected.
    expect(aliasFor("/examples", "")).toBeNull();
    expect(aliasFor("/de/examples", "")).toBeNull();
    expect(aliasFor("/how-it-works", "")).toBe("/#how");
  });

  it("sends someone looking for a person to the help center's contact block, in their language", () => {
    for (const w of ["contact", "contact-us", "support", "faq", "help-center", "customer-service"]) {
      expect(aliasFor(`/${w}`, ""), w).toBe("/help#help-stuck");
      expect(aliasFor(`/${w}/`, ""), w).toBe("/help#help-stuck");
      expect(aliasFor(`/en/${w}`, ""), w).toBe("/help#help-stuck");
      expect(aliasFor(`/${w.toUpperCase()}`, ""), w).toBe("/help#help-stuck");
    }
    expect(aliasFor("/tr/contact-us", "")).toBe("/tr/help#help-stuck");
    expect(aliasFor("/de/support", "")).toBe("/de/help#help-stuck");
    expect(aliasFor("/ar/faq", "")).toBe("/ar/help#help-stuck");
    expect(aliasFor("/ja/help-center", "")).toBe("/ja/help#help-stuck");
    expect(aliasFor("/pl/customer-service", "")).toBe("/pl/help#help-stuck");
    // The query survives, before the anchor.
    expect(aliasFor("/support", "?utm_source=gbp")).toBe("/help?utm_source=gbp#help-stuck");
  });

  it("keeps the company's legal details on the imprint, and sends /security to the privacy policy", () => {
    expect(aliasFor("/impressum", "")).toBe("/imprint");
    expect(aliasFor("/de/impressum", "")).toBe("/de/imprint");
    expect(aliasFor("/company", "")).toBe("/imprint");
    expect(aliasFor("/es/company", "")).toBe("/es/imprint");
    expect(aliasFor("/security", "")).toBe("/privacy");
    expect(aliasFor("/fr/security", "")).toBe("/fr/privacy");
  });

  it("leaves real pages alone", () => {
    for (const p of ["/", "/start", "/tr", "/de/guides", "/guides/pricing-guide", "/app", "/post", "/reset", "/ad-checker", "/help", "/de/help", "/imprint", "/privacy", "/tr/privacy"]) {
      expect(aliasFor(p, ""), p).toBeNull();
    }
    // Only whole segments: a guide or a deeper address that merely contains the word is not a guess.
    for (const p of ["/guides/support-for-new-clinics", "/support/tickets", "/de/faq/x", "/xx/support", "/supporting"]) expect(aliasFor(p, ""), p).toBeNull();
  });
});
