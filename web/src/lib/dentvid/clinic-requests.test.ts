import { beforeEach, describe, expect, it, vi } from "vitest";
import { REQUESTS_TEXT } from "@/content/dentvideo-requests";
import { checkNote, checkTopic, createChange, createTopic, listTopics, weekStart, withdrawTopic, CHANGE_STALE_MS, type ChangeRow, type RequestStore, type TopicRow } from "./clinic-requests";

/**
 * A clinic's topic suggestions and change requests: plain text, owner-scoped
 * (clinic A can never suggest, change or withdraw for clinic B), capped (5
 * waiting suggestions, 3 changes a week, one change at a time per video),
 * and nothing queued without an active plan.
 */

const A = { user: "user-a", clinic: "clinic-a" };
const B = { user: "user-b", clinic: "clinic-b" };
const ITEM_A = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a";
const REC_A = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6b";
const ITEM_B = "8c0d1e2f-3a4b-4c5d-9e6f-0a1b2c3d4e5f";
const NOW = new Date("2026-11-18T10:00:00Z");

type Clinic = { id: string; owner: string; plan: string; country: string; language: string; adminPaused?: boolean };
let clinics: Clinic[];
let items: { id: string; owner: string; clinic_id: string; kind: string; status: string; plan: boolean }[];
let topics: (TopicRow & { owner: string; clinic: string })[];
let changes: (ChangeRow & { owner: string; clinic: string; note: string })[];
let missing: boolean;
let queued: unknown[][];
let queueDown: boolean;

const store: RequestStore = {
  async clinic(ownerId) {
    const c = clinics.find((x) => x.owner === ownerId);
    return c ? { id: c.id, plan: c.plan, country: c.country, language: c.language, adminPaused: !!c.adminPaused } : null;
  },
  async topics(ownerId) {
    return missing ? null : topics.filter((t) => t.owner === ownerId);
  },
  async pendingTopics(clinicId) {
    return missing ? null : topics.filter((t) => t.clinic === clinicId && t.status === "pending").length;
  },
  async insertTopic(row) {
    if (missing) return "missing";
    const t = { id: `t${topics.length + 1}`, text: row.text, status: "pending" as const, reason: null, week_of: null, created_at: NOW.toISOString(), owner: row.owner_id, clinic: row.clinic_id };
    topics.push(t);
    return t;
  },
  async deletePendingTopic(ownerId, id) {
    const i = topics.findIndex((t) => t.id === id && t.owner === ownerId && t.status === "pending");
    if (i < 0) return false;
    topics.splice(i, 1);
    return true;
  },
  async item(ownerId, itemId) {
    const it = items.find((x) => x.id === itemId && x.owner === ownerId);
    return it ? { id: it.id, clinic_id: it.clinic_id, kind: it.kind, status: it.status, hasPlan: it.plan } : null;
  },
  async changesSince(clinicId, since) {
    if (missing) return null;
    return changes.filter((c) => c.clinic === clinicId && Date.parse(c.created_at) >= since.getTime() && (c.reason === null || c.reason === "checks" || c.reason === "technical")).length;
  },
  async openChange(itemId, since) {
    return changes.some((c) => c.item_id === itemId && (c.status === "queued" || c.status === "working") && Date.parse(c.created_at) >= since.getTime());
  },
  async insertChange(row) {
    if (missing) return "missing";
    const c = { id: `c${changes.length + 1}`, item_id: row.item_id, status: "queued" as const, reason: null, created_at: NOW.toISOString(), owner: row.owner_id, clinic: row.clinic_id, note: row.note };
    changes.push(c);
    return c;
  },
  async failChange(id) {
    const c = changes.find((x) => x.id === id);
    if (c) Object.assign(c, { status: "failed", reason: "technical" });
  },
  async latestChanges() {
    return [];
  },
};

const queue = {
  add: async (...a: unknown[]) => {
    if (queueDown) throw new Error("redis down");
    queued.push(a);
  },
};
const actor = (who: typeof A) => ({ db: {} as never, user: { id: who.user } as never });
const body = async (res: Response) => (await res.json()) as Record<string, unknown>;
const change = (who: typeof A, itemId: string, note: unknown = "Shorter, and calmer please") => createChange(actor(who), store, queue, itemId, { note }, { now: NOW, jobOpts: { attempts: 1 } });

beforeEach(() => {
  clinics = [
    { id: A.clinic, owner: A.user, plan: "active", country: "US", language: "en" },
    { id: B.clinic, owner: B.user, plan: "active", country: "TR", language: "tr" },
  ];
  items = [
    { id: ITEM_A, owner: A.user, clinic_id: A.clinic, kind: "generated", status: "ready", plan: true },
    { id: REC_A, owner: A.user, clinic_id: A.clinic, kind: "recording", status: "ready", plan: false },
    { id: ITEM_B, owner: B.user, clinic_id: B.clinic, kind: "generated", status: "ready", plan: true },
  ];
  topics = [];
  changes = [];
  missing = false;
  queued = [];
  queueDown = false;
});

