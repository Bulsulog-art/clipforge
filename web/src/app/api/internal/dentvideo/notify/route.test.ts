import { beforeEach, describe, expect, it, vi } from "vitest";

// The worker's ready notice now also pushes to the clinic owner's iPhones.

const CLINIC = "5f1e2d3c-4b5a-4968-8776-655443322110";
let emailResult: { sent: boolean; reason?: string };
const push = vi.fn(async () => ({ sent: 1, failed: 0, removed: 0 }));

vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => ({}) }));
vi.mock("@/lib/dentvid/internal-auth", () => ({ workerAuthorised: (h: string | null) => h === "Bearer worker" }));
vi.mock("@/lib/dentvid/ready-notice", () => ({ sendReadyNotice: async () => emailResult }));
vi.mock("@/lib/dentvid/apns", () => ({ sendReadyPush: (...a: unknown[]) => push(...(a as [])) }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null }));

async function call(auth: string | null, body: unknown) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = auth;
  return POST(new Request("https://dentvideo.com/api/internal/dentvideo/notify", { method: "POST", headers, body: JSON.stringify(body) }));
}

beforeEach(() => {
  push.mockClear();
  emailResult = { sent: true };
});

describe("POST /api/internal/dentvideo/notify", () => {
  const body = { clinicId: CLINIC, kind: "week", ready: 4, flagged: 1 };
  it("emails and pushes the same notice", async () => {
    expect((await call("Bearer worker", body)).status).toBe(200);
    expect(push).toHaveBeenCalledWith(expect.anything(), CLINIC, "week", { ready: 4, flagged: 1 });
  });
  it("still pushes when the email could not go (bounced address, test account)", async () => {
    emailResult = { sent: false, reason: "send failed" };
    await call("Bearer worker", body);
    expect(push).toHaveBeenCalledTimes(1);
  });
  it("pushes nothing for an unknown clinic or without the worker's token", async () => {
    emailResult = { sent: false, reason: "no clinic" };
    expect((await call("Bearer worker", body)).status).toBe(404);
    expect((await call("Bearer nope", body)).status).toBe(401);
    expect(push).not.toHaveBeenCalled();
  });
});
