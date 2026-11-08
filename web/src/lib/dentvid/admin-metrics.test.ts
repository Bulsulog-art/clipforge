import { describe, expect, it } from "vitest";
import {
  billingHints,
  clinicMrr,
  dailyCounts,
  foundingSeats,
  funnel,
  funnelByLocale,
  growth,
  lastRuns,
  latestErrors,
  rate,
  revenue,
  runState,
  stepCount,
  FUNNEL,
  type AdminClinic,
  type AdminEvent,
  type AdminItem,
} from "./admin-metrics";

const NOW = new Date("2026-11-08T15:00:00Z");
const ago = (days: number) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const clinic = (id: string, plan: string, tier: string | null, createdDaysAgo = 40, sub = plan !== "trial"): AdminClinic => ({
  id,
  plan,
  plan_tier: tier,
  created_at: ago(createdDaysAgo),
  dodo_subscription_id: sub ? `sub_${id}` : null,
});

const ev = (name: string, opts: Partial<AdminEvent> & { daysAgo?: number } = {}): AdminEvent => ({
  name,
  locale: opts.locale ?? "en",
  props: opts.props ?? {},
  clinic_id: opts.clinic_id ?? null,
  created_at: ago(opts.daysAgo ?? 1),
});

describe("MRR", () => {
  it("prices each active clinic at its tier's list price", () => {
    expect(clinicMrr({ plan: "active", plan_tier: "starter" })).toBe(49);
    expect(clinicMrr({ plan: "active", plan_tier: "practice" })).toBe(99);
    expect(clinicMrr({ plan: "active", plan_tier: "group" })).toBe(279);
  });

  it("applies the founding price only to Practice monthly known to use the code", () => {
    expect(clinicMrr({ plan: "active", plan_tier: "practice" }, { founding: true })).toBe(49);
    expect(clinicMrr({ plan: "active", plan_tier: "group" }, { founding: true })).toBe(279);
    expect(clinicMrr({ plan: "active", plan_tier: "practice" }, { founding: true, interval: "year" })).toBe(82.5);
  });

  it("yearly is ÷ 12, and only where a yearly price exists", () => {
    expect(clinicMrr({ plan: "active", plan_tier: "practice" }, { interval: "year" })).toBe(990 / 12);
    expect(clinicMrr({ plan: "active", plan_tier: "starter" }, { interval: "year" })).toBe(49);
  });

  it("not active or unknown tier → 0", () => {
    for (const plan of ["trial", "paused", "cancelled"]) expect(clinicMrr({ plan, plan_tier: "practice" })).toBe(0);
    expect(clinicMrr({ plan: "active", plan_tier: null })).toBe(0);
    expect(clinicMrr({ plan: "active", plan_tier: "platinum" })).toBe(0);
  });

  it("sums a book of clinics, with tiers, founding and yearly counted", () => {
    const clinics = [
      clinic("a", "active", "starter"),
      clinic("b", "active", "practice"),
      clinic("c", "active", "practice"),
      clinic("d", "active", "practice"),
      clinic("e", "active", "group"),
      clinic("f", "active", null),
      clinic("g", "cancelled", null),
      clinic("h", "trial", null),
    ];
    const events = [
      ev("checkout_opened", { clinic_id: "c", props: { tier: "practice", interval: "month", founding: true }, daysAgo: 5 }),
      ev("checkout_opened", { clinic_id: "d", props: { tier: "practice", interval: "year", founding: false }, daysAgo: 5 }),
      ev("payment_succeeded", { clinic_id: "d", props: { tier: "practice", interval: "year" }, daysAgo: 4 }),
    ];
    const r = revenue(clinics, billingHints(events));
    expect(r.payingByTier).toEqual({ starter: 1, practice: 3, group: 1, unknown: 1 });
    expect(r.paying).toBe(6);
    // 49 + 99 + 49 (founding) + 82.5 (yearly) + 279 + 0 (unknown tier)
    expect(r.mrrUsd).toBe(558.5);
    expect(r.founding).toBe(1);
    expect(r.yearly).toBe(1);
  });

  it("the latest checkout decides the founding flag", () => {
    const h = billingHints([
      ev("checkout_opened", { clinic_id: "x", props: { founding: true }, daysAgo: 9 }),
      ev("checkout_opened", { clinic_id: "x", props: { founding: false }, daysAgo: 2 }),
    ]);
    expect(h.get("x")).toEqual({ founding: false });
  });
});

