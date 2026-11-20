import { isAdminUser } from "./admin";

/**
 * Internal traffic: the owner, QA, the browser e2e runs and the synthetic
 * monitor. Before this existed ~88% of DentVideo's funnel events were ours,
 * and QA runs used real ad tags (utm google / cpc, test gclids) — which would
 * also have reached Google Ads as offline conversions once ads start.
 *
 * Pure (no I/O, no Next imports): the sign-up route, the event recorders,
 * the billing webhook, the admin loaders and the tests share one rule.
 *
 * An ACCOUNT is internal when
 *   - its email matches one of the patterns (built-in defaults below plus
 *     DENTVID_INTERNAL_EMAIL_PATTERNS, comma-separated), or
 *   - its app_metadata.internal is true (server-only metadata: set at
 *     sign-up for the monitor, QA tooling and internally flagged browsers,
 *     or by hand in Liman).
 *
 * A BROWSER is internal when its localStorage holds dv-internal=1
 * (lib/dentvid/internal-flag). It is set only when an internal account (or
 * an admin) is signed in on it, or by ?dv_internal=1 while signed in as one
 * — never by a bare URL (a guessable opt-in link would let anyone, a
 * competitor included, switch their visits off… or ours on).
 *
 * "Internal" is a measurement label only. It never grants anything: sign-up
 * does not prove ownership of an address, so anyone could register
 * qa+x@… — all they get is to be left out of our funnel and our ad
 * conversions.
 *
 * Pattern syntax (case-insensitive, whole address):
 *   *@example.com      a domain ("@example.com" is short for the same)
 *   qa+*@*             a local-part prefix on any domain
 *   someone@gmail.com  one exact address (personal addresses go in the env, never in the repo)
 * `*` matches any run of characters; nothing else is special.
 */

/**
 * Safe defaults: the company's own domains, and the plus-tagged / prefixed
 * test addresses QA, the browser e2e runs and the monitor sign up with.
 * No personal address here — those go in DENTVID_INTERNAL_EMAIL_PATTERNS.
 */
export const DEFAULT_INTERNAL_EMAIL_PATTERNS: readonly string[] = ["*@bulsulabs.com", "*@bulsulogistics.com", "*@dentvideo.com", "e2e-monitor+*@*", "e2e*@*", "qa+*@*", "dvq*+*@*"];

export const INTERNAL_PATTERNS_ENV = "DENTVID_INTERNAL_EMAIL_PATTERNS";

/** Normalise one pattern entry; null when empty or unusable. "@x.com" → "*@x.com". */
export function normalisePattern(raw: string): string | null {
  let p = raw.trim().toLowerCase();
  if (!p) return null;
  if (p.startsWith("@")) p = `*${p}`;
  // Every pattern names something before and after one "@" (a bare word would match half the internet).
  const at = p.split("@");
  if (at.length !== 2 || !at[0] || !at[1]) return null;
  if (/\s/.test(p)) return null;
  return p;
}

/** The defaults plus the env list (DENTVID_INTERNAL_EMAIL_PATTERNS, comma / semicolon / whitespace separated). */
export function internalPatterns(env: Record<string, string | undefined> = process.env): string[] {
  const extra = (env[INTERNAL_PATTERNS_ENV] ?? "").split(/[\s,;]+/);
  const out = new Set<string>();
  for (const p of [...DEFAULT_INTERNAL_EMAIL_PATTERNS, ...extra]) {
    const n = normalisePattern(p);
    if (n) out.add(n);
  }
  return [...out];
}

const cache = new Map<string, RegExp>();

/** A pattern as an anchored regular expression (`*` → any run of characters). */
export function patternRegex(pattern: string): RegExp {
  let re = cache.get(pattern);
  if (!re) {
    re = new RegExp(
      `^${pattern
        .split("*")
        .map((s) => s.replace(/[.+?^${}()|[\]\\/-]/g, "\\$&"))
        .join(".*")}$`,
      "i",
    );
    cache.set(pattern, re);
  }
  return re;
}

/** Does this address match an internal pattern? */
export function isInternalEmail(email: string | null | undefined, patterns: readonly string[] = internalPatterns()): boolean {
  const e = (email ?? "").trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  return patterns.some((p) => patternRegex(p).test(e));
}

export type InternalUserLike = { email?: string | null; app_metadata?: Record<string, unknown> | null } | null | undefined;

/** Is this account internal (email pattern, or app_metadata.internal = true)? */
export function isInternalUser(user: InternalUserLike, patterns: readonly string[] = internalPatterns()): boolean {
  if (!user) return false;
  if (user.app_metadata?.internal === true) return true;
  return isInternalEmail(user.email, patterns);
}

/**
 * Does a page signed in as this account mark the browser internal
 * (components/dentvid/internal-mark)? Internal accounts and admins
 * (DENTVIDEO_ADMIN_USER_IDS) do.
 */
export function marksBrowserInternal(user: (InternalUserLike & { id?: string }) | null | undefined, env: Record<string, string | undefined> = process.env): boolean {
  if (!user) return false;
  return isInternalUser(user, internalPatterns(env)) || isAdminUser(user.id, env);
}

/* ------------------------------------------------------- admin exclusion */

type EventLike = { props: Record<string, unknown> | null; clinic_id: string | null };
type ClinicLike = { id: string; owner_id?: string };
type ItemLike = { clinic_id: string };

/** An event tagged internal when it was recorded (props.internal = true). */
export const isInternalEvent = (e: { props: Record<string, unknown> | null }) => e.props?.internal === true;

export type InternalExcluded = { clinics: number; events: number; items: number };

/**
 * The admin views' default: everything internal left out — events tagged
 * internal, clinics whose owner is internal, and those clinics' events and
 * videos (events recorded before tagging existed, or by the server for a
 * clinic, are caught through their clinic).
 */
export function withoutInternal<C extends ClinicLike, E extends EventLike, I extends ItemLike>(
  data: { clinics: C[]; events: E[]; items: I[] },
  internalOwnerIds: ReadonlySet<string>,
): { clinics: C[]; events: E[]; items: I[]; excluded: InternalExcluded } {
  const internalClinics = new Set(data.clinics.filter((c) => !!c.owner_id && internalOwnerIds.has(c.owner_id)).map((c) => c.id));
  const clinics = data.clinics.filter((c) => !internalClinics.has(c.id));
  const events = data.events.filter((e) => !isInternalEvent(e) && !(e.clinic_id && internalClinics.has(e.clinic_id)));
  const items = data.items.filter((i) => !internalClinics.has(i.clinic_id));
  return {
    clinics,
    events,
    items,
    excluded: { clinics: data.clinics.length - clinics.length, events: data.events.length - events.length, items: data.items.length - items.length },
  };
}

/** ?internal=1 on an admin page includes internal traffic; anything else (the default) leaves it out. */
export function includeInternalParam(v: string | string[] | undefined | null): boolean {
  const s = Array.isArray(v) ? v[0] : v;
  return s === "1" || s === "include";
}
