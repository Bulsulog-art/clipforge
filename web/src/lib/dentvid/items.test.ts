import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadItems, loadShootCards } from "./items";
import { addDays, earlierWeeksHref, LIBRARY_WEEKS, withEarlierPosts } from "./library-weeks";
import { postingStreak } from "./app-ui";

/**
 * A small in-memory stand-in for the Supabase client: enough of the query
 * builder (select, eq, gte, lt, in, not … is null, order, limit) and of
 * storage.createSignedUrls for loadItems and loadShootCards, recording every
 * call so the tests can see what was asked of the database.
 *
 * `maxRows` caps every answer the way PostgREST's max_rows does (whatever
 * .limit() asks); `fail` makes the calls it matches answer with an error.
 */
type Rec = Record<string, unknown>;
type Call = { table: string; select: string; filters: string[]; limit?: number; inSize?: number; inValues?: unknown[]; orders: string[] };

function fakeDb(tables: Record<string, Rec[]>, opts: { maxRows?: number; fail?: (c: Call) => boolean } = {}) {
  const calls: Call[] = [];
  const signed: string[][] = [];
  const from = (table: string) => {
    let rows = [...(tables[table] ?? [])];
    let cols = "*";
    const orders: { col: string; asc: boolean }[] = [];
    let limit: number | undefined;
    const call: Call = { table, select: "*", filters: [], orders: [] };
    const q = {
      select(c: string) {
        cols = c;
        call.select = c;
        return q;
      },
      eq(col: string, v: unknown) {
        call.filters.push(`eq:${col}`);
        rows = rows.filter((r) => r[col] === v);
        return q;
      },
      gte(col: string, v: string) {
        call.filters.push(`gte:${col}:${v}`);
        rows = rows.filter((r) => String(r[col]) >= v);
        return q;
      },
      lt(col: string, v: string) {
        call.filters.push(`lt:${col}:${v}`);
        rows = rows.filter((r) => String(r[col]) < v);
        return q;
      },
      in(col: string, vs: unknown[]) {
        call.filters.push(`in:${col}`);
        call.inSize = vs.length;
        call.inValues = vs;
        rows = rows.filter((r) => vs.includes(r[col]));
        return q;
      },
      not(col: string, op: string, v: unknown) {
        call.filters.push(`not:${col}:${op}`);
        if (op === "is" && v === null) rows = rows.filter((r) => r[col] !== null && r[col] !== undefined);
        return q;
      },
      order(col: string, o?: { ascending?: boolean }) {
        orders.push({ col, asc: o?.ascending !== false });
        call.orders.push(`${col}:${o?.ascending === false ? "desc" : "asc"}`);
        return q;
      },
      limit(n: number) {
        limit = n;
        call.limit = n;
        return q;
      },
      then<T>(resolve: (v: { data: Rec[] | null; error: { code: string; message: string } | null }) => T) {
        calls.push(call);
        if (opts.fail?.(call)) return Promise.resolve(resolve({ data: null, error: { code: "PGRST000", message: "could not connect" } }));
        const sorted = [...rows].sort((a, b) => {
          for (const o of orders) {
            const x = String(a[o.col]);
            const y = String(b[o.col]);
            if (x !== y) return (x < y ? -1 : 1) * (o.asc ? 1 : -1);
          }
          return 0;
        });
        const cut = sorted.slice(0, Math.min(limit ?? Infinity, opts.maxRows ?? Infinity));
        const data = cols.trim() === "*" ? cut : cut.map((r) => Object.fromEntries(cols.split(",").map((c) => c.trim()).map((c) => [c, r[c]])));
        return Promise.resolve(resolve({ data, error: null }));
      },
    };
    return q;
  };
  const storage = {
    from: () => ({
      createSignedUrls: async (paths: string[]) => {
        signed.push(paths);
        return { data: paths.map((p) => ({ path: p, signedUrl: `https://signed.example/${p}` })), error: null };
      },
    }),
  };
  return { db: { from, storage } as unknown as SupabaseClient, calls, signed };
}

// Tuesday 24 November 2026: the delivery week is Monday 23 November.
const NOW = new Date("2026-11-24T10:00:00Z");
const CURRENT = "2026-11-23";
const OWNER = "owner-a";
const CLINIC = "clinic-a";

