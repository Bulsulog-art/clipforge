import { describe, expect, it } from "vitest";
import { LOCALES } from "./dentvideo";
import { REVIEW_TEXT, reviewText } from "./dentvideo-review";

describe("the review player's own words", () => {
  const keys = Object.keys(REVIEW_TEXT.en).sort();

  it.each(LOCALES)("%s has exactly the English keys, each a written string", (l) => {
    const t = REVIEW_TEXT[l];
    expect(Object.keys(t).sort()).toEqual(keys);
    for (const [k, v] of Object.entries(t)) {
      expect(typeof v, k).toBe("string");
      expect(v.trim().length, k).toBeGreaterThan(1);
      expect(v, k).not.toMatch(/\{\w+\}/);
    }
  });

  it.each(LOCALES)("%s: calm product words, no dashes as punctuation and no exclamation marks", (l) => {
    for (const [k, v] of Object.entries(REVIEW_TEXT[l])) expect(v, k).not.toMatch(/[–—!！]/);
  });

  it.each(LOCALES.filter((l) => l !== "en"))("%s is translated, not English", (l) => {
    for (const k of keys) expect(REVIEW_TEXT[l][k as keyof typeof REVIEW_TEXT.en], k).not.toBe(REVIEW_TEXT.en[k as keyof typeof REVIEW_TEXT.en]);
  });

  it("the question is a question, in its language's punctuation", () => {
    for (const l of LOCALES) expect(REVIEW_TEXT[l].postedPrompt, l).toMatch(/[?？؟]$/);
  });

  it("falls back to English for an unknown locale", () => {
    expect(reviewText("xx" as never)).toBe(REVIEW_TEXT.en);
  });
});