describe("growth, conversion and churn", () => {
  it("counts sign-ups by window, conversion of everyone who ever paid, and churn", () => {
    const clinics = [
      { ...clinic("t1", "trial", null), created_at: "2026-11-08T09:00:00Z" }, // today
      clinic("t2", "trial", null, 3),
      clinic("t3", "trial", null, 20),
      clinic("a1", "active", "practice", 5),
      clinic("a2", "active", "group", 60),
      clinic("c1", "cancelled", null, 50),
      clinic("p1", "paused", null, 25),
      clinic("t4", "trial", null, 90, true), // had a subscription once, back to trial
    ];
    const g = growth(clinics, NOW);
    expect(g.signupsToday).toBe(1);
    expect(g.signups7d).toBe(3);
    expect(g.signups30d).toBe(5);
    expect(g.total).toBe(8);
    expect(g.everPaid).toBe(5);
    expect(g.unpaid).toBe(3);
    expect(g.conversion).toBeCloseTo(5 / 8);
    // last 30 days: t1, t2, t3, a1, p1 → one paying now
    expect(g.conversion30d).toBeCloseTo(1 / 5);
    expect(g.cancelled).toBe(1);
    expect(g.paused).toBe(1);
    expect(g.churn).toBeCloseTo(2 / 5);
  });

  it("no clinics → no rates, not NaN", () => {
    const g = growth([], NOW);
    expect(g.conversion).toBeNull();
    expect(g.churn).toBeNull();
    expect(g.conversion30d).toBeNull();
  });

  it("founding seats from Dodo when known, else active Practice clinics", () => {
    const clinics = [clinic("a", "active", "practice"), clinic("b", "active", "practice"), clinic("c", "active", "group"), clinic("d", "cancelled", "practice")];
    expect(foundingSeats(clinics, null)).toEqual({ left: 98, used: 2, source: "estimate" });
    expect(foundingSeats(clinics, 37)).toEqual({ left: 63, used: 37, source: "dodo" });
    expect(foundingSeats(clinics, 140)).toEqual({ left: 0, used: 140, source: "dodo" });
  });

  it("daily counts land in the right UTC day, oldest first", () => {
    expect(dailyCounts(["2026-11-08T00:00:01Z", "2026-11-08T14:00:00Z", "2026-11-07T23:59:59Z", "2026-11-02T12:00:00Z", "2026-10-01T00:00:00Z"], 7, NOW)).toEqual([
      1, 0, 0, 0, 0, 1, 2,
    ]);
  });
});