let seq = 0;
function row(week: string, over: Rec = {}): Rec {
  seq += 1;
  const id = `r${String(seq).padStart(5, "0")}`;
  return {
    id,
    owner_id: OWNER,
    clinic_id: CLINIC,
    kind: "generated",
    status: "ready",
    approval: "pending",
    title: `Video ${id}`,
    week_of: week,
    copy: null,
    findings: [],
    video_path: `${OWNER}/${id}.mp4`,
    thumb_path: `${OWNER}/${id}.jpg`,
    shoot_card: null,
    created_at: new Date(Date.parse(`${week}T08:00:00Z`) + seq * 1000).toISOString(),
    ...over,
  };
}

/** A week as the worker leaves it: five videos plus two topics the reviewers turned down and one row that failed. */
function fullWeek(week: string): Rec[] {
  return [
    ...Array.from({ length: 5 }, () => row(week)),
    row(week, { status: "rejected", video_path: null, thumb_path: null }),
    row(week, { status: "rejected", video_path: null, thumb_path: null }),
    row(week, { status: "failed", video_path: null, thumb_path: null }),
  ];
}

/** `n` weeks, newest first, ending at `newest`. */
const weeksBack = (newest: string, n: number) => Array.from({ length: n }, (_, k) => addDays(newest, -7 * k));

const weeksIn = (items: { week_of: string }[]) => [...new Set(items.map((i) => i.week_of))];
const perWeek = (items: { week_of: string }[]) => items.reduce<Record<string, number>>((m, i) => ({ ...m, [i.week_of]: (m[i.week_of] ?? 0) + 1 }), {});

