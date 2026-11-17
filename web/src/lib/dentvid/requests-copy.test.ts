import { describe, expect, it, vi } from "vitest";
import { REQUESTS_TEXT, requestsText, CHANGES_PER_WEEK } from "@/content/dentvideo-requests";
import { LOCALES } from "@/content/dentvideo";
import { HELP } from "@/content/help";
import { LEGAL } from "@/content/legal";
import { retentionEmail, retentionKind, sendRetentionNotice } from "./retention-email";
import type { ClinicForMail, LifecycleStore } from "./lifecycle";

/** Every leaf string with its path. */
function leaves(o: unknown, path = ""): [string, string][] {
  if (typeof o === "string") return [[path, o]];
  if (Array.isArray(o)) return o.flatMap((v, i) => leaves(v, `${path}.${i}`));
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k));
  return [];
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const en = new Map(leaves(REQUESTS_TEXT.en));

describe("request, subtitle and retention copy in all eight languages", () => {
  for (const lang of LOCALES) {
    it(`${lang}: same keys and placeholders as English, nothing empty, really translated`, () => {
      const mine = new Map(leaves(REQUESTS_TEXT[lang]));
      expect([...mine.keys()]).toEqual([...en.keys()]);
      for (const [k, v] of mine) {
        expect(v.trim(), `${lang}.${k}`).not.toBe("");
        expect(placeholders(v), `${lang}.${k}`).toEqual(placeholders(en.get(k)!));
        if (lang !== "en" && v.length > 14) expect(v, `${lang}.${k}`).not.toBe(en.get(k));
      }
    });
  }

  it("promises nothing: no guarantees, no discounts, no free videos, no em dashes", () => {
    const banned = [/guarant/i, /garanti/i, /保証/, /مضمون|ضمان/, /discount|rabatt|descuento|indirim|remise|rabat|割引|خصم/i, /free video|kostenlos|gratis|ücretsiz|gratuit|darmow|無料|مجان/i, /—/];
    for (const lang of LOCALES) for (const [k, v] of leaves(REQUESTS_TEXT[lang])) for (const b of banned) expect(v, `${lang}.${k}`).not.toMatch(b);
  });

  it("the weekly change number in the copy matches the cap", () => {
    for (const lang of LOCALES) expect(REQUESTS_TEXT[lang].change.errors.limit, lang).toContain(String(CHANGES_PER_WEEK));
  });

  it("unknown languages fall back to English", () => {
    expect(requestsText("xx")).toBe(REQUESTS_TEXT.en);
  });
});

describe("help, privacy and DPA say the same about the 90 days and the subtitles", () => {
  for (const lang of LOCALES) {
    it(`${lang}`, () => {
      const h = HELP[lang].articles;
      expect(h["after-cancel"].a, `${lang} after-cancel`).toMatch(/90/);
      expect(h["after-cancel"].a).toMatch(/14/);
      expect(h.captions.a, `${lang} captions`).toMatch(/\.srt/);
      // The suggestion form and the change button exist now: the help names them, and no longer says there is no form.
      expect(h.topics.a).toContain(REQUESTS_TEXT[lang].topics.title);
      expect(h["wrong-video"].a).toContain(REQUESTS_TEXT[lang].change.button);
      const privacy = JSON.stringify(LEGAL[lang].docs.privacy);
      expect(privacy, `${lang} privacy`).toMatch(/90/);
      expect(JSON.stringify(LEGAL[lang].docs.dpa), `${lang} dpa`).toMatch(/90/);
    });
  }
});

describe("the retention emails", () => {
  const ended = new Date("2026-11-16T09:41:00Z");
  const deleteOn = new Date("2027-02-14T09:41:00Z");

  for (const lang of LOCALES) {
    it(`${lang}: both emails render with every date filled in, in the clinic's language`, () => {
      for (const days of [14, 1] as const) {
        const m = retentionEmail({ language: lang, clinicName: "Clinic & Co", days, endedAt: ended, deleteOn, appUrl: "https://dentvideo.com/app" });
        expect(m.subject, `${lang} ${days}`).not.toMatch(/\{\w+\}/);
        expect(m.text, `${lang} ${days}`).not.toMatch(/\{\w+\}/);
        expect(m.html).toContain("https://dentvideo.com/app");
        // The clinic name is escaped in the HTML.
        expect(m.html).not.toContain("Clinic & Co");
        expect(m.text).toMatch(/2027/);
      }
    });
  }

  it("names the plan's end day in the email log kind (the worker reads it before deleting)", () => {
    expect(retentionKind(14, "2026-11-16T09:41:00+00:00")).toBe("retention14_2026_11_16");
  });

  function store(clinic: Partial<ClinicForMail> | null, owner = { email: "dr@clinic.example", verified: true }) {
    const claimed = new Set<string>();
    const s: LifecycleStore = {
      trialClinics: async () => [],
      logs: async () => [],
      clinic: async () => (clinic ? ({ id: "c1", owner_id: "o1", profile: { name: "Clinic", language: "de", country: "DE" }, plan: "cancelled", created_at: "", email_opt_out_at: "2026-01-01T00:00:00Z", ...clinic } as ClinicForMail) : null),
      claim: async (_c, kind) => (claimed.has(kind) ? false : (claimed.add(kind), true)),
      release: async (_c, kind) => void claimed.delete(kind),
      owner: async () => owner,
      optOut: async () => true,
    };
    return { s, claimed };
  }

  it("goes once per ended plan, also to a clinic that unsubscribed from reminders", async () => {
    const { s } = store({});
    const send = vi.fn(async () => true);
    const args = { clinicId: "c1", days: 14 as const, deleteOn, endedAt: ended.toISOString() };
    expect(await sendRetentionNotice({ store: s, send, config: { base: "https://dentvideo.com" } }, args)).toEqual({ sent: true, final: false, reason: "sent" });
    expect(await sendRetentionNotice({ store: s, send, config: { base: "https://dentvideo.com" } }, args)).toMatchObject({ sent: false, final: true, reason: "already sent" });
    expect(send).toHaveBeenCalledTimes(1);
    // Transactional: no unsubscribe headers.
    expect((send.mock.calls[0] as unknown[])[2]).not.toHaveProperty("headers");
  });

  it("never to a clinic whose plan is active again", async () => {
    const { s } = store({ plan: "active" });
    const send = vi.fn(async () => true);
    expect(await sendRetentionNotice({ store: s, send, config: { base: "x" } }, { clinicId: "c1", days: 1, deleteOn, endedAt: ended.toISOString() })).toMatchObject({ sent: false, final: true, reason: "not ended" });
    expect(send).not.toHaveBeenCalled();
  });

  it("a failed send is released so tomorrow's run can try again (not final)", async () => {
    const { s, claimed } = store({});
    const r = await sendRetentionNotice({ store: s, send: async () => false, config: { base: "x" } }, { clinicId: "c1", days: 1, deleteOn, endedAt: ended.toISOString() });
    expect(r).toEqual({ sent: false, final: false, reason: "send failed" });
    expect(claimed.size).toBe(0);
  });
});
