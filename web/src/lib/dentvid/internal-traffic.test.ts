import { describe, expect, it } from "vitest";
import {
  DEFAULT_INTERNAL_EMAIL_PATTERNS,
  includeInternalParam,
  internalPatterns,
  isInternalEmail,
  isInternalEvent,
  isInternalUser,
  marksBrowserInternal,
  normalisePattern,
  withoutInternal,
} from "./internal-traffic";
import { funnel, type AdminEvent } from "./admin-metrics";
import { isInternalBrowser, markInternalBrowser, INTERNAL_KEY } from "./internal-flag";
import { applyInternalParam, internalParam } from "./internal-optin";

const defaults = internalPatterns({});

describe("internal accounts: email patterns", () => {
  it("the defaults catch the company domains and the QA / e2e / monitor test addresses", () => {
    for (const e of [
      "e2e-monitor+1731600000abc@bulsulabs.com",
      "e2e-monitor+smoke-1@bulsulabs.com",
      "e2e-funnel-123@bulsulabs.com",
      "e2e1@example.test",
      "qa+checkout-3@bulsulabs.com",
      "qa+de@gmail.com",
      "dvq7+tr@bulsulabs.com",
      "dvqa+x@whatever.org",
      "hello@dentvideo.com",
      "Someone@BulsuLabs.com",
      "Info@BulsuLogistics.com",
      "  QA+X@gmail.com ",
    ]) {
      expect(isInternalEmail(e, defaults), e).toBe(true);
    }
  });

  it("real clinics are not caught: no bare prefixes, no look-alike domains", () => {
    for (const e of [
      "dr.mueller@praxis-mueller.de",
      "info@klinik.com.tr",
      "qa@clinic.de", // no plus tag
      "dvquinn@gmail.com", // dvq without a plus tag
      "dr.e2e@clinic.de", // e2e not at the start
      "someone@bulsulabs.com.evil.example",
      "someone@bulsulogistics.com.evil.example",
      "someone@notdentvideo.com",
      "",
      null,
      undefined,
      "not-an-email",
    ]) {
      expect(isInternalEmail(e as string, defaults), String(e)).toBe(false);
    }
  });

  it("no personal address is built in: the env list adds them (comma, semicolon or space separated)", () => {
    expect(DEFAULT_INTERNAL_EMAIL_PATTERNS.every((p) => p.startsWith("*@") || /^[a-z0-9-]+[+*]/.test(p))).toBe(true);
    const env = { DENTVID_INTERNAL_EMAIL_PATTERNS: "owner.personal@example.org, @owner-company.example; tester+*@mail.example" };
    const p = internalPatterns(env);
    expect(p).toEqual(expect.arrayContaining([...defaults, "owner.personal@example.org", "*@owner-company.example", "tester+*@mail.example"]));
    expect(isInternalEmail("owner.personal@example.org", p)).toBe(true);
    expect(isInternalEmail("owner.personal@example.org", defaults)).toBe(false);
    expect(isInternalEmail("anyone@owner-company.example", p)).toBe(true);
    expect(isInternalEmail("tester+1@mail.example", p)).toBe(true);
    expect(isInternalEmail("tester@mail.example", p)).toBe(false);
  });

  it("unusable entries are ignored, never widened into match-everything", () => {
    expect(normalisePattern("")).toBeNull();
    expect(normalisePattern("qa+")).toBeNull();
    expect(normalisePattern("*")).toBeNull();
    expect(normalisePattern("a@b@c")).toBeNull();
    expect(normalisePattern("@Example.COM")).toBe("*@example.com");
    const p = internalPatterns({ DENTVID_INTERNAL_EMAIL_PATTERNS: "*, qa+, ,," });
    expect(p).toEqual(defaults);
    expect(isInternalEmail("dr@clinic.de", p)).toBe(false);
  });

  it("regex characters in a pattern are literal (a dot is a dot)", () => {
    const p = internalPatterns({ DENTVID_INTERNAL_EMAIL_PATTERNS: "a.b@x.io" });
    expect(isInternalEmail("a.b@x.io", p)).toBe(true);
    expect(isInternalEmail("axb@x.io", p)).toBe(false);
    expect(isInternalEmail("a.b@xxio", p)).toBe(false);
  });
});

