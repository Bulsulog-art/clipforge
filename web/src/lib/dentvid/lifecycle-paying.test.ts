import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { duePaying, lifecycleConfig, runPaying, supabaseLifecycleStore, type ClinicForMail, type LifecycleStore, type LogRow, type Sender, type WeekStats } from "./lifecycle";
import { monthlyEmail, type MonthStats } from "./lifecycle-email";
import { LIFECYCLE_COPY } from "@/content/dentvideo-lifecycle";
import { APP_TEXT } from "@/content/dentvideo-app";
import { LOCALES } from "@/content/dentvideo";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
// Thursday 12 Nov 2026, 10:23 UTC = 13:23 in Istanbul.
const THU = new Date("2026-11-12T10:23:00Z");
// Monday 2 Nov 2026, 10:23 UTC: the first weekday of the month.
const MON = new Date("2026-11-02T10:23:00Z");

const clinic = (n: number, over: Partial<ClinicForMail> = {}): ClinicForMail => ({
  id: id(n),
  owner_id: `owner-${n}`,
  profile: { name: `Klinik ${n}`, language: "tr", country: "TR" },
  plan: "active",
  created_at: "2026-08-01T00:00:00Z",
  email_opt_out_at: null,
  ...over,
});

function memory(clinics: ClinicForMail[], week: Partial<WeekStats> = {}, month: MonthStats | null = { made: 16, approved: 12, shared: 0 }, emails: Record<string, string> = {}) {
  const log: LogRow[] = [];
  const rows = new Map(clinics.map((c) => [c.id, c]));
  const store: LifecycleStore = {
    trialClinics: async () => [],
    activeClinics: async () => [...rows.values()].filter((c) => c.plan === "active" && !c.email_opt_out_at),
    logs: async (ids) => log.filter((l) => ids.includes(l.clinic_id)),
    clinic: async (cid) => rows.get(cid) ?? null,
    claim: async (cid, kind) => (log.some((l) => l.clinic_id === cid && l.kind === kind) ? false : (log.push({ clinic_id: cid, kind, sent_at: "" }), true)),
    release: async () => {},
    owner: async (o) => ({ email: emails[o] ?? `${o}@x.test`, verified: true }),
    optOut: async () => true,
    weekStats: async () => ({ approved: 3, pending: 1, shared: 0, posted: 0, firstReadyAt: "2026-11-08T22:00:00Z", ...week }),
    monthStats: async () => month,
  };
  return { store, log, rows };
}

const cfg = () => lifecycleConfig({ NEXT_PUBLIC_DENTVIDEO_URL: "https://dentvideo.com", DENTVIDEO_UNSUBSCRIBE_SECRET: "s" });
function sender() {
  const sent: { to: string; subject: string; text: string; html: string; headers?: Record<string, string>; key?: string }[] = [];
  const send: Sender = vi.fn(async (to, m, o) => (sent.push({ to, ...m, headers: o.headers, key: o.idempotencyKey }), true));
  return { send, sent };
}

describe("which paying-clinic email is due", () => {
  it("posting nudge on Thursday in the clinic's daytime; monthly summary early in the month on a weekday", () => {
    expect(duePaying(clinic(1), new Set(), THU)).toEqual({ kind: "nudge_post_2026_11_09", type: "post", week: "2026-11-09" });
    expect(duePaying(clinic(1), new Set(["nudge_post_2026_11_09"]), THU)).toBeNull();
    expect(duePaying(clinic(1), new Set(), new Date("2026-11-11T10:23:00Z"))).toBeNull(); // Wednesday
    expect(duePaying(clinic(1), new Set(), new Date("2026-11-12T19:00:00Z"))).toBeNull(); // 22:00 Istanbul
    expect(duePaying(clinic(1), new Set(), MON)).toEqual({ kind: "monthly_2026_10", type: "monthly", year: 2026, month: 10 });
    expect(duePaying(clinic(1), new Set(["monthly_2026_10"]), MON)).toBeNull();
    expect(duePaying(clinic(1), new Set(), new Date("2026-11-01T10:23:00Z"))).toBeNull(); // Sunday the 1st
    expect(duePaying(clinic(1), new Set(), new Date("2027-01-04T10:23:00Z"))).toMatchObject({ kind: "monthly_2026_12" });
    // A clinic that started paying in the last week of October gets no October summary.
    expect(duePaying(clinic(1, { created_at: "2026-10-28T00:00:00Z" }), new Set(), MON)).toBeNull();
    expect(duePaying(clinic(1, { plan: "trial" }), new Set(), THU)).toBeNull();
    expect(duePaying(clinic(1, { email_opt_out_at: "2026-11-01T00:00:00Z" }), new Set(), THU)).toBeNull();
  });
});

