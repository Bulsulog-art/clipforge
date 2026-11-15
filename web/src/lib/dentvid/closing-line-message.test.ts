import { describe, expect, it } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";
import { closingLineMessage, closingLineNote } from "./closing-line-message";
import { closingLineReasons } from "./closing-line";

/** The country a clinic using this interface language most likely posts in. */
const COUNTRY = { en: "US", de: "DE", es: "ES", tr: "TR", fr: "FR", ja: "JP", ar: "AE", pl: "PL" } as const;

describe("a clinic's own closing line", () => {
  it("every language's example in the help text passes its own market's rules", () => {
    for (const [locale, text] of Object.entries(APP_TEXT)) {
      const example = text.form.closingLineHelp.match(/[“„«「]([^”“»」]+)[”“»」]/u)?.[1];
      expect(example, locale).toBeTruthy();
      expect(closingLineReasons(example!, COUNTRY[locale as keyof typeof COUNTRY]), `${locale}: ${example}`).toEqual([]);
    }
  });

  it("names the reason calmly in the interface language", () => {
    expect(closingLineReasons("Hemen randevu alın!", "TR")).toEqual(["booking", "pressure", "exclamation"]);
    expect(closingLineNote("Hemen randevu alın!", "TR", "tr")).toBe(APP_TEXT.tr.form.closingLineReasons.booking);
    expect(closingLineMessage("Kontaktieren Sie uns für weitere Informationen.", "DE", "de")).toContain(APP_TEXT.de.form.closingLineReasons.generic);
    expect(closingLineNote("Book your check-up with us.", "US", "en")).toBeNull();
    // The same booking invitation is fine outside Türkiye, refused in it.
    expect(closingLineNote("Randevu alabilirsiniz.", "DE", "en")).toBeNull();
    expect(closingLineNote("Randevu alabilirsiniz.", "TR", "en")).toBe(APP_TEXT.en.form.closingLineReasons.booking);
    expect(closingLineNote("x".repeat(121), "US", "en")).toMatch(/120/);
  });
});