describe("funnel rates", () => {
  it("rate is a ÷ b, null for an empty denominator", () => {
    expect(rate(1, 4)).toBe(0.25);
    expect(rate(3, 0)).toBeNull();
  });

  it("clinic steps count distinct clinics, anonymous steps every event", () => {
    const def = FUNNEL.find((s) => s.key === "clinic")!;
    expect(stepCount([ev("clinic_saved", { clinic_id: "a" }), ev("clinic_saved", { clinic_id: "a" }), ev("clinic_saved", { clinic_id: "b" })], def)).toBe(2);
    const visit = FUNNEL[0];
    expect(stepCount([ev("landing_view"), ev("landing_view"), ev("signup_completed")], visit)).toBe(2);
  });

  it("step 2 counts only landing teaser previews", () => {
    const def = FUNNEL.find((s) => s.key === "teaser")!;
    expect(stepCount([ev("preview_started", { props: { where: "landing" } }), ev("preview_started", { props: { where: "wizard" }, clinic_id: "a" })], def)).toBe(1);
  });

  it("computes step and overall conversion in the window, per locale", () => {
    const events: AdminEvent[] = [
      ...Array.from({ length: 100 }, () => ev("landing_view", { daysAgo: 2 })),
      ...Array.from({ length: 50 }, () => ev("landing_view", { daysAgo: 20 })), // outside 7 days
      ...Array.from({ length: 20 }, () => ev("preview_started", { props: { where: "landing" }, daysAgo: 2 })),
      ...Array.from({ length: 10 }, () => ev("signup_completed", { daysAgo: 2 })),
      ...["a", "b", "c", "d", "e", "f", "g", "h"].map((c) => ev("clinic_saved", { clinic_id: c, daysAgo: 2 })),
      ...["a", "b", "c", "d"].map((c) => ev("plan_clicked", { clinic_id: c, daysAgo: 2 })),
      ...["a", "b"].map((c) => ev("payment_succeeded", { clinic_id: c, daysAgo: 2 })),
      ...Array.from({ length: 40 }, () => ev("landing_view", { locale: "de", daysAgo: 1 })),
      ev("signup_completed", { locale: "de", daysAgo: 1 }),
    ];
    const f = funnel(events, { days: 7, now: NOW });
    const by = Object.fromEntries(f.map((s) => [s.key, s]));
    expect(by.visit.count).toBe(140);
    expect(by.visit.fromPrev).toBeNull();
    expect(by.teaser.fromPrev).toBeCloseTo(20 / 140);
    expect(by.signup.count).toBe(11);
    expect(by.signup.fromPrev).toBeCloseTo(11 / 20);
    expect(by.clinic.fromPrev).toBeCloseTo(8 / 11);
    expect(by.preview.count).toBe(0);
    expect(by.plan.fromPrev).toBeNull(); // nothing on the step before
    expect(by.paid.fromTop).toBeCloseTo(2 / 140);

    const en = funnel(events, { days: 7, now: NOW, locale: "en" });
    expect(en[0].count).toBe(100);
    expect(funnel(events, { days: 30, now: NOW, locale: "en" })[0].count).toBe(150);

    const rows = funnelByLocale(events, { days: 7, now: NOW });
    expect(rows.map((r) => r.locale)).toEqual(["en", "de"]);
    expect(rows[0]).toMatchObject({ visits: 100, teaser: 20, signups: 10, plans: 4, paid: 2, visitToPaid: 0.02, signupToPaid: 0.2 });
    expect(rows[1]).toMatchObject({ visits: 40, signups: 1, paid: 0, visitToPaid: 0, signupToPaid: 0 });
  });
});

describe("operations", () => {
  const item = (clinic_id: string, week_of: string, status: string, extra: Partial<AdminItem> = {}): AdminItem => ({
    id: `${clinic_id}-${week_of}-${status}-${Math.random()}`,
    clinic_id,
    kind: "generated",
    week_of,
    status,
    approval: "pending",
    updated_at: `${week_of}T10:00:00Z`,
    ...extra,
  });

  it("summarises each clinic's latest week only", () => {
    const runs = lastRuns([
      item("a", "2026-10-26", "failed"),
      item("a", "2026-11-02", "ready", { approval: "approved" }),
      item("a", "2026-11-02", "ready"),
      item("a", "2026-11-02", "flagged"),
      item("a", "2026-11-02", "failed"),
      item("b", "2026-11-02", "working"),
      item("b", "2026-11-02", "ready", { kind: "recording", week_of: "2026-11-09" }),
    ]);
    expect(runs.get("a")).toEqual({ weekOf: "2026-11-02", ready: 2, flagged: 1, failed: 1, making: 0, approved: 1, total: 4 });
    expect(runs.get("b")).toMatchObject({ weekOf: "2026-11-02", making: 1, total: 1 });
    expect(runState(runs.get("a"))).toBe("flagged");
    expect(runState(runs.get("b"))).toBe("making");
    expect(runState(undefined)).toBe("none");
    expect(runState({ weekOf: "x", ready: 0, flagged: 0, failed: 5, making: 0, approved: 0, total: 5 })).toBe("failed");
  });

  it("lists the newest failures first", () => {
    const errs = latestErrors([
      item("a", "2026-10-26", "failed", { error: "old", updated_at: "2026-10-27T00:00:00Z" }),
      item("a", "2026-11-02", "failed", { error: "new", updated_at: "2026-11-03T00:00:00Z" }),
      item("a", "2026-11-02", "ready"),
    ]);
    expect(errs.map((e) => e.error)).toEqual(["new", "old"]);
  });
});
