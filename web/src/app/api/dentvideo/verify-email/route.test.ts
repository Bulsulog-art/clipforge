import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryKv } from "@/lib/dentvid/verify-email";
import { VERIFY_COPY } from "@/content/dentvideo-auth";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";

type User = { id: string; email: string; app_metadata: Record<string, unknown> };
let user: User | null;
let kv: MemoryKv;
const mails: { to: string; subject: string; text: string }[] = [];
const updates: Record<string, unknown>[] = [];

vi.mock("@/lib/dentvid/auth", () => ({ dvSession: async () => ({ user, db: {} }) }));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvLocale: async () => "en" }));
vi.mock("@/lib/rate-limit-server", () => ({ kvStore: () => kv, rateLimited: async () => null }));
vi.mock("@/lib/dentvid/email", () => ({
  sendEmail: async (to: string, msg: { subject: string; text: string }) => {
    mails.push({ to, subject: msg.subject, text: msg.text });
    return true;
  },
}));
vi.mock("@/lib/dentvid/supabase", () => ({
  DV_SUPABASE_URL: "http://localhost",
  DV_SUPABASE_ANON: "x",
  dvAdmin: () => ({
    auth: {
      admin: {
        getUserById: async () => ({ data: { user }, error: null }),
        updateUserById: async (_id: string, attrs: { email?: string; app_metadata?: Record<string, unknown> }) => {
          updates.push(attrs);
          if (attrs.email === "taken@clinic.example") return { data: null, error: { message: "A user with this email address has already been registered" } };
          if (user && attrs.email) user.email = attrs.email;
          if (user && attrs.app_metadata) user.app_metadata = { ...user.app_metadata, ...attrs.app_metadata };
          return { data: { user }, error: null };
        },
      },
    },
  }),
}));

async function call(body: unknown) {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/verify-email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const lastCode = () => /\b(\d{3}) (\d{3})\b/.exec(mails[mails.length - 1].text)!.slice(1).join("");

beforeEach(() => {
  user = { id: OWNER, email: "dr@clinic.example", app_metadata: { product: "dentvideo" } };
  kv = new MemoryKv();
  mails.length = 0;
  updates.length = 0;
  vi.stubEnv("DENTVID_SERVICE_ROLE_KEY", "service-key");
  vi.stubEnv("RESEND_API_KEY", "re_test");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/dentvideo/verify-email", () => {
  it("needs a session", async () => {
    user = null;
    expect((await call({ action: "send" })).status).toBe(401);
  });

  it("sends a code in the visitor's language and verifies the account with it", async () => {
    const sent = await call({ action: "send", locale: "de" });
    expect(sent).toEqual({ status: 200, body: { ok: true, email: "dr@clinic.example", resendInSec: 60 } });
    expect(mails[0].to).toBe("dr@clinic.example");
    expect(mails[0].subject).toMatch(/^\d{6} ist Ihr DentVideo-Code$/);

    const wrong = await call({ action: "confirm", code: lastCode() === "000000" ? "111111" : "000000" });
    expect(wrong.status).toBe(400);
    expect(wrong.body).toMatchObject({ reason: "wrong", attemptsLeft: 4 });

    const ok = await call({ action: "confirm", code: lastCode() });
    expect(ok).toEqual({ status: 200, body: { ok: true, verified: true, email: "dr@clinic.example" } });
    expect(user!.app_metadata).toMatchObject({ product: "dentvideo", email_verified_for: "dr@clinic.example", email_verified_via: "code" });
    // Done: nothing more is sent.
    expect(await call({ action: "send" })).toMatchObject({ body: { verified: true } });
    expect(mails).toHaveLength(1);
  });

  it("a resend within 60 s is refused; the plan step's on-load ask does not re-send a waiting code", async () => {
    await call({ action: "send" });
    const again = await call({ action: "send" });
    expect(again.status).toBe(429);
    expect(again.body.retryAfter).toBeGreaterThan(0);
    expect(await call({ action: "send", onlyIfNone: true })).toMatchObject({ status: 200, body: { pending: true } });
    expect(mails).toHaveLength(1);
  });

  it("corrects a mistyped address and sends the code there; a taken address is refused", async () => {
    await call({ action: "send" });
    const taken = await call({ action: "change", email: "taken@clinic.example" });
    expect(taken).toEqual({ status: 409, body: { error: VERIFY_COPY.en.emailTaken } });
    const changed = await call({ action: "change", email: "New@Clinic.example" });
    expect(changed).toMatchObject({ status: 200, body: { ok: true, email: "new@clinic.example" } });
    expect(updates).toContainEqual({ email: "new@clinic.example", email_confirm: true });
    expect(mails[mails.length - 1].to).toBe("new@clinic.example");
    expect(await call({ action: "confirm", code: lastCode() })).toMatchObject({ body: { verified: true, email: "new@clinic.example" } });
  });

  it("never swaps the address of a verified account", async () => {
    user!.app_metadata = { email_verified_at: "2026-11-01T00:00:00Z", email_verified_for: "dr@clinic.example" };
    expect(await call({ action: "change", email: "other@clinic.example" })).toMatchObject({ body: { verified: true } });
    expect(updates).toHaveLength(0);
  });
});
