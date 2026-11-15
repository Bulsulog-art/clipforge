/**
 * Google Ads click identifiers (gclid / gbraid / wbraid), kept so a sign-up
 * and a first payment can be reported back to Google Ads as offline
 * conversions (docs/ADS_TRACKING.md). Pure and tiny: the browser part
 * (components/dentvid/ad-consent.tsx), the sign-up route and the tests share
 * these rules.
 *
 * Privacy rules:
 * - a click id is read only from the landing URL, never from a cookie, and
 *   kept only in this site's own browser storage (no cookie, no third-party
 *   script, no gtag);
 * - in the EU/EEA, the UK and Switzerland (or when the country is unknown) it
 *   is stored only after the visitor accepts the consent prompt; a decline
 *   drops it. Elsewhere (e.g. Türkiye) it is stored without a prompt and is
 *   covered by the privacy policy;
 * - it is kept at most 90 days (here and on the server), and it never rides
 *   on the generic funnel events (events.ts has no rule for it).
 */

export const CLICK_TYPES = ["gclid", "gbraid", "wbraid"] as const;
export type ClickType = (typeof CLICK_TYPES)[number];

/** How we may use a stored click: the visitor accepted the prompt, or none was needed (outside the EU/EEA/UK/CH). */
export type ClickConsent = "granted" | "not_required";

export type AdClick = { type: ClickType; id: string; /** When the visitor landed with it (ms since epoch). */ at: number; consent: ClickConsent };

/** Click ids are URL-safe base64-like strings; real ones are ~20–150 characters. */
export const CLICK_ID = /^[A-Za-z0-9._-]{6,200}$/;

/** Click data is kept for 90 days after the click (Google accepts conversions up to 90 days after it). */
export const CLICK_TTL_MS = 90 * 86_400_000;

export const AD_CLICK_KEY = "dv-ad-click";
/** Set for the tab when the visitor declined, so a reload of the ad's URL does not ask again. */
export const AD_DECLINED_KEY = "dv-ad-declined";

/**
 * Countries where an ad click id is stored only with consent: the EU, the
 * rest of the EEA, the UK and Switzerland.
 */
export const CONSENT_COUNTRIES: ReadonlySet<string> = new Set([
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
  "GB", "CH",
]);

/** Does a visitor from this country (ISO code; undefined = unknown) need to consent first? Unknown counts as yes. */
export function consentRequired(country: string | null | undefined): boolean {
  const c = (country ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c) || c === "XX" || c === "T1") return true;
  return CONSENT_COUNTRIES.has(c);
}

/** The click id in a landing URL's query, if any (gclid first, then gbraid, then wbraid). */
export function clickFrom(search: string): { type: ClickType; id: string } | null {
  let q: URLSearchParams;
  try {
    q = new URLSearchParams(search);
  } catch {
    return null;
  }
  for (const type of CLICK_TYPES) {
    const id = q.get(type)?.trim();
    if (id && CLICK_ID.test(id)) return { type, id };
  }
  return null;
}

/** A stored or posted click, checked: right shape, not from the future, not older than 90 days. */
export function validClick(v: unknown, now = Date.now()): AdClick | null {
  if (!v || typeof v !== "object") return null;
  const c = v as Record<string, unknown>;
  if (!(CLICK_TYPES as readonly unknown[]).includes(c.type)) return null;
  if (typeof c.id !== "string" || !CLICK_ID.test(c.id)) return null;
  if (typeof c.at !== "number" || !Number.isFinite(c.at)) return null;
  // A few minutes of clock skew between the browser and the server are fine.
  if (c.at > now + 10 * 60_000 || now - c.at > CLICK_TTL_MS) return null;
  if (c.consent !== "granted" && c.consent !== "not_required") return null;
  return { type: c.type as ClickType, id: c.id, at: Math.min(c.at, now), consent: c.consent };
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function local(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function session(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** The stored click, or null (none, expired — then removed — or malformed). */
export function readAdClick(s: Store | null = local(), now = Date.now()): AdClick | null {
  try {
    const raw = s?.getItem(AD_CLICK_KEY);
    if (!raw) return null;
    const click = validClick(JSON.parse(raw), now);
    if (!click) s?.removeItem(AD_CLICK_KEY);
    return click;
  } catch {
    return null;
  }
}

/** Keep a click the visitor may be measured by (a newer ad click replaces an older one, as Google counts the last click). */
export function storeAdClick(click: AdClick, s: Store | null = local()): void {
  try {
    if (validClick(click)) s?.setItem(AD_CLICK_KEY, JSON.stringify(click));
  } catch {
    // storage blocked: nothing is kept
  }
}

/** The visitor declined: drop any click we hold and remember the answer for this tab. */
export function declineAdClick(s: Store | null = local(), tab: Store | null = session()): void {
  try {
    s?.removeItem(AD_CLICK_KEY);
  } catch {
    // nothing to drop
  }
  try {
    tab?.setItem(AD_DECLINED_KEY, "1");
  } catch {
    // the prompt may come back on a reload; harmless
  }
}

export function declinedInTab(tab: Store | null = session()): boolean {
  try {
    return tab?.getItem(AD_DECLINED_KEY) === "1";
  } catch {
    return false;
  }
}
