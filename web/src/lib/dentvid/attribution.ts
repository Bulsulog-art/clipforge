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
    return captureAttribution(attributionFrom(window.location.search, document.referrer, window.location.hostname));
  } catch {
    return {};
  }
}
