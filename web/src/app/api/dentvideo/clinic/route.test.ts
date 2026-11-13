import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const OTHER = "9f8e7d6c-5b4a-4c3d-8e2f-1a0b9c8d7e6f";

let row: Record<string, unknown> | null;
/** Simulates the 0004 trigger (before 0008): a versioned logo name is quietly refused. */
let oldTrigger = false;
let objects: Map<string, number>;
/** Stored bytes, when a test cares; anything else reads as a PNG. */
let contents: Map<string, Uint8Array>;
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82]);
const removed: string[] = [];
const adminUpdates: Record<string, unknown>[] = [];

const LEGACY = new RegExp(`^${OWNER}/logo\\.[a-z0-9_+-]{1,4}$`);

vi.mock("@/lib/dentvid/auth", () => ({
  dvSession: async () => ({
    user: { id: OWNER, email: "dr@clinic.example" },
    db: {
      from: () => {
        let upsert: Record<string, unknown> | null = null;
        const q = {
          select: () => q,
          eq: () => q,
          maybeSingle: async () => ({ data: row, error: null }),
          upsert: (r: Record<string, unknown>) => ((upsert = r), q),
          single: async () => {
            const next = { ...(row ?? { id: "c1" }), ...upsert! };
            if (oldTrigger && typeof next.logo_path === "string" && !LEGACY.test(next.logo_path)) next.logo_path = row?.logo_path ?? null;
            row = next;
            return { data: row, error: null };
          },
        };
        return q;
      },
    },
  }),
}));
vi.mock("@/lib/dentvid/locale-server", () => ({ dvErrors: async () => APP_TEXT.en.errors }));
vi.mock("@/lib/rate-limit-server", () => ({ rateLimited: async () => null }));
vi.mock("@/lib/dentvid/events-server", () => ({ recordEvent: async () => {} }));
vi.mock("@/lib/dentvid/supabase", () => ({
  BUCKET: "dentvid",
  dvAdmin: () => ({
    from: () => ({
      update: (patch: Record<string, unknown>) => ({
        eq: async () => {
          adminUpdates.push(patch);
          row = { ...row, ...patch };
          return { error: null };
        },
      }),
    }),
    storage: {
      from: () => ({
        list: async (prefix: string, opts: { search: string }) => {
          const p = `${prefix}/${opts.search}`;
          return { data: objects.has(p) ? [{ name: opts.search, id: "x", metadata: { size: objects.get(p) } }] : [], error: null };
        },
        download: async (p: string) => {
          if (!objects.has(p)) return { data: null, error: { message: "Object not found" } };
          return { data: new Blob([new Uint8Array(contents.get(p) ?? PNG)]), error: null };
        },
        remove: async (paths: string[]) => {
          removed.push(...paths);
          for (const p of paths) objects.delete(p);
          return { data: [], error: null };
        },
      }),
    },
  }),
}));

const profile = { name: "Riverside Dental", country: "GB", language: "en", services: ["Implants"], tone: "warm", address: "formal", brandColor: "#0f5c5c" };

async function save(extra: Record<string, unknown>) {
  const { POST } = await import("./route");
  const res = await POST(new Request("https://dentvideo.com/api/dentvideo/clinic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile, ...extra }) }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  row = { id: "c1", owner_id: OWNER, logo_path: `${OWNER}/logo.png` };
  oldTrigger = false;
  objects = new Map([
    [`${OWNER}/logo.png`, 1000],
    [`${OWNER}/logo-1731081600000.png`, 2000],
  ]);
  contents = new Map();
  removed.length = 0;
  adminUpdates.length = 0;
});

describe("POST /api/dentvideo/clinic — replacing the logo", () => {
  it("saves the new versioned logo and deletes the previous file", async () => {
    const r = await save({ logoPath: `${OWNER}/logo-1731081600000.png` });
    expect(r.status).toBe(200);
    expect(row!.logo_path).toBe(`${OWNER}/logo-1731081600000.png`);
    expect(removed).toEqual([`${OWNER}/logo.png`]);
  });

  it("works before migration 0008 too: the path the old trigger refuses is stored with the service role", async () => {
    oldTrigger = true;
    expect((await save({ logoPath: `${OWNER}/logo-1731081600000.png` })).status).toBe(200);
    expect(adminUpdates).toEqual([{ logo_path: `${OWNER}/logo-1731081600000.png` }]);
    expect(row!.logo_path).toBe(`${OWNER}/logo-1731081600000.png`);
    expect(removed).toEqual([`${OWNER}/logo.png`]);
  });

  it("keeps the old logo when only the profile changes", async () => {
    expect((await save({})).status).toBe(200);
    expect(removed).toEqual([]);
  });

  it("refuses another owner's path, a file that was never uploaded, and an oversize logo (deleting it)", async () => {
    expect((await save({ logoPath: `${OTHER}/logo-1731081600000.png` })).status).toBe(400);
    expect((await save({ logoPath: `${OWNER}/logo-1731081699999.png` })).status).toBe(400);
    objects.set(`${OWNER}/logo-1731081600001.png`, 6 * 1024 * 1024);
    expect((await save({ logoPath: `${OWNER}/logo-1731081600001.png` })).body).toMatchObject({ code: "size" });
    expect(removed).toEqual([`${OWNER}/logo-1731081600001.png`]);
    expect(row!.logo_path).toBe(`${OWNER}/logo.png`);
  });

  it("refuses (and deletes) a file named like a logo that is not an image, keeping the old logo", async () => {
    const key = `${OWNER}/logo-1731081600002.png`;
    objects.set(key, 900);
    contents.set(key, new TextEncoder().encode("<!DOCTYPE html><html>not a logo</html>"));
    const r = await save({ logoPath: key });
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ code: "type", error: APP_TEXT.en.errors.invalidLogo });
    expect(removed).toEqual([key]);
    expect(row!.logo_path).toBe(`${OWNER}/logo.png`);
  });

  it("accepts a JPEG or WebP by its bytes, whatever its extension", async () => {
    const key = `${OWNER}/logo-1731081600003.png`;
    objects.set(key, 900);
    contents.set(key, new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]));
    expect((await save({ logoPath: key })).status).toBe(200);
    expect(row!.logo_path).toBe(key);
  });
});
