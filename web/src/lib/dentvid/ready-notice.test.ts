import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

// The funnel event is fire-and-forget and needs a real database: not from a test.
vi.mock("./events-server", () => ({ recordEvent: vi.fn(async () => true) }));

import { isFirstWeek, missingFromWeek, nextWeekOf, sendReadyNotice, settingsNudge, shortReason } from "./ready-notice";
import { DELIVERY_NOTICES } from "@/content/dentvideo-delivery-notices";

/**
 * sendReadyNotice against a fake Liman: the clinic row, the owner's address,
 * the generated items (filtered, ordered and capped like PostgREST), the
 * email log (dentvid_email_sends) and the signed poster URLs. Nothing leaves
 * the process: `send` is a spy.
 */
const CLINIC = "5f1e2d3c-4b5a-4968-8776-655443322110";
type Item = { id: string; title: string; week_of: string; thumb_path: string | null; status: string; approval: string; copy: unknown; kind: string; created_at: string; clinic_id: string; error?: string | null };
type SendRow = { clinic_id: string; kind: string; status: "sent" | "failed" };

let n = 0;
const item = (week: string, status = "ready", over: Partial<Item> = {}): Item => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  title: `Video ${n}`,
  week_of: week,
  thumb_path: `owner/${n}.jpg`,
  status,
  approval: "pending",
  copy: null,
  kind: "generated",
  created_at: `${week}T05:00:${String(n % 60).padStart(2, "0")}Z`,
  clinic_id: CLINIC,
  ...over,
});
const week = (w: string, ready: number, flagged = 0) => [...Array.from({ length: ready }, () => item(w)), ...Array.from({ length: flagged }, () => item(w, "flagged"))];

type Filter = { op: "eq" | "in" | "lt"; col: string; v: unknown };
function fakeDb(opts: {
  items: Item[];
  email?: string | null;
  profile?: Record<string, unknown>;
  countError?: boolean;
  noClinic?: boolean;
  /** The email log; sendsError: the table answers with an error (e.g. 0010 not applied). */
  sends?: SendRow[];
  sendsError?: boolean;
  /** Extra clinic columns, e.g. library_deleted_at. */
  clinic?: Record<string, unknown>;
}) {
  const counted: (Filter[] & { table?: string })[] = [];
  const query = (table: string) => {
    const filters: Filter[] = [];
    const orders: { col: string; asc: boolean }[] = [];
    let limit = Infinity;
    let head = false;
    const match = (r: Record<string, unknown>) =>
      filters.every((f) => (f.op === "eq" ? r[f.col] === f.v : f.op === "in" ? (f.v as unknown[]).includes(r[f.col]) : String(r[f.col]) < String(f.v)));
    const run = () => {
      if (table === "dentvid_clinics") {
        const row = opts.noClinic ? null : { id: CLINIC, owner_id: "owner-1", profile: { name: "Smile & Co", language: "en", ...opts.profile }, logo_path: null, ...opts.clinic };
        return { data: row && match(row) ? row : null, error: null };
      }
      if (head) {
        counted.push(Object.assign([...filters], { table }));
        if (table === "dentvid_email_sends") {
          if (opts.sendsError) return { count: null, error: { message: "relation does not exist" } };
          return { count: (opts.sends ?? []).filter(match).length, error: null };
        }
        if (opts.countError) return { count: null, error: { message: "boom" } };
        return { count: opts.items.filter(match).length, error: null };
      }
      let rows = opts.items.filter(match);
      for (const o of [...orders].reverse()) rows = [...rows].sort((a, b) => String(a[o.col as keyof Item]).localeCompare(String(b[o.col as keyof Item])) * (o.asc ? 1 : -1));
      return { data: rows.slice(0, limit), error: null };
    };
    const q = {
      select: (_cols: string, o?: { head?: boolean }) => ((head = !!o?.head), q),
      eq: (col: string, v: unknown) => (filters.push({ op: "eq", col, v }), q),
      in: (col: string, v: unknown[]) => (filters.push({ op: "in", col, v }), q),
      lt: (col: string, v: unknown) => (filters.push({ op: "lt", col, v }), q),
      order: (col: string, o?: { ascending?: boolean }) => (orders.push({ col, asc: o?.ascending !== false }), q),
      limit: (k: number) => ((limit = k), q),
      maybeSingle: async () => run(),
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(run()).then(res, rej),
    };
    return q;
  };
  const db = {
    from: query,
    auth: { admin: { getUserById: async () => ({ data: { user: opts.email === null ? null : { email: opts.email ?? "dr@klinik.example" } } }) } },
    storage: { from: () => ({ createSignedUrls: async (paths: string[]) => ({ data: paths.map((p) => ({ path: p, signedUrl: `https://cdn.example/${p}` })) }) }) },
  };
  return { db: db as unknown as SupabaseClient, counted };
}

