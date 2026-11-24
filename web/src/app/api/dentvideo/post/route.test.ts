import { beforeEach, describe, expect, it, vi } from "vitest";
import { approveToken } from "@/lib/dentvid/approve-link";
import { MemoryOpsStore } from "@/lib/dentvid/ops-alert";

/**
 * POST /api/dentvideo/post — the email's post page. Here: the "shared"
 * action counts a share as the clinic's video_shared event, server-side,
 * once per video, only for a valid token, clinic, week and video.
 */

const SECRET = "test-secret-0123456789";
const CLINIC = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const WEEK = "2026-11-09";
const NOW = new Date("2026-11-10T08:00:00Z");
const id = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

type Row = Record<string, unknown>;
const clinics: Row[] = [];
const items: Row[] = [];
const recorded: { name: string; opts: Record<string, unknown> }[] = [];
let recordOk = true;
let limitOk = true;
let redis: MemoryOpsStore | null = null;

vi.mock("@/lib/dentvid/unsubscribe-token", () => ({ unsubscribeSecret: () => SECRET }));
vi.mock("@/lib/rate-limit-server", () => ({
  limitChecks: async () => ({ ok: limitOk, remaining: 0, retryAfterSec: 7 }),
}));
vi.mock("@/lib/dentvid/events-server", () => ({
  recordEvent: async (name: string, opts: Record<string, unknown>) => {
    recorded.push({ name, opts });
    return recordOk;
  },
}));
vi.mock("@/lib/dentvid/ops-server", () => ({ webOpsStore: async () => redis }));
const writes: Row[] = [];
vi.mock("@/lib/dentvid/supabase", () => ({
  BUCKET: "dentvid",
  dvAdmin: () => ({
    from(table: string) {
      const filters: [string, unknown][] = [];
      let patch: Row | null = null;
      const rows = () => (table === "dentvid_clinics" ? clinics : items).filter((r) => filters.every(([k, v]) => r[k] === v));
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        order: () => q,
        limit: async () => ({ data: rows(), error: null }),
        maybeSingle: async () => ({ data: rows()[0] ?? null, error: null }),
        update: (p: Row) => ((patch = p), q),
        then(resolve: (v: unknown) => void) {
          const hit = rows();
          if (patch) {
            writes.push(patch);
            for (const r of hit) Object.assign(r, patch);
          }
          return resolve({ data: hit.map((r) => ({ id: r.id })), error: null });
        },
      };
      return q;
    },
    storage: { from: () => ({ createSignedUrls: async () => ({ data: [] }) }) },
  }),
}));

const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const HEADLESS = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36";

async function post(body: Record<string, unknown>, ua = SAFARI) {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/post", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": "203.0.113.9", "user-agent": ua }, body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const tok = (clinic = CLINIC, week = WEEK, now = NOW) => approveToken(clinic, week, SECRET, now);
const shared = (over: Record<string, unknown> = {}, ua?: string) => post({ t: tok(), v: id(1), action: "shared", method: "share", ...over }, ua);
const shares = () => recorded.filter((r) => r.name === "video_shared");

