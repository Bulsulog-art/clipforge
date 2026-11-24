import { beforeEach, describe, expect, it, vi } from "vitest";

// The worker's notices: "ready" (email + iPhone push) and "running late" (email only).

const CLINIC = "5f1e2d3c-4b5a-4968-8776-655443322110";
let emailResult: { sent: boolean; reason?: string };
let ownerEmail: string | null;
let limitedNow: boolean;
const push = vi.fn(async () => ({ sent: 1, failed: 0, removed: 0 }));
const readyNotice = vi.fn(async () => emailResult);
/** The real email is built and handed to the sender; only the send itself is faked. */
const sendEmail = vi.fn(async () => true);

/** The clinic and its owner, as the admin client answers them (no week delivered yet). */
const db = {
  from: () => {
    const q = {
      select: () => q,
      eq: () => q,
      in: () => q,
      maybeSingle: async () => ({ data: { owner_id: "owner-1", profile: { name: "Smile & Co", language: "en" } }, error: null }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ count: 0, error: null }).then(res),
    };
    return q;
  },
  auth: { admin: { getUserById: async () => ({ data: { user: ownerEmail ? { email: ownerEmail } : null } }) } },
};

vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => db }));
vi.mock("@/lib/dentvid/internal-auth", () => ({ workerAuthorised: (h: string | null) => h === "Bearer worker" }));
vi.mock("@/lib/dentvid/ready-notice", () => ({ sendReadyNotice: (...a: unknown[]) => readyNotice(...(a as [])) }));
vi.mock("@/lib/dentvid/apns", () => ({ sendReadyPush: (...a: unknown[]) => push(...(a as [])) }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => (limitedNow ? new Response(JSON.stringify({ error: "too many notices" }), { status: 429 }) : null) }));
vi.mock("@/lib/dentvid/email", async (orig) => ({ ...(await orig<typeof import("@/lib/dentvid/email")>()), sendEmail: (...a: unknown[]) => sendEmail(...(a as [])) }));

async function call(auth: string | null, body: unknown) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (auth) headers.authorization = auth;
  return POST(new Request("https://dentvideo.com/api/internal/dentvideo/notify", { method: "POST", headers, body: JSON.stringify(body) }));
}

beforeEach(() => {
  push.mockClear();
  readyNotice.mockClear();
  sendEmail.mockClear();
  emailResult = { sent: true };
  ownerEmail = "dr@klinik.example";
  limitedNow = false;
});

describe("POST /api/internal/dentvideo/notify: ready", () => {
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
  it("a test account is a decision, not a failure: it answers with the reason, so the worker does not retry for hours", async () => {
    emailResult = { sent: false, reason: "test account" };
    expect(await (await call("Bearer worker", body)).json()).toEqual({ sent: false, reason: "test account" });
    emailResult = { sent: false, reason: "send failed" };
    expect(await (await call("Bearer worker", body)).json()).toEqual({ sent: false });
  });
  it("a ready notice still needs its counts", async () => {
    expect((await call("Bearer worker", { clinicId: CLINIC, kind: "week" })).status).toBe(400);
    expect(readyNotice).not.toHaveBeenCalled();
  });
});

describe("POST /api/internal/dentvideo/notify: running late", () => {
  it("kind 'late' sends the 'running late' email through delay-notice, and no push", async () => {
    const res = await call("Bearer worker", { clinicId: CLINIC, kind: "late", week: "2026-11-16" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ sent: true });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [to, msg, opts] = sendEmail.mock.calls[0] as unknown as [string, { subject: string }, { log: { kind: string }; idempotencyKey: string }];
    expect(to).toBe("dr@klinik.example");
    expect(msg.subject).toBe("This week's videos are running late");
    expect(opts.log.kind).toBe("week_late");
    expect(opts.idempotencyKey).toBe(`dentvideo-week-late-${CLINIC}-2026-11-16`);
    expect(readyNotice).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });
  it("kind 'first-late' sends the first-week wording", async () => {
    await call("Bearer worker", { clinicId: CLINIC, kind: "first-late", week: "2026-11-16" });
    expect((sendEmail.mock.calls[0] as unknown as [string, { subject: string }])[1].subject).toBe("Your first videos are taking a little longer");
  });
  it("a test account is skipped, with a final reason", async () => {
    ownerEmail = "e2e-42@bulsulabs.com";
    const res = await call("Bearer worker", { clinicId: CLINIC, kind: "late", week: "2026-11-16" });
    expect(await res.json()).toEqual({ sent: false, reason: "test account" });
    ownerEmail = null;
    expect(await (await call("Bearer worker", { clinicId: CLINIC, kind: "late", week: "2026-11-16" })).json()).toEqual({ sent: false, reason: "no email" });
    expect(sendEmail).not.toHaveBeenCalled();
  });
  it("needs the worker's token, a uuid and a real week; shares the ready notice's rate limits", async () => {
    expect((await call(null, { clinicId: CLINIC, kind: "late", week: "2026-11-16" })).status).toBe(401);
    expect((await call("Bearer nope", { clinicId: CLINIC, kind: "late", week: "2026-11-16" })).status).toBe(401);
    expect((await call("Bearer worker", { clinicId: "not-a-uuid", kind: "late", week: "2026-11-16" })).status).toBe(400);
    expect((await call("Bearer worker", { clinicId: CLINIC, kind: "late", week: "16 Nov" })).status).toBe(400);
    expect((await call("Bearer worker", { clinicId: CLINIC, kind: "soon" })).status).toBe(400);
    limitedNow = true;
    expect((await call("Bearer worker", { clinicId: CLINIC, kind: "late", week: "2026-11-16" })).status).toBe(429);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
