import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const MB = 1024 * 1024;

let user: { id: string; email: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null;
let clinic: Record<string, unknown> | null;
let files: { path: string; size: number | null; contentType: string | null }[];
const signed: string[] = [];

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user,
    db: {
      from: () => {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: clinic, error: null }) };
        return q;
      },
    },
  }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null }));
vi.mock("@/lib/dentvid/account", () => ({ listOwnerFiles: async () => files }));
vi.mock("@/lib/dentvid/supabase", () => ({
  BUCKET: "dentvid",
  dvAdmin: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: async (path: string) => {
          signed.push(path);
          return { data: { path, token: "tok", signedUrl: `https://liman.example/sign/${path}?token=tok` }, error: null };
        },
      }),
    },
  }),
}));

async function ask(body: Record<string, unknown>) {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/upload-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

const logo = { kind: "logo", name: "Logo.PNG", size: 200_000, contentType: "image/png" };
const recording = { kind: "recording", name: "clip.mov", size: 80 * MB, contentType: "video/quicktime" };

beforeEach(() => {
  user = { id: OWNER, email: "dr@clinic.example", app_metadata: { product: "dentvideo" } };
  clinic = { id: "c1", plan: "trial", plan_tier: null, profile: { language: "en" } };
  files = [];
  signed.length = 0;
});

describe("POST /api/dentvideo/upload-url", () => {
  it("needs a session and a DentVideo account (app_metadata, not user_metadata)", async () => {
    user = null;
    expect((await ask(logo)).status).toBe(401);
    user = { id: OWNER, email: "x@y.example", app_metadata: {}, user_metadata: { product: "dentvideo" } };
    expect((await ask(logo)).status).toBe(403);
    expect(signed).toEqual([]);
  });

  it("signs a versioned logo path in the owner's folder for an unpaid clinic (and before the clinic exists)", async () => {
    const r = await ask(logo);
    expect(r.status).toBe(200);
    expect(r.body.path).toMatch(new RegExp(`^${OWNER}/logo-\\d{13}\\.png$`));
    expect(r.body).toMatchObject({ token: "tok", contentType: "image/png" });
    clinic = null;
    expect((await ask(logo)).status).toBe(200);
  });

  it("refuses recordings unless the clinic is active on Practice or Group", async () => {
    expect((await ask(recording)).body).toMatchObject({ needsPlan: true, error: APP_TEXT.en.errors.planRequired });
    clinic = { id: "c1", plan: "active", plan_tier: "starter" };
    expect(await ask(recording)).toMatchObject({ status: 402, body: { error: APP_TEXT.en.errors.recordingsNeedPractice } });
    clinic = { id: "c1", plan: "active", plan_tier: "practice" };
    const ok = await ask(recording);
    expect(ok.status).toBe(200);
    expect(ok.body.path).toMatch(new RegExp(`^${OWNER}/recordings/\\d{13}\\.mov$`));
    expect(signed).toHaveLength(1);
  });

  it("refuses wrong types, oversize files and a full folder", async () => {
    expect((await ask({ ...logo, contentType: "image/svg+xml" })).body).toMatchObject({ code: "type" });
    expect((await ask({ ...logo, size: 6 * MB })).body).toMatchObject({ code: "size" });
    files = Array.from({ length: 20 }, (_, i) => ({ path: `${OWNER}/logo-${i}.png`, size: 1000, contentType: "image/png" }));
    expect(await ask(logo)).toMatchObject({ status: 413, body: { code: "quota" } });
    expect(signed).toEqual([]);
  });
});
