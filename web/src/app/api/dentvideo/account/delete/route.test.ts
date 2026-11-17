import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";
import { ACCOUNT_TEXT } from "@/content/dentvideo-account";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";

let session: { user: { id: string; email: string } | null };
const signOut = vi.fn(async () => ({ error: null }));
const deleteAccount = vi.fn();

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user: session.user,
    db: {
      auth: { signOut },
      from: () => {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: null, error: null }) };
        return q;
      },
    },
  }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors, dvLocale: async () => "en" }));
vi.mock("@/lib/dentvid/supabase", () => ({ dvAdmin: () => ({ admin: true }), BUCKET: "dentvid" }));
vi.mock("@/lib/dentvid/account", () => ({ deleteDentvideoAccount: (...a: unknown[]) => deleteAccount(...a) }));

async function call(body: unknown) {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/account/delete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  session = { user: { id: OWNER, email: "dr@clinic.example" } };
  deleteAccount.mockReset();
  signOut.mockClear();
  vi.stubEnv("DODO_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/dentvideo/account/delete", () => {
  it("needs a signed-in owner and a confirmation", async () => {
    session.user = null;
    expect((await call({ confirm: "x" })).status).toBe(401);
    session.user = { id: OWNER, email: "dr@clinic.example" };
    expect((await call({})).status).toBe(400);
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes only the session's own account (the body cannot name another) and signs out", async () => {
    deleteAccount.mockResolvedValueOnce({ ok: true });
    expect(await call({ confirm: "Riverside Dental", owner_id: "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f", user: { id: "x" } })).toEqual({ status: 200, body: { ok: true } });
    const args = deleteAccount.mock.calls[0][0];
    expect(args.user).toEqual({ id: OWNER, email: "dr@clinic.example" });
    expect(args.confirm).toBe("Riverside Dental");
    expect(args.dodo).toBeNull();
    expect(signOut).toHaveBeenCalled();
  });

  it("passes Dodo cancellation in when DODO_API_KEY is set", async () => {
    vi.stubEnv("DODO_API_KEY", "sk_test");
    deleteAccount.mockResolvedValueOnce({ ok: true });
    await call({ confirm: "Riverside Dental" });
    expect(deleteAccount.mock.calls[0][0].dodo).toMatchObject({ getSubscription: expect.any(Function), cancelSubscription: expect.any(Function) });
  });

  it("maps refusals to calm messages", async () => {
    deleteAccount.mockResolvedValueOnce({ ok: false, reason: "confirm" });
    expect(await call({ confirm: "nope" })).toEqual({ status: 400, body: { error: ACCOUNT_TEXT.en.errors.deleteConfirm } });
    deleteAccount.mockResolvedValueOnce({ ok: false, reason: "subscription_active" });
    expect(await call({ confirm: "x" })).toEqual({ status: 409, body: { error: ACCOUNT_TEXT.en.errors.deleteNeedsCancel, fallback: "email" } });
    deleteAccount.mockResolvedValueOnce({ ok: false, reason: "failed", step: "storage" });
    expect((await call({ confirm: "x" })).status).toBe(500);
    expect(signOut).not.toHaveBeenCalled();
  });
});
