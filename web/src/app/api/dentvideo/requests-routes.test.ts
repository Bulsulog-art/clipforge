import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";
import { REQUESTS_TEXT } from "@/content/dentvideo-requests";

/**
 * The web routes for topic suggestions, change requests and subtitle files,
 * end to end through the real handlers and the real Supabase store code,
 * against an in-memory Liman that enforces row-level security like the real
 * policies (a user's client sees only rows with owner_id = that user; the
 * service role sees all). Every route: signed out, rate-limited, clinic A
 * against clinic B's rows, success, and each failure the clinic can hit.
 */

const A = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const B = "2d0c5e8a-3f4b-4c7d-9e0f-1a2b3c4d5e6f";
const CLINIC_A = "aaaaaaaa-0000-4000-8000-00000000000a";
const CLINIC_B = "bbbbbbbb-0000-4000-8000-00000000000b";
const ITEM_A = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a";
const REC_A = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6b";
const ITEM_B = "8c0d1e2f-3a4b-4c5d-9e6f-0a1b2c3d4e5f";

type Row = Record<string, unknown>;
let db: Record<string, Row[]>;
let missing: Set<string>;
let me: string | null;
let limited: string[];
let queued: unknown[][];
let queueDown: boolean;

function query(table: string, owner: string | null) {
  const filters: ((r: Row) => boolean)[] = [];
  let op: "select" | "insert" | "update" | "delete" = "select";
  let payload: Row = {};
  let head = false;
  let returning = false;
  let single = false;
  let limitN = Infinity;
  const visible = (r: Row) => owner === null || r.owner_id === owner;
  const run = () => {
    if (missing.has(table)) return { data: null, count: null, error: { code: "42P01", message: `relation "public.${table}" does not exist` } };
    const rows = (db[table] ??= []);
    const hit = () => rows.filter((r) => visible(r) && filters.every((f) => f(r)));
    if (op === "insert") {
      // No insert policy on the request tables: only the service role writes.
      if (owner !== null) return { data: null, error: { code: "42501", message: "row-level security" } };
      const row = { id: crypto.randomUUID(), created_at: new Date().toISOString(), status: table === "dentvid_change_requests" ? "queued" : "pending", reason: null, week_of: null, ...payload };
      rows.push(row);
      return { data: single ? { ...row } : [{ ...row }], error: null };
    }
    if (op === "update") {
      if (owner !== null && table !== "dentvid_items") return { data: null, error: { code: "42501", message: "row-level security" } };
      const m = hit();
      m.forEach((r) => Object.assign(r, payload));
      return { data: returning ? m.map((r) => ({ ...r })) : null, error: null };
    }
    if (op === "delete") {
      if (owner !== null) return { data: [], error: null };
      const m = hit();
      db[table] = rows.filter((r) => !m.includes(r));
      return { data: returning ? m.map((r) => ({ ...r })) : null, error: null };
    }
    const m = hit().slice(0, limitN);
    if (head) return { data: null, count: m.length, error: null };
    return { data: single ? (m[0] ?? null) : m.map((r) => ({ ...r })), error: null };
  };
  const orFilter = (expr: string) => {
    const parts = expr.split(/,(?![^(]*\))/).map((p) => {
      const isNull = /^(\w+)\.is\.null$/.exec(p);
      if (isNull) return (r: Row) => r[isNull[1]] == null;
      const inList = /^(\w+)\.in\.\(([^)]*)\)$/.exec(p);
      if (inList) return (r: Row) => inList[2].split(",").includes(String(r[inList[1]]));
      throw new Error(`unsupported or(${p})`);
    });
    return (r: Row) => parts.some((f) => f(r));
  };
  const q = {
    select: (_c?: string, o?: { head?: boolean }) => ((head = !!o?.head), op !== "select" && (returning = true), q),
    insert: (row: Row) => ((op = "insert"), (payload = row), q),
    update: (p: Row) => ((op = "update"), (payload = p), q),
    delete: () => ((op = "delete"), q),
    eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), q),
    neq: (k: string, v: unknown) => (filters.push((r) => r[k] !== v), q),
    in: (k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), q),
    gte: (k: string, v: string) => (filters.push((r) => String(r[k]) >= v), q),
    or: (e: string) => (filters.push(orFilter(e)), q),
    order: () => q,
    limit: (n: number) => ((limitN = n), q),
    maybeSingle: async () => ((single = true), run()),
    single: async () => ((single = true), run()),
    then: (ok: (v: unknown) => unknown, bad?: (e: unknown) => unknown) => Promise.resolve().then(run).then(ok, bad),
  };
  return q;
}
const client = (owner: string | null) => ({ from: (t: string) => query(t, owner) });

