import { describe, expect, it } from "vitest";
import { LOCALES } from "./dentvideo";
import { VERIFY_COPY, fmtAuth, verifyText } from "./dentvideo-auth";

type Tree = { [k: string]: string | Tree };

const leaves = (t: Tree, prefix = ""): [string, string][] =>
  Object.entries(t).flatMap(([k, v]) => (typeof v === "string" ? [[`${prefix}${k}`, v] as [string, string]] : leaves(v, `${prefix}${k}.`)));
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("email verification copy", () => {
  const en = new Map(leaves(VERIFY_COPY.en as unknown as Tree));

  it("exists for every site language", () => {
    expect(Object.keys(VERIFY_COPY).sort()).toEqual([...LOCALES].sort());
  });

  for (const locale of LOCALES) {
    it(`${locale}: same keys and placeholders as English, nothing empty or left in English`, () => {
      const mine = new Map(leaves(VERIFY_COPY[locale] as unknown as Tree));
      expect([...mine.keys()].sort()).toEqual([...en.keys()].sort());
      for (const [key, value] of mine) {
        expect(value.trim(), `${locale}.${key}`).not.toBe("");
        expect(placeholders(value), `${locale}.${key}`).toEqual(placeholders(en.get(key)!));
        if (locale !== "en") expect(value, `${locale}.${key} is still English`).not.toBe(en.get(key));
      }
    });
  }

  it("says where the code went, and the subject carries the code", () => {
    for (const locale of LOCALES) {
      const v = verifyText(locale);
      expect(fmtAuth(v.lead, { email: "a@b.example" })).toContain("a@b.example");
      expect(fmtAuth(v.email.subject, { code: "123456" })).toContain("123456");
      expect(fmtAuth(v.wrong, { n: 3 })).toContain("3");
    }
  });

  it("Arabic is written in Arabic script; unknown languages fall back to English", () => {
    expect(verifyText("ar").title).toMatch(/[؀-ۿ]/);
    expect(verifyText("it")).toBe(VERIFY_COPY.en);
    expect(verifyText(null)).toBe(VERIFY_COPY.en);
  });
});
