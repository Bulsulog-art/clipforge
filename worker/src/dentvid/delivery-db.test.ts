import { describe, expect, it } from "vitest";
import { supabaseDeliveryDb } from "./delivery.js";

/** Which clinics the Monday delivery watchdog expects a week for (Liman adapter). */
describe("supabaseDeliveryDb.payingClinics", () => {
  const rows = [
    { id: "a", plan: "active", admin_paused_at: null, profile: { country: "DE" } },
    { id: "p", plan: "active", admin_paused_at: "2026-11-10T10:00:00Z", profile: { country: "DE" } },
    { id: "demo", plan: "active", admin_paused_at: null, review_demo: true, profile: { country: "US" } },
  ];
  const db = {
    from: () => ({
      select: () => ({
        eq: (_col: string, v: string) => ({
          order: () => ({ range: async () => ({ data: rows.filter((r) => r.plan === v), error: null }) }),
        }),
      }),
    }),
  };

  it("leaves out a clinic the owner paused and the App Review demo clinic (no false 'late' alert, no requeue)", async () => {
    const paying = await supabaseDeliveryDb(db as never).payingClinics();
    expect(paying.map((c) => c.id)).toEqual(["a"]);
  });
});
