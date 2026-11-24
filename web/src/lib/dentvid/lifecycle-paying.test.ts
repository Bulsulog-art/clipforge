import { describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

  it("does not nudge when something was shared or ticked as posted, nothing is ready, the week is too fresh, or a signal cannot be read", async () => {
    const cases = [
      { shared: 1 },
      { approved: 0, pending: 0 },
      { firstReadyAt: "2026-11-11T12:00:00Z" },
      // The share events could not be read (the guard this run always had): wait, even with no ticks.
      { shared: null },
      { shared: null, posted: 0 },
      { shared: 0, posted: null },
      { shared: null, posted: null },
      // Posted from the email's page and ticked there: no share event with the clinic, still posted.
      { shared: 0, posted: 1 },
      { shared: null, posted: 2 },
      { shared: 2, posted: null },
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

  it("never sends on a signal it could not read: a seen share or tick settles it, an unread one waits for the next hour", async () => {
    for (const [week, why] of [
      [{ shared: null, posted: 0 }, "shares unknown"],
      [{ shared: 0, posted: null }, "shares unknown"],
      [{ shared: null, posted: null }, "shares unknown"],
      [{ shared: null, posted: 2 }, "already posted"],
      [{ shared: 2, posted: null }, "already posted"],
    ] as [Partial<WeekStats>, string][]) {
      const m = memory([clinic(1)], week);
      const { send, sent } = sender();
      const r = await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
      expect(sent, JSON.stringify(week)).toHaveLength(0);
      expect(r.skipped, JSON.stringify(week)).toEqual({ [why]: 1 });
      // Nothing was claimed: the week's one nudge is still there for a later run.
      expect(m.log, JSON.stringify(week)).toHaveLength(0);
    }
    // The read failed at 13:23; at 14:23 both come back as none, and the nudge goes out once.
    let week: Partial<WeekStats> = { shared: null, posted: 0 };
    const m = memory([clinic(1)]);
    m.store.weekStats = async () => ({ approved: 3, pending: 1, shared: 0, posted: 0, firstReadyAt: "2026-11-08T22:00:00Z", ...week });
    const { send, sent } = sender();
    await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(sent).toHaveLength(0);
    week = {};
    await runPaying({ store: m.store, send, allow: async () => true, now: new Date(THU.getTime() + 3600_000), config: cfg() });
    expect(sent).toHaveLength(1);
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
    expect(sent[0].text).toContain("marked as posted: 0");
    expect(sent[0].text).toContain("We haven't seen any marked as posted yet.");
    expect(sent[0].text).toContain(`tap “${APP_TEXT.en.library.post.markPosted}”`);
    expect(sent[0].text).not.toContain("from the app");
    const empty = memory([clinic(1)], {}, { made: 0, approved: 0, shared: 0 });
    const b = sender();
    await runPaying({ store: empty.store, send: b.send, allow: async () => true, now: MON, config: cfg() });
    expect(b.sent).toHaveLength(0);
  });

  it("monthly summary: numbers that could not be read send nothing this hour, and the next run sends it", async () => {
    let month: MonthStats | null = null;
    const m = memory([clinic(1, { profile: { name: "Smile", language: "en", country: "GB" } })]);
    m.store.monthStats = async () => month;
    const { send, sent } = sender();
    const r = await runPaying({ store: m.store, send, allow: async () => true, now: MON, config: cfg() });
    expect(sent).toHaveLength(0);
    expect(r.skipped).toEqual({ "stats unknown": 1 });
    expect(m.log).toHaveLength(0);
    month = { made: 5, approved: 5, shared: 0, posted: 3 };
    await runPaying({ store: m.store, send, allow: async () => true, now: new Date(MON.getTime() + 3600_000), config: cfg() });
    expect(sent).toHaveLength(1);
    expect(sent[0].text).toContain("Approved videos marked as posted: 3 of 5.");
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
    expect(m.text).toContain("marked as posted: 2");
    expect(m.text).toContain("Approved videos marked as posted: 2 of 2.");
    expect(m.text).not.toMatch(/posted: [3-9]|: 4 of/);
    // Nothing approved: nothing can count as posted.
    const none = monthlyEmail({ ...args, stats: { made: 3, approved: 0, shared: 0, posted: 2 } });
    expect(none.text).toContain("marked as posted: 0");
    expect(none.text).toContain("We haven't seen any marked as posted yet.");
  });

  it("share events alone never stand in for the posted number: unknown ticks show two numbers, not a guess", () => {
    const m = monthlyEmail({ ...args, stats: { made: 20, approved: 17, shared: 40 } });
    expect(m.text).toContain("videos made: 20");
    expect(m.text).toContain("approved: 17");
    expect(m.text).not.toMatch(/posted: |shared: |40/);
    // ...but a share still earns the thank-you.
    expect(m.text).toContain(LIFECYCLE_COPY.en.monthly.sharedSome);
  });

  it("with the ticks unknown, neither the inbox preview nor the lines speak of posted ticks, in any language", () => {
    for (const lang of LOCALES) {
      const c = LIFECYCLE_COPY[lang].monthly;
      for (const shared of [0, 3]) {
        const m = monthlyEmail({ ...args, language: lang, stats: { made: 20, approved: 17, shared, posted: null } });
        expect(m.html, lang).toContain(c.preheaderMadeApproved);
        expect(m.html, lang).not.toContain(c.preheader);
        expect(m.text, lang).not.toContain(c.posted);
        expect(m.text, lang).not.toContain(c.sharedNone.split("{mark}")[0].trim());
        expect(m.text, lang).not.toContain(APP_TEXT[lang].library.post.markPosted);
        expect(m.text.includes(c.sharedSome), `${lang} ${shared}`).toBe(shared > 0);
      }
      // With the ticks counted, the preview names all three numbers.
      const known = monthlyEmail({ ...args, language: lang, stats: { made: 20, approved: 17, shared: 0, posted: 4 } });
      expect(known.html, lang).toContain(c.preheader);
      expect(known.html, lang).not.toContain(c.preheaderMadeApproved);
    }
  });

  it("the third number says what it counts: a clinic that shares but never ticks reads 'marked as posted: 0', with the way to tick", () => {
    const m = monthlyEmail({ ...args, stats: { made: 12, approved: 12, shared: 12, posted: 0 } });
    expect(m.text).toContain("marked as posted: 0");
    expect(m.text).not.toMatch(/(^|\n)posted: 0/);
    expect(m.text).toContain(`tap “${APP_TEXT.en.library.post.markPosted}”`);
    for (const lang of LOCALES) {
      const c = LIFECYCLE_COPY[lang].monthly;
      expect(c.posted, lang).not.toBe(APP_TEXT[lang].library.post.posted);
      expect(c.posted.trim(), lang).not.toBe("");
    }
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

/**
 * A small stand-in for the PostgREST builder: eq / in / gte / lt / not-is-null, count + head.
 * It answers as supabase-js does: a count comes back whenever one was asked for, and a failed
 * HEAD request carries no body, so its error is { message: "" } with no code.
 */
function fakeDb(tables: Record<string, Row[]>, opts: { noPostedAt?: boolean; failPostedAt?: boolean; failEvents?: boolean } = {}) {
  const calls: { table: string; filters: string[]; head: boolean }[] = [];
  const db = {
    from(table: string) {
      const filters: Filter[] = [];
      const seen: string[] = [];
      let head = false;
      let counted = false;
      const col = (k: string) => {
        seen.push(k);
      };
      const q = {
        select: (_cols: string, o?: { count?: string; head?: boolean }) => ((head = !!o?.head), (counted = !!o?.count), q),
        eq: (k: string, v: unknown) => (col(`${k}=${v}`), filters.push((r) => r[k] === v), q),
        in: (k: string, vs: unknown[]) => (col(`${k} in`), filters.push((r) => vs.includes(r[k])), q),
        gte: (k: string, v: string) => (col(`${k}>=`), filters.push((r) => String(r[k]) >= v), q),
        lt: (k: string, v: string) => (col(`${k}<`), filters.push((r) => String(r[k]) < v), q),
        not: (k: string, op: string, v: unknown) => (col(`${k} not ${op} ${v}`), filters.push((r) => r[k] !== null && r[k] !== undefined), q),
        then(resolve: (v: unknown) => void) {
          calls.push({ table, filters: seen, head });
          const fail = (error: { code: string; message: string }) => resolve({ data: null, count: null, error: head ? { message: "" } : error });
          if (opts.noPostedAt && seen.some((f) => f.startsWith("posted_at"))) return fail({ code: "42703", message: "column dentvid_items.posted_at does not exist" });
          if (opts.failPostedAt && seen.some((f) => f.startsWith("posted_at"))) return fail({ code: "57014", message: "canceling statement due to statement timeout" });
          if (opts.failEvents && table === "dentvid_events") return fail({ code: "42P01", message: "relation dentvid_events does not exist" });
          const rows = (tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
          return resolve({ data: head ? null : rows, count: counted ? rows.length : null, error: null });
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

  it("weekStats before 0012: no video can have been ticked, so none, and the run decides on the share events as it always did", async () => {
    const { db } = fakeDb({ dentvid_items: [item(1)], dentvid_events: [] }, { noPostedAt: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = await supabaseLifecycleStore(db).weekStats!(C, "2026-11-09");
    expect([w.shared, w.posted]).toEqual([0, 0]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    const both = fakeDb({ dentvid_items: [item(1)] }, { noPostedAt: true, failEvents: true });
    const u = await supabaseLifecycleStore(both.db).weekStats!(C, "2026-11-09");
    expect([u.shared, u.posted]).toEqual([null, 0]);
  });

  it("weekStats: a posted count that fails for another reason is unknown, never none", async () => {
    const { db } = fakeDb({ dentvid_items: [item(1, { posted_at: "2026-11-10T09:00:00Z" })], dentvid_events: [] }, { failPostedAt: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = await supabaseLifecycleStore(db).weekStats!(C, "2026-11-09");
    expect([w.shared, w.posted]).toEqual([0, null]);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
    // ...and with that, the run holds the nudge for the hour.
    const m = memory([clinic(1)], { shared: w.shared, posted: w.posted });
    const { send, sent } = sender();
    const r = await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(sent).toHaveLength(0);
    expect(r.skipped).toEqual({ "shares unknown": 1 });
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

  it("monthStats: a posted count that fails for another reason gives no numbers at all, so no half-true summary goes out", async () => {
    const { db } = fakeDb({ dentvid_items: [item(1, { week_of: "2026-10-05", posted_at: "2026-10-06T09:00:00Z" })], dentvid_events: [] }, { failPostedAt: true });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const m = await supabaseLifecycleStore(db).monthStats!(C, new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 10, 1)));
    expect(m).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("the posted counts are GETs: a failed HEAD has no body, so a missing column could not be told from a failed read", async () => {
    const { db, calls } = fakeDb({ dentvid_items: [item(1)], dentvid_events: [] });
    await supabaseLifecycleStore(db).weekStats!(C, "2026-11-09");
    await supabaseLifecycleStore(db).monthStats!(C, new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 10, 1)));
    const postedReads = calls.filter((c) => c.filters.some((f) => f.startsWith("posted_at")));
    expect(postedReads).toHaveLength(2);
    for (const c of postedReads) expect(c.head).toBe(false);
  });
});

/**
 * PostgREST without 0012, behind the real supabase-js client: a query that
 * names posted_at is a 400 with the 42703 body, and, as on any server, a
 * HEAD answer carries no body.
 */
function postgrestWithout0012(rows: Row[]) {
  const seen: string[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    seen.push(`${method} ${url.pathname}`);
    const reply = (status: number, body: unknown, range: string | null) =>
      new Response(method === "HEAD" ? null : JSON.stringify(body), { status, headers: { "content-type": "application/json", ...(range ? { "content-range": range } : {}) } });
    if (url.searchParams.has("posted_at")) return reply(400, { code: "42703", details: null, hint: null, message: "column dentvid_items.posted_at does not exist" }, null);
    if (url.pathname.endsWith("/dentvid_events")) return reply(200, [], "*/0");
    return reply(200, rows, `0-${rows.length - 1}/${rows.length}`);
  };
  const db = createClient("http://postgrest.test", "anon-key", { auth: { persistSession: false, autoRefreshToken: false }, global: { fetch } });
  return { db, seen };
}

describe("supabaseLifecycleStore before 0012, through supabase-js", () => {
  const C = id(1);
  const rows = [
    { approval: "approved", created_at: "2026-11-09T06:00:00Z" },
    { approval: "approved", created_at: "2026-11-09T06:00:00Z" },
    { approval: "pending", created_at: "2026-11-09T06:00:00Z" },
  ];

  it("the stand-in answers like the real thing: the same failure is 42703 on a GET and a bare { message: '' } on a HEAD", async () => {
    const { db } = postgrestWithout0012(rows);
    const get = await db.from("dentvid_items").select("id", { count: "exact" }).not("posted_at", "is", null);
    expect(get.error).toMatchObject({ code: "42703" });
    const head = await db.from("dentvid_items").select("id", { count: "exact", head: true }).not("posted_at", "is", null);
    expect(head.error).toEqual({ message: "" });
  });

  it("weekStats reads posted as none (nothing can have been ticked), so the Thursday nudge still goes out when nothing was shared", async () => {
    const { db, seen } = postgrestWithout0012(rows);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const w = await supabaseLifecycleStore(db).weekStats!(C, "2026-11-09");
    expect(w).toEqual({ approved: 2, pending: 1, shared: 0, posted: 0, firstReadyAt: "2026-11-09T06:00:00Z" });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    expect(seen.filter((r) => r.startsWith("HEAD") && r.endsWith("/dentvid_items"))).toEqual([]);
    const m = memory([clinic(1)], { shared: w.shared, posted: w.posted });
    const { send, sent } = sender();
    const r = await runPaying({ store: m.store, send, allow: async () => true, now: THU, config: cfg() });
    expect(r.skipped).toEqual({});
    expect(sent).toHaveLength(1);
  });

  it("monthStats gives the two numbers it knows, and the monthly summary goes out with them", async () => {
    const { db } = postgrestWithout0012(rows);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const month = await supabaseLifecycleStore(db).monthStats!(C, new Date(Date.UTC(2026, 9, 1)), new Date(Date.UTC(2026, 10, 1)));
    expect(month).toEqual({ made: 3, approved: 2, posted: null, shared: 0 });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
    const m = memory([clinic(1)], {}, month);
    const { send, sent } = sender();
    await runPaying({ store: m.store, send, allow: async () => true, now: MON, config: cfg() });
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain(LIFECYCLE_COPY.tr.monthly.preheaderMadeApproved);
  });
});
