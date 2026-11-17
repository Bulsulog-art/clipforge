import { describe, expect, it, vi } from "vitest";

/** POST /api/dentvideo/mobile/v1/verify-email: the web's code handler, for the bearer session's own user only. */

const sent: { userId: string; email: string }[] = [];
const SESSION_USER = { id: "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e", email: "dr@clinic-a.example", app_metadata: { product: "dentvideo" } };

vi.mock("@/lib/dentvid/mobile-auth", () => ({
  withMobileSession: async (req: Request, run: (s: { user: typeof SESSION_USER }) => Promise<Response>) =>
    req.headers.get("authorization") === "Bearer good" ? run({ user: SESSION_USER }) : new Response(JSON.stringify({ code: "unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvLocale: async () => "en" }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null, kvStore: () => ({}) }));
vi.mock("@/lib/dentvid/verify-email-server", () => ({
  sendVerificationCode: async (a: { userId: string; email: string }) => (sent.push({ userId: a.userId, email: a.email }), { ok: true }),
  markEmailVerified: async () => true,
}));
vi.mock("@/lib/dentvid/events-server", () => ({ recordEvent: async () => {} }));

async function post(body: unknown, auth = "Bearer good") {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/mobile/v1/verify-email", { method: "POST", headers: { "content-type": "application/json", authorization: auth }, body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

describe("POST mobile/v1/verify-email", () => {
  it("sends the code to the session user's own address (an address in the body is never used for 'send')", async () => {
    const r = await post({ action: "send", email: "victim@other.example" });
    expect(r.status).toBe(200);
    expect(sent).toEqual([{ userId: SESSION_USER.id, email: "dr@clinic-a.example" }]);
  });

  it("401 without the bearer session", async () => {
    expect((await post({ action: "send" }, "Bearer bad")).status).toBe(401);
  });
});
