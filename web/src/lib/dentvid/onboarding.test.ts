import { describe, expect, it } from "vitest";
import { appSendsToFunnel, asStep, billingReturn, needsPlanHistory, resolveStep, showFirstWeek } from "./onboarding";
import { PLAN_REACHED_EVENTS, clinicReachedPlan } from "./events-server";

describe("return from Dodo's payment link", () => {
  // The link has one redirect_url (/app?billing=success); Dodo appends &status= with the outcome.
  it("treats a declined or abandoned payment as a cancelled checkout, not 'payment received'", () => {
    for (const status of ["failed", "cancelled", "expired", "requires_payment_method", "FAILED"]) {
      expect(billingReturn("success", status)).toBe("cancelled");
    }
    // …so a clinic with nothing yet goes back to the plans with the "nothing was charged" note.
    expect(appSendsToFunnel("trial", billingReturn("success", "failed"), 0)).toBe(true);
    expect(showFirstWeek({ plan: "trial", billing: billingReturn("success", "failed"), madeThisWeek: false, everMade: false })).toBe(false);
  });

  it("keeps the success path for a payment that went through or is still being confirmed", () => {
    for (const status of ["succeeded", "active", "processing", "requires_customer_action", undefined, ""]) {
      expect(billingReturn("success", status)).toBe("success");
    }
    expect(billingReturn("cancelled", undefined)).toBe("cancelled");
    expect(billingReturn(undefined, "failed")).toBeUndefined();
  });
});

const step = (s: string) => ({ kind: "step", step: s });

describe("wizard step resolution", () => {
  it("a visitor who is not signed in starts at the account step, whatever they ask for", () => {
    expect(resolveStep({ signedIn: false, hasClinic: false })).toEqual(step("account"));
    expect(resolveStep({ signedIn: false, hasClinic: false, requested: "plan", reached: "plan" })).toEqual(step("account"));
  });

  it("signed in without a clinic: the clinic step, and never further", () => {
    expect(resolveStep({ signedIn: true, hasClinic: false })).toEqual(step("clinic"));
    expect(resolveStep({ signedIn: true, hasClinic: false, requested: "preview" })).toEqual(step("clinic"));
    expect(resolveStep({ signedIn: true, hasClinic: false, requested: "plan", reached: "plan" })).toEqual(step("clinic"));
    expect(resolveStep({ signedIn: true, hasClinic: false, requested: "account" })).toEqual(step("clinic"));
  });

  it("a returning unpaid clinic lands on its preview, or on the plans if it got that far", () => {
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial" })).toEqual(step("preview"));
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", reached: "preview" })).toEqual(step("preview"));
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", reached: "plan" })).toEqual(step("plan"));
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", reached: "nonsense" })).toEqual(step("preview"));
  });

  it("after signing out and in again (the step cookie is gone), a clinic that saw the plans resumes there", () => {
    // Sign-out clears dv-step; the clinic's recorded plan visit still says how far it got.
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", reached: null, reachedPlan: true })).toEqual(step("plan"));
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: null, reachedPlan: true })).toEqual(step("plan"));
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", reached: null, reachedPlan: false })).toEqual(step("preview"));
    // Never past what was done: no clinic, no plan step.
    expect(resolveStep({ signedIn: true, hasClinic: false, reachedPlan: true })).toEqual(step("clinic"));
    // A link that asks for a step still wins.
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", requested: "clinic", reachedPlan: true })).toEqual(step("clinic"));
  });

  it("looks the history up only when it decides something", () => {
    expect(needsPlanHistory({ signedIn: true, hasClinic: true, plan: "trial" })).toBe(true);
    expect(needsPlanHistory({ signedIn: true, hasClinic: true, plan: null, reached: "preview" })).toBe(true);
    expect(needsPlanHistory({ signedIn: true, hasClinic: true, plan: "trial", reached: "plan" })).toBe(false);
    expect(needsPlanHistory({ signedIn: true, hasClinic: true, plan: "trial", requested: "preview" })).toBe(false);
    expect(needsPlanHistory({ signedIn: true, hasClinic: true, plan: "trial", requested: "nonsense" })).toBe(true);
    expect(needsPlanHistory({ signedIn: true, hasClinic: false })).toBe(false);
    expect(needsPlanHistory({ signedIn: false, hasClinic: true })).toBe(false);
    expect(needsPlanHistory({ signedIn: true, hasClinic: true, plan: "active" })).toBe(false);
  });

  it("an explicit step wins when it is allowed (back links, edits)", () => {
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", requested: "clinic", reached: "plan" })).toEqual(step("clinic"));
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", requested: "plan" })).toEqual(step("plan"));
    expect(resolveStep({ signedIn: true, hasClinic: true, plan: "trial", requested: "account" })).toEqual(step("preview"));
  });

  it("paying, paused and cancelled clinics go to the app", () => {
    for (const plan of ["active", "paused", "cancelled"]) {
      expect(resolveStep({ signedIn: true, hasClinic: true, plan, requested: "preview" }), plan).toEqual({ kind: "app" });
    }
  });

  it("parses steps strictly", () => {
    expect(asStep("plan")).toBe("plan");
    expect(asStep("PLAN")).toBeNull();
    expect(asStep(undefined)).toBeNull();
  });
});

