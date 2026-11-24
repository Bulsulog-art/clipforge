import { describe, expect, it } from "vitest";
import { LOCALES } from "./dentvideo";
import { fmt } from "./dentvideo-app";
import { LIBRARY_WEEKS_TEXT, libraryWeeksText } from "./dentvideo-library-weeks";
import { weekLabelDate } from "@/lib/dentvid/app-ui";

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const en = LIBRARY_WEEKS_TEXT.en;

describe("library weeks copy in all eight languages", () => {
  for (const lang of LOCALES) {
    it(`${lang}: same keys and placeholders as English, nothing empty, really translated`, () => {
      const mine = LIBRARY_WEEKS_TEXT[lang];
      expect(Object.keys(mine)).toEqual(Object.keys(en));
      for (const [k, v] of Object.entries(mine) as [keyof typeof en, string][]) {
        expect(v.trim(), `${lang}.${k}`).not.toBe("");
        expect(placeholders(v), `${lang}.${k}`).toEqual(placeholders(en[k]));
        if (lang !== "en") expect(v, `${lang}.${k}`).not.toBe(en[k]);
      }
    });
  }

  it("the next-delivery line names the date and the five videos, in every language", () => {
    const five: Record<string, RegExp> = { en: /five/, de: /fünf/, es: /cinco/, tr: /beş/, fr: /cinq/, ja: /5本/, ar: /الخمسة/, pl: /pięć/ };
    const monday: Record<string, RegExp> = { en: /Monday/, de: /Montag/, es: /lunes/, tr: /Pazartesi/, fr: /lundi/, ja: /（月）/, ar: /الاثنين/, pl: /poniedziałek/ };
    for (const lang of LOCALES) {
      const line = LIBRARY_WEEKS_TEXT[lang].nextDelivery;
      expect(line, lang).toContain("{date}");
      expect(line, lang).toMatch(five[lang]);
      expect(line, lang).toMatch(monday[lang]);
      // Filled in, it reads as one sentence with the date in the clinic's own form.
      const filled = fmt(line, { date: weekLabelDate("2026-12-07", lang) });
      expect(filled, lang).not.toMatch(/\{\w+\}/);
      expect(filled, lang).toContain(weekLabelDate("2026-12-07", lang));
    }
  });

  it("plain and calm: no dashes as punctuation, no exclamation marks, no promises", () => {
    const banned = [/[—–]/, /[!！]/, /guarant|garanti|保証|ضمان/i, /free|kostenlos|gratis|ücretsiz|gratuit|darmow|無料|مجان/i];
    for (const lang of LOCALES) for (const [k, v] of Object.entries(LIBRARY_WEEKS_TEXT[lang])) for (const b of banned) expect(v, `${lang}.${k}`).not.toMatch(b);
  });

  it("unknown languages fall back to English", () => {
    expect(libraryWeeksText("xx")).toBe(en);
    expect(libraryWeeksText("tr")).toBe(LIBRARY_WEEKS_TEXT.tr);
  });
});
