import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const ITEM = "5d1e2f3a-4b5c-4d6e-8f70-8192a3b4c5d6";

type Item = Record<string, unknown> | null;
let session: { user: { id: string } | null; item: Item };
const filters: [string, unknown][] = [];
const updates: Record<string, unknown>[] = [];
const added: unknown[][] = [];
let queueFails = false;

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user: session.user,
    db: {
      from: () => {
        const q = {
          select: () => q,
          eq: (k: string, v: unknown) => (filters.push([k, v]), q),
          maybeSingle: async () => ({ data: session.item, error: null }),
          update: (u: Record<string, unknown>) => (updates.push(u), q),
          then: (res: (v: { error: null }) => unknown) => Promise.resolve({ error: null }).then(res),
        };
        return q;
      },
    },
  }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
vi.mock("@/lib/queue", () => ({
  dentvidQueue: {
    add: async (...args: unknown[]) => {
      if (queueFails) throw new Error("redis down");
      added.push(args);
    },
  },
}));

async function call(body: unknown) {
  const { POST } = await import("./route");
  const res = await POST(
    new Request(`https://dentvideo.com/api/dentvideo/items/${ITEM}/backgrounds`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
    { params: Promise.resolve({ id: ITEM }) },
  );
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const plan = { title: "t", aspect: "9:16", theme: "midnight", scenes: [], backgrounds: ["/dentvideo/backgrounds/whitening-02.jpg"] };

beforeEach(() => {
  session = { user: { id: OWNER }, item: { id: ITEM, kind: "generated", plan, restyle_status: null } };
  filters.length = 0;
  updates.length = 0;
  added.length = 0;
  queueFails = false;
});

describe("POST /api/dentvideo/items/[id]/backgrounds", () => {
  it("needs a signed-in owner", async () => {
    session.user = null;
    expect((await call({ backgrounds: ["implants-03"] })).status).toBe(401);
  });

  it("saves the photos into the plan, marks the card updating and queues a re-render", async () => {
    const res = await call({ backgrounds: ["implants-03", "implants-06"] });
    expect(res.status).toBe(200);
    expect(filters).toContainEqual(["owner_id", OWNER]);
    expect(updates[0].plan).toMatchObject({ backgrounds: ["/dentvideo/backgrounds/implants-03.jpg", "/dentvideo/backgrounds/implants-06.jpg"] });
    expect(updates[0].restyle_status).toBe("queued");
    expect(added[0][0]).toBe("restyle");
    expect(added[0][1]).toEqual({ itemId: ITEM });
    // Ahead of the weekend batch: the clinic is watching "updating…".
    expect(added[0][2]).toMatchObject({ priority: 1, attempts: 2 });
  });

  it("refuses unknown ids, URLs, none and more than four", async () => {
    for (const backgrounds of [["nope-01"], ["https://evil.test/x.jpg"], [], ["whitening-01", "whitening-02", "whitening-03", "whitening-04", "whitening-05"]]) {
      expect((await call({ backgrounds })).status).toBe(400);
    }
    expect(updates).toHaveLength(0);
  });

  it("only for the owner's own generated videos", async () => {
    session.item = null;
    expect((await call({ backgrounds: ["implants-03"] })).status).toBe(404);
    session.item = { id: ITEM, kind: "recording", plan: null };
    expect((await call({ backgrounds: ["implants-03"] })).status).toBe(404);
  });

  it("does not queue twice while an update is running", async () => {
    session.item = { ...session.item!, restyle_status: "queued", restyle_requested_at: new Date().toISOString() };
    expect((await call({ backgrounds: ["implants-03"] })).status).toBe(409);
    expect(added).toHaveLength(0);
  });

  it("a re-render stuck in the queue for over 30 minutes no longer blocks a retry", async () => {
    session.item = { ...session.item!, restyle_status: "queued", restyle_requested_at: new Date(Date.now() - 31 * 60_000).toISOString() };
    expect((await call({ backgrounds: ["implants-03"] })).status).toBe(200);
    expect(added).toHaveLength(1);
  });

  it("marks the update failed when the queue is down", async () => {
    queueFails = true;
    expect((await call({ backgrounds: ["implants-03"] })).status).toBe(503);
    expect(updates.at(-1)).toEqual({ restyle_status: "failed" });
  });
});