describe("runPaying", () => {
  it("nudges a clinic that has not shared this week, once, with unsubscribe headers", async () => {
    const m = memory([clinic(1)]);
    const { send, sent } = sender();
    const r = await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(r.sent).toBe(1);
    expect(sent[0].subject).toBe("Bu haftanın videoları sizi bekliyor");
    expect(sent[0].text).toContain("onaylanmış ve paylaşıma hazır 3 video");
    expect(sent[0].text).toContain("onayınızı bekleyen 1 video");
    expect(sent[0].html).toContain('href="https://dentvideo.com/app"');
    expect(sent[0].headers?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(sent[0].key).toBe(`dentvideo-nudge_post-${id(1)}-2026-11-09`);
    await runPaying({ store: m.store, send, allow: async () => true, now: new Date(THU.getTime() + 3600_000), config: cfg() });
    expect(sent).toHaveLength(1);
  });

  it("does not nudge when something was shared or ticked as posted, nothing is ready, the week is too fresh, or nothing can be read", async () => {
    const cases = [
      { shared: 1 },
      { approved: 0, pending: 0 },
      { firstReadyAt: "2026-11-11T12:00:00Z" },
      { shared: null, posted: null },
      // Posted from the email's page and ticked there: no share event with the clinic, still posted.
      { shared: 0, posted: 1 },
      { shared: null, posted: 2 },
    ] as Partial<WeekStats>[];
    for (const week of cases) {
      const m = memory([clinic(1)], week);
      const { send, sent } = sender();
      await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
      expect(sent, JSON.stringify(week)).toHaveLength(0);
    }
  });

  it("a week with no share events but one video ticked as posted gets no Thursday nudge, and the run says why", async () => {
    const m = memory([clinic(1)], { shared: 0, posted: 1 });
    const { send, sent } = sender();
    const r = await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(sent).toHaveLength(0);
    expect(r.skipped).toMatchObject({ "already posted": 1 });
    expect(m.log).toHaveLength(0);
  });

  it("decides on the posted ticks when the share events cannot be read, and on the events when the ticks cannot", async () => {
    for (const [week, n] of [
      [{ shared: null, posted: 0 }, 1],
      [{ shared: 0, posted: null }, 1],
      [{ shared: 2, posted: null }, 0],
    ] as [Partial<WeekStats>, number][]) {
      const m = memory([clinic(1)], week);
      const { send, sent } = sender();
      await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
      expect(sent, JSON.stringify(week)).toHaveLength(n);
    }
  });

  it("the nudge names the app's own post button and says it stops once a video is shared or marked as posted", async () => {
    const m = memory([clinic(1, { profile: { name: "Smile", language: "en", country: "GB" } })]);
    const { send, sent } = sender();
    await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(sent[0].text).toContain(`tap “${APP_TEXT.en.library.review.openPost}” on a video`);
    expect(sent[0].text).toContain("only when none of this week's videos has been shared or marked as posted");
    expect(sent[0].text).not.toMatch(/tap Share/);
  });

  it("monthly summary: made, approved, posted; none when nothing was made", async () => {
    const m = memory([clinic(1, { profile: { name: "Smile", language: "en", country: "GB" } })], {}, { made: 16, approved: 12, shared: 0, posted: 0 });
    const { send, sent } = sender();
    await runPaying({ store: m.store, send, allow: async () => true, now: MON, config: cfg() });
    expect(sent[0].subject).toBe("Your DentVideo month: October 2026");
    expect(sent[0].text).toContain("videos made: 16");
    expect(sent[0].text).toContain("approved: 12");
    expect(sent[0].text).toContain("posted: 0");
    expect(sent[0].text).toContain("We haven't seen any marked as posted yet.");
    expect(sent[0].text).toContain(`tap “${APP_TEXT.en.library.post.markPosted}”`);
    expect(sent[0].text).not.toContain("from the app");
    const empty = memory([clinic(1)], {}, { made: 0, approved: 0, shared: 0 });
    const b = sender();
    await runPaying({ store: empty.store, send: b.send, allow: async () => true, now: MON, config: cfg() });
    expect(b.sent).toHaveLength(0);
  });

  it("skips test accounts and clinics that stopped paying", async () => {
    const m = memory([clinic(1), clinic(2)], {}, null, { "owner-1": "e2e-pay@x.test" });
    m.store.clinic = async (cid) => (cid === id(2) ? clinic(2, { plan: "paused" }) : clinic(1));
    const { send, sent } = sender();
    const r = await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(sent).toHaveLength(0);
    expect(r.skipped).toMatchObject({ "test account": 1, "not active": 1 });
  });
});

describe("monthly summary: posted X of Y approved", () => {
  const args = { language: "en", clinicName: "Smile", url: "https://dentvideo.com/app", unsubscribeUrl: "https://dentvideo.com/api/dentvideo/unsubscribe?t=x.y", year: 2026, month: 10 };
  const nonePhrases = LOCALES.map((l) => LIFECYCLE_COPY[l].monthly.sharedNone.split("{mark}")[0].trim());

  it("with videos ticked as posted it never says none, in any language, even with no share events", () => {
    for (const lang of LOCALES) {
      const m = monthlyEmail({ ...args, language: lang, stats: { made: 20, approved: 17, shared: 0, posted: 5 } });
      const c = LIFECYCLE_COPY[lang].monthly;
      for (const none of nonePhrases) expect(m.text, lang).not.toContain(none);
      expect(m.text, lang).toContain(c.sharedSome);
      expect(m.text, lang).toContain(`${c.posted}: 5`);
    }
    const en = monthlyEmail({ ...args, stats: { made: 20, approved: 17, shared: 0, posted: 5 } });
    expect(en.text).toContain("Approved videos marked as posted: 5 of 17.");
  });

  it("posted never exceeds approved", () => {
    const m = monthlyEmail({ ...args, stats: { made: 6, approved: 2, shared: 9, posted: 4 } });
    expect(m.text).toContain("approved: 2");
    expect(m.text).toContain("posted: 2");
    expect(m.text).toContain("Approved videos marked as posted: 2 of 2.");
    expect(m.text).not.toMatch(/posted: [3-9]|: 4 of/);
    // Nothing approved: nothing can count as posted.
    const none = monthlyEmail({ ...args, stats: { made: 3, approved: 0, shared: 0, posted: 2 } });
    expect(none.text).toContain("posted: 0");
    expect(none.text).toContain("We haven't seen any marked as posted yet.");
  });

  it("share events alone never stand in for the posted number: unknown ticks show two numbers, not a guess", () => {
    const m = monthlyEmail({ ...args, stats: { made: 20, approved: 17, shared: 40 } });
    expect(m.text).toContain("videos made: 20");
    expect(m.text).toContain("approved: 17");
    expect(m.text).not.toMatch(/posted: |shared: |40/);
    // ...but they still decide between the thank-you and the gentle line.
    expect(m.text).toContain(LIFECYCLE_COPY.en.monthly.sharedSome);
    expect(monthlyEmail({ ...args, stats: { made: 20, approved: 17, shared: 0, posted: null } }).text).toContain("We haven't seen any marked as posted yet.");
  });

  it("the gentle line names the app's own Mark as posted button, in every language, and never says 'from the app'", () => {
    for (const lang of LOCALES) {
      const m = monthlyEmail({ ...args, language: lang, stats: { made: 5, approved: 5, shared: 0, posted: 0 } });
      expect(m.text, lang).toContain(APP_TEXT[lang].library.post.markPosted);
    }
    expect(LIFECYCLE_COPY.en.monthly.sharedNone).not.toMatch(/from the app/i);
  });
});

/* ------------------------------------------------- the Liman store's counts */

type Row = Record<string, unknown>;
type Filter = (r: Row) => boolean;

/** A small stand-in for the PostgREST builder: eq / in / gte / lt / not-is-null, count + head. */
function fakeDb(tables: Record<string, Row[]>, opts: { noPostedAt?: boolean; failEvents?: boolean } = {}) {
  const calls: { table: string; filters: string[] }[] = [];
  const db = {
    from(table: string) {
      const filters: Filter[] = [];
      const seen: string[] = [];
      let head = false;
      const col = (k: string) => {
        seen.push(k);
      };
      const q = {
        select: (_cols: string, o?: { count?: string; head?: boolean }) => ((head = !!o?.head), q),
        eq: (k: string, v: unknown) => (col(`${k}=${v}`), filters.push((r) => r[k] === v), q),
        in: (k: string, vs: unknown[]) => (col(`${k} in`), filters.push((r) => vs.includes(r[k])), q),
        gte: (k: string, v: string) => (col(`${k}>=`), filters.push((r) => String(r[k]) >= v), q),
        lt: (k: string, v: string) => (col(`${k}<`), filters.push((r) => String(r[k]) < v), q),
        not: (k: string, op: string, v: unknown) => (col(`${k} not ${op} ${v}`), filters.push((r) => r[k] !== null && r[k] !== undefined), q),
        then(resolve: (v: unknown) => void) {
          calls.push({ table, filters: seen });
          if (opts.noPostedAt && seen.some((f) => f.startsWith("posted_at"))) return resolve({ data: null, count: null, error: { code: "42703", message: "column dentvid_items.posted_at does not exist" } });
          if (opts.failEvents && table === "dentvid_events") return resolve({ data: null, count: null, error: { code: "42P01", message: "relation dentvid_events does not exist" } });
          const rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          return resolve(head ? { data: null, count: rows.length, error: null } : { data: rows, count: null, error: null });
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
  return { db, calls };
}

describe("supabaseLifecycleStore: what went out", () => {
  const C = id(1);
  const item = (n: number, over: Row = {}): Row => ({
    id: id(100 + n),
    clinic_id: C,
    week_of: "2026-11-09",
    kind: "generated",
    status: "ready",
    approval: "approved",
    created_at: "2026-11-09T06:00:00Z",
    posted_at: null,
    ...over,
  });

  it("weekStats counts this week's videos ticked as posted, besides the share events", async () => {
    const items = [
      item(1, { posted_at: "2026-11-10T09:00:00Z" }),
      item(2),
      item(3, { approval: "pending" }),
      item(4, { posted_at: "2026-11-03T09:00:00Z", week_of: "2026-11-02" }), // last week
      item(5, { posted_at: "2026-11-10T09:00:00Z", clinic_id: id(2) }), // another clinic
      item(6, { posted_at: "2026-11-10T09:00:00Z", kind: "recording" }),
    ];
    const { db } = fakeDb({ dentvid_items: items, dentvid_events: [] });
    const w = await supabaseLifecycleStore(db).weekStats!(C, "2026-11-09");
    expect(w).toEqual({ approved: 2, pending: 1, shared: 0, posted: 1, firstReadyAt: "2026-11-09T06:00:00Z" });
  });

  it("weekStats says 'unknown' for the ticks before 0012, and the run then decides on the share events", async () => {
    const { db } = fakeDb({ dentvid_items: [item(1)], dentvid_events: [] }, { noPostedAt: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = await supabaseLifecycleStore(db).weekStats!(C, "2026-11-09");
    expect(w.posted).toBeNull();
    expect(w.shared).toBe(0);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    const both = fakeDb({ dentvid_items: [item(1)] }, { noPostedAt: true, failEvents: true });
    const u = await supabaseLifecycleStore(both.db).weekStats!(C, "2026-11-09");
    expect([u.shared, u.posted]).toEqual([null, null]);
  });

  it("monthStats: posted = approved videos of the month ticked as posted, one per video, never more than approved", async () => {
    const items = [
      item(1, { week_of: "2026-10-05", posted_at: "2026-10-06T09:00:00Z" }),
      item(2, { week_of: "2026-10-12", posted_at: "2026-10-13T09:00:00Z" }),
      item(3, { week_of: "2026-10-19" }),
      // Ticked, then taken back to pending: not counted as posted, so posted stays within approved.
      item(4, { week_of: "2026-10-26", approval: "pending", posted_at: "2026-10-27T09:00:00Z" }),
      item(5, { week_of: "2026-11-02", posted_at: "2026-11-03T09:00:00Z" }), // next month
      item(6, { week_of: "2026-09-28", posted_at: "2026-09-29T09:00:00Z" }), // previous month
    ];
    const events = Array.from({ length: 7 }, (_, n) => ({ id: n, clinic_id: C, name: "video_shared", created_at: "2026-10-14T10:00:00Z" }));
    const { db, calls } = fakeDb({ dentvid_items: items, dentvid_events: events });
    const m = await supabaseLifecycleStore(db).monthStats!(C, new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 10, 1)));
    expect(m).toEqual({ made: 4, approved: 3, posted: 2, shared: 7 });
    expect(calls.some((c) => c.filters.includes("approval=approved") && c.filters.includes("posted_at not is null"))).toBe(true);
  });

  it("monthStats before 0012: posted is unknown, the rest still counts", async () => {
    const { db } = fakeDb({ dentvid_items: [item(1, { week_of: "2026-10-05" })], dentvid_events: [] }, { noPostedAt: true });
    const m = await supabaseLifecycleStore(db).monthStats!(C, new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 10, 1)));
    expect(m).toEqual({ made: 1, approved: 1, posted: null, shared: 0 });
  });
});
