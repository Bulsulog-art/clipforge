import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

let user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null;
const mails: string[] = [];

vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null }));
vi.mock("@/lib/dentvid/email", () => ({
  sendEmail: async (to: string) => {
    mails.push(to);
    return true;
  },
}));
vi.mock("@/lib/dentvid/supabase", () => ({
  dvAdmin: () => ({ auth: { admin: { generateLink: async () => ({ data: { user, properties: { hashed_token: "h" } }, error: null }) } } }),
}));

async function reset() {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/password-reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "dr@clinic.example" }) }));
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  mails.length = 0;
});

describe("POST /api/dentvideo/password-reset", () => {
  it("mails DentVideo accounts, recognised by app_metadata", async () => {
    user = { app_metadata: { product: "dentvideo" } };
    expect(await reset()).toEqual({ status: 200, body: { ok: true } });
    expect(mails).toEqual(["dr@clinic.example"]);
  });

  it("mails an account another app made with the address (opening the link proves the mailbox), and nobody for an unknown address", async () => {
    user = { app_metadata: { product: "aires" }, user_metadata: { product: "dentvideo" } };
    expect(await reset()).toEqual({ status: 200, body: { ok: true } });
    expect(mails).toHaveLength(1);
    user = null;
    expect(await reset()).toEqual({ status: 200, body: { ok: true } });
    expect(mails).toHaveLength(1);
  });
});