let send: ReturnType<typeof vi.fn>;
beforeEach(() => {
  send = vi.fn(async () => true);
  vi.stubEnv("DENTVIDEO_UNSUBSCRIBE_SECRET", "test-secret");
});

const EN = DELIVERY_NOTICES.en;
const mailed = () => send.mock.calls[0] as unknown as [string, { subject: string; text: string; html: string }, { log: { kind: string } }];

describe("sendReadyNotice: is this the clinic's first week?", () => {
  it("earlier delivered weeks → the routine email", async () => {
    const { db } = fakeDb({ items: [...week("2026-11-09", 5), ...week("2026-11-16", 4, 1)] });
    const r = await sendReadyNotice(db, CLINIC, "week", { ready: 4, flagged: 1 }, { send, recordFunnel: false });
    expect(r).toEqual({ sent: true });
    const [to, msg, opts] = mailed();
    expect(to).toBe("dr@klinik.example");
    expect(msg.subject).toBe("5 new videos are ready for your review");
    expect(msg.text).not.toContain(EN.first.welcome);
    expect(msg.text).not.toContain(EN.first.stepsIntro);
    expect(opts.log.kind).toBe("ready_week");
  });

  it("no earlier week → the first-week email: welcome, steps, the next Monday, the nudge for what is not set", async () => {
    const { db } = fakeDb({ items: week("2026-11-16", 4, 1) });
    await sendReadyNotice(db, CLINIC, "week", { ready: 4, flagged: 1 }, { send, recordFunnel: false });
    const [, msg, opts] = mailed();
    expect(msg.subject).toBe(EN.first.subject);
    expect(msg.text).toContain(EN.first.welcome);
    expect(msg.text).toContain("“Approve all ready videos” below does it in one tap.");
    expect(msg.text).toContain("tap “Post it” on an approved video. One more tap saves the video to your phone and copies its caption.");
    expect(msg.text).toContain("Your next week of videos arrives on Monday 23 November.");
    expect(msg.text).toContain("If you like, add your Instagram or TikTok handle and your own closing line in Settings.");
    // Still the "videos ready" email in the log, so the owner can resend it from the admin panel.
    expect(opts.log.kind).toBe("ready_week");
  });

  it("a clinic that set its handle and closing line is not nudged; one that set only the handle hears only about the closing line", async () => {
    await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), profile: { handle: "smileco", closingLine: "Questions? Bring them to your next check-up." } }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].text).not.toContain("If you like");
    send.mockClear();
    await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), profile: { handle: "smileco" } }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].text).toContain("If you like, add your own closing line in Settings.");
  });

  it("an earlier week the 24 rows read do not reach is still found (one count query), and only usable videos count", async () => {
    // The newest week holds 25 rows (20 the reviewers refused): the earlier week falls outside the first read.
    const busy = [...week("2026-11-16", 5), ...Array.from({ length: 20 }, () => item("2026-11-16", "rejected"))];
    const old = fakeDb({ items: [...busy, ...week("2026-11-02", 5)] });
    await sendReadyNotice(old.db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe("5 new videos are ready for your review");
    const itemCounts = old.counted.filter((c) => c.table === "dentvid_items");
    expect(itemCounts).toHaveLength(1);
    expect([...itemCounts[0]]).toEqual(
      expect.arrayContaining([
        { op: "eq", col: "clinic_id", v: CLINIC },
        { op: "eq", col: "kind", v: "generated" },
        { op: "in", col: "status", v: ["ready", "flagged"] },
        { op: "lt", col: "week_of", v: "2026-11-16" },
      ]),
    );
    // An earlier week with only refused or failed videos was never delivered: this is still the first.
    send.mockClear();
    await sendReadyNotice(fakeDb({ items: [...week("2026-11-16", 5), item("2026-11-09", "rejected"), item("2026-11-09", "failed")] }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe(EN.first.subject);
  });

  it("when the database cannot answer, the clinic gets the routine email (a long-time clinic is never welcomed as new)", async () => {
    await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), countError: true }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe("5 new videos are ready for your review");
  });

  it("once per clinic: a top-up or re-run of the first week, after its 'videos ready' email went out, gets the routine email", async () => {
    // The first run's email was sent; the clinic's own button (or the owner) topped up the short first week.
    const topUp = fakeDb({ items: week("2026-11-16", 5), sends: [{ clinic_id: CLINIC, kind: "ready_week", status: "sent" }] });
    await sendReadyNotice(topUp.db, CLINIC, "week", { ready: 2, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe("2 new videos are ready for your review");
    expect(mailed()[1].text).not.toContain(EN.first.welcome);
    expect(mailed()[1].text).not.toContain(EN.first.stepsIntro);
    const sendsCount = topUp.counted.find((c) => c.table === "dentvid_email_sends");
    expect([...sendsCount!]).toEqual(
      expect.arrayContaining([
        { op: "eq", col: "clinic_id", v: CLINIC },
        { op: "eq", col: "kind", v: "ready_week" },
        { op: "eq", col: "status", v: "sent" },
      ]),
    );
    // A first email that failed to go out does not count: the retry is still the welcome.
    send.mockClear();
    await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), sends: [{ clinic_id: CLINIC, kind: "ready_week", status: "failed" }, { clinic_id: CLINIC, kind: "welcome", status: "sent" }] }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe(EN.first.subject);
    // Another clinic's log is not this clinic's.
    send.mockClear();
    await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), sends: [{ clinic_id: "someone-else", kind: "ready_week", status: "sent" }] }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe(EN.first.subject);
  });

  it("a clinic back after a cancelled plan whose library was deleted is not welcomed as new", async () => {
    await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), clinic: { library_deleted_at: "2026-09-01T03:00:00Z" } }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe("5 new videos are ready for your review");
  });

  it("when the email log cannot answer, the clinic gets the routine email", async () => {
    await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), sendsError: true }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe("5 new videos are ready for your review");
  });

  it("a recording is never a first week", async () => {
    await sendReadyNotice(fakeDb({ items: [] }).db, CLINIC, "recording", { ready: 2, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].subject).toBe("2 clips from your recording are ready");
  });
});

