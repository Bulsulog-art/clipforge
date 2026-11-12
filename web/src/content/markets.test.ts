import { describe, expect, it } from "vitest";
import { LANDING, LOCALES, RTL_LOCALES, dirOf, type Locale } from "./dentvideo";
import { APP_TEXT } from "./dentvideo-app";
import { ENTITY } from "./guides/entity";
import { GUIDE_UI } from "./guides/ui";
import { readyEmail } from "@/lib/dentvid/email";

/**
 * The website brief in docs/MARKETS.md, as tests: each new market's
 * do-not-say list, its form of address, its regulator named in the FAQ, and
 * prices only in USD. Words on a list may appear inside quotation marks —
 * that is us naming what the reviewers catch ("「痛くない」", «الأفضل»,
 * „bezbolesny”) — but never as our own claim.
 */
const QUOTED = /「[^」]*」|『[^』]*』|«[^»]*»|„[^”“]*[”“]|“[^”]*”|"[^"]*"/g;

function allText(l: Locale): string {
  const mail = (["week", "recording"] as const)
    .map((kind) => readyEmail({ kind, counts: { ready: 3, flagged: 2 }, clinicName: "Clinic", language: l, appUrl: "https://dentvideo.com/app" })?.text)
    .join("\n");
  // JSON.stringify escapes the quote marks of each string; read the values themselves.
  const values: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") values.push(v);
    else if (typeof v === "function") values.push(String((v as (n: number) => string)(3)));
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  [LANDING[l], APP_TEXT[l], ENTITY[l], GUIDE_UI[l]].forEach(walk);
  return [...values, mail].join("\n");
}

const unquoted = (l: Locale) => allText(l).replace(QUOTED, "");

const DO_NOT_SAY: Partial<Record<Locale, RegExp[]>> = {
  // MHLW 医療広告ガイドライン: no superlatives, comparisons, guarantees, unverifiable results; no あなた.
  ja: [/日本一/, /No\.?\s?1/i, /ナンバーワン/, /業界最安/, /最高/, /絶対/, /必ず/, /確実/, /倍/, /完全対応/, /100\s?[%％]/, /無痛/, /痛くない/, /あなた/],
  // DHA's banned words and offers.
  ar: [/الأفضل/, /رقم\s?1/, /الأرخص/, /مضمون/, /نتائج فورية/, /بدون (أي )?آثار جانبية/, /100\s?%/, /لفترة محدودة/],
  // No superlatives, guarantees, "painless", legal-compliance promises; formal Państwo, never "ty" forms.
  pl: [/najlepsz/i, /nr\.?\s?1\b/i, /gwarantujemy/i, /gwarantowan\S* (efekt|wynik|pacjent)/i, /bezbolesn/i, /100\s?%/, /zgodn\S* z prawem/i, /\b[Tt]w(ój|oja|oje|ojego|ojej|oich|oim)\b/, /\bciebie\b/i, /\bmasz\b/i],
};

describe("market copy rules (docs/MARKETS.md)", () => {
  it.each(Object.keys(DO_NOT_SAY) as Locale[])("%s: nothing from the do-not-say list, outside quotation marks", (l) => {
    const text = unquoted(l);
    for (const re of DO_NOT_SAY[l]!) {
      const m = text.match(re);
      expect(m ? text.slice(Math.max(0, (m.index ?? 0) - 30), (m.index ?? 0) + 30) : null, `${l} ${re}`).toBeNull();
    }
  });

  it("the advertising-rules FAQ names each market's regulator and the clinic's own responsibility", () => {
    const rules = (l: Locale) => LANDING[l].faq[3].a;
    expect(rules("ja")).toContain("厚生労働省");
    expect(rules("ja")).toContain("医療広告ガイドライン");
    expect(rules("ja")).toContain("院長先生の承認");
    expect(rules("ar")).toContain("هيئة الصحة بدبي");
    expect(rules("ar")).toContain("وزارة الصحة");
    // Gulf: permits stay with the clinic; the approval step is where the medical director signs off.
    expect(rules("ar")).toContain("تصاريح الإعلان");
    expect(rules("ar")).toContain("من مسؤولية العيادة");
    expect(rules("ar")).toContain("المدير الطبي");
    expect(rules("pl")).toContain("Kodeks Etyki Lekarskiej");
    expect(rules("pl")).toContain("izbę lekarską");
    for (const l of ["ja", "ar", "pl"] as const) expect(rules(l), l).toMatch(/法律事務所|مكتب محاماة|kancelarią/);
  });

  it("Polish speaks to the clinic as Państwo", () => {
    const pl = JSON.stringify(LANDING.pl);
    expect(pl.match(/Państw/g)?.length ?? 0).toBeGreaterThan(20);
  });

  it("prices stay in USD: no local-currency figures anywhere", () => {
    for (const l of LOCALES) expect(allText(l), l).not.toMatch(/\d\s?(円|zł|PLN|AED|SAR|JPY)|(¥|￥|AED|SAR|PLN)\s?\d/);
  });

  it("only Arabic is right to left", () => {
    expect(RTL_LOCALES).toEqual(["ar"]);
    expect(LOCALES.filter((l) => dirOf(l) === "rtl")).toEqual(["ar"]);
  });

  it("the ready email is right to left in Arabic, with the link kept left to right", () => {
    const m = readyEmail({ kind: "week", counts: { ready: 4, flagged: 1 }, clinicName: "عيادة الابتسامة", language: "ar", appUrl: "https://dentvideo.com/app" })!;
    expect(m.html).toContain('<html lang="ar" dir="rtl">');
    expect(m.html).toContain("text-align:right");
    expect(m.html).toContain('dir="ltr" class="dv-link" style="color:#0f5c5c">https://dentvideo.com/app');
    expect(m.subject).toContain("5");
    const ja = readyEmail({ kind: "week", counts: { ready: 5, flagged: 0 }, clinicName: "さくら歯科", language: "ja", appUrl: "u" })!;
    expect(ja.subject).toBe("新しい動画5本のご確認をお願いします");
    const pl = readyEmail({ kind: "week", counts: { ready: 2, flagged: 3 }, clinicName: "Gabinet", language: "pl", appUrl: "u" })!;
    expect(pl.text).toContain("Gotowe do akceptacji: 2");
  });
});
