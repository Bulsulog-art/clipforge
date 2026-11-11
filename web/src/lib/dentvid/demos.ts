/**
 * Personalised demo links (dentvideo.com/<lang>/d/<token>): the pure parts —
 * token, expiry, input rules, the share URL and the per-demo numbers on
 * /admin/demos. No I/O here (demos-server.ts does the database and storage),
 * so the rules are unit-tested and the dev harness renders with them too.
 *
 * A demo is made by the owner from a clinic's public business information
 * (name, city, country, colour, logo) to show that clinic its own branded
 * preview before anyone signs up. It lives 60 days (privacy policy §7), can
 * be switched off at any time, and nothing about one demo is reachable from
 * another: the token is the only key, and it is random.
 */
import { LOCALES, LANDING_PATH, type Locale } from "@/content/dentvideo";
import { everPaid, type AdminClinic, type AdminEvent } from "./admin-metrics";

export const DEMO_TOKEN_LENGTH = 11;
export const DEMO_TOKEN_RE = /^[A-Za-z0-9]{10,12}$/;
export const DEMO_TTL_DAYS = 60;
export const DEMO_DEFAULT_CAMPAIGN = "tr-launch";
/** Largest logo a demo keeps (upload or fetched copy). */
export const DEMO_LOGO_MAX_BYTES = 2 * 1024 * 1024;

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** A uniform random integer in [0, max) from Web Crypto, by rejection sampling (no modulo bias). */
function randomBelow(max: number): number {
  const limit = Math.floor(256 / max) * max;
  const buf = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limit) return buf[0] % max;
  }
}

/** A random base62 token. 11 chars ≈ 65 bits: not guessable, not enumerable. */
export function newDemoToken(length = DEMO_TOKEN_LENGTH, pick: (max: number) => number = randomBelow): string {
  let out = "";
  for (let i = 0; i < length; i++) out += BASE62[pick(BASE62.length)];
  return out;
}

export function isDemoToken(v: unknown): v is string {
  return typeof v === "string" && DEMO_TOKEN_RE.test(v);
}

/** Brand colours a demo gets when none is given: calm, clinical, readable under white text. */
export const DEMO_PALETTE = ["#0f5c5c", "#1f4e79", "#2e7d6b", "#5b3f8c", "#8a3b4a", "#b6774f", "#24303a", "#1d6fa5"];

/** The default colour for a clinic: picked from the palette by its name, so the same clinic gets the same one. */
export function paletteColour(name: string): string {
  let h = 0;
  for (const ch of name.trim().toLowerCase()) h = (h * 31 + ch.codePointAt(0)!) >>> 0;
  return DEMO_PALETTE[h % DEMO_PALETTE.length];
}

export type DemoRow = {
  token: string;
  clinic_name: string;
  city: string | null;
  country: string | null;
  language: string;
  colour: string | null;
  logo_path: string | null;
  note?: string | null;
  campaign: string;
  created_by?: string | null;
  created_at: string;
  expires_at: string;
  disabled: boolean;
  view_count: number;
  last_viewed_at: string | null;
};

/** What the public page may know of a demo: never the note, the creator or the counters. */
export type PublicDemo = {
  token: string;
  clinicName: string;
  city?: string;
  country?: string;
  language: Locale;
  colour: string;
  hasLogo: boolean;
  campaign: string;
};

/** Live: not switched off and not past its expiry. */
export function isDemoActive(d: Pick<DemoRow, "disabled" | "expires_at">, now = new Date()): boolean {
  if (d.disabled) return false;
  const t = Date.parse(d.expires_at);
  return Number.isFinite(t) && t > now.getTime();
}

export function demoExpiry(now = new Date(), days = DEMO_TTL_DAYS): string {
  return new Date(now.getTime() + days * 86_400_000).toISOString();
}

