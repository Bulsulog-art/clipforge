import { describe, expect, it, vi } from "vitest";
import { dodoLookup, reconcileBilling, RENEWAL_GRACE_MS, type ActiveClinic, type ReconcileDb } from "./reconcile.js";
import type { OwnerAlert } from "./ops-alert.js";

const NOW = new Date("2026-11-20T03:17:00Z");

function fakeDb(clinics: ActiveClinic[]) {
  const plans = new Map(clinics.map((c) => [c.id, "active"]));
  const renews = new Map(clinics.map((c) => [c.id, c.plan_renews_at]));
  const ledger: [string, string][] = [];
  const db: ReconcileDb = {
    activeClinics: async () => clinics.filter((c) => plans.get(c.id) === "active"),
    setPlan: async (c, plan) => {
      if (plans.get(c.id) !== "active" || renews.get(c.id) !== c.plan_renews_at) return false;
      plans.set(c.id, plan);
      return true;
    },
    setRenewsAt: async (id, at) => void renews.set(id, at),
    markLedger: async (sub, status) => void ledger.push([sub, status]),
    clinic: async (id) => ({ id, name: `Clinic ${id}` }),
  };
  return { db, plans, renews, ledger };
}

const due = (offsetMs: number) => new Date(NOW.getTime() - offsetMs).toISOString();

describe("nightly billing reconciliation", () => {
  it("no Dodo key: pauses a clinic whose renewal is more than 3 days overdue and alerts the owner; within the grace nothing happens", async () => {
    const f = fakeDb([
      { id: "late", plan_renews_at: due(RENEWAL_GRACE_MS + 3600_000), dodo_subscription_id: "sub_late" },
      { id: "grace", plan_renews_at: due(RENEWAL_GRACE_MS - 3600_000), dodo_subscription_id: "sub_grace" },
      { id: "future", plan_renews_at: new Date(NOW.getTime() + 86_400_000).toISOString(), dodo_subscription_id: "sub_f" },
      { id: "nodate", plan_renews_at: null, dodo_subscription_id: null },
    ]);
    const raised: OwnerAlert[] = [];
    const r = await reconcileBilling({ db: f.db, dodo: null, alert: async (a) => raised.push(a), now: NOW });
    expect(r.paused).toEqual(["late"]);
    expect(f.plans.get("late")).toBe("paused");
    expect(f.plans.get("grace")).toBe("active");
    expect(f.ledger).toEqual([["sub_late", "lapsed"]]);
    expect(raised.map((a) => a.key)).toEqual([expect.stringMatching(/^lapsed:late:/)]);
  });

  it("with Dodo: active with a later billing date → the date is corrected, never paused; ended → access stops", async () => {
    const f = fakeDb([
      { id: "renewed", plan_renews_at: due(RENEWAL_GRACE_MS * 2), dodo_subscription_id: "sub_r" },
      { id: "gone", plan_renews_at: new Date(NOW.getTime() + 86_400_000).toISOString(), dodo_subscription_id: "sub_g" },
      { id: "hold", plan_renews_at: due(0), dodo_subscription_id: "sub_h" },
    ]);
    const next = "2026-12-20T00:00:00.000Z";
    const dodo = vi.fn(async (id: string) => (id === "sub_r" ? { status: "active", next_billing_date: next } : id === "sub_g" ? { status: "cancelled" } : { status: "on_hold" }));
    const alert = vi.fn(async () => "sent");
    const r = await reconcileBilling({ db: f.db, dodo, alert, now: NOW });
    expect(r.corrected).toEqual(["renewed"]);
    expect(f.renews.get("renewed")).toBe(next);
    expect(f.plans.get("renewed")).toBe("active");
    expect(r.cancelled).toEqual(["gone"]);
    expect(r.paused).toEqual(["hold"]);
    expect(alert).toHaveBeenCalledTimes(2);
  });

  it("Dodo unreachable falls back to the clock", async () => {
    const f = fakeDb([{ id: "late", plan_renews_at: due(RENEWAL_GRACE_MS + 1000), dodo_subscription_id: "sub_late" }]);
    const r = await reconcileBilling({ db: f.db, dodo: async () => null, alert: async () => "sent", now: NOW });
    expect(r.paused).toEqual(["late"]);
  });

  it("a webhook that renewed the clinic mid-run wins (conditional update)", async () => {
    const c = { id: "late", plan_renews_at: due(RENEWAL_GRACE_MS + 1000), dodo_subscription_id: "sub_late" };
    const f = fakeDb([c]);
    f.renews.set("late", "2026-12-20T00:00:00.000Z"); // the renewal landed after the list was read
    const r = await reconcileBilling({ db: { ...f.db, activeClinics: async () => [c] }, dodo: null, alert: async () => "sent", now: NOW });
    expect(r.paused).toEqual([]);
    expect(f.plans.get("late")).toBe("active");
  });

  it("dodoLookup: off without a key, and never builds a URL from an odd id", async () => {
    expect(dodoLookup({})).toBeNull();
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ status: "active", next_billing_date: "2026-12-01T00:00:00Z" })));
    const look = dodoLookup({ DODO_API_KEY: "k", DODO_ENVIRONMENT: "live" }, fetchImpl as unknown as typeof fetch)!;
    expect(await look("../payments")).toBeNull();
    expect(await look("sub_1")).toEqual({ status: "active", next_billing_date: "2026-12-01T00:00:00Z" });
    expect((fetchImpl.mock.calls[0] as unknown[])[0]).toBe("https://live.dodopayments.com/subscriptions/sub_1");
  });
});