describe("text rules", () => {
  it("topics: plain text, 3–140 characters, no links or markup, nothing the ad rules refuse", () => {
    expect(checkTopic("  How long does   sensitivity last?\n")).toEqual({ ok: true, text: "How long does sensitivity last?" });
    expect(checkTopic("hi")).toMatchObject({ ok: false, error: "length" });
    expect(checkTopic("x".repeat(141))).toMatchObject({ ok: false, error: "length" });
    expect(checkTopic("See https://evil.example/x")).toMatchObject({ ok: false, error: "plain" });
    expect(checkTopic("visit www.clinic.com now")).toMatchObject({ ok: false, error: "plain" });
    expect(checkTopic("<script>alert(1)</script>")).toMatchObject({ ok: false, error: "plain" });
    expect(checkTopic("bad\u0007char")).toMatchObject({ ok: false, error: "plain" });
    expect(checkTopic("Whitening 20% off this week")).toMatchObject({ ok: false, error: "adRules" });
    expect(checkTopic("Garantili ve acısız implant", "TR")).toMatchObject({ ok: false, error: "adRules" });
    expect(checkTopic(42)).toMatchObject({ ok: false, error: "length" });
  });

  it("change notes: plain text, 3–300 characters; a note may name a word to take out", () => {
    expect(checkNote("Take out 'painless', please").ok).toBe(true);
    expect(checkNote("x".repeat(301))).toMatchObject({ ok: false, error: "length" });
    expect(checkNote("Use this: https://x.example")).toMatchObject({ ok: false, error: "plain" });
  });

  it("the week starts on Monday 00:00 UTC, as the worker's spend guard counts it", () => {
    expect(weekStart(NOW).toISOString()).toBe("2026-11-16T00:00:00.000Z");
  });
});

describe("topic suggestions", () => {
  it("stored for the signed-in owner's own clinic, answered in the clinic's language", async () => {
    const res = await createTopic(actor(B), store, { text: "Beyazlatma sonrası hassasiyet ne kadar sürer?" });
    expect(res.status).toBe(200);
    expect((await body(res)).message).toBe(REQUESTS_TEXT.tr.topics.sent);
    expect(topics).toEqual([expect.objectContaining({ owner: B.user, clinic: B.clinic, text: "Beyazlatma sonrası hassasiyet ne kadar sürer?" })]);
    // A only ever sees its own.
    expect(((await body(await listTopics(actor(A), store))).topics as unknown[]).length).toBe(0);
  });

  it("refuses an ad-rules topic at once with an honest reason, and stores nothing", async () => {
    const res = await createTopic(actor(A), store, { text: "Our best price for implants" });
    expect(res.status).toBe(400);
    expect(await body(res)).toMatchObject({ code: "adRules", error: REQUESTS_TEXT.en.topics.errors.adRules });
    expect(topics).toHaveLength(0);
  });

  it("at most five waiting per clinic", async () => {
    for (let i = 0; i < 5; i++) expect((await createTopic(actor(A), store, { text: `Patient question number ${i}?` })).status).toBe(200);
    const res = await createTopic(actor(A), store, { text: "One too many?" });
    expect(res.status).toBe(409);
    expect((await body(res)).code).toBe("too_many_pending");
    // Clinic B is not affected by A's queue.
    expect((await createTopic(actor(B), store, { text: "Diş taşı neden oluşur?" })).status).toBe(200);
  });

  it("clinic A cannot withdraw clinic B's suggestion", async () => {
    await createTopic(actor(B), store, { text: "Diş taşı neden oluşur?" });
    const id = "aaaaaaaa-1111-4222-8333-444444444444";
    topics[0].id = id;
    expect((await withdrawTopic(actor(A), store, id)).status).toBe(404);
    expect(topics).toHaveLength(1);
    expect((await withdrawTopic(actor(B), store, id)).status).toBe(200);
    expect(topics).toHaveLength(0);
  });

  it("before migration 0025: says it is not available, never crashes", async () => {
    missing = true;
    expect((await createTopic(actor(A), store, { text: "How long does sensitivity last?" })).status).toBe(503);
    expect(await body(await listTopics(actor(A), store))).toEqual({ topics: [], available: false });
  });
});

