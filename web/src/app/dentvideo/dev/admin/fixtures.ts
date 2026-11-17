import type { AdminClinic, AdminEvent, AdminItem } from "@/lib/dentvid/admin-metrics";
import type { AdminData } from "@/lib/dentvid/admin-server";

/**
 * Dev-only fixture data for the owner panel's harness (page.tsx): realistic,
 * seeded (the same on every load), never touching a database.
 */

export const SAMPLES = ["en/caring-for-clear-aligners", "en/proper-brushing-technique", "en/whitening-myths-debunked", "de/bleaching-zahnschmelz", "de/kinder-zahnarztangst"];

/** Mulberry32: a tiny seeded PRNG so the fake data is stable between loads. */
export function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES: Record<string, { country: string; names: string[] }> = {
  en: { country: "GB", names: ["Riverside Dental", "Harbour Smiles", "Oakwood Dental Care", "The Smile Studio", "Kingsway Dental", "Brightside Dentistry", "Meadow Lane Dental"] },
  de: { country: "DE", names: ["Zahnarztpraxis am Park", "Zahnzentrum Mitte", "Praxis Dr. Weber", "Zahnärzte am Markt", "Lächelwerk"] },
  tr: { country: "TR", names: ["Gülümse Diş Kliniği", "Ağız ve Diş Sağlığı Merkezi", "Dentpark İzmir", "Beyaz Diş Kliniği"] },
  es: { country: "ES", names: ["Clínica Dental Sonrisa", "Dental Mediterráneo", "Clínica Dental Sol"] },
  fr: { country: "FR", names: ["Cabinet Dentaire du Parc", "Centre Dentaire Lumière", "Cabinet Dr Martin"] },
  pl: { country: "PL", names: ["Gabinet Uśmiech", "Dentica Kraków"] },
  ja: { country: "JP", names: ["さくら歯科クリニック", "みなと歯科"] },
  ar: { country: "AE", names: ["عيادة الابتسامة", "مركز النور لطب الأسنان"] },
};
const LOCALE_WEIGHT: [string, number][] = [["en", 34], ["de", 22], ["tr", 18], ["es", 9], ["fr", 8], ["pl", 4], ["ja", 3], ["ar", 2]];
const TOPICS = ["Whitening: what to expect", "Why floss before brushing?", "Implants in three steps", "Aligners vs braces", "Sensitive teeth after cleaning", "Your child's first visit", "Gum bleeding: when to worry"];

function pick<T>(r: () => number, weighted: [T, number][]): T {
  const total = weighted.reduce((s, [, w]) => s + w, 0);
  let x = r() * total;
  for (const [v, w] of weighted) if ((x -= w) <= 0) return v;
  return weighted[weighted.length - 1][0];
}

export function uuid(r: () => number) {
  const h = () => Math.floor(r() * 16).toString(16);
  const s = (n: number) => Array.from({ length: n }, h).join("");
  return `${s(8)}-${s(4)}-4${s(3)}-a${s(3)}-${s(12)}`;
}

export function mondayOf(d: Date) {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7));
  return x.toISOString().slice(0, 10);
}

