import { describe, it, expect } from "vitest";
import { asLocale, fromAcceptLanguage, resolveLocale } from "./locale";

describe("resolveLocale", () => {
  it("prefers the clinic's language", () => {
    expect(resolveLocale({ clinicLanguage: "tr", cookie: "de", acceptLanguage: "fr" })).toBe("tr");
  });
  it("falls back to English for clinic languages the interface does not speak", () => {
    expect(resolveLocale({ clinicLanguage: "it", cookie: "de" })).toBe("en");
    expect(resolveLocale({ clinicLanguage: "pt" })).toBe("en");
  });
  it("uses the cookie before the browser", () => {
    expect(resolveLocale({ cookie: "es", acceptLanguage: "de-DE,de;q=0.9" })).toBe("es");
  });
  it("ignores an unknown cookie", () => {
    expect(resolveLocale({ cookie: "xx", acceptLanguage: "fr-FR" })).toBe("fr");
  });
  it("defaults to English", () => {
    expect(resolveLocale({})).toBe("en");
    expect(resolveLocale({ acceptLanguage: "ko,zh;q=0.8" })).toBe("en");
  });
});

describe("fromAcceptLanguage", () => {
  it("honours q-values and order", () => {
    expect(fromAcceptLanguage("it-IT,it;q=0.9,tr;q=0.8,de;q=0.7")).toBe("tr");
    expect(fromAcceptLanguage("de;q=0.5,fr;q=0.9")).toBe("fr");
    expect(fromAcceptLanguage("en-US,en;q=0.9")).toBe("en");
    expect(fromAcceptLanguage("tr;q=0,de")).toBe("de");
    expect(fromAcceptLanguage("ja-JP,ja;q=0.9,en;q=0.8")).toBe("ja");
    expect(fromAcceptLanguage("ar-AE,ar;q=0.9")).toBe("ar");
    expect(fromAcceptLanguage("ar-SA")).toBe("ar");
    expect(fromAcceptLanguage("pl-PL,pl;q=0.9,en-US;q=0.8")).toBe("pl");
  });
  it("handles empty input", () => {
    expect(fromAcceptLanguage(null)).toBeNull();
    expect(fromAcceptLanguage("")).toBeNull();
  });
});

describe("asLocale", () => {
  it("reads region tags and rejects others", () => {
    expect(asLocale("TR-tr")).toBe("tr");
    expect(asLocale("pt")).toBeNull();
    expect(asLocale(undefined)).toBeNull();
  });
});