describe("sendReadyNotice: a short week", () => {
  it("fewer than five usable videos, every one left out refused by our checks → one line that says so (routine and first week)", async () => {
    await sendReadyNotice(fakeDb({ items: [...week("2026-11-09", 5), ...week("2026-11-16", 3, 1), item("2026-11-16", "rejected"), item("2026-11-16", "rejected")] }).db, CLINIC, "week", { ready: 3, flagged: 1 }, { send, recordFunnel: false });
    expect(mailed()[1].text).toContain(EN.short.checks[1]);
    send.mockClear();
    await sendReadyNotice(fakeDb({ items: [...week("2026-11-16", 2), item("2026-11-16", "rejected"), item("2026-11-16", "rejected"), item("2026-11-16", "rejected")] }).db, CLINIC, "week", { ready: 2, flagged: 0 }, { send, recordFunnel: false });
    const first = mailed()[1].text;
    expect(first).toContain(EN.first.welcome);
    expect(first).toContain("Three of this week's five videos did not pass our checks");
  });

  it("a video that failed for a technical reason (stored as rejected with an error) is never blamed on our checks", async () => {
    // The reviewer's case: a topic failed both render attempts (week.ts), or its file could not be stored (jobs.ts).
    const technical = item("2026-11-16", "rejected", { error: "render timed out after 2 attempts" });
    await sendReadyNotice(fakeDb({ items: [...week("2026-11-09", 5), ...week("2026-11-16", 4), technical] }).db, CLINIC, "week", { ready: 4, flagged: 0 }, { send, recordFunnel: false });
    const text = mailed()[1].text;
    expect(text).toContain("One of this week's five videos could not be finished to our standard, so we left it out.");
    expect(text).not.toContain("our checks");
    // Mixed (one refused by review, one technical): the plainer line too.
    send.mockClear();
    const stored = item("2026-11-16", "rejected", { error: "could not store the video file" });
    await sendReadyNotice(fakeDb({ items: [...week("2026-11-09", 5), ...week("2026-11-16", 3), item("2026-11-16", "rejected"), stored] }).db, CLINIC, "week", { ready: 3, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].text).toContain(EN.short.unfinished[2]);
    expect(mailed()[1].text).not.toContain("our checks");
  });

  it("a slot never attempted (no row to explain it) is not blamed on our checks either", async () => {
    await sendReadyNotice(fakeDb({ items: [...week("2026-11-09", 5), ...week("2026-11-16", 3), item("2026-11-16", "rejected")] }).db, CLINIC, "week", { ready: 3, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].text).toContain(EN.short.unfinished[2]);
  });

  it("a full week says nothing, even when this run made only the missing ones (its counts are one run's)", async () => {
    await sendReadyNotice(fakeDb({ items: [...week("2026-11-09", 5), ...week("2026-11-16", 5), item("2026-11-16", "rejected")] }).db, CLINIC, "week", { ready: 2, flagged: 0 }, { send, recordFunnel: false });
    expect(mailed()[1].text).not.toMatch(/of this week's five videos/);
  });
});

describe("sendReadyNotice: who never gets it", () => {
  it("a test account (e2e-…), an owner without an address, a clinic that does not exist", async () => {
    expect(await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), email: "e2e-123@bulsulabs.com" }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false })).toEqual({ sent: false, reason: "test account" });
    expect(await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5), email: null }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false })).toEqual({ sent: false, reason: "no email" });
    expect(await sendReadyNotice(fakeDb({ items: [], noClinic: true }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false })).toEqual({ sent: false, reason: "no clinic" });
    expect(send).not.toHaveBeenCalled();
  });

  it("a failed send is reported, so the worker retries it", async () => {
    send.mockResolvedValueOnce(false);
    expect(await sendReadyNotice(fakeDb({ items: week("2026-11-16", 5) }).db, CLINIC, "week", { ready: 5, flagged: 0 }, { send, recordFunnel: false })).toEqual({ sent: false, reason: "send failed" });
  });
});

