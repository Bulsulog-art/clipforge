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

  it("leaves real pages alone", () => {
    for (const p of ["/", "/start", "/tr", "/de/guides", "/guides/pricing-guide", "/app", "/post", "/reset", "/ad-checker"]) expect(aliasFor(p, ""), p).toBeNull();
  });
});