describe("change requests", () => {
  it("queues the worker's one-attempt change job for the owner's own video", async () => {
    const res = await change(A, ITEM_A);
    expect(res.status).toBe(200);
    expect(await body(res)).toMatchObject({ ok: true, left: 2 });
    expect(changes[0]).toMatchObject({ owner: A.user, clinic: A.clinic, item_id: ITEM_A, note: "Shorter, and calmer please" });
    expect(queued).toEqual([["change", { requestId: "c1" }, { jobId: "change:c1", attempts: 1 }]]);
  });

  it("clinic A cannot ask for a change to clinic B's video", async () => {
    const res = await change(A, ITEM_B);
    expect(res.status).toBe(404);
    expect(changes).toHaveLength(0);
    expect(queued).toHaveLength(0);
  });

  it("only generated, finished videos", async () => {
    expect((await change(A, REC_A)).status).toBe(409);
    items[0].status = "working";
    expect((await change(A, ITEM_A)).status).toBe(409);
    expect(queued).toHaveLength(0);
  });

  it("needs an active plan that is not paused by DentVideo", async () => {
    clinics[0].plan = "cancelled";
    expect((await change(A, ITEM_A)).status).toBe(402);
    clinics[0].plan = "active";
    clinics[0].adminPaused = true;
    expect((await change(A, ITEM_A)).status).toBe(402);
    expect(queued).toHaveLength(0);
  });

  it("one at a time per video; a lost one (over an hour old) no longer blocks", async () => {
    await change(A, ITEM_A);
    const res = await change(A, ITEM_A);
    expect(res.status).toBe(409);
    expect((await body(res)).code).toBe("busy");
    changes[0].created_at = new Date(NOW.getTime() - CHANGE_STALE_MS - 1000).toISOString();
    expect((await change(A, ITEM_A)).status).toBe(200);
  });

  it("three a week per clinic; refusals that cost nothing do not count; next week starts again", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await change(A, ITEM_A)).status).toBe(200);
      changes.at(-1)!.status = "done";
    }
    const res = await change(A, ITEM_A);
    expect(res.status).toBe(429);
    expect(await body(res)).toMatchObject({ code: "limit", left: 0, error: REQUESTS_TEXT.en.change.errors.limit });
    expect(queued).toHaveLength(3);
    // A request refused before anything ran (the spend cap, no plan) gives its slot back.
    changes.at(-1)!.status = "failed";
    changes.at(-1)!.reason = "busy";
    expect((await change(A, ITEM_A)).status).toBe(200);
    // Last week's do not count.
    for (const c of changes) c.created_at = "2026-11-15T23:59:00Z";
    for (const c of changes) c.status = "done";
    expect((await change(A, ITEM_A)).status).toBe(200);
    // Clinic B has its own three.
    expect((await change(B, ITEM_B)).status).toBe(200);
  });

  it("a queue that is down: the request is marked failed and the clinic told, never left 'queued'", async () => {
    queueDown = true;
    const res = await change(A, ITEM_A);
    expect(res.status).toBe(503);
    expect(changes[0]).toMatchObject({ status: "failed", reason: "technical" });
  });

  it("validates the note before anything is stored", async () => {
    expect((await change(A, ITEM_A, "")).status).toBe(400);
    expect((await change(A, ITEM_A, "see http://x.example")).status).toBe(400);
    expect(changes).toHaveLength(0);
  });
});

describe("rate limits on the routes", () => {
  it("are applied before anything is read or written", async () => {
    vi.resetModules();
    vi.doMock("@/lib/rate-limit-server", () => ({ rateLimited: async () => new Response(JSON.stringify({ error: "Too many" }), { status: 429 }) }));
    vi.doMock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => ({ tooMany: "Too many" }) }));
    const added: unknown[] = [];
    vi.doMock("@/lib/queue", () => ({ dentvidQueue: { add: async (...a: unknown[]) => added.push(a) } }));
    vi.doMock("@/lib/dentvid/ops-server", () => ({ noteEnqueueFailure: async () => {} }));
    const from = vi.fn();
    const h = await import("./handlers/requests");
    const a = { db: { from } as never, user: { id: A.user } as never };
    expect((await h.topicsPost(a, new Request("https://x/", { method: "POST", body: "{}" }))).status).toBe(429);
    expect((await h.changePost(a, ITEM_A, new Request("https://x/", { method: "POST", body: "{}" }))).status).toBe(429);
    expect((await h.subtitlesGet(a, ITEM_A, new Request("https://x/"))).status).toBe(429);
    expect((await h.topicDelete(a, ITEM_A)).status).toBe(429);
    expect(from).not.toHaveBeenCalled();
    expect(added).toHaveLength(0);
    vi.doUnmock("@/lib/rate-limit-server");
    vi.doUnmock("@/lib/dentvid/locale-server");
    vi.doUnmock("@/lib/queue");
    vi.doUnmock("@/lib/dentvid/ops-server");
  });
});
