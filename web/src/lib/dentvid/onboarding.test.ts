import { describe, expect, it } from "vitest";
import { appSendsToFunnel, asStep, resolveStep, showFirstWeek } from "./onboarding";

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