describe("loadItems: whole weeks, newest first", () => {
  const twenty = weeksBack(CURRENT, 20);
  const data = () => ({ dentvid_items: twenty.flatMap(fullWeek) });

  it("by default shows the newest 12 whole weeks, rejected and failed rows included, and says there is more", async () => {
    const { db } = fakeDb(data());
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(out.weeks).toBe(LIBRARY_WEEKS);
    expect(weeksIn(out.items)).toEqual(twenty.slice(0, 12));
    // Every week whole: 5 videos + 2 topics not made + 1 failed row = 8 rows, 96 in all (the old 60-row cap showed 7 weeks and a half).
    for (const n of Object.values(perWeek(out.items))) expect(n).toBe(8);
    expect(out.items.filter((i) => i.status === "ready")).toHaveLength(60);
    expect(out.hasEarlier).toBe(true);
  });

  it("topics not made and failed rows never push a video out of the library", async () => {
    // A rough quarter: every week ten topics turned down and five failed rows besides its five videos.
    const weeks = weeksBack(CURRENT, 12);
    const rows = weeks.flatMap((w) => [
      ...Array.from({ length: 5 }, () => row(w)),
      ...Array.from({ length: 10 }, () => row(w, { status: "rejected", video_path: null, thumb_path: null })),
      ...Array.from({ length: 5 }, () => row(w, { status: "failed", video_path: null, thumb_path: null })),
    ]);
    const { db } = fakeDb({ dentvid_items: rows });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(out.items.filter((i) => i.status === "ready")).toHaveLength(60);
    expect(weeksIn(out.items.filter((i) => i.status === "ready"))).toEqual(weeks);
    expect(out.hasEarlier).toBe(false);
  });

  it("weeks=24 shows all 20 weeks and nothing is left earlier", async () => {
    const { db } = fakeDb(data());
    const out = await loadItems(db, OWNER, { weeks: 24, now: NOW });
    expect(out.weeks).toBe(24);
    expect(weeksIn(out.items)).toEqual(twenty);
    expect(out.items).toHaveLength(160);
    expect(out.hasEarlier).toBe(false);
  });

  it("the window is cut on week_of, so a week is never split", async () => {
    const { db, calls } = fakeDb(data());
    for (const weeks of [12, 13, 17, 24]) {
      const out = await loadItems(db, OWNER, { weeks, now: NOW });
      const counts = perWeek(out.items);
      for (const [w, n] of Object.entries(counts)) expect(n, `${weeks} weeks, ${w}`).toBe(8);
      expect(Object.keys(counts)).toHaveLength(Math.min(weeks, 20));
    }
    // The query: this owner, every day of the twelve weeks, newest week first, then newest row first.
    const main = calls.find((c) => c.table === "dentvid_items" && c.select === "*")!;
    expect(main.filters).toEqual(["eq:owner_id", "in:week_of"]);
    expect(main.inSize).toBe(84);
    expect(main.inValues).toContain(CURRENT);
    expect(main.inValues).toContain(addDays(CURRENT, 6));
    expect(main.inValues).toContain(addDays(CURRENT, -11 * 7));
    expect(main.inValues).not.toContain(addDays(CURRENT, -11 * 7 - 1));
    expect(main.orders).toEqual(["week_of:desc", "created_at:desc"]);
    // The safety limit: 34 rows a week of the window (408 for twelve weeks).
    expect(main.limit).toBe(408);
    // Two one-row reads find the newest and the oldest week.
    const edges = calls.filter((c) => c.table === "dentvid_items" && c.select === "week_of").slice(0, 2);
    expect(edges.map((c) => [c.filters, c.orders, c.limit])).toEqual([
      [["eq:owner_id"], ["week_of:desc"], 1],
      [["eq:owner_id"], ["week_of:asc"], 1],
    ]);
  });

  it("a row whose week_of is not a Monday still shows in its week", async () => {
    const rows = [...fullWeek(CURRENT), row(addDays(CURRENT, 2), { kind: "recording", title: "Our own recording" })];
    const { db } = fakeDb({ dentvid_items: rows });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(out.items.map((i) => i.title)).toContain("Our own recording");
  });

  it("at the safety limit the cut-short oldest week is left for 'Show earlier weeks', never shown half", async () => {
    // A runaway week: 404 rows this week, 10 last week. The 408-row safety limit would cut last week after 4 rows.
    const rows = [...Array.from({ length: 404 }, () => row(CURRENT)), ...Array.from({ length: 10 }, () => row(addDays(CURRENT, -7)))];
    const { db } = fakeDb({ dentvid_items: rows });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(weeksIn(out.items)).toEqual([CURRENT]);
    expect(out.items).toHaveLength(404);
    expect(out.hasEarlier).toBe(true);
    expect(out.earlierWeeks).toBe(24);
    // Asking for more weeks raises the limit with them, so the week comes back whole.
    const more = await loadItems(db, OWNER, { weeks: 24, now: NOW });
    expect(perWeek(more.items)).toEqual({ [CURRENT]: 404, [addDays(CURRENT, -7)]: 10 });
    expect(more.hasEarlier).toBe(false);
  });

  it("every older week can be reached by asking for 12 more each time", async () => {
    const forty = weeksBack(CURRENT, 40);
    const { db } = fakeDb({ dentvid_items: forty.flatMap(fullWeek) });
    const seen = new Set<string>();
    let weeks = 12;
    for (;;) {
      const out = await loadItems(db, OWNER, { weeks, now: NOW });
      for (const w of weeksIn(out.items)) seen.add(w);
      if (!out.hasEarlier) break;
      weeks += 12;
    }
    expect(weeks).toBe(48);
    expect([...seen].sort().reverse()).toEqual(forty);
  });

  it("a clinic back after a pause sees its own newest 12 weeks, not an empty page", async () => {
    // Last videos five months ago (paused, or reading the library in the 90 days after cancelling).
    const newest = addDays(CURRENT, -7 * 22);
    const old = weeksBack(newest, 15);
    const { db } = fakeDb({ dentvid_items: old.flatMap(fullWeek) });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(weeksIn(out.items)).toEqual(old.slice(0, 12));
    expect(out.hasEarlier).toBe(true);
  });

  it("an empty library is empty, with nothing earlier", async () => {
    const { db, signed } = fakeDb({ dentvid_items: [] });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(out).toMatchObject({ items: [], rows: [], hasEarlier: false, weeks: 12 });
    expect(signed).toEqual([]);
  });

  it("only ever reads the signed-in clinic's own rows", async () => {
    const mine = fullWeek(CURRENT);
    const theirs = fullWeek(CURRENT).map((r) => ({ ...r, owner_id: "owner-b" }));
    const theirsOlder = fullWeek(addDays(CURRENT, -7 * 30)).map((r) => ({ ...r, owner_id: "owner-b" }));
    const { db, calls } = fakeDb({ dentvid_items: [...theirs, ...mine, ...theirsOlder] });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(out.items.map((i) => i.id).sort()).toEqual(mine.map((r) => r.id as string).sort());
    // Another clinic's older rows do not make "Show earlier weeks" appear.
    expect(out.hasEarlier).toBe(false);
    for (const c of calls) expect(c.filters, c.table).toContain("eq:owner_id");
  });

  it("signs every video and poster in batches of at most 500, and asks for change requests 100 ids at a time", async () => {
    const many = weeksBack(CURRENT, 90);
    const { db, signed, calls } = fakeDb({ dentvid_items: many.flatMap((w) => Array.from({ length: 5 }, () => row(w))), dentvid_change_requests: [] });
    const out = await loadItems(db, OWNER, { weeks: 520, now: NOW });
    expect(out.items).toHaveLength(450);
    expect(out.hasEarlier).toBe(false);
    // A long window is read 40 weeks (280 days) per request, so no request line grows long,
    // and never further back than the clinic's first week: 90 weeks are three requests, not thirteen.
    const windows = calls.filter((c) => c.table === "dentvid_items" && c.select === "*");
    expect(windows.length).toBe(3);
    for (const c of windows) expect(c.inSize).toBeLessThanOrEqual(280);
    expect(signed.map((b) => b.length)).toEqual([500, 400]);
    expect(out.items.every((i) => i.videoUrl?.startsWith("https://signed.example/") && i.thumbUrl)).toBe(true);
    const changeCalls = calls.filter((c) => c.table === "dentvid_change_requests");
    expect(changeCalls.map((c) => c.inSize)).toEqual([100, 100, 100, 100, 50]);
  });

  it("keeps the latest change request per video across batches", async () => {
    const rows = fullWeek(CURRENT);
    const id = rows[0].id as string;
    const at = new Date(NOW.getTime() - 60_000).toISOString();
    const { db } = fakeDb({
      dentvid_items: rows,
      dentvid_change_requests: [
        { item_id: id, owner_id: OWNER, status: "done", reason: null, created_at: new Date(NOW.getTime() - 86_400_000).toISOString() },
        { item_id: id, owner_id: OWNER, status: "refused", reason: "checks", created_at: at },
      ],
    });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(out.items.find((i) => i.id === id)?.change).toEqual({ status: "refused", reason: "checks", at });
  });

  it("an odd ?weeks= is held to 12..520", async () => {
    const { db } = fakeDb(data());
    expect((await loadItems(db, OWNER, { weeks: 3, now: NOW })).weeks).toBe(12);
    expect((await loadItems(db, OWNER, { weeks: 100_000, now: NOW })).weeks).toBe(520);
    expect((await loadItems(db, OWNER, { weeks: Number.NaN, now: NOW })).weeks).toBe(12);
  });
});

