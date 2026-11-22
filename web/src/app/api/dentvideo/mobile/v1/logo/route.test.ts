import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { APP_TEXT } from "@/content/dentvideo-app";

/**
 * POST mobile/v1/logo: the iPhone app's "See it with your logo". The bytes go through the web's own
 * logo handler (handlers/logo-upload.ts, the same rules as POST /api/dentvideo/logo) and the path is
 * attached with the web's clinic handler (handlers/clinic-save.ts). The bearer checks themselves are
 * in mobile.test.ts (every attack shape against every mobile route, this one included).
 */

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const MB = 1024 * 1024;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

let user: { id: string; email: string; app_metadata: Record<string, unknown> };
let clinic: { id: string; profile: Record<string, unknown>; logo_path: string | null } | null;
let files: { path: string; size: number | null; contentType: string | null }[];
let saveAnswer: () => NextResponse;
const uploaded: string[] = [];
const removed: string[][] = [];
const saves: { profile: unknown; logoPath: unknown; contentType: string | null }[] = [];

vi.mock("@/lib/dentvid/mobile-auth", () => ({
  withMobileSession: async (req: Request, run: (s: unknown) => Promise<Response>) => {
    if (req.headers.get("authorization") !== "Bearer good") return NextResponse.json({ code: "unauthorized" }, { status: 401 });
    const db = {
      from: () => {
        const q = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: clinic ? { profile: clinic.profile, plan: "trial", plan_tier: null, logo_path: clinic.logo_path } : null, error: null }) };
        return q;
      },
      storage: { from: () => ({ createSignedUrl: async (p: string) => ({ data: { signedUrl: `https://liman.example/sign/${p}?t=1` }, error: null }) }) },
    };
    const res = await run({ db, user, token: "good" });
    res.headers.set("cache-control", "no-store");
    return res;
  },
}));
vi.mock("@/lib/dentvid/mobile", () => ({ loadOwnClinic: async () => clinic }));
vi.mock("@/lib/dentvid/handlers/clinic-save", () => ({
  saveClinic: async (_actor: unknown, req: Request) => {
    const body = (await req.json()) as { profile: unknown; logoPath: unknown };
    saves.push({ profile: body.profile, logoPath: body.logoPath, contentType: req.headers.get("content-type") });
    return saveAnswer();
  },
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null }));
vi.mock("@/lib/dentvid/account", () => ({ listOwnerFiles: async () => files }));
vi.mock("@/lib/dentvid/supabase", () => ({
  BUCKET: "dentvid",
  dvAdmin: () => ({
    storage: {
      from: () => ({
        upload: async (path: string) => (uploaded.push(path), { data: { path }, error: null }),
        remove: async (paths: string[]) => (removed.push(paths), { data: [], error: null }),
      }),
    },
  }),
}));

function png(size: number): Uint8Array {
  const b = new Uint8Array(size);
  b.set(PNG);
  return b;
}

async function send(body: Uint8Array | string, opts: { contentType?: string; token?: string | null } = {}) {
  const { POST } = await import("./route");
  const headers: Record<string, string> = { "content-type": opts.contentType ?? "image/png" };
  if (opts.token !== null) headers.authorization = `Bearer ${opts.token ?? "good"}`;
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/mobile/v1/logo", { method: "POST", headers, body: body as BodyInit }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown>, headers: res.headers };
}

beforeEach(() => {
  user = { id: OWNER, email: "dr@clinic.example", app_metadata: { product: "dentvideo" } };
  clinic = { id: "clinic-1", profile: { name: "Sample Dental Practice", country: "DE", language: "de", services: ["Implantate"], brandColor: "0F5C5C" }, logo_path: null };
  files = [];
  saveAnswer = () => NextResponse.json({ id: "clinic-1" });
  uploaded.length = 0;
  removed.length = 0;
  saves.length = 0;
});

describe("POST mobile/v1/logo", () => {
  it("stores the logo with the web's rules and attaches it to the caller's own clinic, with its stored profile", async () => {
    const r = await send(png(120_000));
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    expect(r.body.path).toMatch(new RegExp(`^${OWNER}/logo-\\d{13}\\.png$`));
    expect(r.body).toMatchObject({ contentType: "image/png", logoUrl: `https://liman.example/sign/${r.body.path}?t=1` });
    expect(uploaded).toEqual([r.body.path]);
    // The web's clinic handler gets the clinic's own profile (unchanged) and the path the server picked.
    expect(saves).toEqual([{ profile: clinic!.profile, logoPath: r.body.path, contentType: "application/json" }]);
    expect(removed).toEqual([]);
  });

  it("needs a clinic first: nothing is stored for a login without one", async () => {
    clinic = null;
    expect(await send(png(1000))).toMatchObject({ status: 409, body: { code: "no_clinic" } });
    expect(uploaded).toEqual([]);
    expect(saves).toEqual([]);
  });

  it("refuses what the web's logo route refuses, before anything is attached", async () => {
    expect(await send(png(5 * MB + 1))).toMatchObject({ status: 413, body: { code: "size", maxBytes: 5 * MB } });
    expect(await send("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", { contentType: "image/svg+xml" })).toMatchObject({ status: 400, body: { code: "type" } });
    expect(await send(png(1000), { contentType: "image/jpeg" })).toMatchObject({ status: 400, body: { code: "type" } });
    expect(await send(new Uint8Array(), { contentType: "image/png" })).toMatchObject({ status: 400 });
    files = [{ path: `${OWNER}/logo-1731081600002.png`, size: 4 * MB, contentType: "image/png" }, ...Array.from({ length: 19 }, (_, i) => ({ path: `${OWNER}/logo-17310816000${10 + i}.png`, size: 1000, contentType: "image/png" }))];
    expect(await send(png(2 * MB))).toMatchObject({ status: 413, body: { code: "quota" } });
    expect(uploaded).toEqual([]);
    expect(saves).toEqual([]);
  });

  it("an account of another product cannot store a logo", async () => {
    user = { id: OWNER, email: "x@y.example", app_metadata: { product: "clipforge" } };
    expect((await send(png(1000))).status).toBe(403);
    expect(uploaded).toEqual([]);
  });

  it("when the clinic handler refuses the attach, its answer is passed on and the stored file is removed", async () => {
    saveAnswer = () => NextResponse.json({ error: APP_TEXT.en.errors.invalidLogo, code: "type" }, { status: 400 });
    const r = await send(png(2000));
    expect(r).toMatchObject({ status: 400, body: { code: "type" } });
    expect(uploaded).toHaveLength(1);
    expect(removed).toEqual([[uploaded[0]]]);
    saveAnswer = () => NextResponse.json({ error: "Too many" }, { status: 429 });
    expect((await send(png(2000))).status).toBe(429);
    expect(removed).toHaveLength(2);
  });

  it("without a bearer session: 401 and nothing stored", async () => {
    expect((await send(png(1000), { token: null })).status).toBe(401);
    expect((await send(png(1000), { token: "forged" })).status).toBe(401);
    expect(uploaded).toEqual([]);
    expect(saves).toEqual([]);
  });
});