export function demoData(now: Date): AdminData {
  const r = rng(20261108);
  const t = now.getTime();
  const DAY = 86_400_000;
  const clinics: AdminClinic[] = [];
  const events: AdminEvent[] = [];
  const items: AdminItem[] = [];
  const iso = (ms: number) => new Date(Math.min(ms, t - 60_000)).toISOString();
  const ev = (name: string, at: number, locale: string, clinic_id: string | null, props: Record<string, unknown> = {}) => {
    if (at > t - 35 * DAY) events.push({ name, locale, props, clinic_id, created_at: iso(at) });
  };

  // Anonymous traffic: landing views (growing slowly), teaser tries.
  for (let d = 34; d >= 0; d--) {
    const views = Math.round(70 + (34 - d) * 2.2 + r() * 40 - (new Date(t - d * DAY).getUTCDay() % 6 === 0 ? 25 : 0));
    for (let i = 0; i < views; i++) {
      const locale = pick(r, LOCALE_WEIGHT as [string, number][]);
      const at = t - d * DAY - r() * DAY;
      const src = pick(r, [["", 55], ["google", 25], ["instagram", 8], ["linkedin", 6], ["newsletter", 6]] as [string, number][]);
      const tags = src === "instagram" ? { utm_source: src, utm_medium: "dm", utm_campaign: `${locale}-launch` } : src ? { utm_source: src } : {};
      const geo = { geo: NAMES[locale].country };
      ev("landing_view", at, locale, null, { ...tags, ...geo });
      if (r() < 0.22) ev("cta_clicked", at + 30_000, locale, null, { ...tags, ...geo, where: r() < 0.7 ? "hero" : "pricing" });
      if (r() < 0.19) ev("preview_started", at + 60_000, locale, null, { ...tags, ...geo, where: "landing" });
      if (r() < 0.1) ev("signup_started", at + 90_000, locale, null, { ...tags, ...geo });
    }
  }

  // Clinics over 90 days and their journey.
  const created = 150;
  for (let i = 0; i < created; i++) {
    const age = Math.pow(r(), 1.35) * 90; // more recent sign-ups
    const at = t - age * DAY;
    const locale = pick(r, LOCALE_WEIGHT as [string, number][]);
    const pool = NAMES[locale];
    const id = uuid(r);
    const name = `${pool.names[i % pool.names.length]}${i >= pool.names.length ? ` ${["Nord", "Süd", "Centre", "West", "Plus", "II"][i % 6]}` : ""}`;
    const roll = r();
    let plan: string = "trial";
    let tier: string | null = null;
    const willPay = roll < 0.36;
    if (willPay) {
      plan = r() < 0.86 ? "active" : r() < 0.5 ? "cancelled" : "paused";
      tier = pick(r, [["starter", 22], ["practice", 63], ["group", 15]] as [string, number][]);
    }
    clinics.push({
      id,
      created_at: iso(at),
      plan,
      plan_tier: plan === "active" ? tier : null,
      dodo_subscription_id: willPay ? `sub_${id.slice(0, 8)}` : null,
      profile: { name, country: pool.country, language: locale },
    });
    const touch = pick(r, [[{}, 50], [{ utm_source: "google" }, 25], [{ utm_source: "instagram", utm_medium: "dm", utm_campaign: `${locale}-launch` }, 15], [{ ref: "linkedin.com" }, 10]] as [Record<string, string>, number][]);
    ev("signup_completed", at, locale, null, { ...touch, geo: pool.country });
    if (r() < 0.9) {
      ev("clinic_saved", at + 4 * 60_000, locale, id, { ...touch, country: pool.country, language: locale });
      ev("preview_started", at + 4 * 60_000, locale, id, { where: "wizard" });
      if (r() < 0.86) {
        ev("preview_step_viewed", at + 6 * 60_000, locale, id);
        ev("preview_played", at + 6 * 60_000, locale, id, { where: "wizard" });
        if (r() < 0.7) ev("preview_completed", at + 7 * 60_000, locale, id, { where: "wizard" });
      }
      if (willPay || r() < 0.5) ev("plan_viewed", at + 8 * 60_000, locale, id);
      if (willPay || r() < 0.3) ev("code_verified", at + 8.5 * 60_000, locale, null, { geo: pool.country });
      if (willPay || r() < 0.42) {
        const interval = tier === "practice" && r() < 0.2 ? "year" : "month";
        const founding = tier === "practice" && interval === "month" && r() < 0.8;
        ev("plan_clicked", at + 9 * 60_000, locale, id, { tier: tier ?? "practice", interval, where: "onboarding" });
        if (willPay || r() < 0.55) ev("checkout_opened", at + 9.5 * 60_000, locale, id, { tier: tier ?? "practice", interval, founding, via: "api" });
        if (willPay) {
          ev("payment_succeeded", at + 12 * 60_000, locale, id, { tier, interval, first: true, event: "subscription.active" });
          ev("week_ready", at + 40 * 60_000, locale, id, { kind: "week", ready: 5, flagged: Math.round(r() * 1.2) });
          if (r() < 0.82) ev("video_approved", at + 3 * 3600_000, locale, id);
          if (r() < 0.6) ev("video_shared", at + 3.2 * 3600_000, locale, id, { method: r() < 0.7 ? "share" : "download" });
        }
      }
    }
    // Their videos: weekly runs for paying clinics.
    if (willPay) {
      const weeks = Math.min(8, Math.ceil(age / 7));
      for (let w = 0; w < weeks; w++) {
        const weekOf = mondayOf(new Date(t - w * 7 * DAY));
        for (let k = 0; k < 5; k++) {
          const s = r();
          const status = w === 0 && plan === "active" && s < 0.06 ? "working" : s < 0.84 ? "ready" : s < 0.95 ? "flagged" : "failed";
          items.push({
            id: uuid(r),
            clinic_id: id,
            kind: k === 4 && r() < 0.3 ? "recording" : "generated",
            week_of: weekOf,
            status,
            approval: status === "ready" && (w > 0 || r() < 0.5) ? "approved" : "pending",
            title: TOPICS[(i + k + w) % TOPICS.length],
            error:
              status === "failed"
                ? pick(r, [
                    ["render: Remotion timed out after 240s (scene 3)", 3],
                    ["tts: 429 Too Many Requests from provider", 2],
                    ["qa: caption overflow on 9:16 safe area", 1],
                  ] as [string, number][])
                : null,
            updated_at: iso(Date.parse(weekOf) + (k + 1) * 3600_000 + r() * 2 * DAY),
          });
        }
      }
    }
  }
  return {
    now: now.toISOString(),
    clinics: clinics.sort((a, b) => b.created_at.localeCompare(a.created_at)),
    events,
    items,
    eventsTable: true,
    spend: {
      available: true,
      spentTodayUsd: 6.4,
      spentMonthUsd: 118.25,
      dailyCapUsd: 20,
      monthlyCapUsd: 300,
      paused: false,
      parked: [
        { jobId: `week:${clinics[3].id}:${mondayOf(now)}`, name: "week", reason: "clinic_weekly_weeks", parkedAt: iso(t - 2 * 3600_000), clinicId: clinics[3].id },
      ],
    },
    dodoFoundingUses: null,
    warnings: [],
  };
}

export function emptyData(now: Date): AdminData {
  return {
    now: now.toISOString(),
    clinics: [],
    events: [],
    items: [],
    eventsTable: false,
    spend: { available: false, spentTodayUsd: null, spentMonthUsd: null, dailyCapUsd: 20, monthlyCapUsd: 300, paused: false, parked: [] },
    dodoFoundingUses: null,
    warnings: [],
  };
}
