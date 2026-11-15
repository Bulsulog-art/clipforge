import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";
import { MemorySlotStore } from "@/lib/dentvid/upload-slots";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const MB = 1024 * 1024;

let user: { id: string; email: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null;
let clinic: Record<string, unknown> | null;
let files: { path: string; size: number | null; contentType: string | null }[];
let slots: MemorySlotStore | null;
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
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null, uploadSlotStore: async () => slots }));
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
  slots = new MemorySlotStore();
  signed.length = 0;
});

describe("POST /api/dentvideo/upload-url", () => {
  it("needs a session and a DentVideo account (app_metadata, not user_metadata)", async () => {
    user = null;
    expect((await ask(recording)).status).toBe(401);
    user = { id: OWNER, email: "x@y.example", app_metadata: {}, user_metadata: { product: "dentvideo" } };
    expect((await ask(recording)).status).toBe(403);
    expect(signed).toEqual([]);
  });

  it("never signs a logo URL: logos go through /api/dentvideo/logo, where the server bounds the bytes", async () => {
    // A signed URL takes up to the bucket's 500 MB whatever size was declared (audit 2026-11-15).
    expect(await ask(logo)).toMatchObject({ status: 400, body: { code: "logo_route", error: APP_TEXT.en.errors.invalidLogo } });
    clinic = { id: "c1", plan: "active", plan_tier: "practice" };
    expect((await ask(logo)).status).toBe(400);
    expect(signed).toEqual([]);
  });

  it("refuses recordings unless the clinic is active on Practice or Group", async () => {
    expect((await ask(recording)).body).toMatchObject({ needsPlan: true, error: APP_TEXT.en.errors.planRequired });
    clinic = { id: "c1", plan: "active", plan_tier: "starter" };
    expect(await ask(recording)).toMatchObject({ status: 402, body: { error: APP_TEXT.en.errors.recordingsNeedPractice } });
    clinic = null;
    expect(await ask(recording)).toMatchObject({ status: 400, body: { error: APP_TEXT.en.errors.setupFirst } });
    clinic = { id: "c1", plan: "active", plan_tier: "practice" };
    const ok = await ask(recording);
    expect(ok.status).toBe(200);
    expect(ok.body.path).toMatch(new RegExp(`^${OWNER}/recordings/\\d{13}\\.mov$`));
    expect(signed).toHaveLength(1);
  });

  it("refuses wrong types, oversize files and a full folder", async () => {
    clinic = { id: "c1", plan: "active", plan_tier: "practice" };
    expect((await ask({ ...recording, contentType: "video/x-msvideo" })).body).toMatchObject({ code: "type" });
    expect((await ask({ ...recording, size: 501 * MB })).body).toMatchObject({ code: "size" });
    files = Array.from({ length: 3000 }, (_, i) => ({ path: `${OWNER}/w/${i}.mp4`, size: 1000, contentType: "video/mp4" }));
    expect(await ask(recording)).toMatchObject({ status: 413, body: { code: "quota" } });
    expect(signed).toEqual([]);
  });

  it("holds only a few unused upload URLs per owner; one whose file arrived frees its slot", async () => {
    clinic = { id: "c1", plan: "active", plan_tier: "practice" };
    const paths: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await ask(recording);
      expect(r.status).toBe(200);
      paths.push(r.body.path as string);
      await new Promise((ok) => setTimeout(ok, 2)); // distinct timestamped paths
    }
    // Before: 30 URLs per 10 minutes, each good for 500 MB, none counted by the quota until used.
    expect(await ask(recording)).toMatchObject({ status: 429, body: { code: "pending" } });
    expect(signed).toHaveLength(3);
    files = [{ path: paths[0], size: 80 * MB, contentType: "video/quicktime" }];
    expect((await ask(recording)).status).toBe(200);
    expect(signed).toHaveLength(4);
  });

  it("without Redis the cap is skipped (fail open, like the rate limits)", async () => {
    clinic = { id: "c1", plan: "active", plan_tier: "practice" };
    slots = null;
    for (let i = 0; i < 5; i++) expect((await ask(recording)).status).toBe(200);
  });
});
