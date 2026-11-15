import { externalReferrerHost } from "./events";

/**
 * First-touch attribution for the sign-up funnel, without a cookie or an id.
 *
 * An outreach link such as dentvideo.com/tr?utm_source=instagram&utm_medium=dm&utm_campaign=tr-launch
 * lands on a page; the tags (or, without tags, the referring site's host)
 * are kept in sessionStorage for that browser tab only, so they survive the
 * sign-up, the email code, the clinic step and the Dodo checkout round trip
 * (all in the same tab), and every funnel event from that tab carries them
 * (events-client). The clinic's first tagged event — clinic_saved, stamped
 * by the wizard — makes them the clinic's first touch, so its payment is
 * credited to the source on /admin (admin-metrics clinicSources).
 *
 * Only the allow-listed tags are kept, as short slugs or a host name; the
 * server sanitises them again (events.ts). Nothing is stored when a visit
 * has neither tags nor an outside referrer, and a later source never
 * replaces the first one in the tab.
 */

export const ATTR_KEY = "dv-attr";
export const ATTR_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"] as const;
export type Attribution = Partial<Record<(typeof ATTR_FIELDS)[number], string>>;

const SLUG = /^[a-z0-9][a-z0-9._-]{0,39}$/;

/** The source of one visit: its utm_* tags, else the outside referrer's host. Empty when direct. */
export function attributionFrom(search: string, referrer: string, ownHost: string): Attribution {
  const q = new URLSearchParams(search);
  const out: Attribution = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign"] as const) {
    const v = q.get(k)?.trim().toLowerCase().slice(0, 40);
    if (v && SLUG.test(v)) out[k] = v;
  }
  // utm_content keeps its case: a demo link puts its token there (lib/dentvid/demos).
  const content = q.get("utm_content")?.trim().slice(0, 40);
  if (content && Object.keys(out).length > 0 && /^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(content)) out.utm_content = content;
  if (Object.keys(out).length === 0 && referrer) {
    const ref = externalReferrerHost(referrer, ownHost);
    if (ref) out.ref = ref;
  }
  return out;
}

type Store = Pick<Storage, "getItem" | "setItem">;

function store(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** What this tab came in with, or {} (no storage, nothing kept, or a malformed value). */
export function readAttribution(s: Store | null = store()): Attribution {
  try {
    const raw = s?.getItem(ATTR_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as Record<string, unknown>;
    const out: Attribution = {};
    for (const k of ATTR_FIELDS) if (typeof v[k] === "string" && v[k]) out[k] = (v[k] as string).slice(0, 80);
    return out;
  } catch {
    return {};
  }
}

/** Keep this visit's source for the tab, unless the tab already has one (first touch wins). Returns what is kept. */
export function captureAttribution(visit: Attribution, s: Store | null = store()): Attribution {
  const had = readAttribution(s);
  if (Object.keys(had).length > 0 || Object.keys(visit).length === 0) return had;
  try {
    s?.setItem(ATTR_KEY, JSON.stringify(visit));
  } catch {
    // storage full or blocked: the events of this page still carry the tags
  }
  return visit;
}

/** Capture from the current page (landing, /start, guides). Never throws. */
export function captureFromLocation(): Attribution {
  try {
    captureReferralFromLocation();
    return captureAttribution(attributionFrom(window.location.search, document.referrer, window.location.hostname));
  } catch {
    return {};
  }
}

/* ------------------------------------------------------- clinic referral */

/**
 * A clinic's referral link is dentvideo.com/?ref=DVXXXXXX (lib/dentvid/referrals).
 * The code is kept in this browser (localStorage, 30 days — a dentist sent the
 * link by a colleague often signs up days later) and sent with the clinic step
 * (clinic-form → /api/dentvideo/clinic), where the server checks it against
 * the codes it issued and attaches it to the clinic row once, before the first
 * payment. Anything that is not shaped like one of our codes is ignored here,
 * so ?ref=producthunt and the like never become a referral. The first code
 * wins until it expires.
 */
export const REFERRAL_KEY = "dv-ref";
export const REFERRAL_TTL_MS = 30 * 86_400_000;
/** DV + 6 characters without 0/O/1/I. Must match supabase/liman/0018 and referrals.ts. */
export const REFERRAL_CODE = /^DV[2-9A-HJ-NP-Z]{6}$/;

/** A referral code as typed or linked, normalised — or null when it is not one of ours. */
export function normaliseReferralCode(v: string | null | undefined): string | null {
  const c = (v ?? "").trim().toUpperCase();
  return REFERRAL_CODE.test(c) ? c : null;
}

/** The referral code in a page's query string (?ref=), or null. */
export function referralFrom(search: string): string | null {
  try {
    return normaliseReferralCode(new URLSearchParams(search).get("ref"));
  } catch {
    return null;
  }
}

function localStore(): Store | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** The referral code this browser came with, unless it has expired. */
export function readReferral(s: Store | null = localStore(), now = Date.now()): string | null {
  try {
    const raw = s?.getItem(REFERRAL_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as { code?: unknown; at?: unknown };
    const at = typeof v.at === "number" ? v.at : NaN;
    if (!Number.isFinite(at) || now - at > REFERRAL_TTL_MS || now < at - 60_000) return null;
    return typeof v.code === "string" ? normaliseReferralCode(v.code) : null;
  } catch {
    return null;
  }
}

/** Keep a referral code for this browser, unless an unexpired one is already kept (first wins). Returns what is kept. */
export function captureReferral(code: string | null, s: Store | null = localStore(), now = Date.now()): string | null {
  const had = readReferral(s, now);
  if (had || !code) return had;
  try {
    s?.setItem(REFERRAL_KEY, JSON.stringify({ code, at: now }));
  } catch {
    // storage blocked: no referral, nothing else breaks
  }
  return code;
}

/** Capture ?ref= from the current page. Never throws. */
export function captureReferralFromLocation(): string | null {
  try {
    return captureReferral(referralFrom(window.location.search));
  } catch {
    return null;
  }
}
