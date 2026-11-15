import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AD_CONVERSIONS, paidConversionValue, acceptableClick, conversionsCsv, googleTime, rowsFor, withinWindow, type AdConversionRow } from "./ad-conversions";
import { markExported, purgeAdData, recordPaidConversion, recordSignupClick } from "./ad-conversions-server";
import { CLICK_TTL_MS } from "./ad-click";
import { ownerIsInternal } from "./internal-server";

const NOW = new Date("2026-11-15T10:00:00Z");
const DAY = 86_400_000;
const OWNER = "0b0f6f7e-1111-4222-8333-944444444444";
const CLINIC = "11111111-2222-3333-4444-555555555555";

const row = (o: Partial<AdConversionRow> = {}): AdConversionRow => ({
  id: 1,
  owner_id: OWNER,
  clinic_id: null,
  conversion_name: "dv_signup",
  conversion_time: "2026-11-14T09:05:07.123Z",
  value: "5.00",
  currency: "USD",
  click_type: "gclid",
  click_id: "Cj0KCQiA_test-gclid",
  consent: "granted",
  clicked_at: "2026-11-14T08:59:00Z",
  exported_at: null,
  created_at: "2026-11-14T09:05:07Z",
  ...o,
});

describe("which clicks the server keeps", () => {
  const click = { type: "gclid", id: "Cj0KCQiA_test-gclid", at: NOW.getTime() - 60_000, consent: "not_required" };

  it("outside the consent countries: no prompt needed", () => {
    expect(acceptableClick(click, "TR", NOW.getTime())).toMatchObject({ id: click.id, consent: "not_required" });
  });

  it("in the EU/EEA/UK/CH, or with an unknown country, only a click the visitor accepted", () => {
    for (const c of ["DE", "AT", "GB", "CH", undefined]) expect(acceptableClick(click, c, NOW.getTime()), String(c)).toBeNull();
    expect(acceptableClick({ ...click, consent: "granted" }, "DE", NOW.getTime())).toMatchObject({ consent: "granted" });
  });

  it("never a malformed or stale click", () => {
    expect(acceptableClick({ ...click, id: "x" }, "TR", NOW.getTime())).toBeNull();
    expect(acceptableClick({ ...click, at: NOW.getTime() - CLICK_TTL_MS - 1 }, "TR", NOW.getTime())).toBeNull();
    expect(acceptableClick(undefined, "TR", NOW.getTime())).toBeNull();
  });
});

describe("Google Ads upload file", () => {
  it("values: dv_signup 5 USD, dv_paid 250 USD (150 for a clinic in Türkiye)", () => {
    expect(AD_CONVERSIONS).toEqual({ dv_signup: { value: 5, currency: "USD" }, dv_paid: { value: 250, currency: "USD" } });
    expect(paidConversionValue("TR")).toBe(150);
    expect(paidConversionValue(" tr ")).toBe(150);
    expect(paidConversionValue("DE")).toBe(250);
    expect(paidConversionValue("US")).toBe(250);
    expect(paidConversionValue(null)).toBe(250);
  });

  it("follows the click-conversion template: TimeZone line, header, UTC times", () => {
    const csv = conversionsCsv("gclid", [row(), row({ id: 2, conversion_name: "dv_paid", value: 100, consent: "not_required", conversion_time: "2026-11-15T00:00:00Z", clinic_id: CLINIC })]);
    expect(csv.split("\r\n")).toEqual([
      "Parameters:TimeZone=+0000",
      "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Ad User Data,Ad Personalization",
      "Cj0KCQiA_test-gclid,dv_signup,2026-11-14 09:05:07,5.00,USD,GRANTED,",
      "Cj0KCQiA_test-gclid,dv_paid,2026-11-15 00:00:00,100.00,USD,,",
      "",
    ]);
  });

  it("the gbraid / wbraid file puts each id in its own column", () => {
    const csv = conversionsCsv("braid", [row({ click_type: "gbraid", click_id: "gbraid-abc123" }), row({ id: 2, click_type: "wbraid", click_id: "wbraid-xyz789" })]);
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toBe("GBRAID,WBRAID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Ad User Data,Ad Personalization");
    expect(lines[2]).toBe("gbraid-abc123,,dv_signup,2026-11-14 09:05:07,5.00,USD,GRANTED,");
    expect(lines[3]).toBe(",wbraid-xyz789,dv_signup,2026-11-14 09:05:07,5.00,USD,GRANTED,");
  });

  it("each file gets its own click type, and nothing past Google's 90-day window", () => {
    const rows = [row({ id: 1 }), row({ id: 2, click_type: "wbraid" }), row({ id: 3, clicked_at: new Date(NOW.getTime() - 91 * DAY).toISOString() })];
    expect(rowsFor("gclid", rows, NOW).map((r) => r.id)).toEqual([1]);
    expect(rowsFor("braid", rows, NOW).map((r) => r.id)).toEqual([2]);
  });

  it("time and window helpers", () => {
    expect(googleTime("2026-01-02T03:04:05.999Z")).toBe("2026-01-02 03:04:05");
    expect(withinWindow(NOW.getTime() - 89 * DAY, NOW)).toBe(true);
    expect(withinWindow(NOW.getTime() - 91 * DAY, NOW)).toBe(false);
    expect(withinWindow(NOW.getTime() + DAY, NOW)).toBe(false);
    expect(withinWindow("not a date", NOW)).toBe(false);
  });
});

