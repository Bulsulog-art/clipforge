import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

const WEEK = "2026-11-16";
let usable = 0;
let jobState: string | null = null;
const added: { data: Record<string, unknown>; opts: Record<string, unknown> }[] = [];
const removed: string[] = [];

const chain = (result: unknown) => {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "neq"]) c[m] = () => c;
  c.maybeSingle = async () => result;
  c.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res);
  return c;
};

vi.mock("@/lib/dentvid/auth", () => ({
  deliveryWeek: () => WEEK,
  dvSession: async () => ({
    user: { id: "u1" },
    db: { from: (t: string) => (t === "dentvid_clinics" ? chain({ data: { id: "c1", profile: { language: "en" } } }) : chain({ count: usable })) },
  }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null }));
vi.mock("@/lib/dentvid/ops-server", () => ({ markWeekRetrying: async () => {}, noteEnqueueFailure: async () => {} }));
vi.mock("@/lib/dentvid/plan", () => ({
  adminPausedMessage: () => "paused",
  loadClinicPlan: async () => ({ plan: "active", tier: "starter", renewsAt: null, canMake: true, adminPaused: false }),
}));
vi.mock("@/lib/queue", () => ({
  dentvidQueue: {
    getJob: async (id: string) =>
      jobState ? { getState: async () => jobState, remove: async () => void removed.push(id), changePriority: async () => {} } : null,
    add: async (_name: string, data: Record<string, unknown>, opts: Record<string, unknown>) => void added.push({ data, opts }),
  },
}));

const { POST } = await import("./route");

beforeEach(() => {
  usable = 0;
  jobState = null;
  added.length = 0;
  removed.length = 0;
});

describe("POST /api/dentvideo/week", () => {
  it("queues a full week when nothing is made", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(added).toEqual([{ data: { clinicId: "c1", count: 5, week: WEEK }, opts: expect.objectContaining({ jobId: `week:c1:${WEEK}` }) }]);
  });

  it("a finished week with three usable videos is made up with the two missing ones (not 409 'already done')", async () => {
    usable = 3;
    jobState = "completed";
    const res = await POST();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, topup: 2 });
    expect(removed).toEqual([`week:c1:${WEEK}`]);
    expect(added[0].data).toEqual({ clinicId: "c1", count: 2, week: WEEK });
  });

  it("a full week stays 'already made'", async () => {
    usable = 5;
    jobState = "completed";
    const res = await POST();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: APP_TEXT.en.errors.weekMade });
    expect(added).toEqual([]);
  });

  it("a run in progress is left alone", async () => {
    usable = 2;
    jobState = "active";
    expect(await (await POST()).json()).toMatchObject({ ok: true, already: true });
    expect(added).toEqual([]);
  });
});