describe("internal accounts: app_metadata and admins", () => {
  it("app_metadata.internal = true makes any account internal; user_metadata does not", () => {
    expect(isInternalUser({ email: "dr@clinic.de", app_metadata: { product: "dentvideo", internal: true } }, defaults)).toBe(true);
    expect(isInternalUser({ email: "dr@clinic.de", app_metadata: { internal: "true" } }, defaults)).toBe(false);
    expect(isInternalUser({ email: "dr@clinic.de", app_metadata: { product: "dentvideo" }, user_metadata: { internal: true } } as never, defaults)).toBe(false);
    expect(isInternalUser({ email: "qa+1@bulsulabs.com", app_metadata: {} }, defaults)).toBe(true);
    expect(isInternalUser(null, defaults)).toBe(false);
  });

  it("an admin's or an internal account's signed-in page marks the browser; a clinic's does not", () => {
    const admin = "0b0f6f7e-1111-4222-8333-944444444444";
    const env = { DENTVIDEO_ADMIN_USER_IDS: admin };
    expect(marksBrowserInternal({ id: admin, email: "owner@personal.example", app_metadata: {} }, env)).toBe(true);
    expect(marksBrowserInternal({ id: "x", email: "qa+1@bulsulabs.com", app_metadata: {} }, env)).toBe(true);
    expect(marksBrowserInternal({ id: "x", email: "dr@clinic.de", app_metadata: {} }, env)).toBe(false);
    expect(marksBrowserInternal(null, env)).toBe(false);
  });
});

describe("admin views: internal traffic left out by default", () => {
  const INT_OWNER = "owner-internal";
  const clinics = [
    { id: "c-real", owner_id: "owner-real", created_at: "2026-11-10T00:00:00Z", plan: "trial" },
    { id: "c-qa", owner_id: INT_OWNER, created_at: "2026-11-10T00:00:00Z", plan: "trial" },
  ];
  const ev = (name: string, props: Record<string, unknown> = {}, clinic_id: string | null = null): AdminEvent => ({ name, locale: "en", props, clinic_id, created_at: "2026-11-14T10:00:00Z" });
  const events: AdminEvent[] = [
    ev("landing_view"),
    ev("landing_view"),
    ev("landing_view", { internal: true, utm_source: "google", utm_medium: "cpc", utm_campaign: "de-search-core" }),
    ev("landing_view", { internal: true }),
    ev("signup_started"),
    ev("signup_started", { internal: true }),
    ev("signup_completed", { internal: true }),
    ev("clinic_saved", {}, "c-real"),
    // Recorded before tagging existed, or by the server for the clinic: caught through the clinic.
    ev("clinic_saved", {}, "c-qa"),
    ev("checkout_opened", { tier: "starter", interval: "month", via: "link" }, "c-qa"),
  ];
  const items = [
    { clinic_id: "c-real", id: "i1" },
    { clinic_id: "c-qa", id: "i2" },
  ];

  it("drops tagged events, internal owners' clinics and everything of those clinics", () => {
    const out = withoutInternal({ clinics, events, items }, new Set([INT_OWNER]));
    expect(out.clinics.map((c) => c.id)).toEqual(["c-real"]);
    expect(out.items.map((i) => i.id)).toEqual(["i1"]);
    expect(out.events.some(isInternalEvent)).toBe(false);
    expect(out.events.map((e) => e.name)).toEqual(["landing_view", "landing_view", "signup_started", "clinic_saved"]);
    expect(out.excluded).toEqual({ clinics: 1, events: 6, items: 1 });
    // No ad-tagged QA visit is left to pollute the paid-search rows.
    expect(out.events.some((e) => e.props?.utm_medium === "cpc")).toBe(false);
  });

  it("the funnel counts only real traffic once excluded", () => {
    const now = new Date("2026-11-15T00:00:00Z");
    const count = (evs: AdminEvent[], name: string) => funnel(evs, { days: 30, now }).find((s) => s.event === name)?.count;
    const out = withoutInternal({ clinics, events, items }, new Set([INT_OWNER]));
    expect(count(events, "landing_view")).toBe(4);
    expect(count(out.events, "landing_view")).toBe(2);
    expect(count(events, "checkout_opened")).toBe(1);
    expect(count(out.events, "checkout_opened")).toBe(0);
  });

  it("without the users list, the tags alone still apply", () => {
    const out = withoutInternal({ clinics, events, items }, new Set());
    expect(out.clinics).toHaveLength(2);
    expect(out.events).toHaveLength(6);
  });

  it("?internal=1 includes internal traffic; anything else leaves it out", () => {
    expect(includeInternalParam("1")).toBe(true);
    expect(includeInternalParam(["1"])).toBe(true);
    expect(includeInternalParam("include")).toBe(true);
    for (const v of [undefined, null, "", "0", "yes", "true"]) expect(includeInternalParam(v as string)).toBe(false);
  });
});

