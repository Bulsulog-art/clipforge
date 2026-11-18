import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkoutBlockMessage, loadAppBillingPanel, loadCheckoutBlock } from "./billing-state";
import { APP_STORE_COPY } from "@/content/dentvideo-app-store";

vi.mock("./dodo-account", () => ({ dodoApiKey: () => null, dodoGetSubscription: vi.fn() }));

/** The web never opens a Dodo checkout for a clinic the App Store pays for (no double subscription across channels). */

function admin(clinic: Record<string, unknown> | null, opts: { noColumns?: boolean } = {}) {
  return {
    from(table: string) {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        limit: async () => ({ data: [], error: null }),
        maybeSingle: async () => {
          if (table === "dentvid_clinics" && opts.noColumns) return { data: null, error: { code: "42703", message: "column dentvid_clinics.billing_source does not exist" } };
          return { data: table === "dentvid_clinics" ? clinic : null, error: null };
        },
      };
      return q;
    },
  } as unknown as SupabaseClient;
}

describe("checkout refusal for App Store plans", () => {
  it("an active or paused App Store plan refuses a web checkout with 'managed in the App Store'", async () => {
    for (const plan of ["active", "paused"]) {
      const block = await loadCheckoutBlock({ id: "c1", plan, dodo_subscription_id: null }, admin({ billing_source: "apple", apple_original_transaction_id: "2000000100" }));
      expect(block, plan).toEqual({ code: "app_store" });
    }
    expect(checkoutBlockMessage({ code: "app_store" }, "tr", { selfServe: false, alreadySubscribed: "x" })).toBe(APP_STORE_COPY.tr.refuse);
  });

  it("an App Store plan that ended does not block a web checkout", async () => {
    expect(await loadCheckoutBlock({ id: "c1", plan: "cancelled", dodo_subscription_id: null }, admin({ billing_source: "apple" }))).toBeNull();
  });

  it("a web clinic, and any clinic before migration 0026, keeps the old answers", async () => {
    expect(await loadCheckoutBlock({ id: "c1", plan: "active", dodo_subscription_id: "sub_1" }, admin({ billing_source: "dodo" }))).toEqual({ code: "active" });
    expect(await loadCheckoutBlock({ id: "c1", plan: "active", dodo_subscription_id: "sub_1" }, admin(null, { noColumns: true }))).toEqual({ code: "active" });
    expect(await loadCheckoutBlock({ id: "c1", plan: "trial", dodo_subscription_id: null }, admin({ billing_source: null }))).toBeNull();
  });

  it("the app's plan panel for an App Store plan Apple could not renew says to fix it on the iPhone, not to buy", async () => {
    expect(await loadAppBillingPanel({ id: "c1", plan: "paused", dodo_subscription_id: null }, admin({ billing_source: "apple" }))).toEqual({ kind: "app_store" });
  });

  it("every language has the App Store copy, with no price and no web purchase wording", () => {
    expect(Object.keys(APP_STORE_COPY).sort()).toEqual(["ar", "de", "en", "es", "fr", "ja", "pl", "tr"]);
    const keys = Object.keys(APP_STORE_COPY.en).sort();
    for (const [lang, c] of Object.entries(APP_STORE_COPY)) {
      expect(Object.keys(c).sort(), lang).toEqual(keys);
      for (const [k, v] of Object.entries(c)) {
        expect(v.trim().length, `${lang}.${k}`).toBeGreaterThan(3);
        expect(v, `${lang}.${k}`).not.toMatch(/\d{2}|\$|€|\{/);
      }
    }
  });
});
