import { beforeEach, describe, expect, it, vi } from "vitest";
import { APP_TEXT } from "@/content/dentvideo-app";

/**
 * Sign-up from a demo link: the clinic step's save copies the demo's logo
 * into the owner's own folder (server side) and credits the clinic to the
 * demo, so a later payment counts for it on /admin/demos.
 */

const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const TOKEN = "Ab3dE5fG7hJ";

let row: Record<string, unknown> | null;
let demo: Record<string, unknown> | null;
const copies: [string, string][] = [];
const events: [string, Record<string, unknown>][] = [];

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
            row = { ...(row ?? { id: "c1" }), ...upsert! };
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
vi.mock("@/lib/dentvid/events-server", () => ({
  recordEvent: async (name: string, opts: Record<string, unknown>) => {
    events.push([name, opts]);
  },
}));
vi.mock("@/lib/dentvid/supabase", () => ({
  BUCKET: "dentvid",
  dvAdmin: () => ({ storage: { from: () => ({ remove: async () => ({ error: null }), list: async () => ({ data: [], error: null }) }) } }),
}));
vi.mock("@/lib/dentvid/demos-server", () => ({
  loadDemoRow: async (t: string) => (t === TOKEN ? demo : null),
  copyDemoLogoTo: async (t: string, uid: string) => {
    const dest = `${uid}/logo-1762862400000.png`;
    copies.push([t, dest]);
    return dest;
  },
}));

const profile = { name: "Gülümse Diş Kliniği", city: "İzmir", country: "TR", language: "tr", services: ["İmplant"], tone: "warm", address: "formal", brandColor: "#1f4e79" };
const attribution = { utm_source: "demo", utm_medium: "dm", utm_campaign: "tr-launch", utm_content: TOKEN };

async function save(extra: Record<string, unknown>) {
  const { POST } = await import("./route");
  const res = await POST(
    new Request("https://dentvideo.com/api/dentvideo/clinic", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile, attribution, ...extra }) }),
  );
  return res.status;
}

beforeEach(() => {
  row = null;
  demo = { token: TOKEN, logo_path: `demos/${TOKEN}.png`, disabled: false, expires_at: new Date(Date.now() + 86_400_000).toISOString() };
  copies.length = 0;
  events.length = 0;
});

describe("clinic save from a demo link", () => {
  it("copies the demo's logo into the owner's folder and credits the demo", async () => {
    expect(await save({ demoToken: TOKEN })).toBe(200);
    expect(copies).toEqual([[TOKEN, `${OWNER}/logo-1762862400000.png`]]);
    expect(row!.logo_path).toBe(`${OWNER}/logo-1762862400000.png`);
    expect(events[0][0]).toBe("clinic_saved");
    expect(events[0][1].props).toMatchObject({ ...attribution, demo: TOKEN, country: "TR", language: "tr" });
  });

  it("keeps a logo the clinic chose or already has", async () => {
    row = { id: "c1", owner_id: OWNER, logo_path: `${OWNER}/logo-1731081600000.png` };
    expect(await save({ demoToken: TOKEN })).toBe(200);
    expect(copies).toEqual([]);
    expect(row!.logo_path).toBe(`${OWNER}/logo-1731081600000.png`);
  });

  it("does not copy from an expired or switched-off demo, but still credits it", async () => {
    demo = { ...demo, disabled: true };
    expect(await save({ demoToken: TOKEN })).toBe(200);
    expect(copies).toEqual([]);
    expect(events[0][1].props).toMatchObject({ demo: TOKEN });
  });

  it("ignores an unknown token and refuses a malformed one", async () => {
    expect(await save({ demoToken: "Zx7Cv3Bn6Mq" })).toBe(200);
    expect(copies).toEqual([]);
    expect(events[0][1].props).not.toHaveProperty("demo");
    expect(await save({ demoToken: "../../etc" })).toBe(400);
  });
});
