import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";
import { recordEvent } from "@/lib/dentvid/events-server";
import { clinicRefFor, raiseOwnerAlert } from "@/lib/dentvid/ops-server";
import type { OwnerAlert } from "@/lib/dentvid/ops-alert";

// L5: a clinic decides only on finished videos (ready / flagged).
// A decline is heard: one owner alert and one server-side event per decline, and the note survives an undo.

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const ITEM = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a";

let item: { id: string; owner_id: string; status: string; approval: string; approval_note?: string | null; clinic_id: string; title: string; posted_at?: string | null };
let dbError: { code?: string; message: string } | null = null;
let filters: [string, string, unknown][];

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user: { id: OWNER, email: "dr@clinic.example" },
    db: {
      from: () => {
        let patch: Record<string, unknown> = {};
        const q = {
          update: (p: Record<string, unknown>) => ((patch = p), q),
          eq: (k: string, v: unknown) => (filters.push(["eq", k, v]), q),
          in: (k: string, v: unknown) => (filters.push(["in", k, v]), q),
          select: async () => {
            if (dbError) return { data: null, error: dbError };
            const match = filters.every(([op, k, v]) => {
              const have = (item as Record<string, unknown>)[k];
              return op === "eq" ? have === v : (v as unknown[]).includes(have);
            });
            if (match) Object.assign(item, patch);
            return { data: match ? [{ clinic_id: item.clinic_id, title: item.title }] : [], error: null };
          },
        };
        return q;
      },
    },
  }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null }));
vi.mock("@/lib/dentvid/events-server", () => ({ recordEvent: vi.fn() }));
vi.mock("@/lib/dentvid/ops-server", () => ({
  raiseOwnerAlert: vi.fn(async () => "sent"),
  clinicRefFor: vi.fn(async (_db: unknown, id: string) => ({ id, name: "Sample Dental Practice", country: "US", tier: "starter", email: null })),
}));

async function patch(body: unknown) {
  const { PATCH } = await import("./route");
  const res = await PATCH(new Request(`https://dentvideo.com/api/dentvideo/items/${ITEM}`, { method: "PATCH", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: ITEM }),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  filters = [];
  item = { id: ITEM, owner_id: OWNER, status: "ready", approval: "pending", clinic_id: "c1", title: "Whitening and enamel" };
  dbError = null;
  vi.mocked(recordEvent).mockClear();
  vi.mocked(raiseOwnerAlert).mockClear();
  vi.mocked(raiseOwnerAlert).mockImplementation(async () => "sent");
  vi.mocked(clinicRefFor).mockClear();
});

/** Let fire-and-forget work (the alert) run. */
const settle = () => new Promise((r) => setTimeout(r, 0));
const alertsRaised = () => vi.mocked(raiseOwnerAlert).mock.calls.map((c) => c[0] as OwnerAlert);
const events = (name: string) => vi.mocked(recordEvent).mock.calls.filter((c) => c[0] === name);
async function decide(body: unknown) {
  filters = [];
  const r = await patch(body);
  await settle();
  return r;
}