describe("the pieces", () => {
  it("missingFromWeek counts usable videos only, and says nothing for a full or empty week", () => {
    expect(missingFromWeek(week("2026-11-16", 4))).toBe(1);
    expect(missingFromWeek([...week("2026-11-16", 1, 1), item("2026-11-16", "rejected")])).toBe(3);
    expect(missingFromWeek(week("2026-11-16", 5))).toBe(0);
    expect(missingFromWeek(week("2026-11-16", 6))).toBe(0);
    expect(missingFromWeek([])).toBe(0);
  });
  it("settingsNudge names only what is not set", () => {
    expect(settingsNudge({})).toBe("both");
    expect(settingsNudge({ handle: "smileco" })).toBe("closingLine");
    expect(settingsNudge({ closingLine: "A line." })).toBe("handle");
    expect(settingsNudge({ handle: "smileco", closingLine: "A line." })).toBeNull();
    expect(settingsNudge({ handle: "  ", closingLine: "" })).toBe("both");
  });
  it("nextWeekOf is the Monday after", () => {
    expect(nextWeekOf("2026-11-16")).toBe("2026-11-23");
    expect(nextWeekOf("2026-12-28")).toBe("2027-01-04");
    expect(nextWeekOf("nope")).toBeNull();
  });
  it("isFirstWeek answers from the rows it has when they show an earlier week (no extra query)", async () => {
    const { db, counted } = fakeDb({ items: [] });
    expect(await isFirstWeek(db, CLINIC, "2026-11-16", week("2026-11-09", 1))).toBe(false);
    expect(counted).toHaveLength(0);
    expect(await isFirstWeek(db, CLINIC, "2026-11-16", week("2026-11-16", 5))).toBe(true);
    expect(counted.map((c) => c.table)).toEqual(["dentvid_items", "dentvid_email_sends"]);
  });
  it("shortReason: 'checks' only when review refusals, and nothing else, explain every missing video", () => {
    const w = "2026-11-16";
    const refused = () => item(w, "rejected");
    expect(shortReason([...week(w, 4), refused()], 1)).toBe("checks");
    expect(shortReason([...week(w, 3), refused(), refused(), refused()], 2)).toBe("checks");
    expect(shortReason([...week(w, 4), item(w, "rejected", { error: "boom" })], 1)).toBe("unfinished");
    expect(shortReason([...week(w, 4), refused(), item(w, "rejected", { error: "silent render: no audio track" })], 1)).toBe("unfinished");
    expect(shortReason([...week(w, 4), item(w, "failed")], 1)).toBe("unfinished");
    expect(shortReason([...week(w, 3), refused()], 2)).toBe("unfinished");
    expect(shortReason(week(w, 4), 1)).toBe("unfinished");
    // An empty error is no error.
    expect(shortReason([...week(w, 4), item(w, "rejected", { error: " " })], 1)).toBe("checks");
    expect(shortReason([...week(w, 4), item(w, "rejected", { error: null })], 1)).toBe("checks");
  });
});