vi.mock("@/lib/dentvid/auth", () => ({ dvSession: async () => ({ db: client(me ?? "nobody"), user: me ? { id: me } : null }) }));
vi.mock("@/lib/dentvid/supabase", () => ({ BUCKET: "dentvid", dvAdmin: () => client(null) }));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
vi.mock("@/lib/rate-limit-server", () => ({
  rateLimited: async (checks: { key: string }[]) => (checks.some((c) => limited.some((k) => c.key.startsWith(k))) ? Response.json({ error: "Too many" }, { status: 429 }) : null),
}));
vi.mock("@/lib/queue", () => ({
  dentvidQueue: {
    add: async (...a: unknown[]) => {
      if (queueDown) throw new Error("redis down");
      queued.push(a);
    },
  },
}));
vi.mock("@/lib/dentvid/ops-server", () => ({ noteEnqueueFailure: async () => {} }));

const topics = await import("./topic-requests/route");
const topic = await import("./topic-requests/[id]/route");
const change = await import("./items/[id]/change/route");
const subs = await import("./items/[id]/subtitles/route");

const post = (body: unknown) => new Request("https://dentvideo.com/x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as Record<string, unknown> });
const snapshot = () => JSON.stringify(db);

beforeEach(() => {
  me = A;
  limited = [];
  queued = [];
  queueDown = false;
  missing = new Set();
  db = {
    dentvid_clinics: [
      { id: CLINIC_A, owner_id: A, plan: "active", profile: { name: "A", language: "en", country: "US" } },
      { id: CLINIC_B, owner_id: B, plan: "active", profile: { name: "B", language: "tr", country: "TR" } },
    ],
    dentvid_items: [
      { id: ITEM_A, owner_id: A, clinic_id: CLINIC_A, kind: "generated", status: "ready", plan: { scenes: [] }, title: "Whitening and sensitivity", subtitles: { v: 1, cues: [{ start: 0.2, end: 2.5, text: "Sensitive teeth are common." }] } },
      { id: REC_A, owner_id: A, clinic_id: CLINIC_A, kind: "recording", status: "ready", plan: null, title: "Clip" },
      { id: ITEM_B, owner_id: B, clinic_id: CLINIC_B, kind: "generated", status: "ready", plan: { scenes: [] }, title: "Diş taşı", subtitles: { v: 1, cues: [{ start: 0, end: 2, text: "B's words" }] } },
    ],
    dentvid_topic_requests: [],
    dentvid_change_requests: [],
  };
});

describe("POST/GET /api/dentvideo/topic-requests and DELETE …/[id]", () => {
  it("signed out: 401 everywhere, nothing written", async () => {
    me = null;
    const before = snapshot();
    expect((await topics.POST(post({ text: "How long does sensitivity last?" }))).status).toBe(401);
    expect((await topics.GET()).status).toBe(401);
    expect((await topic.DELETE(new Request("https://x"), ctx(ITEM_A))).status).toBe(401);
    expect(snapshot()).toBe(before);
  });

  it("rate-limited: 429 before anything is read or written", async () => {
    limited = ["rl:topicreq"];
    const before = snapshot();
    expect((await topics.POST(post({ text: "How long does sensitivity last?" }))).status).toBe(429);
    expect((await topic.DELETE(new Request("https://x"), ctx(ITEM_A))).status).toBe(429);
    expect(snapshot()).toBe(before);
  });

  it("stores the suggestion for the session's own clinic (never the body's), and each clinic lists only its own", async () => {
    const r = await json(await topics.POST(post({ text: "How long does sensitivity last?", clinic_id: CLINIC_B, owner_id: B })));
    expect(r.status).toBe(200);
    expect(db.dentvid_topic_requests[0]).toMatchObject({ owner_id: A, clinic_id: CLINIC_A, status: "pending" });
    expect(((await json(await topics.GET())).body.topics as unknown[]).length).toBe(1);
    me = B;
    expect(((await json(await topics.GET())).body.topics as unknown[]).length).toBe(0);
  });

  it("clinic B cannot withdraw clinic A's suggestion; A can", async () => {
    await topics.POST(post({ text: "How long does sensitivity last?" }));
    const id = db.dentvid_topic_requests[0].id as string;
    me = B;
    expect((await topic.DELETE(new Request("https://x"), ctx(id))).status).toBe(404);
    expect(db.dentvid_topic_requests).toHaveLength(1);
    me = A;
    expect((await topic.DELETE(new Request("https://x"), ctx(id))).status).toBe(200);
    expect(db.dentvid_topic_requests).toHaveLength(0);
  });

  it("a used or refused suggestion cannot be withdrawn", async () => {
    await topics.POST(post({ text: "How long does sensitivity last?" }));
    db.dentvid_topic_requests[0].status = "used";
    expect((await topic.DELETE(new Request("https://x"), ctx(db.dentvid_topic_requests[0].id as string))).status).toBe(404);
  });

  it("refuses ad-rule topics, links, bad lengths, and a sixth waiting suggestion — in the clinic's language", async () => {
    me = B;
    const ad = await json(await topics.POST(post({ text: "Garantili ve acısız implant" })));
    expect(ad).toMatchObject({ status: 400, body: { code: "adRules", error: REQUESTS_TEXT.tr.topics.errors.adRules } });
    expect((await topics.POST(post({ text: "see www.x.com" }))).status).toBe(400);
    expect((await topics.POST(post({ text: "no" }))).status).toBe(400);
    expect((await topics.POST(post({}))).status).toBe(400);
    for (let i = 0; i < 5; i++) expect((await topics.POST(post({ text: `Hasta sorusu ${i}?` }))).status).toBe(200);
    expect((await json(await topics.POST(post({ text: "Bir tane daha?" })))).body.code).toBe("too_many_pending");
    expect(db.dentvid_topic_requests).toHaveLength(5);
  });

  it("before migration 0025: 503 'not available', and the list says unavailable", async () => {
    missing.add("dentvid_topic_requests");
    expect((await topics.POST(post({ text: "How long does sensitivity last?" }))).status).toBe(503);
    expect((await json(await topics.GET())).body).toEqual({ topics: [], available: false });
  });
});

describe("POST /api/dentvideo/items/[id]/change", () => {
  it("signed out or rate-limited: nothing written, nothing queued", async () => {
    me = null;
    expect((await change.POST(post({ note: "Shorter please" }), ctx(ITEM_A))).status).toBe(401);
    me = A;
    limited = ["rl:change"];
    expect((await change.POST(post({ note: "Shorter please" }), ctx(ITEM_A))).status).toBe(429);
    expect(db.dentvid_change_requests).toHaveLength(0);
    expect(queued).toHaveLength(0);
  });

  it("queues one 'change' job, one attempt only, for the owner's own video", async () => {
    const r = await json(await change.POST(post({ note: "Shorter, and calmer please" }), ctx(ITEM_A)));
    expect(r).toMatchObject({ status: 200, body: { ok: true, left: 2 } });
    const row = db.dentvid_change_requests[0];
    expect(row).toMatchObject({ owner_id: A, clinic_id: CLINIC_A, item_id: ITEM_A, status: "queued" });
    expect(queued).toEqual([["change", { requestId: row.id }, expect.objectContaining({ jobId: `change:${row.id}`, attempts: 1 })]]);
  });

  it("clinic A cannot ask for a change to clinic B's video", async () => {
    const r = await change.POST(post({ note: "Shorter please" }), ctx(ITEM_B));
    expect(r.status).toBe(404);
    expect(db.dentvid_change_requests).toHaveLength(0);
    expect(queued).toHaveLength(0);
  });

  it("not for a recording clip, not without an active plan", async () => {
    expect((await change.POST(post({ note: "Shorter please" }), ctx(REC_A))).status).toBe(409);
    db.dentvid_clinics[0].plan = "cancelled";
    expect((await change.POST(post({ note: "Shorter please" }), ctx(ITEM_A))).status).toBe(402);
    db.dentvid_clinics[0].plan = "active";
    db.dentvid_clinics[0].admin_paused_at = "2026-11-01T00:00:00Z";
    expect((await change.POST(post({ note: "Shorter please" }), ctx(ITEM_A))).status).toBe(402);
    expect(queued).toHaveLength(0);
  });

  it("one running change per video, three a week per clinic; a refused-for-free one gives its slot back", async () => {
    expect((await change.POST(post({ note: "Shorter please" }), ctx(ITEM_A))).status).toBe(200);
    expect((await json(await change.POST(post({ note: "Again" }), ctx(ITEM_A)))).body.code).toBe("busy");
    db.dentvid_change_requests[0].status = "done";
    expect((await change.POST(post({ note: "Second change" }), ctx(ITEM_A))).status).toBe(200);
    db.dentvid_change_requests[1].status = "refused";
    db.dentvid_change_requests[1].reason = "checks";
    expect((await change.POST(post({ note: "Third change" }), ctx(ITEM_A))).status).toBe(200);
    db.dentvid_change_requests[2].status = "done";
    const fourth = await json(await change.POST(post({ note: "Fourth change" }), ctx(ITEM_A)));
    expect(fourth).toMatchObject({ status: 429, body: { code: "limit" } });
    db.dentvid_change_requests[2].status = "failed";
    db.dentvid_change_requests[2].reason = "busy";
    expect((await change.POST(post({ note: "Fourth change" }), ctx(ITEM_A))).status).toBe(200);
    // B's week is its own.
    me = B;
    expect((await change.POST(post({ note: "Daha kısa" }), ctx(ITEM_B))).status).toBe(200);
  });

  it("the queue is down: the request is marked failed (never left 'queued') and the clinic told", async () => {
    queueDown = true;
    const r = await json(await change.POST(post({ note: "Shorter please" }), ctx(ITEM_A)));
    expect(r.status).toBe(503);
    expect(db.dentvid_change_requests[0]).toMatchObject({ status: "failed", reason: "technical" });
  });

  it("two requests racing on the web side may both be accepted; the worker's spend guard is the hard cap", async () => {
    // Both read "2 used this week" before either writes: the route cannot lock, so the 3-a-week cap is
    // enforced again, atomically, by the worker (worker/src/dentvid/change.test.ts: racing requests).
    for (let i = 0; i < 2; i++) db.dentvid_change_requests.push({ id: `old${i}`, owner_id: A, clinic_id: CLINIC_A, item_id: REC_A, status: "done", reason: null, created_at: new Date().toISOString() });
    const [x, y] = await Promise.all([change.POST(post({ note: "One" }), ctx(ITEM_A)), change.POST(post({ note: "Two" }), ctx(ITEM_A))]);
    expect([x.status, y.status].filter((s) => s === 200).length).toBeLessThanOrEqual(2);
    expect(queued.every((q) => (q[2] as { attempts: number }).attempts === 1)).toBe(true);
  });

  it("validates the note; before migration 0025 says 'not available'", async () => {
    expect((await change.POST(post({ note: "x" }), ctx(ITEM_A))).status).toBe(400);
    expect((await change.POST(post({ note: "see https://x.example" }), ctx(ITEM_A))).status).toBe(400);
    missing.add("dentvid_change_requests");
    expect((await change.POST(post({ note: "Shorter please" }), ctx(ITEM_A))).status).toBe(503);
    expect(queued).toHaveLength(0);
  });
});

describe("GET /api/dentvideo/items/[id]/subtitles", () => {
  const get = (id: string, format = "") => subs.GET(new Request(`https://dentvideo.com/api/dentvideo/items/${id}/subtitles${format}`), ctx(id));

  it("the owner gets SRT (default) or WebVTT", async () => {
    const srt = await get(ITEM_A);
    expect(srt.status).toBe(200);
    expect(await srt.text()).toBe("1\n00:00:00,200 --> 00:00:02,500\nSensitive teeth are common.\n");
    const vtt = await get(ITEM_A, "?format=vtt");
    expect(vtt.headers.get("content-type")).toContain("text/vtt");
    expect(await vtt.text()).toContain("00:00:00.200 --> 00:00:02.500");
  });

  it("clinic A gets nothing of clinic B's; no cues, not found; signed out 401; rate-limited 429", async () => {
    expect((await get(ITEM_B)).status).toBe(404);
    expect((await get(REC_A)).status).toBe(404);
    limited = ["rl:subtitles"];
    expect((await get(ITEM_A)).status).toBe(429);
    limited = [];
    me = null;
    expect((await get(ITEM_A)).status).toBe(401);
  });
});
