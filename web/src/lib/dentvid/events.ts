/**
 * DentVideo first-party funnel events — the allow-list and the payload rules.
 *
 * Pure (no I/O, no Next imports) so the browser helper (events-client), the
 * POST /api/dentvideo/event route, the server-side recorders and the tests
 * share one definition.
 *
 * Privacy rules, enforced here rather than trusted from callers:
 * - only allow-listed event names are stored;
 * - each event has its own prop allow-list, and every value must match a
 *   narrow shape (an enum, a short slug, a host name, a small integer, a
 *   boolean, an ISO country code) — free text never gets through, so an
 *   email, a name or a URL path cannot be stored by accident;
 * - anything that still looks like an email or a phone number is dropped;
 * - no IP, user agent or cookie id is ever part of an event.
 */

export const DV_EVENTS = [
  "landing_view",
  "preview_started",
  "signup_completed",
  "clinic_saved",
  "preview_step_viewed",
  "plan_clicked",
  "checkout_opened",
  "payment_succeeded",
  "week_ready",
  "video_approved",
  "video_shared",
] as const;
export type DvEventName = (typeof DV_EVENTS)[number];

/**
 * Events a browser may send to /api/dentvideo/event. The rest are recorded
 * by the server at the moment they really happen (account created, checkout
 * opened, payment webhook…), so they cannot be forged from a browser.
 */
export const DV_CLIENT_EVENTS: readonly DvEventName[] = ["landing_view", "preview_started", "preview_step_viewed", "plan_clicked", "video_shared"];

/** Browser events that belong to a signed-in clinic: the route looks the clinic up from the session. */
export const DV_CLINIC_CLIENT_EVENTS: readonly DvEventName[] = ["preview_step_viewed", "plan_clicked", "video_shared"];

export type DvProps = Record<string, string | number | boolean>;

type Rule =
  | { kind: "enum"; values: readonly string[] }
  | { kind: "slug" }
  | { kind: "host" }
  | { kind: "int"; max: number }
  | { kind: "bool" }
  | { kind: "country" };

const TIER: Rule = { kind: "enum", values: ["starter", "practice", "group"] };
const INTERVAL: Rule = { kind: "enum", values: ["month", "year"] };
const LANGUAGE: Rule = { kind: "enum", values: ["en", "de", "es", "fr", "it", "pt", "tr", "ja", "ar", "pl"] };

export const DV_EVENT_PROPS: Record<DvEventName, Record<string, Rule>> = {
  landing_view: { utm_source: { kind: "slug" }, utm_medium: { kind: "slug" }, utm_campaign: { kind: "slug" }, ref: { kind: "host" } },
  preview_started: { where: { kind: "enum", values: ["landing", "wizard"] } },
  signup_completed: {},
  clinic_saved: { country: { kind: "country" }, language: LANGUAGE },
  preview_step_viewed: {},
  plan_clicked: { tier: TIER, interval: INTERVAL, where: { kind: "enum", values: ["onboarding", "app"] } },
  checkout_opened: { tier: TIER, interval: INTERVAL, founding: { kind: "bool" }, via: { kind: "enum", values: ["api", "link"] } },
  payment_succeeded: {
    tier: TIER,
    interval: INTERVAL,
    first: { kind: "bool" },
    event: { kind: "enum", values: ["subscription.active", "subscription.renewed", "subscription.unpaused", "subscription.plan_changed"] },
  },
  week_ready: { kind: { kind: "enum", values: ["week", "recording"] }, ready: { kind: "int", max: 100 }, flagged: { kind: "int", max: 100 } },
  video_approved: {},
  video_shared: { method: { kind: "enum", values: ["share", "download"] } },
};

const SLUG = /^[a-z0-9][a-z0-9._-]{0,39}$/;
const HOST = /^(?=.{3,80}$)[a-z0-9-]+(\.[a-z0-9-]+)+$/;
const EMAIL = /@|%40/;
const PHONE = /\d[\d\s().-]{6,}\d/;

/** Is this one of our event names? */
export function isDvEvent(name: unknown): name is DvEventName {
  return typeof name === "string" && (DV_EVENTS as readonly string[]).includes(name);
}

function clean(rule: Rule, raw: unknown): string | number | boolean | undefined {
  switch (rule.kind) {
    case "bool":
      return typeof raw === "boolean" ? raw : undefined;
    case "int":
      return typeof raw === "number" && Number.isInteger(raw) && raw >= 0 && raw <= rule.max ? raw : undefined;
    case "enum":
      return typeof raw === "string" && rule.values.includes(raw) ? raw : undefined;
    case "country": {
      const v = typeof raw === "string" ? raw.trim().toUpperCase() : "";
      return /^[A-Z]{2}$/.test(v) ? v : undefined;
    }
    case "slug": {
      if (typeof raw !== "string") return undefined;
      const v = raw.trim().toLowerCase();
      if (EMAIL.test(v) || PHONE.test(v)) return undefined;
      return SLUG.test(v) ? v : undefined;
    }
    case "host": {
      if (typeof raw !== "string") return undefined;
      const v = raw.trim().toLowerCase().replace(/^www\./, "");
      if (EMAIL.test(v)) return undefined;
      return HOST.test(v) ? v : undefined;
    }
  }
}

/** The props of an event reduced to its allow-list; anything else is dropped. */
export function sanitizeProps(name: DvEventName, raw: unknown): DvProps {
  const rules = DV_EVENT_PROPS[name];
  const out: DvProps = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, rule] of Object.entries(rules)) {
    const v = clean(rule, (raw as Record<string, unknown>)[key]);
    if (v !== undefined) out[key] = v;
  }
  return out;
}

const LOCALE = /^[a-z]{2}$/;

export function sanitizeLocale(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const l = v.trim().toLowerCase().slice(0, 2);
  return LOCALE.test(l) && (LANGUAGE as { values: readonly string[] }).values.includes(l) ? l : null;
}

export type DvEventRow = { name: DvEventName; locale: string | null; props: DvProps; clinic_id: string | null };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A row ready to insert, or null if the name is not allowed. */
export function buildEventRow(input: { name: unknown; locale?: unknown; props?: unknown; clinicId?: unknown }): DvEventRow | null {
  if (!isDvEvent(input.name)) return null;
  return {
    name: input.name,
    locale: sanitizeLocale(input.locale),
    props: sanitizeProps(input.name, input.props),
    clinic_id: typeof input.clinicId === "string" && UUID.test(input.clinicId) ? input.clinicId : null,
  };
}

/** Largest accepted request body for /api/dentvideo/event, in bytes. */
export const DV_EVENT_MAX_BYTES = 1024;

/**
 * Parse a browser event body: { name, locale?, props? }. Only client events
 * pass; the clinic id is never taken from the browser.
 */
export function parseClientEvent(text: string): DvEventRow | null {
  if (!text || text.length > DV_EVENT_MAX_BYTES) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  const b = body as { name?: unknown; locale?: unknown; props?: unknown };
  if (!isDvEvent(b.name) || !DV_CLIENT_EVENTS.includes(b.name)) return null;
  return buildEventRow({ name: b.name, locale: b.locale, props: b.props });
}

/** The referrer's host when it is another site (our own pages are not a source). */
export function externalReferrerHost(referrer: string, ownHost: string): string | undefined {
  try {
    const h = new URL(referrer).hostname.toLowerCase().replace(/^www\./, "");
    const own = ownHost.toLowerCase().replace(/^www\./, "");
    return h && h !== own ? h : undefined;
  } catch {
    return undefined;
  }
}