/** A minimal PostgREST stand-in that records calls; `click` is what dentvid_ad_clicks returns. */
function fakeDb(click: Record<string, unknown> | null = null, error: { message: string; code?: string } | null = null) {
  const calls: { table: string; op: string; values?: unknown; options?: unknown; filters: [string, unknown][] }[] = [];
  const db = {
    from(table: string) {
      const call = { table, op: "select", filters: [] as [string, unknown][] } as (typeof calls)[number];
      calls.push(call);
      const q = {
        select: () => q,
        upsert: (values: unknown, options: unknown) => (Object.assign(call, { op: "upsert", values, options }), q),
        update: (values: unknown) => (Object.assign(call, { op: "update", values }), q),
        eq: (k: string, v: unknown) => (call.filters.push([k, v]), q),
        in: (k: string, v: unknown) => (call.filters.push([k, v]), q),
        is: (k: string, v: unknown) => (call.filters.push([k, v]), q),
        maybeSingle: async () => ({ data: click, error }),
        then: (resolve: (v: unknown) => void) => resolve({ error }),
      };
      return q;
    },
    rpc: vi.fn(async () => ({ data: 4, error: null })),
  };
  return { db: db as unknown as SupabaseClient, calls };
}

describe("recording conversions", () => {
  const click = { type: "gclid" as const, id: "Cj0KCQiA_test-gclid", at: NOW.getTime() - 3_600_000, consent: "granted" as const };

  it("a sign-up stores the click and a dv_signup conversion, one per account", async () => {
    const { db, calls } = fakeDb();
    expect(await recordSignupClick(OWNER, click, NOW, db)).toBe("recorded");
    expect(calls.map((c) => [c.table, c.op])).toEqual([
      ["dentvid_ad_clicks", "upsert"],
      ["dentvid_ad_conversions", "upsert"],
    ]);
    expect(calls[0].values).toMatchObject({ owner_id: OWNER, click_type: "gclid", click_id: click.id, consent: "granted" });
    expect(calls[0].options).toEqual({ onConflict: "owner_id", ignoreDuplicates: true });
    expect(calls[1].values).toMatchObject({ owner_id: OWNER, conversion_name: "dv_signup", value: 5, currency: "USD", conversion_time: NOW.toISOString() });
    // A retried sign-up or replay is a no-op, never a second conversion.
    expect(calls[1].options).toEqual({ onConflict: "owner_id,conversion_name", ignoreDuplicates: true });
  });

  it("a first payment records dv_paid from the stored click", async () => {
    const { db, calls } = fakeDb({ click_type: "gclid", click_id: click.id, consent: "granted", clicked_at: new Date(click.at).toISOString() });
    expect(await recordPaidConversion(db, { id: CLINIC, owner_id: OWNER }, NOW)).toBe("recorded");
    expect(calls[0].filters).toEqual([["owner_id", OWNER]]);
    expect(calls[1]).toMatchObject({ table: "dentvid_clinics", filters: [["id", CLINIC]] });
    expect(calls[2].values).toMatchObject({ owner_id: OWNER, clinic_id: CLINIC, conversion_name: "dv_paid", value: 250, currency: "USD" });
    expect(calls[2].options).toEqual({ onConflict: "owner_id,conversion_name", ignoreDuplicates: true });
  });

  it("an internal owner's first payment never becomes a dv_paid conversion, even with a click stored", async () => {
    const { db, calls } = fakeDb({ click_type: "gclid", click_id: click.id, consent: "granted", clicked_at: new Date(click.at).toISOString() });
    const isInternal = vi.fn(async () => true);
    expect(await recordPaidConversion(db, { id: CLINIC, owner_id: OWNER }, NOW, isInternal)).toBe("internal");
    expect(isInternal).toHaveBeenCalledWith(db, OWNER);
    expect(calls).toEqual([]);
  });

  it("the owner lookup: pattern or app_metadata.internal; a failed lookup counts as external (never blocks a real conversion)", async () => {
    const users: Record<string, { email: string; app_metadata: Record<string, unknown> }> = {
      qa: { email: "qa+pay@bulsulabs.com", app_metadata: {} },
      flagged: { email: "x@example.org", app_metadata: { internal: true } },
      clinic: { email: "dr@praxis.example", app_metadata: { product: "dentvideo" } },
    };
    const db = {
      auth: {
        admin: {
          getUserById: async (id: string) => {
            if (id === "boom") throw new Error("down");
            return users[id] ? { data: { user: { id, ...users[id] } }, error: null } : { data: { user: null }, error: { message: "not found" } };
          },
        },
      },
    } as unknown as SupabaseClient;
    expect(await ownerIsInternal(db, "qa")).toBe(true);
    expect(await ownerIsInternal(db, "flagged")).toBe(true);
    expect(await ownerIsInternal(db, "clinic")).toBe(false);
    expect(await ownerIsInternal(db, "missing")).toBe(false);
    expect(await ownerIsInternal(db, "boom")).toBe(false);
    expect(await ownerIsInternal(db, null)).toBe(false);
  });

  it("a first payment from a clinic in Türkiye is valued at 150 USD", async () => {
    const { db, calls } = fakeDb({ click_type: "gclid", click_id: click.id, consent: "granted", clicked_at: new Date(click.at).toISOString(), profile: { country: "TR" } });
    expect(await recordPaidConversion(db, { id: CLINIC, owner_id: OWNER }, NOW)).toBe("recorded");
    expect(calls[2].values).toMatchObject({ conversion_name: "dv_paid", value: 150, currency: "USD" });
  });

  it("no click, a stale click or a missing table: nothing recorded, nothing thrown", async () => {
    expect(await recordPaidConversion(fakeDb(null).db, { id: CLINIC, owner_id: OWNER }, NOW)).toBe("no click");
    const old = { click_type: "gclid", click_id: click.id, consent: "granted", clicked_at: new Date(NOW.getTime() - 100 * DAY).toISOString() };
    const stale = fakeDb(old);
    expect(await recordPaidConversion(stale.db, { id: CLINIC, owner_id: OWNER }, NOW)).toBe("outside window");
    expect(stale.calls).toHaveLength(1);
    const missing = fakeDb(null, { code: "42P01", message: 'relation "dentvid_ad_clicks" does not exist' });
    expect(await recordPaidConversion(missing.db, { id: CLINIC, owner_id: OWNER }, NOW)).toBe("failed");
    expect(await recordSignupClick(OWNER, click, NOW, missing.db)).toBe("failed");
  });

  it("export marks only pending rows; purge runs the 0019 function", async () => {
    const { db, calls } = fakeDb();
    expect(await markExported([3, 4], NOW, db)).toBe(true);
    expect(calls[0]).toMatchObject({ table: "dentvid_ad_conversions", op: "update", values: { exported_at: NOW.toISOString() } });
    expect(calls[0].filters).toEqual([
      ["id", [3, 4]],
      ["exported_at", null],
    ]);
    expect(await markExported([], NOW, db)).toBe(true);
    expect(await purgeAdData(db)).toBe(4);
  });
});
