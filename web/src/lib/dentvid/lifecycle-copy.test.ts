import { describe, expect, it } from "vitest";
import { LIFECYCLE_COPY, LIFECYCLE_LANGUAGES, lifecycleText } from "@/content/dentvideo-lifecycle";
import { LOCALES } from "@/content/dentvideo";
import { monthLabel, objectionsEmail, offerEmail, sampleEmail, startEmail, unsubscribePage, usd, welcomeEmail } from "./lifecycle-email";
import { lowestMonthlyUsd, offerTerms } from "./lifecycle";
import { DV_FOUNDING, DV_PRICES_USD } from "./billing";
import { SAMPLE_KINDS, sampleEmailFor } from "./email-samples";
import { EMAIL_LANGUAGES } from "./email";

/** Every leaf string with its path, e.g. "offer.terms" or "welcome.steps.2.body". */
function leaves(o: unknown, path = ""): [string, string][] {
  if (typeof o === "string") return [[path, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => leaves(v, `${path}.${i}`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const en = new Map(leaves(LIFECYCLE_COPY.en));

describe("lifecycle copy parity", () => {
  it("covers exactly the site's eight languages", () => {
    expect([...LIFECYCLE_LANGUAGES].sort()).toEqual([...LOCALES].sort());
    expect(LOCALES).toHaveLength(8);
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

  it("is really translated: no non-English language reuses an English sentence", () => {
    for (const lang of LIFECYCLE_LANGUAGES.filter((l) => l !== "en")) {
      for (const [k, v] of leaves(LIFECYCLE_COPY[lang])) {
        if (v.length > 12) expect(v, `${lang}.${k}`).not.toBe(en.get(k));
      }
    }
  });

  it("makes no promises it cannot keep (guarantees, painless, patient numbers, fake urgency)", () => {
    const banned = [
      /guarant/i, /painless/i, /garanti/i, /schmerzfrei/i, /sin dolor/i, /indolore/i, /ağrısız/i, /bezbol/i, /痛みのない/, /保証/, /بدون ألم/, /مضمون/, /ضمان/,
      /more patients/i, /new patients/i, /mehr Patienten/i, /más pacientes/i, /plus de patients/i, /daha fazla hasta/i, /więcej pacjentów/i, /患者さんが増/, /مرضى أكثر|مزيد من المرضى/,
      /only \d+ left/i, /hurry/i, /last chance/i, /expires (today|tonight)/i, /\b\d+ spots?\b/i, /ends (today|tonight|soon)/i, /\bact now\b/i,
      /letzte chance/i, /última oportunidad/i, /dernière chance/i, /son fırsat/i, /ostatnia szansa/i, /今だけ/, /本日限り/, /الفرصة الأخيرة/,
    ];
    for (const lang of LIFECYCLE_LANGUAGES) for (const [k, v] of leaves(LIFECYCLE_COPY[lang])) for (const b of banned) expect(v, `${lang}.${k}`).not.toMatch(b);
  });

  it("the only scarcity is the founding cap, and it is a placeholder filled from the real count", () => {
    for (const lang of LIFECYCLE_LANGUAGES) {
      const seats = LIFECYCLE_COPY[lang].offer.seats;
      expect(placeholders(seats), lang).toEqual(["clinics", "left"]);
      expect(seats, lang).not.toMatch(/\d/);
    }
  });

  it("falls back to English for languages without copy (it, pt)", () => {
    expect(lifecycleText("it").lang).toBe("en");
    expect(lifecycleText(undefined).lang).toBe("en");
    expect(lifecycleText("ja").lang).toBe("ja");
  });
});

describe("every email, every language", () => {
  const langs = [...new Set([...LOCALES, ...EMAIL_LANGUAGES])];

  for (const lang of langs) {
    it(`${lang}: all ${SAMPLE_KINDS.length} emails render completely, accessibly, in the right direction`, () => {
      for (const kind of SAMPLE_KINDS) {
        const m = sampleEmailFor(kind, lang);
        const at = `${lang} ${kind}`;
        for (const part of [m.subject, m.html, m.text]) expect(part, at).not.toMatch(/\{\w+\}|undefined|NaN|\[object/);
        expect(m.subject.length, at).toBeLessThanOrEqual(90);
        expect(m.subject.trim(), at).not.toBe("");
        // Language and direction: Arabic flips, the brand and links stay LTR.
        const shown = (LOCALES as readonly string[]).includes(lang) || ["ready", "ready-recording"].includes(kind) ? lang : "en";
        expect(m.html, at).toContain(`<html lang="${shown}" dir="${shown === "ar" ? "rtl" : "ltr"}"`);
        expect(m.html, at).toContain('<span dir="ltr"');
        // Preheader, title, dark mode, mobile, accessible tables.
        expect(m.html, at).toMatch(/class="dv-pre" aria-hidden="true" style="display:none/);
        expect(m.html, at).toContain(`<title>`);
        expect(m.html, at).toContain('name="color-scheme" content="light dark"');
        expect(m.html, at).toContain("@media (prefers-color-scheme:dark)");
        expect(m.html, at).toContain("@media (max-width:600px)");
        expect(m.html, at).toContain('role="presentation"');
        expect(m.html.match(/<h1/g)?.length ?? 0, at).toBeLessThanOrEqual(1);
        for (const img of m.html.match(/<img [^>]*>/g) ?? []) expect(img, at).toMatch(/ alt="[^"]*"/);
        // Every link goes to dentvideo.com (or our own mailto).
        for (const [, href] of m.html.matchAll(/href="([^"]+)"/g)) expect(href, at).toMatch(/^(https:\/\/dentvideo\.com\/|mailto:hello@dentvideo\.com)/);
        for (const url of m.text.match(/https?:\/\/\S+/g) ?? []) expect(url, at).toMatch(/^https:\/\/dentvideo\.com\//);
        // Plain-text part: no markup.
        expect(m.text, at).not.toMatch(/<[a-z][^>]*>/i);
      }
    });
  }

  it("marketing mail carries unsubscribe and the postal address; transactional mail does not unsubscribe", () => {
    for (const lang of LOCALES) {
      for (const kind of ["start", "sample", "objections", "offer", "not-posted", "monthly"] as const) {
        const m = sampleEmailFor(kind, lang);
        expect(m.html, `${lang} ${kind}`).toContain("/api/dentvideo/unsubscribe?t=");
        expect(m.text, `${lang} ${kind}`).toContain("/api/dentvideo/unsubscribe?t=");
        expect(m.text, `${lang} ${kind}`).toContain("Neznanih Junaka 60");
      }
      for (const kind of ["code", "reset", "welcome", "ready", "payment-failed", "payment-hold"] as const) {
        expect(sampleEmailFor(kind, lang).html, `${lang} ${kind}`).not.toContain("unsubscribe");
      }
    }
  });

  it("each email has at most one primary button", () => {
    for (const kind of SAMPLE_KINDS) expect(sampleEmailFor(kind, "en").html.match(/class="dv-btn" bgcolor/g)?.length ?? 0, kind).toBeLessThanOrEqual(1);
  });
});

describe("activation emails", () => {
  const unsub = "https://dentvideo.com/api/dentvideo/unsubscribe?t=x.y";
  const open = offerTerms({});

  it("takes the offer terms from billing.ts, never hard-coded", () => {
    expect(open).toEqual({ open: true, priceUsd: DV_FOUNDING.priceUsd, thenUsd: DV_PRICES_USD.practice.month, months: DV_FOUNDING.months, clinics: DV_FOUNDING.clinics, code: "KURUCU100" });
    expect(offerTerms({ DENTVIDEO_FOUNDING_OFFER: "off" })).toEqual({ open: false, fromUsd: DV_PRICES_USD.starter.month });
    expect(lowestMonthlyUsd()).toBe(DV_PRICES_USD.starter.month);
  });

  it("day 0 links to the preview; the clinic name is escaped", () => {
    const m = startEmail({ language: "en", clinicName: "Smile & <Co>", url: "https://dentvideo.com/start?step=preview&lang=en", unsubscribeUrl: unsub });
    expect(m.subject).toBe("Your clinic's video preview is saved");
    expect(m.html).toContain('href="https://dentvideo.com/start?step=preview&amp;lang=en"');
    expect(m.html).toContain("Smile &amp; &lt;Co&gt;");
    expect(m.html).not.toContain("<Co>");
  });

  it("day 1 lists the clinic's own preview videos", () => {
    const m = sampleEmail({ language: "de", clinicName: "Praxis Mitte", url: "https://dentvideo.com/start?step=preview&lang=de", unsubscribeUrl: unsub, titles: ["Implantate erklärt", "Bleaching-Mythen"] });
    expect(m.text).toContain("• Implantate erklärt");
    expect(m.text).toContain("Praxis Mitte");
    // Without titles it still reads well: no dangling "these are the videos:" line.
    const none = sampleEmail({ language: "en", clinicName: "A", url: "https://dentvideo.com/x", unsubscribeUrl: unsub, titles: [] });
    expect(none.text).not.toContain("These are the videos");
  });

  it("day 3 answers three objections with the real starting price", () => {
    for (const lang of LOCALES) {
      const m = objectionsEmail({ language: lang, clinicName: "A", url: "https://dentvideo.com/start?step=plan", unsubscribeUrl: unsub, fromUsd: 59 });
      expect(LIFECYCLE_COPY[lang].objections.qa, lang).toHaveLength(3);
      expect(m.text, lang).toContain(usd(lang, 59));
    }
  });

  it("day 7 shows the seats left only when the count is reliable", () => {
    if (!open.open) throw new Error("offer closed in test env");
    const base = { language: "en", clinicName: "A", url: "https://dentvideo.com/start?step=plan", unsubscribeUrl: unsub, offer: open };
    expect(offerEmail({ ...base, seats: { left: 37, reliable: true } }).text).toContain("Founding places still open: 37 of 100.");
    expect(offerEmail({ ...base, seats: { left: 37, reliable: false } }).text).not.toContain("Founding places");
    expect(offerEmail({ ...base, seats: null }).text).not.toContain("Founding places");
    expect(offerEmail({ ...base, seats: { left: 0, reliable: true } }).text).not.toContain("Founding places");
    const m = offerEmail({ ...base, seats: null });
    expect(m.subject).toBe("Founding offer: Practice for $49/month for 12 months");
    expect(m.text).toContain("then $99/month");
    expect(m.text).toContain("KURUCU100");
    expect(m.text).toContain("This is the last reminder we'll send.");
  });

  it("the welcome is transactional and links the library", () => {
    const m = welcomeEmail({ language: "ar", clinicName: "عيادة الابتسامة", appUrl: "https://dentvideo.com/app" });
    expect(m.html).toContain('dir="rtl"');
    expect(m.html).toContain("mailto:hello@dentvideo.com");
    expect(m.html).not.toContain("unsubscribe");
  });

  it("month names come out in the reader's language", () => {
    expect(monthLabel("en", 2026, 10)).toBe("October 2026");
    expect(monthLabel("de", 2026, 10)).toBe("Oktober 2026");
    expect(monthLabel("tr", 2026, 10)).toBe("Ekim 2026");
    expect(monthLabel("ar", 2026, 10)).toMatch(/2026/);
  });

  it("unsubscribe page in each state, and it says what still arrives", () => {
    expect(unsubscribePage({ language: "ar", state: "done", homeUrl: "https://dentvideo.com" })).toContain('dir="rtl"');
    expect(unsubscribePage({ language: "de", state: "done", homeUrl: "https://dentvideo.com" })).toContain("Erledigt");
    expect(unsubscribePage({ language: "en", state: "confirm", homeUrl: "https://dentvideo.com", action: "/x" })).toContain("ready videos still arrive");
    expect(unsubscribePage({ language: "en", state: "invalid", homeUrl: "https://dentvideo.com" })).toContain("mailto:hello@dentvideo.com");
  });
});