/**
 * Taps "Show earlier weeks" until it is gone, the way a dentist would: each load asks for what the
 * previous one's link asked for. Returns the weeks seen and how many weeks each load showed.
 */
async function tapThrough(db: SupabaseClient, opts: { clinicId?: string } = {}) {
  const seen = new Set<string>();
  const shown: number[] = [];
  let weeks = LIBRARY_WEEKS;
  for (let taps = 0; taps < 60; taps++) {
    const out = await loadItems(db, OWNER, { weeks, now: NOW, ...opts });
    for (const w of weeksIn(out.items)) seen.add(w);
    shown.push(weeksIn(out.items).length);
    const href = out.hasEarlier ? earlierWeeksHref(out.weeks, out.earlierWeeks) : null;
    if (!href) return { seen, shown, last: out };
    weeks = Number(href.replace("?weeks=", ""));
  }
  throw new Error("the link never went away");
}

describe("loadItems: every tap on 'Show earlier weeks' shows more", () => {
  it("a dense clinic (20 rows a week): the safety limit grows with the window, so 24 and 36 weeks show 24 and 36", async () => {
    const forty = weeksBack(CURRENT, 40);
    const dense = forty.flatMap((w) => [...Array.from({ length: 5 }, () => row(w)), ...Array.from({ length: 15 }, () => row(w, { status: "rejected", video_path: null, thumb_path: null }))]);
    const { db } = fakeDb({ dentvid_items: dense });
    for (const weeks of [12, 24, 36]) {
      const out = await loadItems(db, OWNER, { weeks, now: NOW });
      expect(weeksIn(out.items), `${weeks} weeks`).toEqual(forty.slice(0, weeks));
      for (const n of Object.values(perWeek(out.items))) expect(n).toBe(20);
      expect(out.hasEarlier).toBe(true);
    }
    const { seen, shown, last } = await tapThrough(db);
    expect(shown).toEqual([12, 24, 36, 40]);
    expect([...seen].sort().reverse()).toEqual(forty);
    expect(last.hasEarlier).toBe(false);
  });

  it("after a long pause the link jumps to the older videos, never to weeks that are all empty", async () => {
    // This week and last, then 30 weeks with nothing (a pause), then ten older weeks.
    const recent = weeksBack(CURRENT, 2);
    const older = weeksBack(addDays(CURRENT, -32 * 7), 10);
    const { db } = fakeDb({ dentvid_items: [...recent, ...older].flatMap(fullWeek) });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(weeksIn(out.items)).toEqual(recent);
    expect(out.hasEarlier).toBe(true);
    // The next older week is 32 weeks back: the window that shows it and eleven weeks below it is 44.
    expect(out.earlierWeeks).toBe(44);
    expect(earlierWeeksHref(out.weeks, out.earlierWeeks)).toBe("?weeks=44");
    const { seen, shown, last } = await tapThrough(db);
    expect(shown).toEqual([2, 12]);
    expect([...seen].sort().reverse()).toEqual([...recent, ...older]);
    expect(last.hasEarlier).toBe(false);
  });

  it("…and with several pauses each tap still lands on videos", async () => {
    const a = weeksBack(CURRENT, 3);
    const b = weeksBack(addDays(CURRENT, -25 * 7), 4);
    const c = weeksBack(addDays(CURRENT, -80 * 7), 2);
    const { db } = fakeDb({ dentvid_items: [...a, ...b, ...c].flatMap(fullWeek) });
    const { seen, shown } = await tapThrough(db);
    for (let k = 1; k < shown.length; k++) expect(shown[k], `tap ${k}`).toBeGreaterThan(shown[k - 1]);
    expect([...seen].sort().reverse()).toEqual([...a, ...b, ...c]);
  });

  it("the jump is only a convenience: if that read fails, the link asks for twelve more", async () => {
    const recent = weeksBack(CURRENT, 2);
    const older = weeksBack(addDays(CURRENT, -32 * 7), 10);
    const { db } = fakeDb({ dentvid_items: [...recent, ...older].flatMap(fullWeek) }, { fail: (c) => c.filters.some((f) => f.startsWith("lt:week_of")) });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(weeksIn(out.items)).toEqual(recent);
    expect(out.earlierWeeks).toBe(24);
  });
});