describe("app home for an unpaid clinic", () => {
  it("sends it back to the funnel unless it just paid or has old videos", () => {
    expect(appSendsToFunnel("trial", undefined, 0)).toBe(true);
    expect(appSendsToFunnel("trial", "cancelled", 0)).toBe(true);
    expect(appSendsToFunnel("trial", "success", 0)).toBe(false);
    expect(appSendsToFunnel("trial", undefined, 5)).toBe(false);
    expect(appSendsToFunnel("active", undefined, 0)).toBe(false);
    expect(appSendsToFunnel("paused", undefined, 0)).toBe(false);
  });

  it("shows the first-week state after payment until the week exists", () => {
    expect(showFirstWeek({ plan: "trial", billing: "success", madeThisWeek: false, everMade: false })).toBe(true); // webhook on its way
    expect(showFirstWeek({ plan: "active", billing: "success", madeThisWeek: false, everMade: false })).toBe(true);
    expect(showFirstWeek({ plan: "active", billing: "success", madeThisWeek: true, everMade: true })).toBe(false);
    expect(showFirstWeek({ plan: "active", madeThisWeek: false, everMade: false })).toBe(true); // came back before the email
    expect(showFirstWeek({ plan: "active", madeThisWeek: false, everMade: true })).toBe(false); // an ordinary week
    expect(showFirstWeek({ plan: "trial", madeThisWeek: false, everMade: false })).toBe(false);
    expect(showFirstWeek({ plan: "paused", billing: "success", madeThisWeek: false, everMade: true })).toBe(false);
  });
});

/** A stand-in for the service-role client: records the query, answers with `rows` or `error`. */
function fakeDb(answer: { data?: unknown[] | null; error?: { code?: string; message?: string } | null } | Error) {
  const calls: Record<string, unknown> = {};
  const q = {
    select: (c: string) => ((calls.select = c), q),
    eq: (k: string, v: string) => ((calls.eq = [k, v]), q),
    in: (k: string, v: string[]) => ((calls.in = [k, v]), q),
    limit: (n: number) => {
      calls.limit = n;
      return answer instanceof Error ? Promise.reject(answer) : Promise.resolve({ data: answer.data ?? null, error: answer.error ?? null });
    },
  };
  const db = { from: (t: string) => ((calls.from = t), q) };
  return { db: db as never, calls };
}

describe("the clinic's recorded plan visit", () => {
  const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";

  it("asks for one plan-step event of this clinic", async () => {
    const { db, calls } = fakeDb({ data: [{ id: 1 }] });
    expect(await clinicReachedPlan(CLINIC, db)).toBe(true);
    expect(calls).toEqual({ from: "dentvid_events", select: "id", eq: ["clinic_id", CLINIC], in: ["name", [...PLAN_REACHED_EVENTS]], limit: 1 });
    expect(PLAN_REACHED_EVENTS).toContain("plan_viewed");
  });

  it("no event, an error or no backend: not known, so the cookie decides", async () => {
    expect(await clinicReachedPlan(CLINIC, fakeDb({ data: [] }).db)).toBe(false);
    expect(await clinicReachedPlan(CLINIC, fakeDb({ error: { message: "boom" } }).db)).toBe(false);
    expect(await clinicReachedPlan(CLINIC, fakeDb(new Error("down")).db)).toBe(false);
    expect(await clinicReachedPlan("", fakeDb({ data: [{ id: 1 }] }).db)).toBe(false);
  });
});
