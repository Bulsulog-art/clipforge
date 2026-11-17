import { describe, expect, it, vi } from "vitest";
import { dodoLookup, purgeAdData, reconcileBilling, revenuecatLookup, RENEWAL_GRACE_MS, type ActiveClinic, type AppleClinic, type ReconcileDb } from "./reconcile.js";
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
      // Cancelled, paid period over → cancelled. Cancelled but paid until tomorrow → kept until then
      // (docs/RELIABILITY.md F9; plan-end.ts ends it at that date).
      { id: "gone", plan_renews_at: new Date(NOW.getTime() - 86_400_000).toISOString(), dodo_subscription_id: "sub_g" },
      { id: "paidup", plan_renews_at: new Date(NOW.getTime() + 86_400_000).toISOString(), dodo_subscription_id: "sub_g" },
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
    expect(f.plans.get("paidup")).toBe("active");
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

describe("ad click retention purge", () => {
  it("runs the 0019 SQL function and returns rows deleted; never throws", async () => {
    const rpc = vi.fn(async () => ({ data: 3, error: null }));
    expect(await purgeAdData({ rpc } as never)).toBe(3);
    expect(rpc).toHaveBeenCalledWith("dentvid_purge_ad_data");
    expect(await purgeAdData({ rpc: async () => ({ data: null, error: { message: "function does not exist" } }) } as never)).toBeNull();
    expect(
      await purgeAdData({
        rpc: async () => {
          throw new Error("network");
        },
      } as never),
    ).toBeNull();
  });
});

describe("App Store clinics (billing_source = apple, web migration 0026)", () => {
  const U = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
  const withApple = (clinics: ActiveClinic[], apple: Record<string, AppleClinic>) => {
    const f = fakeDb(clinics);
    return { ...f, db: { ...f.db, appleClinics: async () => new Map(Object.entries(apple)) } };
  };

  it("never asks Dodo about them; without RevenueCat: a cancelled plan past its end is cancelled, a silent one paused after the grace", async () => {
    const f = withApple(
      [
        { id: "ended", plan_renews_at: due(3600_000), dodo_subscription_id: null },
        { id: "silent", plan_renews_at: due(RENEWAL_GRACE_MS + 3600_000), dodo_subscription_id: null },
        { id: "fresh", plan_renews_at: due(3600_000), dodo_subscription_id: null },
      ],
      { ended: { owner_id: U, status: "cancelled" }, silent: { owner_id: U, status: "active" }, fresh: { owner_id: U, status: "active" } },
    );
    const dodo = vi.fn(async () => ({ status: "cancelled" }));
    const r = await reconcileBilling({ db: f.db, dodo, revenuecat: null, alert: async () => {}, now: NOW });
    expect(dodo).not.toHaveBeenCalled();
    expect(r.appStore).toBe(3);
    expect(r.cancelled).toEqual(["ended"]);
    expect(r.paused).toEqual(["silent"]);
    expect(f.plans.get("fresh")).toBe("active");
    expect(f.ledger).toEqual([]);
  });

  it("with RevenueCat: paid through later → date corrected, never paused; not paid → cancelled and the owner told; no answer → the clock", async () => {
    const f = withApple(
      [
        { id: "paid", plan_renews_at: due(RENEWAL_GRACE_MS * 2), dodo_subscription_id: null },
        { id: "gone", plan_renews_at: new Date(NOW.getTime() + 86_400_000).toISOString(), dodo_subscription_id: null },
        { id: "unknown", plan_renews_at: due(RENEWAL_GRACE_MS + 3600_000), dodo_subscription_id: null },
      ],
      { paid: { owner_id: "u-paid", status: "active" }, gone: { owner_id: "u-gone", status: "active" }, unknown: { owner_id: "u-unknown", status: "active" } },
    );
    const later = new Date(NOW.getTime() + 20 * 86_400_000).toISOString();
    const rc = async (id: string) => (id === "u-paid" ? { active: true, expiresAt: later } : id === "u-gone" ? { active: false, expiresAt: due(86_400_000) } : null);
    const raised: OwnerAlert[] = [];
    const r = await reconcileBilling({ db: f.db, dodo: null, revenuecat: rc, alert: async (a) => void raised.push(a), now: NOW });
    expect(r.corrected).toEqual(["paid"]);
    expect(f.renews.get("paid")).toBe(later);
    expect(r.cancelled).toEqual(["gone"]);
    expect(r.paused).toEqual(["unknown"]);
    expect(raised.map((a) => a.key)).toEqual([expect.stringMatching(/^lapsed:gone:/), expect.stringMatching(/^lapsed:unknown:/)]);
  });

  it("revenuecatLookup is off without the flag or the key, and reads the latest expiry of DentVideo's products only", async () => {
    expect(revenuecatLookup({ DENTVID_REVENUECAT_API_KEY: "sk_x" })).toBeNull();
    expect(revenuecatLookup({ DENTVID_REVENUECAT_RECONCILE: "on" })).toBeNull();
    const calls: string[] = [];
    const fetchImpl = (async (url: string, init: { headers: Record<string, string> }) => {
      calls.push(`${url} ${init.headers.Authorization}`);
      return new Response(
        JSON.stringify({
          subscriber: {
            subscriptions: {
              dentvideo_starter_monthly: { expires_date: "2026-11-01T00:00:00Z" },
              dentvideo_practice_monthly: { expires_date: "2026-11-25T00:00:00Z", grace_period_expires_date: null },
              clipforge_pro_monthly: { expires_date: "2027-06-01T00:00:00Z" },
            },
          },
        }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const rc = revenuecatLookup({ DENTVID_REVENUECAT_API_KEY: "sk_x", DENTVID_REVENUECAT_RECONCILE: "on" }, fetchImpl, () => NOW)!;
    expect(await rc(U)).toEqual({ active: true, expiresAt: "2026-11-25T00:00:00.000Z" });
    expect(calls).toEqual([`https://api.revenuecat.com/v1/subscribers/${U} Bearer sk_x`]);
    // Not a Liman id: never sent anywhere.
    expect(await rc("../../v1/projects")).toBeNull();
    const failing = revenuecatLookup({ DENTVID_REVENUECAT_API_KEY: "sk_x", DENTVID_REVENUECAT_RECONCILE: "on" }, (async () => new Response("no", { status: 500 })) as unknown as typeof fetch)!;
    expect(await failing(U)).toBeNull();
  });

  it("a refunded subscription is not paid", async () => {
    const fetchImpl = (async () => new Response(JSON.stringify({ subscriber: { subscriptions: { dentvideo_practice_monthly: { expires_date: "2026-12-25T00:00:00Z", refunded_at: "2026-11-19T00:00:00Z" } } } }), { status: 200 })) as unknown as typeof fetch;
    const rc = revenuecatLookup({ DENTVID_REVENUECAT_API_KEY: "sk_x", DENTVID_REVENUECAT_RECONCILE: "on" }, fetchImpl, () => NOW)!;
    expect(await rc(U)).toEqual({ active: false, expiresAt: null });
  });
});