describe("loadItems: a server that returns at most 1000 rows per request", () => {
  it("never loses a week or shows one half: a request cut by the server is read on from the week it cut", async () => {
    // 120 weeks of 30 rows: 40 weeks per request would be 1200 rows, more than the server returns.
    const many = weeksBack(CURRENT, 120);
    const rows = many.flatMap((w) => [...Array.from({ length: 5 }, () => row(w)), ...Array.from({ length: 25 }, () => row(w, { status: "rejected", video_path: null, thumb_path: null }))]);
    const { db, calls } = fakeDb({ dentvid_items: rows }, { maxRows: 1000 });
    const out = await loadItems(db, OWNER, { weeks: 520, now: NOW });
    expect(weeksIn(out.items)).toEqual(many);
    for (const [w, n] of Object.entries(perWeek(out.items))) expect(n, w).toBe(30);
    expect(out.hasEarlier).toBe(false);
    // No request asks the server for more than it gives.
    for (const c of calls.filter((x) => x.table === "dentvid_items")) expect(c.limit).toBeLessThanOrEqual(1000);
  });

  it("36 weeks of a dense clinic come out the same whether the server cuts a request or not", async () => {
    const forty = weeksBack(CURRENT, 40);
    const rows = forty.flatMap((w) => Array.from({ length: 30 }, () => row(w)));
    const capped = await loadItems(fakeDb({ dentvid_items: rows }, { maxRows: 1000 }).db, OWNER, { weeks: 36, now: NOW });
    const free = await loadItems(fakeDb({ dentvid_items: rows }).db, OWNER, { weeks: 36, now: NOW });
    expect(weeksIn(capped.items)).toEqual(forty.slice(0, 36));
    expect(capped.items.map((i) => i.id)).toEqual(free.items.map((i) => i.id));
  });

  it("a runaway week bigger than one request shows as far as a request goes, and the older weeks still follow", async () => {
    const rows = [...Array.from({ length: 1200 }, () => row(CURRENT)), ...weeksBack(addDays(CURRENT, -7), 3).flatMap(fullWeek)];
    const { db } = fakeDb({ dentvid_items: rows }, { maxRows: 1000 });
    const out = await loadItems(db, OWNER, { weeks: 520, now: NOW });
    expect(perWeek(out.items)).toEqual({ [CURRENT]: 1000, ...Object.fromEntries(weeksBack(addDays(CURRENT, -7), 3).map((w) => [w, 8])) });
  });
});

