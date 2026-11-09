import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

// L5: a clinic decides only on finished videos (ready / flagged).

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const ITEM = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a";

let item: { id: string; owner_id: string; status: string; approval: string; clinic_id: string };
let filters: [string, string, unknown][];

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user: { id: OWNER },
    db: {
      from: () => {
        let patch: Record<string, unknown> = {};
        const q = {
          update: (p: Record<string, unknown>) => ((patch = p), q),
          eq: (k: string, v: unknown) => (filters.push(["eq", k, v]), q),
          in: (k: string, v: unknown) => (filters.push(["in", k, v]), q),
          select: async () => {
            const match = filters.every(([op, k, v]) => {
              const have = (item as Record<string, unknown>)[k];
              return op === "eq" ? have === v : (v as unknown[]).includes(have);
            });
            if (match) Object.assign(item, patch);
            return { data: match ? [{ clinic_id: item.clinic_id }] : [], error: null };
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

async function patch(body: unknown) {
  const { PATCH } = await import("./route");
  const res = await PATCH(new Request(`https://dentvideo.com/api/dentvideo/items/${ITEM}`, { method: "PATCH", body: JSON.stringify(body) }), {
    params: Promise.resolve({ id: ITEM }),
  });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  filters = [];
  item = { id: ITEM, owner_id: OWNER, status: "ready", approval: "pending", clinic_id: "c1" };
});

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
});
