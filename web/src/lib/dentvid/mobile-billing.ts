import type { SupabaseClient, User } from "@supabase/supabase-js";
import { loadClinicPlan } from "./plan";
import { loadOwnClinic } from "./mobile";
import { isEmailVerified } from "./verify-email";
import { adminOrNull, loadCheckoutBlock, loadPlanEnd } from "./billing-state";
import { readClinicSource, supabaseAppleStore } from "./apple-store";
import { APP_STORE_MANAGE_URL, iapProducts, mobileBillingView, type MobileBillingInput, type MobileBillingStatus } from "./apple-billing";

/**
 * GET /api/dentvideo/mobile/v1/billing — what the iPhone app's plan screen and paywall need.
 *
 * Only the session's own clinic (owner_id = user.id). No price ever leaves here: StoreKit shows the
 * storefront's own localized price for each product id. `appUserId` is what the app passes to
 * RevenueCat's Purchases.logIn so the webhook can map the purchase back to this login.
 */
export type MobileBilling = {
  appUserId: string;
  clinicId: string | null;
  plan: { state: string; tier: string | null; source: "dodo" | "apple" | null; renewsAt: string | null; endsAt: string | null } | null;
  status: MobileBillingStatus;
  /** The paywall may be shown: no live subscription in either channel. */
  showPaywall: boolean;
  /** …and a purchase may start now (no blockers). */
  canPurchase: boolean;
  /** Why not yet: the clinic form is not saved, or the email address is not confirmed (same rule as the web's checkout). */
  blockers: ("clinic" | "email_unverified")[];
  /** Where the plan is changed or cancelled: the App Store (with Apple's URL), or the web (no link in the app: guideline 3.1.1). */
  manage: "app_store" | "web" | null;
  manageUrl: string | null;
  products: { tier: "starter" | "practice"; productId: string; entitlement: string }[];
};

export async function mobileBilling(db: SupabaseClient, user: Pick<User, "id" | "email" | "app_metadata" | "user_metadata">, now = new Date()): Promise<MobileBilling> {
  const products = iapProducts();
  const verified = isEmailVerified(user as User);
  const clinic = await loadOwnClinic(db, user.id);
  if (!clinic) {
    const blockers: MobileBilling["blockers"] = ["clinic", ...(verified ? [] : (["email_unverified"] as const))];
    return { appUserId: user.id, clinicId: null, plan: null, status: "none", showPaywall: false, canPurchase: false, blockers, manage: null, manageUrl: null, products };
  }
  const plan = await loadClinicPlan(db, clinic.id);
  const admin = await adminOrNull();
  const row = { id: clinic.id, plan: plan.plan, dodo_subscription_id: plan.subscriptionId ?? null };
  const src = admin ? await readClinicSource(admin, clinic.id) : null;
  const source = plan.source ?? src?.source ?? null;

  let appleStatus: string | null = null;
  if (source === "apple" && admin && src?.appleSubscription) appleStatus = (await supabaseAppleStore(admin).get(src.appleSubscription))?.status ?? null;

  let endsAt: string | null = null;
  if (plan.plan === "active") endsAt = source === "apple" ? (appleStatus === "cancelled" ? plan.renewsAt : null) : await loadPlanEnd(row, admin, now);

  let webBlock: MobileBillingInput["webBlock"] = null;
  if (plan.plan !== "active" && source !== "apple") {
    const b = await loadCheckoutBlock(row, admin, now);
    webBlock = b && b.code !== "app_store" ? b.code : null;
  }

  const view = mobileBillingView({ plan: plan.plan, tier: plan.tier, source, renewsAt: plan.renewsAt, endsAt, adminPaused: !!plan.adminPaused, webBlock, appleStatus });
  const blockers: MobileBilling["blockers"] = verified ? [] : ["email_unverified"];
  return {
    appUserId: user.id,
    clinicId: clinic.id,
    plan: { state: plan.plan, tier: plan.tier, source, renewsAt: plan.renewsAt, endsAt },
    status: view.status,
    showPaywall: view.showPaywall,
    canPurchase: view.showPaywall && blockers.length === 0,
    blockers,
    manage: view.manage,
    manageUrl: view.manage === "app_store" ? APP_STORE_MANAGE_URL : null,
    products,
  };
}