export function demoLanguage(v: string | null | undefined): Locale {
  return (LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : "en";
}

export function toPublicDemo(d: DemoRow): PublicDemo {
  return {
    token: d.token,
    clinicName: d.clinic_name,
    ...(d.city ? { city: d.city } : {}),
    ...(d.country ? { country: d.country } : {}),
    language: demoLanguage(d.language),
    colour: d.colour && /^#[0-9a-f]{6}$/i.test(d.colour) ? d.colour.toLowerCase() : paletteColour(d.clinic_name),
    hasLogo: !!d.logo_path,
    campaign: d.campaign,
  };
}

/* ------------------------------------------------------------------ input */

export type DemoInput = {
  clinicName: string;
  city?: string;
  country?: string;
  language: Locale;
  colour: string;
  logoUrl?: string;
  note?: string;
  campaign: string;
};

const CLEAN = (v: unknown, max: number) =>
  typeof v === "string"
    ? v
        .replace(/[\u0000-\u001f\u007f<>]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";

/** The admin form, checked. Errors are for the owner (English). */
export function parseDemoInput(raw: Record<string, unknown>): { ok: true; value: DemoInput } | { ok: false; error: string } {
  const clinicName = CLEAN(raw.clinicName, 80);
  if (!clinicName) return { ok: false, error: "Clinic name is required." };
  const city = CLEAN(raw.city, 60);
  const country = CLEAN(raw.country, 2).toUpperCase();
  if (country && !/^[A-Z]{2}$/.test(country)) return { ok: false, error: "Country must be a two-letter code (TR, DE, ES…)." };
  const lang = CLEAN(raw.language, 2).toLowerCase();
  if (!(LOCALES as readonly string[]).includes(lang)) return { ok: false, error: "Choose one of the site languages." };
  let colour = CLEAN(raw.colour, 7).toLowerCase();
  if (colour && !colour.startsWith("#")) colour = `#${colour}`;
  if (colour && !/^#[0-9a-f]{6}$/.test(colour)) return { ok: false, error: "Brand colour must be a hex colour like #0f5c5c." };
  const logoUrl = CLEAN(raw.logoUrl, 500);
  if (logoUrl && !/^https:\/\//i.test(logoUrl)) return { ok: false, error: "Logo URL must start with https://." };
  const campaign = CLEAN(raw.campaign, 40).toLowerCase() || DEMO_DEFAULT_CAMPAIGN;
  if (!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(campaign)) return { ok: false, error: "Campaign tag: lower-case letters, digits, dot, dash or underscore." };
  const note = CLEAN(raw.note, 500);
  return {
    ok: true,
    value: {
      clinicName,
      ...(city ? { city } : {}),
      ...(country ? { country } : {}),
      language: lang as Locale,
      colour: colour || paletteColour(clinicName),
      ...(logoUrl ? { logoUrl } : {}),
      ...(note ? { note } : {}),
      campaign,
    },
  };
}

/* ------------------------------------------------------------------ links */

/** The demo page's in-app path: English at /dentvideo/d/<token>, the others under their landing. */
export function demoPath(token: string, language: Locale): string {
  return `${LANDING_PATH[language]}/d/${token}`;
}

/** Where "Start with these settings" goes: the sign-up, carrying the demo and its source tags. */
export function demoStartPath(d: Pick<PublicDemo, "token" | "language" | "campaign">): string {
  const q = new URLSearchParams({ lang: d.language, demo: d.token, utm_source: "demo", utm_medium: "dm", utm_campaign: d.campaign, utm_content: d.token });
  return `/dentvideo/start?${q.toString()}`;
}

/** Same-origin URL of the demo's logo (served by the app from the private bucket). */
export function demoLogoSrc(token: string): string {
  return `/api/dentvideo/demo/${token}/logo`;
}

/* ------------------------------------------------------------------ stats */

export type DemoStats = { views: number; played: number; ctaClicks: number; signups: number; paid: number };

/**
 * The demo a clinic came from: the first of its events that names one
 * (clinic_saved carries `demo` from the server and `utm_content` from the
 * tab's first touch). Later demos never replace the first.
 */
export function clinicDemos(events: AdminEvent[]): Map<string, string> {
  const out = new Map<string, string>();
  const sorted = events.filter((e) => e.clinic_id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  for (const e of sorted) {
    if (out.has(e.clinic_id!)) continue;
    const p = e.props ?? {};
    const t = isDemoToken(p.demo) ? p.demo : isDemoToken(p.utm_content) && p.utm_source === "demo" ? p.utm_content : null;
    if (t) out.set(e.clinic_id!, t as string);
  }
  return out;
}

/** Per demo: views (the stored counter), previews played, CTA clicks, sign-ups (clinics saved) and paid clinics. */
export function demoStats(
  demos: Pick<DemoRow, "token" | "view_count">[],
  events: AdminEvent[],
  clinics: Pick<AdminClinic, "id" | "plan" | "dodo_subscription_id">[],
): Map<string, DemoStats> {
  const out = new Map<string, DemoStats>(demos.map((d) => [d.token, { views: d.view_count ?? 0, played: 0, ctaClicks: 0, signups: 0, paid: 0 }]));
  for (const e of events) {
    const t = e.props?.demo;
    if (typeof t !== "string") continue;
    const s = out.get(t);
    if (!s) continue;
    if (e.name === "demo_preview_played") s.played++;
    if (e.name === "demo_cta_clicked") s.ctaClicks++;
  }
  const byId = new Map(clinics.map((c) => [c.id, c]));
  for (const [clinicId, token] of clinicDemos(events)) {
    const s = out.get(token);
    if (!s) continue;
    s.signups++;
    const c = byId.get(clinicId);
    if (c && everPaid(c)) s.paid++;
  }
  return out;
}
