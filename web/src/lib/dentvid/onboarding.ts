import type { DvPlanState } from "./billing";

/**
 * The paid funnel: account → clinic → live preview → plan (pay). There is no
 * free week; the first real week is made after payment. Pure, so where a
 * returning visitor lands is tested directly.
 */
export const ONBOARDING_STEPS = ["account", "clinic", "preview", "plan"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Remembers the furthest step a visitor reached (set by the wizard in the browser). */
export const STEP_COOKIE = "dv-step";
/** What the landing's "Try it with your logo" teaser hands to the wizard (sessionStorage). */
export const TEASER_KEY = "dv-teaser";

export function asStep(v: string | null | undefined): OnboardingStep | null {
  return (ONBOARDING_STEPS as readonly string[]).includes(v ?? "") ? (v as OnboardingStep) : null;
}

export const stepIndex = (s: OnboardingStep) => ONBOARDING_STEPS.indexOf(s);

export type StepInput = {
  signedIn: boolean;
  hasClinic: boolean;
  /** The clinic's plan, when it has one. */
  plan?: DvPlanState | string | null;
  /** ?step= in the URL (a back link, or the wizard's own navigation). */
  requested?: string | null;
  /** The furthest step reached before (STEP_COOKIE). */
  reached?: string | null;
};

export type StepResolution = { kind: "step"; step: OnboardingStep } | { kind: "app" };

/**
 * Where /start puts a visitor.
 * - Not signed in: the account step.
 * - A clinic that pays, or used to (active / paused / cancelled): the app,
 *   which shows its library and, when needed, the plans.
 * - Otherwise the step asked for, if it is one they may be on (never past
 *   what they have done: no preview without a clinic), else where they left
 *   off: the plan step if they got that far, else the preview.
 */
export function resolveStep(i: StepInput): StepResolution {
  if (!i.signedIn) return { kind: "step", step: "account" };
  if (i.hasClinic && i.plan && i.plan !== "trial") return { kind: "app" };
  const furthest: OnboardingStep = i.hasClinic ? "plan" : "clinic";
  const requested = asStep(i.requested);
  if (requested && requested !== "account" && stepIndex(requested) <= stepIndex(furthest)) return { kind: "step", step: requested };
  if (!i.hasClinic) return { kind: "step", step: "clinic" };
  return { kind: "step", step: asStep(i.reached) === "plan" ? "plan" : "preview" };
}

/**
 * Dodo statuses that mean "nothing was paid". Dodo's payment link sends the
 * clinic back to its one redirect_url (/app?billing=success) whatever
 * happened, appending `status` (and payment_id / subscription_id): a declined
 * card comes back as ?billing=success&status=failed. Unknown or pending
 * statuses ("processing", "requires_customer_action") keep the success path:
 * the webhook may still activate the plan.
 */
const DODO_NOT_PAID = new Set(["failed", "cancelled", "canceled", "expired", "requires_payment_method"]);

/**
 * The ?billing= the app should act on after a return from Dodo: a payment
 * that did not go through counts as a cancelled checkout (back to the plans,
 * "nothing was charged"), never as "payment received".
 */
export function billingReturn(billing: string | null | undefined, status: string | null | undefined): string | undefined {
  const s = (status ?? "").trim().toLowerCase();
  if (billing === "success" && DODO_NOT_PAID.has(s)) return "cancelled";
  return billing ?? undefined;
}

/**
 * The app home for a clinic: should a not-yet-paying visitor be sent back
 * into the funnel? Yes, unless they are just back from paying (the webhook
 * may still be on its way) or have videos from before the free week ended
 * (early test clinics keep their library).
 */
export function appSendsToFunnel(plan: DvPlanState | string | null | undefined, billing: string | null | undefined, itemCount: number): boolean {
  if (plan && plan !== "trial") return false;
  if (billing === "success") return false;
  return itemCount === 0;
}

/**
 * Show the "your first week is being made" state? After a payment (until
 * this week's videos exist), and for a paying clinic that has never had a
 * week made (it came back before the email).
 */
export function showFirstWeek(args: {
  plan: DvPlanState | string | null | undefined;
  billing?: string | null;
  madeThisWeek: boolean;
  everMade: boolean;
  /**
   * For a clinic not active yet: is there evidence a payment happened
   * (billing-state.ts paymentSeen)? Without it ?billing=success alone does
   * not claim the videos are being made. Defaults to true.
   */
  paymentSeen?: boolean;
}): boolean {
  if (args.madeThisWeek) return false;
  if (args.billing === "success") return args.plan === "active" || (args.plan === "trial" && args.paymentSeen !== false);
  return args.plan === "active" && !args.everMade;
}