describe("POST /api/dentvideo/post — shared", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    recorded.length = 0;
    writes.length = 0;
    recordOk = true;
    limitOk = true;
    redis = new MemoryOpsStore();
    clinics.length = 0;
    clinics.push({ id: CLINIC, plan: "active", profile: { language: "de", country: "DE" } }, { id: OTHER, plan: "active", profile: { language: "en" } });
    items.length = 0;
    const base = { clinic_id: CLINIC, week_of: WEEK, kind: "generated", status: "ready", video_path: "c/1.mp4", thumb_path: null, copy: null, posted_at: null, title: "T" };
    items.push(
      { ...base, id: id(1), approval: "approved" },
      { ...base, id: id(2), approval: "pending" },
      { ...base, id: id(3), approval: "pending", status: "flagged" },
      { ...base, id: id(4), approval: "rejected" },
      { ...base, id: id(5), approval: "approved", clinic_id: OTHER },
      { ...base, id: id(6), approval: "approved", week_of: "2026-11-02" },
    );
  });

  it("records exactly one video_shared with the clinic id per video, server-side", async () => {
    expect(await shared({ device: "mobile" })).toEqual({ status: 200, body: { ok: true, stored: true } });
    expect(shares()).toEqual([{ name: "video_shared", opts: { clinicId: CLINIC, locale: "de", props: { method: "share", device: "mobile" }, internal: false } }]);
    expect(redis!.kv.has(`dv:shared:${id(1)}`)).toBe(true);
    // Tapped again, downloaded too, or the request replayed: still one.
    expect((await shared({ method: "download" })).body).toEqual({ ok: true, stored: false });
    expect((await shared()).body).toEqual({ ok: true, stored: false });
    expect(shares()).toHaveLength(1);
    // A pending video of the same week is its own video.
    expect((await shared({ v: id(2), method: "download" })).body).toEqual({ ok: true, stored: true });
    expect(shares()).toHaveLength(2);
  });

  it("counts nothing for another clinic's video, another week's, a flagged or declined one, or with another clinic's token", async () => {
    for (const v of [id(3), id(4), id(5), id(6), id(9)]) expect((await shared({ v })).status, v).toBe(409);
    expect((await post({ t: tok(OTHER), v: id(1), action: "shared", method: "share" })).status).toBe(409);
    expect((await post({ t: tok(CLINIC, "2026-11-02"), v: id(1), action: "shared", method: "share" })).status).toBe(409);
    expect(shares()).toEqual([]);
    expect(redis!.kv.size).toBe(0);
  });

  it("rejects an expired or forged token and a bad method", async () => {
    expect((await shared({ t: tok(CLINIC, WEEK, new Date("2026-10-01T00:00:00Z")) })).status).toBe(400);
    expect((await shared({ t: approveToken(CLINIC, WEEK, "not-our-secret", NOW) })).status).toBe(400);
    expect((await shared({ t: tok().replace(/.$/, (c) => (c === "A" ? "B" : "A")) })).status).toBe(400);
    expect((await shared({ method: "instagram" })).status).toBe(400);
    expect((await shared({ v: "../../etc" })).status).toBe(400);
    expect(shares()).toEqual([]);
  });

  it("a paused clinic counts nothing", async () => {
    clinics[0].plan = "paused";
    expect((await shared()).status).toBe(409);
    expect(shares()).toEqual([]);
  });

  it("when the event could not be stored, the key is freed and the next tap counts", async () => {
    recordOk = false;
    expect((await shared()).body).toEqual({ ok: true, stored: false });
    expect(redis!.kv.size).toBe(0);
    recordOk = true;
    expect((await shared()).body).toEqual({ ok: true, stored: true });
  });

  it("without Redis (missing or failing) a share still counts, and still once", async () => {
    redis = null;
    expect((await shared()).body.stored).toBe(true);
    expect((await shared()).body.stored).toBe(false);
    redis = new MemoryOpsStore();
    redis.down = true;
    expect((await shared({ v: id(2) })).body.stored).toBe(true);
    expect((await shared({ v: id(2) })).body.stored).toBe(false);
    expect(shares()).toHaveLength(2);
  });

  it("an automated browser's share is kept, tagged internal", async () => {
    await shared({}, HEADLESS);
    expect(shares()[0].opts.internal).toBe(true);
  });

  it("over the per-IP limit: 429 and nothing counted", async () => {
    limitOk = false;
    const r = await shared();
    expect(r.status).toBe(429);
    expect(shares()).toEqual([]);
  });

  it("never writes to the database: a share is an event, not a change to the video", async () => {
    await shared();
    await shared({ v: id(2) });
    expect(writes).toEqual([]);
    expect(items.find((i) => i.id === id(2))).toMatchObject({ approval: "pending", posted_at: null });
  });

  it("approve and posted work as before: video_approved with the clinic, the tick stored, and no share counted by either", async () => {
    expect((await post({ t: tok(), v: id(2), action: "approve" })).status).toBe(200);
    expect(items.find((i) => i.id === id(2))?.approval).toBe("approved");
    await vi.waitFor(() => expect(recorded.map((r) => [r.name, r.opts.clinicId])).toEqual([["video_approved", CLINIC]]));
    expect((await post({ t: tok(), v: id(2), action: "posted", on: true })).body).toEqual({ ok: true, stored: true });
    expect(items.find((i) => i.id === id(2))?.posted_at).toBeTruthy();
    expect(shares()).toEqual([]);
  });
});
