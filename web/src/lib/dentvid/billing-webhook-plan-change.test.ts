import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { handleDentvideoEvent } from "./billing-webhook";

// Self-serve plan change (/api/dentvideo/billing/change-plan) never writes
// plan_tier itself: Dodo's subscription.plan_changed webhook does. This pins
// that the webhook really moves the tier and does not re-queue a first week.

const CLINIC = "11111111-2222-3333-4444-555555555555";

function fakeDb(clinic: Record<string, unknown>) {
  const updates: Record<string, unknown>[] = [];
  const db = {
    from() {
      const filters: [string, unknown][] = [];
      let patch: Record<string, unknown> | null = null;
      const q = {
        select: () => q,
        update: (p: Record<string, unknown>) => ((patch = p), q),
        eq: (k: string, v: unknown) => (filters.push([k, v]), q),
        maybeSingle: async () => ({ data: filters.every(([k, v]) => clinic[k] === v) ? { ...clinic } : null, error: null }),
        then(resolve: (v: unknown) => void) {
          if (patch) {
            updates.push(patch);
            Object.assign(clinic, patch);
          }
          return resolve({ error: null });
        },
      };
      return q;
    },
  };
  return { db: db as unknown as SupabaseClient, updates, clinic };
}

describe("subscription.plan_changed", () => {
  it("moves an active clinic from Starter to Practice without queueing another first week", async () => {
    const f = fakeDb({ id: CLINIC, owner_id: "o", plan: "active", plan_tier: "starter", dodo_subscription_id: "sub_1", plan_renews_at: "2026-12-01T00:00:00Z" });
    const enqueueWeek = vi.fn();
    const res = await handleDentvideoEvent(
      f.db,
      {
        type: "subscription.plan_changed",
        data: { subscription_id: "sub_1", status: "active", product_id: "pdt_0NrVai0xqpQKU8H3Zj3QN", next_billing_date: "2026-12-01T00:00:00Z", metadata: { app: "dentvideo", clinic_id: CLINIC, plan: "starter" } },
      },
      { enqueueWeek },
    );
    expect(res.status).toBe(200);
    expect(f.clinic.plan_tier).toBe("practice");
    expect(f.clinic.plan).toBe("active");
    expect(enqueueWeek).not.toHaveBeenCalled();
  });
});
