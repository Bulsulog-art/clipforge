import { describe, expect, it } from "vitest";
import { LIFECYCLE_COPY, LIFECYCLE_LANGUAGES, lifecycleText } from "@/content/dentvideo-lifecycle";
import { LOCALES } from "@/content/dentvideo";
import { offerNudgeEmail, previewNudgeEmail, unsubscribePage, usd, welcomeEmail } from "./lifecycle-email";
import { offerTerms } from "./lifecycle";
import { DV_FOUNDING, DV_PRICES_USD } from "./billing";

/** Every leaf string with its path, e.g. "offer.whyNowOpen" or "welcome.steps.2.body". */
function leaves(o: unknown, path = ""): [string, string][] {
  if (typeof o === "string") return [[path, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => leaves(v, `${path}.${i}`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const en = new Map(leaves(LIFECYCLE_COPY.en));

describe("lifecycle copy parity", () => {
  it("covers exactly the site's languages", () => {
    expect([...LIFECYCLE_LANGUAGES].sort()).toEqual([...LOCALES].sort());
  });

  for (const lang of LIFECYCLE_LANGUAGES) {
    it(`${lang}: same structure and placeholders as English, nothing empty`, () => {
      const mine = new Map(leaves(LIFECYCLE_COPY[lang]));
      expect([...mine.keys()]).toEqual([...en.keys()]);
      for (const [k, v] of mine) {
        expect(v.trim(), `${lang}.${k}`).not.toBe("");
        expect(placeholders(v), `${lang}.${k}`).toEqual(placeholders(en.get(k)!));
      }
    });
  }

  it("makes no promises it cannot keep (guarantees, painless, patient numbers, fake urgency)", () => {
    const banned = [
      /guarant/i, /painless/i, /garanti/i, /schmerzfrei/i, /sin dolor/i, /indolore/i, /ağrısız/i, /bezbol/i, /痛みのない/, /保証/, /بدون ألم/, /مضمون/, /ضمان/,
      /more patients/i, /new patients/i, /mehr Patienten/i, /más pacientes/i, /plus de patients/i, /daha fazla hasta/i, /więcej pacjentów/i, /患者さんが増/, /مرضى أكثر|مزيد من المرضى/,
      /only \d+ left/i, /hurry/i, /last chance/i, /expires (today|tonight)/i, /\b\d+ spots?\b/i,
    ];
    for (const lang of LIFECYCLE_LANGUAGES) for (const [k, v] of leaves(LIFECYCLE_COPY[lang])) for (const b of banned) expect(v, `${lang}.${k}`).not.toMatch(b);
  });

  it("falls back to English for languages without copy (it, pt)", () => {
    expect(lifecycleText("it").lang).toBe("en");
    expect(lifecycleText(undefined).lang).toBe("en");
    expect(lifecycleText("ja").lang).toBe("ja");
  });
});

describe("rendered emails", () => {
  const unsub = "https://dentvideo.com/api/dentvideo/unsubscribe?t=x.y";
  const open = offerTerms({});
  const closed = offerTerms({ DENTVIDEO_FOUNDING_OFFER: "off" });

  it("takes the offer terms from billing.ts, never hard-coded", () => {
    expect(open).toEqual({
      open: true,
      priceUsd: DV_FOUNDING.priceUsd,
      thenUsd: DV_PRICES_USD.practice.month,
      months: DV_FOUNDING.months,
      clinics: DV_FOUNDING.clinics,
      code: "KURUCU100",
    });
    expect(closed).toEqual({ open: false, fromUsd: DV_PRICES_USD.starter.month });
    expect(offerTerms({ DENTVIDEO_FOUNDING_CODE: "X1" })).toMatchObject({ code: "X1" });
  });

  for (const lang of LIFECYCLE_LANGUAGES) {
    it(`${lang}: every email renders completely, with the right direction`, () => {
      const mails = [
        welcomeEmail({ language: lang, clinicName: "Smile & Co", appUrl: "https://dentvideo.com/app" }),
        previewNudgeEmail({ language: lang, clinicName: "Smile & Co", url: "https://dentvideo.com/start?step=preview&lang=" + lang, unsubscribeUrl: unsub }),
        offerNudgeEmail({ language: lang, clinicName: "Smile & Co", url: "https://dentvideo.com/start?step=plan", unsubscribeUrl: unsub, offer: open }),
        offerNudgeEmail({ language: lang, clinicName: "Smile & Co", url: "https://dentvideo.com/start?step=plan", unsubscribeUrl: unsub, offer: closed }),
      ];
      for (const m of mails) {
        for (const part of [m.subject, m.html, m.text]) expect(part).not.toMatch(/\{\w+\}/);
        expect(m.subject.length).toBeLessThanOrEqual(90);
        expect(m.html).toContain(`lang="${lang}"`);
        expect(m.html).toContain(lang === "ar" ? 'dir="rtl"' : 'dir="ltr"');
        expect(m.html).toContain("Smile &amp; Co"); // escaped
        expect(m.html).not.toContain("Smile & Co");
        expect(m.html).toContain('role="presentation"');
      }
      const [welcome, preview, offer] = mails;
      // Reminders carry the unsubscribe link; the transactional welcome does not.
      expect(preview.html).toContain(unsub.replace(/&/g, "&amp;"));
      expect(offer.text).toContain(unsub);
      expect(welcome.html).not.toContain("unsubscribe");
      expect(offer.text).toContain(usd(lang, DV_FOUNDING.priceUsd));
      expect(offer.text).toContain(open.open ? open.code : "");
      expect(welcome.html).toContain("mailto:hello@dentvideo.com");
    });
  }

  it("reminders follow the order: problem → outcome → why us → why now", () => {
    for (const lang of LIFECYCLE_LANGUAGES) {
      const c = LIFECYCLE_COPY[lang].preview;
      const m = previewNudgeEmail({ language: lang, clinicName: "A", url: "https://x", unsubscribeUrl: unsub });
      const at = [c.problem, c.outcome, c.whyUs, c.whyNow].map((s) => m.text.indexOf(s));
      expect(at.every((i) => i >= 0), lang).toBe(true);
      expect([...at].sort((a, b) => a - b), lang).toEqual(at);
    }
  });

  it("unsubscribe page in each state", () => {
    expect(unsubscribePage({ language: "ar", state: "done", homeUrl: "https://dentvideo.com" })).toContain('dir="rtl"');
    expect(unsubscribePage({ language: "de", state: "done", homeUrl: "https://dentvideo.com" })).toContain("Sie sind abgemeldet");
    expect(unsubscribePage({ language: "en", state: "invalid", homeUrl: "https://dentvideo.com" })).toContain("mailto:hello@dentvideo.com");
  });
});
