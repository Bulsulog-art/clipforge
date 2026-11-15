import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const MB = 1024 * 1024;
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

let user: { id: string; email: string; app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null;
let clinic: Record<string, unknown> | null;
let files: { path: string; size: number | null; contentType: string | null }[];
const uploaded: { path: string; bytes: number; contentType: string; upsert: boolean }[] = [];
const removed: string[][] = [];

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
        upload: async (path: string, bytes: Uint8Array, o: { contentType: string; upsert: boolean }) => {
          uploaded.push({ path, bytes: bytes.byteLength, contentType: o.contentType, upsert: o.upsert });
          return { data: { path }, error: null };
        },
        remove: async (paths: string[]) => {
          removed.push(paths);
          return { data: [], error: null };
        },
      }),
    },
  }),
}));

function png(size: number): Uint8Array {
  const b = new Uint8Array(size);
  b.set(PNG);
  return b;
}

async function send(body: Uint8Array | string, contentType = "image/png") {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/logo", { method: "POST", headers: { "content-type": contentType }, body: body as BodyInit }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  user = { id: OWNER, email: "dr@clinic.example", app_metadata: { product: "dentvideo" } };
  clinic = { plan: "trial", plan_tier: null, profile: { language: "en" }, logo_path: null };
  files = [];
  uploaded.length = 0;
  removed.length = 0;
});

describe("POST /api/dentvideo/logo", () => {
  it("needs a session and a DentVideo account (app_metadata, not user_metadata)", async () => {
    user = null;
    expect((await send(png(1000))).status).toBe(401);
    user = { id: OWNER, email: "x@y.example", app_metadata: {}, user_metadata: { product: "dentvideo" } };
    expect((await send(png(1000))).status).toBe(403);
    expect(uploaded).toEqual([]);
  });

  it("stores a real PNG under a versioned path the server picks, never overwriting", async () => {
    const r = await send(png(200_000));
    expect(r.status).toBe(200);
    expect(r.body.path).toMatch(new RegExp(`^${OWNER}/logo-\\d{13}\\.png$`));
    expect(uploaded).toEqual([{ path: r.body.path, bytes: 200_000, contentType: "image/png", upsert: false }]);
    clinic = null; // the sign-up wizard uploads before the clinic row exists
    expect((await send(png(1000))).status).toBe(200);
  });

  it("refuses a body over 5 MB while reading it, whatever Content-Length says", async () => {
    // Before: a signed "logo" URL took up to the bucket's 500 MB.
    expect(await send(png(5 * MB + 1))).toMatchObject({ status: 413, body: { code: "size", error: APP_TEXT.en.errors.invalidLogo } });
    expect(uploaded).toEqual([]);
  });

  it("refuses bytes that are not the image type they claim (SVG, HTML, a mismatched type, empty)", async () => {
    expect(await send("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>", "image/svg+xml")).toMatchObject({ status: 400, body: { code: "type" } });
    expect(await send("<html>hi</html>", "image/png")).toMatchObject({ status: 400, body: { code: "type" } });
    expect(await send(png(1000), "image/jpeg")).toMatchObject({ status: 400, body: { code: "type" } });
    expect(await send(new Uint8Array(), "image/png")).toMatchObject({ status: 400 });
    expect(uploaded).toEqual([]);
  });

  it("counts the real size against the quota, after sweeping oversized leftovers", async () => {
    files = [{ path: `${OWNER}/logo-1731081600002.png`, size: 4 * MB, contentType: "image/png" }, ...Array.from({ length: 19 }, (_, i) => ({ path: `${OWNER}/logo-17310816000${10 + i}.png`, size: 1000, contentType: "image/png" }))];
    expect(await send(png(2 * MB))).toMatchObject({ status: 413, body: { code: "quota" } });
    // A 400 MB "logo" left by the old signed-URL path: deleted, then the new logo fits.
    files = [{ path: `${OWNER}/logo-1731081600000.png`, size: 400 * MB, contentType: "image/png" }];
    expect((await send(png(2 * MB))).status).toBe(200);
    expect(removed).toEqual([[`${OWNER}/logo-1731081600000.png`]]);
  });
});
