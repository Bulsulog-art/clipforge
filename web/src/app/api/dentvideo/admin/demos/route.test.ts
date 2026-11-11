import { beforeEach, describe, expect, it, vi } from "vitest";

const ADMIN = "7d3f1c2a-9b8e-4f6d-a1c2-3e4f5a6b7c8d";
const OTHER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);

let user: { id: string } | null;
const created: { input: Record<string, unknown>; logo: { ext: string; bytes: Uint8Array } | null; by: string }[] = [];
const toggled: [string, boolean][] = [];

vi.mock("@/lib/dentvid/auth", () => ({ dvSession: async () => ({ user, db: {} }) }));
vi.mock("@/lib/rate-limit-server", () => ({ limitChecks: async () => ({ ok: true, remaining: 1, retryAfterSec: 0 }) }));
vi.mock("@/lib/dentvid/billing-state", () => ({ adminOrNull: async () => null, foundingForApp: async () => ({ open: true }) }));
vi.mock("@/lib/dentvid/demos-server", () => ({
  createDemo: async (input: Record<string, unknown>, logo: { ext: string; bytes: Uint8Array } | null, by: string) => {
    created.push({ input, logo, by });
    return { ok: true, demo: { token: "Ab3dE5fG7hJ", expires_at: "2027-01-10T12:00:00.000Z" } };
  },
  setDemoDisabled: async (token: string, disabled: boolean) => {
    toggled.push([token, disabled]);
    return true;
  },
}));

function form(fields: Record<string, string>, file?: { bytes: Uint8Array; type: string; name: string }) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  if (file) fd.set("logo", new File([file.bytes as BlobPart], file.name, { type: file.type }));
  return new Request("https://dentvideo.com/api/dentvideo/admin/demos", { method: "POST", body: fd });
}

async function post(fields: Record<string, string>, file?: { bytes: Uint8Array; type: string; name: string }) {
  const { POST } = await import("./route");
  const res = await POST(form(fields, file));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

beforeEach(() => {
  process.env.DENTVIDEO_ADMIN_USER_IDS = ADMIN;
  user = { id: ADMIN };
  created.length = 0;
  toggled.length = 0;
});

describe("admin-only", () => {
  it("answers 404 to signed-out visitors and to signed-in non-admins — and creates nothing", async () => {
    for (const u of [null, { id: OTHER }]) {
      user = u;
      expect((await post({ clinicName: "X", language: "tr" })).status).toBe(404);
      const { PATCH } = await import("./route");
      const res = await PATCH(new Request("https://dentvideo.com/api/dentvideo/admin/demos", { method: "PATCH", body: JSON.stringify({ token: "Ab3dE5fG7hJ", disabled: true }) }));
      expect(res.status).toBe(404);
    }
    expect(created).toEqual([]);
    expect(toggled).toEqual([]);
  });
});

describe("creating a demo", () => {
  it("returns the share link and the two messages in the clinic's language", async () => {
    const r = await post({ clinicName: "Gülümse Diş Kliniği", city: "İzmir", country: "tr", language: "tr", colour: "", campaign: "" });
    expect(r.status).toBe(200);
    expect(r.body.token).toBe("Ab3dE5fG7hJ");
    expect(r.body.url).toMatch(/\/tr\/d\/Ab3dE5fG7hJ$/);
    const m = r.body.messages as { ask: string; link: string };
    expect(m.ask).toContain("Merhaba Gülümse Diş Kliniği ekibi");
    expect(m.ask).not.toContain("https://");
    expect(m.link).toContain(r.body.url as string);
    expect(m.link).toContain("kurucu fiyatı");
    expect(created[0]).toMatchObject({ input: { clinicName: "Gülümse Diş Kliniği", country: "TR", language: "tr", campaign: "tr-launch" }, logo: null, by: ADMIN });
  });

  it("stores an uploaded PNG, refuses a non-image or a file over 2 MB", async () => {
    expect((await post({ clinicName: "X", language: "de" }, { bytes: PNG, type: "image/png", name: "logo.png" })).status).toBe(200);
    expect(created[0].logo?.ext).toBe("png");
    const svg = new TextEncoder().encode("<svg><script>alert(1)</script></svg>");
    expect((await post({ clinicName: "X", language: "de" }, { bytes: svg, type: "image/svg+xml", name: "logo.svg" })).status).toBe(400);
    const big = new Uint8Array(2 * 1024 * 1024 + 10);
    big.set(PNG);
    const r = await post({ clinicName: "X", language: "de" }, { bytes: big, type: "image/png", name: "big.png" });
    expect([400, 413]).toContain(r.status);
    expect(created).toHaveLength(1);
  });

  it("never fetches a logo URL that points at the server's own network", async () => {
    for (const logoUrl of ["https://127.0.0.1/logo.png", "https://169.254.169.254/latest/meta-data", "https://localhost/logo.png", "https://[::1]/x.png", "http://clinic.example/logo.png"]) {
      const r = await post({ clinicName: "X", language: "tr", logoUrl });
      expect(r.status, logoUrl).toBe(400);
    }
    expect(created).toEqual([]);
  });

  it("checks the form", async () => {
    expect((await post({ clinicName: "", language: "tr" })).status).toBe(400);
    expect((await post({ clinicName: "X", language: "xx" })).status).toBe(400);
  });
});

describe("switching a demo off", () => {
  it("lets the admin turn it off and on", async () => {
    const { PATCH } = await import("./route");
    const res = await PATCH(new Request("https://dentvideo.com/api/dentvideo/admin/demos", { method: "PATCH", body: JSON.stringify({ token: "Ab3dE5fG7hJ", disabled: true }) }));
    expect(res.status).toBe(200);
    expect(toggled).toEqual([["Ab3dE5fG7hJ", true]]);
    const bad = await PATCH(new Request("https://dentvideo.com/api/dentvideo/admin/demos", { method: "PATCH", body: JSON.stringify({ token: "../x", disabled: true }) }));
    expect(bad.status).toBe(400);
  });
});
