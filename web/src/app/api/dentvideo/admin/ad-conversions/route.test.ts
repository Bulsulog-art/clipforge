import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AdConversionRow } from "@/lib/dentvid/ad-conversions";

let viewer: { id: string; email: string; sessionId: string; csrf: string } | null = null;
let rows: AdConversionRow[] = [];
let available = true;
const marked: number[][] = [];

vi.mock("@/lib/dentvid/admin-server", () => ({ adminViewer: async () => viewer }));
vi.mock("@/lib/dentvid/ad-conversions-server", () => ({
  listAdConversions: async () => ({ available, rows }),
  markExported: async (ids: number[]) => {
    marked.push(ids);
    return true;
  },
}));

const SECRET = "test-csrf-secret-0123456789";
const ADMIN = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const SESSION = "11111111-2222-3333-4444-555555555555";

async function post(fields: Record<string, string>, headers: Record<string, string> = { origin: "https://dentvideo.com" }) {
  const { POST } = await import("./route");
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return POST(new Request("https://dentvideo.com/api/dentvideo/admin/ad-conversions", { method: "POST", headers, body: form }));
}

const recent = new Date(Date.now() - 3_600_000).toISOString();
const row = (o: Partial<AdConversionRow>): AdConversionRow => ({
  id: 1,
  owner_id: ADMIN,
  clinic_id: null,
  conversion_name: "dv_signup",
  conversion_time: recent,
  value: 5,
  currency: "USD",
  click_type: "gclid",
  click_id: "TEST123",
  consent: "granted",
  clicked_at: recent,
  exported_at: null,
  created_at: recent,
  ...o,
});

describe("POST /api/dentvideo/admin/ad-conversions", () => {
  beforeEach(async () => {
    vi.stubEnv("DENTVIDEO_ADMIN_CSRF_SECRET", SECRET);
    const { csrfToken } = await import("@/lib/dentvid/admin-csrf");
    viewer = { id: ADMIN, email: "owner@example.com", sessionId: SESSION, csrf: csrfToken(ADMIN, SESSION, SECRET) };
    rows = [row({ id: 1 }), row({ id: 2, conversion_name: "dv_paid", value: 100, exported_at: recent }), row({ id: 3, click_type: "wbraid", click_id: "wbraid-abc" })];
    available = true;
    marked.length = 0;
  });

  it("is a plain 404 for everyone but an admin", async () => {
    viewer = null;
    expect((await post({ csrf: "x" })).status).toBe(404);
  });

  it("refuses another site and a missing or wrong CSRF token", async () => {
    expect((await post({ csrf: viewer!.csrf }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ csrf: "wrong" })).status).toBe(403);
    expect(marked).toEqual([]);
  });

  it("downloads the pending gclid rows in Google's template and marks them exported", async () => {
    const res = await post({ csrf: viewer!.csrf, kind: "gclid" });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toMatch(/attachment; filename="dentvideo-google-ads-gclid-\d{4}-\d{2}-\d{2}\.csv"/);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const lines = (await res.text()).trim().split("\r\n");
    expect(lines[0]).toBe("Parameters:TimeZone=+0000");
    expect(lines[1]).toBe("Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Ad User Data,Ad Personalization");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toMatch(/^TEST123,dv_signup,\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},5\.00,USD,GRANTED,$/);
    expect(marked).toEqual([[1]]);
  });

  it("can re-download exported rows without marking them again; the braid file has its own rows", async () => {
    const all = await post({ csrf: viewer!.csrf, kind: "gclid", include: "all" });
    expect((await all.text()).trim().split("\r\n")).toHaveLength(4);
    expect(marked).toEqual([[1]]);
    marked.length = 0;
    const braid = await post({ csrf: viewer!.csrf, kind: "braid" });
    const lines = (await braid.text()).trim().split("\r\n");
    expect(lines[1].startsWith("GBRAID,WBRAID,")).toBe(true);
    expect(lines[2].startsWith(",wbraid-abc,dv_signup,")).toBe(true);
    expect(marked).toEqual([[3]]);
  });

  it("says so when migration 0019 is not applied", async () => {
    available = false;
    expect((await post({ csrf: viewer!.csrf })).status).toBe(503);
  });
});
