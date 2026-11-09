import { describe, expect, it } from "vitest";
import { LOCALES } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { requestLocale, TOO_MANY } from "./request-locale";

describe("requestLocale", () => {
  it("prefers the dv-lang cookie", () => {
    expect(requestLocale("a=1; dv-lang=ar; b=2", "de-DE,de;q=0.9")).toBe("ar");
  });
  it("falls back to Accept-Language, then English", () => {
    expect(requestLocale("a=1", "pl-PL,pl;q=0.9,en;q=0.5")).toBe("pl");
    expect(requestLocale(null, "it-IT")).toBe("en");
    expect(requestLocale(undefined, undefined)).toBe("en");
  });
  it("ignores an unknown or broken cookie value", () => {
    expect(requestLocale("dv-lang=xx", "fr")).toBe("fr");
    expect(requestLocale("dv-lang=%E0%A4", "ja")).toBe("ja");
  });
});

describe("TOO_MANY", () => {
  it("says what the app says, in every language", () => {
    for (const l of LOCALES) expect(TOO_MANY[l]).toBe(appText(l).errors.tooMany);
  });
});