/** A Storage-like map. */
function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe("internal browsers", () => {
  it("the flag is dv-internal=1 in localStorage; storage that throws reads as not internal", () => {
    const s = memStore();
    expect(isInternalBrowser(s)).toBe(false);
    markInternalBrowser(true, s);
    expect(s.m.get(INTERNAL_KEY)).toBe("1");
    expect(isInternalBrowser(s)).toBe(true);
    markInternalBrowser(false, s);
    expect(isInternalBrowser(s)).toBe(false);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {},
    };
    expect(isInternalBrowser(broken)).toBe(false);
    expect(() => markInternalBrowser(true, broken)).not.toThrow();
  });

  it("?dv_internal=1 marks the browser only when the server confirms an internal account or admin", async () => {
    const s = memStore();
    const g = globalThis as unknown as { localStorage?: unknown; window?: unknown };
    const prev = { ls: g.localStorage, w: g.window };
    const replaced: string[] = [];
    g.localStorage = s;
    g.window = { history: { state: null, replaceState: (_: unknown, __: string, url: string) => replaced.push(url) } };
    try {
      const loc = (q: string) => ({ search: q, href: `https://dentvideo.com/tr${q}#try` });
      // Not signed in as one of us: nothing is kept (a shared link marks nobody).
      expect(await applyInternalParam(loc("?dv_internal=1"), async () => ({ internal: false }))).toBe(false);
      expect(await applyInternalParam(loc("?dv_internal=1"), async () => null)).toBe(false);
      expect(await applyInternalParam(loc("?dv_internal=1"), async () => Promise.reject(new Error("offline")))).toBe(false);
      expect(isInternalBrowser(s)).toBe(false);
      // Signed in as internal / admin: kept.
      expect(await applyInternalParam(loc("?utm_source=x&dv_internal=1"), async () => ({ internal: true }))).toBe(true);
      expect(isInternalBrowser(s)).toBe(true);
      // The parameter is taken off the address bar, the rest kept.
      expect(replaced.at(-1)).toBe("/tr?utm_source=x#try");
      // ?dv_internal=0 removes it without asking anyone.
      let asked = false;
      expect(await applyInternalParam(loc("?dv_internal=0"), async () => ((asked = true), { internal: true }))).toBe(false);
      expect(asked).toBe(false);
      expect(isInternalBrowser(s)).toBe(false);
      expect(await applyInternalParam(loc("?x=1"))).toBeNull();
    } finally {
      g.localStorage = prev.ls;
      g.window = prev.w;
    }
  });

  it("only 1 and 0 are understood", () => {
    expect(internalParam("?dv_internal=1")).toBe("1");
    expect(internalParam("?dv_internal=0")).toBe("0");
    expect(internalParam("?dv_internal=yes")).toBeNull();
    expect(internalParam("")).toBeNull();
  });
});
