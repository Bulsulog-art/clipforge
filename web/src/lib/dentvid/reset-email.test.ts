import { describe, expect, it } from "vitest";
import { AUTH_LANGUAGES, authText } from "@/content/dentvideo-auth";
import { resetEmail } from "./reset-email";

describe("account recovery copy", () => {
  it("has every string in every language", () => {
    const keys = (o: object): string[] =>
      Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v).map((x) => `${k}.${x}`) : [k])).sort();
    const en = keys(authText("en"));
    for (const l of AUTH_LANGUAGES) {
      expect(keys(authText(l)), l).toEqual(en);
      for (const v of Object.values(authText(l))) if (typeof v === "string") expect(v.trim(), l).not.toBe("");
    }
  });

  it("falls back to English only outside the site's languages", () => {
    expect(authText("it")).toEqual(authText("en"));
    expect(authText(undefined)).toEqual(authText("en"));
    expect(authText("ja")).not.toEqual(authText("en"));
  });
});

describe("resetEmail", () => {
  it("is in the clinic's language, carries the link and escapes it", () => {
    const m = resetEmail({ language: "tr", link: "https://dentvideo.com/reset?token_hash=a&b=<x>" });
    expect(m.subject).toBe(authText("tr").email.subject);
    expect(m.text).toContain("https://dentvideo.com/reset?token_hash=a&b=<x>");
    expect(m.html).toContain("token_hash=a&amp;b=&lt;x&gt;");
    expect(m.html).not.toContain("<x>");
    expect(m.html).toContain('lang="tr" dir="ltr"');
  });

  it("reads right to left in Arabic, with the brand and the link kept left to right", () => {
    const m = resetEmail({ language: "ar", link: "https://dentvideo.com/reset?token_hash=a" });
    expect(m.subject).toBe("إعادة تعيين كلمة مرور DentVideo");
    expect(m.html).toContain('lang="ar" dir="rtl"');
    expect(m.html).toContain('<body dir="rtl"');
    expect(m.html).toMatch(/<p dir="ltr"[^>]*>https:\/\/dentvideo\.com\/reset/);
    expect(m.html).toContain('<span dir="ltr">Dent');
  });

  it("an unknown language gets English, marked as English", () => {
    const m = resetEmail({ language: "x\"><script>", link: "https://dentvideo.com/reset" });
    expect(m.subject).toBe(authText("en").email.subject);
    expect(m.html).toContain('lang="en" dir="ltr"');
  });
});
