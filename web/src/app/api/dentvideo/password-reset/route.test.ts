import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

let user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null;
const mails: string[] = [];

vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
let limited = false;
vi.mock("@/lib/rate-limit-server", async () => {
  const { NextResponse } = await import("next/server");
  return { rateLimited: async (_c: unknown, msg: () => string) => (limited ? NextResponse.json({ error: msg() }, { status: 429 }) : null) };
});
vi.mock("@/lib/dentvid/email", () => ({
  sendEmail: async (to: string) => {
    mails.push(to);
    return true;
  },
}));
vi.mock("@/lib/dentvid/supabase", () => ({
  dvAdmin: () => ({ auth: { admin: { generateLink: async () => ({ data: { user, properties: { hashed_token: "h" } }, error: null }) } } }),
}));

async function reset(extra: Record<string, unknown> = {}) {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/password-reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "dr@clinic.example", ...extra }) }));
  return { status: res.status, body: await res.json() };
}

beforeEach(() => {
  mails.length = 0;
  limited = false;
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

  it("refuses too many requests in the form's language (the form shows it instead of 'the link is on its way')", async () => {
    user = { app_metadata: { product: "dentvideo" } };
    limited = true;
    expect(await reset({ locale: "tr" })).toEqual({ status: 429, body: { error: APP_TEXT.tr.errors.tooMany } });
    expect(await reset({ locale: "xx" })).toEqual({ status: 429, body: { error: APP_TEXT.en.errors.tooMany } });
    expect(mails).toHaveLength(0);
  });
});