describe("loadItems: a failed read is an error, never an empty library", () => {
  // An empty library reads as "your first week is being made", or sends a trial clinic back to the sign-up.
  const data = () => ({ dentvid_items: weeksBack(CURRENT, 3).flatMap(fullWeek) });

  it("the newest-week read fails: it throws", async () => {
    const { db } = fakeDb(data(), { fail: (c) => c.select === "week_of" && c.orders[0] === "week_of:desc" && c.limit === 1 && !c.filters.some((f) => f.startsWith("lt:")) });
    await expect(loadItems(db, OWNER, { now: NOW })).rejects.toThrow(/could not read the clinic's weeks \(PGRST000\)/);
  });

  it("the oldest-week read fails: it throws", async () => {
    const { db } = fakeDb(data(), { fail: (c) => c.select === "week_of" && c.orders[0] === "week_of:asc" });
    await expect(loadItems(db, OWNER, { now: NOW })).rejects.toThrow(/could not read the clinic's weeks/);
  });

  it("the window read fails: it throws", async () => {
    const { db } = fakeDb(data(), { fail: (c) => c.table === "dentvid_items" && c.select === "*" });
    await expect(loadItems(db, OWNER, { now: NOW })).rejects.toThrow(/could not read the clinic's videos/);
  });

  it("with the same data and no failure, the library loads", async () => {
    const out = await loadItems(fakeDb(data()).db, OWNER, { now: NOW });
    expect(weeksIn(out.items)).toEqual(weeksBack(CURRENT, 3));
  });

  it("the extras never break it: change requests and posted weeks that fail are simply left out", async () => {
    const { db } = fakeDb(data(), { fail: (c) => c.table === "dentvid_change_requests" || c.filters.includes("not:posted_at:is") });
    const out = await loadItems(db, OWNER, { now: NOW, streak: true });
    expect(out.items).toHaveLength(24);
    expect(out.postedWeeks).toEqual([]);
  });
});

describe("loadItems: the posting streak counts on past the window", () => {
  // Fifteen weeks in a row, one video posted in each.
  const fifteen = weeksBack(CURRENT, 15);
  const rows = () => fifteen.flatMap((w) => [row(w, { posted_at: `${w}T18:00:00Z` }), ...Array.from({ length: 4 }, () => row(w, { posted_at: null }))]);
  const marksOf = (items: { id: string; week_of: string; postedAt?: string | null }[]) =>
    Object.fromEntries(items.filter((i) => i.postedAt).map((i) => [i.id, i.week_of]));

  it("a clinic that posted fifteen weeks in a row sees 15 at the default twelve weeks", async () => {
    const { db, calls } = fakeDb({ dentvid_items: rows() });
    const out = await loadItems(db, OWNER, { now: NOW, streak: true, clinicId: CLINIC });
    expect(weeksIn(out.items)).toHaveLength(12);
    expect(out.postedWeeks).toEqual(fifteen.slice(12));
    expect(postingStreak(withEarlierPosts(marksOf(out.items), out.postedWeeks), CURRENT)).toBe(15);
    // Without them the streak stopped at the window: the bug this fixes.
    expect(postingStreak(marksOf(out.items), CURRENT)).toBe(12);
    // One read, the clinic's own posted rows before the oldest loaded week.
    const read = calls.find((c) => c.filters.includes("not:posted_at:is"))!;
    expect(read.filters).toEqual(["eq:owner_id", "eq:clinic_id", "not:posted_at:is", `lt:week_of:${fifteen[11]}`]);
    expect(read.select).toBe("week_of");
    expect(read.limit).toBe(520);
  });

  it("the same number with 'Show earlier weeks' tapped: it no longer depends on the address", async () => {
    const out = await loadItems(fakeDb({ dentvid_items: rows() }).db, OWNER, { weeks: 24, now: NOW, streak: true });
    expect(out.postedWeeks).toEqual([]);
    expect(postingStreak(withEarlierPosts(marksOf(out.items), out.postedWeeks), CURRENT)).toBe(15);
  });

  it("only the page that shows the streak asks (the iPhone list does not)", async () => {
    const { db, calls } = fakeDb({ dentvid_items: rows() });
    const out = await loadItems(db, OWNER, { now: NOW });
    expect(out.postedWeeks).toEqual([]);
    expect(calls.some((c) => c.filters.includes("not:posted_at:is"))).toBe(false);
  });

  it("another clinic's posts never count", async () => {
    const theirs = weeksBack(addDays(CURRENT, -12 * 7), 3).map((w) => row(w, { owner_id: "owner-b", clinic_id: "clinic-b", posted_at: `${w}T18:00:00Z` }));
    const mine = fifteen.slice(0, 12).flatMap((w) => [row(w, { posted_at: `${w}T18:00:00Z` })]);
    const out = await loadItems(fakeDb({ dentvid_items: [...mine, ...theirs] }).db, OWNER, { now: NOW, streak: true, clinicId: CLINIC });
    expect(out.postedWeeks).toEqual([]);
  });
});

describe("loadItems: the clinic's own rows, by its index", () => {
  it("with the clinic's id every read of the library filters on owner and clinic", async () => {
    const recent = weeksBack(CURRENT, 2);
    const older = weeksBack(addDays(CURRENT, -32 * 7), 2);
    const { db, calls } = fakeDb({ dentvid_items: [...recent, ...older].flatMap(fullWeek), dentvid_change_requests: [] });
    await loadItems(db, OWNER, { now: NOW, clinicId: CLINIC, streak: true });
    const reads = calls.filter((c) => c.table === "dentvid_items");
    expect(reads.length).toBeGreaterThanOrEqual(5);
    for (const c of reads) expect(c.filters.slice(0, 2), c.select).toEqual(["eq:owner_id", "eq:clinic_id"]);
  });
});

describe("loadShootCards (the record page)", () => {
  it("reads the five newest filming cards, title and card only, and signs nothing", async () => {
    const card = (n: number) => ({ opening: `Open ${n}`, points: ["a"], closing: "c" });
    const rows = [
      ...weeksBack(CURRENT, 8).map((w, n) => row(w, { shoot_card: card(n) })),
      ...fullWeek(CURRENT),
    ];
    const { db, calls, signed } = fakeDb({ dentvid_items: rows });
    const out = await loadShootCards(db, OWNER);
    expect(out).toHaveLength(5);
    expect(out.every((r) => Object.keys(r).sort().join() === "shoot_card,title")).toBe(true);
    expect(out.map((r) => (r.shoot_card as { opening: string }).opening)).toEqual(["Open 0", "Open 1", "Open 2", "Open 3", "Open 4"]);
    expect(signed).toEqual([]);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ select: "title, shoot_card", limit: 5, filters: ["eq:owner_id", "not:shoot_card:is"] });
  });

  it("returns nothing for a clinic without cards", async () => {
    const { db } = fakeDb({ dentvid_items: fullWeek(CURRENT) });
    expect(await loadShootCards(db, OWNER)).toEqual([]);
  });
});