describe("PATCH /api/dentvideo/items/[id]", () => {
  it("approves a ready or flagged video", async () => {
    for (const status of ["ready", "flagged"]) {
      item = { ...item, status, approval: "pending" };
      filters = [];
      expect((await patch({ approval: "approved" })).status).toBe(200);
      expect(item.approval).toBe("approved");
    }
  });

  it("refuses a decision on a video that is not finished (queued, working, failed, rejected)", async () => {
    for (const status of ["queued", "working", "failed", "rejected"]) {
      item = { ...item, status, approval: "pending" };
      filters = [];
      const r = await patch({ approval: "approved" });
      expect(r.status, status).toBe(409);
      expect(item.approval).toBe("pending");
    }
  });

  it("ticks an approved video as posted, and unticks it", async () => {
    item = { ...item, approval: "approved" };
    const r = await patch({ posted: true });
    expect(r).toEqual({ status: 200, body: { ok: true, stored: true } });
    expect(typeof item.posted_at).toBe("string");
    filters = [];
    await patch({ posted: false });
    expect(item.posted_at).toBeNull();
  });

  it("never ticks a video that is not approved, and a tick never changes the decision", async () => {
    const r = await patch({ posted: true });
    expect(r.status).toBe(409);
    expect(item.posted_at).toBeUndefined();
    expect(item.approval).toBe("pending");
    // A body with both is a decision, never a tick.
    filters = [];
    expect((await patch({ posted: true, approval: "approved" })).status).toBe(200);
    expect(item.approval).toBe("approved");
    expect(item.posted_at).toBeUndefined();
  });

  it("a decline raises one owner alert and records one video_declined event with the reason tag only; urgent only for [wrong]", async () => {
    for (const [reason, severity] of [["wrong", "urgent"], ["notUs", "warning"], ["look", "warning"], ["other", "warning"]] as const) {
      vi.mocked(recordEvent).mockClear();
      vi.mocked(raiseOwnerAlert).mockClear();
      item = { ...item, approval: "pending" };
      expect((await decide({ approval: "rejected", note: `[${reason}] Private words about dr@clinic.example` })).status, reason).toBe(200);
      expect(item).toMatchObject({ approval: "rejected", approval_note: `[${reason}] Private words about dr@clinic.example` });
      expect(events("video_declined"), reason).toEqual([["video_declined", { clinicId: "c1", props: { reason } }]]);
      expect(JSON.stringify(vi.mocked(recordEvent).mock.calls)).not.toContain("Private words");
      const raised = alertsRaised();
      expect(raised, reason).toHaveLength(1);
      expect(raised[0]).toMatchObject({ key: `declined:${ITEM}`, severity, clinic: { id: "c1", name: "Sample Dental Practice", email: "dr@clinic.example" } });
      // The owner reads the dentist's words, without the tag, and the video's title.
      expect(raised[0].what.join(" ")).toContain("“Whitening and enamel”");
      expect(raised[0].what.join(" ")).toContain("Their words: “Private words about dr@clinic.example”");
    }
  });

  it("a decline without a reason or a note still alerts the owner (a warning) and records the event without props", async () => {
    await decide({ approval: "rejected" });
    expect(item.approval_note).toBeNull();
    expect(events("video_declined")).toEqual([["video_declined", { clinicId: "c1", props: {} }]]);
    expect(alertsRaised()).toHaveLength(1);
    expect(alertsRaised()[0]).toMatchObject({ key: `declined:${ITEM}`, severity: "warning" });
    expect(alertsRaised()[0].what).toContain("They wrote no note.");
  });

  it("approving, undoing and refused decisions raise no alert and no decline event", async () => {
    await decide({ approval: "approved" });
    await decide({ approval: "pending" });
    item = { ...item, status: "working", approval: "pending" };
    expect((await decide({ approval: "rejected", note: "[wrong] x" })).status).toBe(409);
    // Another owner's video: nothing matches, nothing is raised.
    item = { ...item, status: "ready", owner_id: "someone-else" };
    expect((await decide({ approval: "rejected", note: "[wrong] x" })).status).toBe(409);
    expect(raiseOwnerAlert).not.toHaveBeenCalled();
    expect(events("video_declined")).toEqual([]);
    expect(events("video_approved")).toHaveLength(1);
  });

  it("undoing a decline, or approving it later, keeps the dentist's note; a new decline replaces it", async () => {
    await decide({ approval: "rejected", note: "[notUs] We do not offer this" });
    await decide({ approval: "pending" });
    expect(item).toMatchObject({ approval: "pending", approval_note: "[notUs] We do not offer this" });
    // A note sent with an undo or an approval is not written either.
    await decide({ approval: "approved", note: "[wrong] stray" });
    expect(item).toMatchObject({ approval: "approved", approval_note: "[notUs] We do not offer this" });
    await decide({ approval: "rejected", note: "[look] The colours" });
    expect(item).toMatchObject({ approval: "rejected", approval_note: "[look] The colours" });
  });

  it("the answer never waits for the alert, and a failing alert never fails the decision", async () => {
    vi.mocked(raiseOwnerAlert).mockImplementation(() => new Promise(() => {}));
    expect((await decide({ approval: "rejected", note: "[wrong] x" })).status).toBe(200);
    vi.mocked(raiseOwnerAlert).mockImplementation(async () => {
      throw new Error("redis down");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await decide({ approval: "rejected", note: "[wrong] y" })).status).toBe(200);
    vi.mocked(clinicRefFor).mockImplementationOnce(async () => {
      throw new Error("db down");
    });
    expect((await decide({ approval: "rejected", note: "[wrong] z" })).status).toBe(200);
    expect(item).toMatchObject({ approval: "rejected", approval_note: "[wrong] z" });
    expect(error).toHaveBeenCalledWith("dentvideo decline alert failed", "redis down");
    error.mockRestore();
  });

  it("before 0012 is applied, the tick answers stored: false (the app keeps it in the browser)", async () => {
    item = { ...item, approval: "approved" };
    dbError = { code: "PGRST204", message: "Could not find the 'posted_at' column of 'dentvid_items' in the schema cache" };
    expect(await patch({ posted: true })).toEqual({ status: 200, body: { ok: true, stored: false } });
  });
});
