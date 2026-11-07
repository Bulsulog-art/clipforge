import { createHmac, timingSafeEqual } from "node:crypto";
import { SUBSCRIPTION_PRODUCTS, CONSUMABLE_PRODUCTS } from "@/lib/revenuecat-products";

/**
 * Dodo Payments — web checkout and webhook helpers.
 *
 * Our catalogue keys (clipforge_plus_weekly, …) stay the single source of
 * truth for what a purchase is worth (lib/revenuecat-products). Dodo has its
 * own product ids (pdt_…); env maps ours to theirs.
 */

export type PlanKey = "clipforge_plus_weekly" | "clipforge_plus_yearly" | "clipforge_credits_topup";

export const DODO_PRODUCT_ENV: Record<PlanKey, string> = {
  clipforge_plus_weekly: "DODO_PRODUCT_PLUS_WEEKLY",
  clipforge_plus_yearly: "DODO_PRODUCT_PLUS_YEARLY",
  clipforge_credits_topup: "DODO_PRODUCT_TOPUP",
};

export function dodoApiBase(env: NodeJS.ProcessEnv = process.env): string {
  return env.DODO_ENVIRONMENT === "live"
    ? "https://live.dodopayments.com"
    : "https://test.dodopayments.com";
}

export function dodoProductId(plan: PlanKey, env: NodeJS.ProcessEnv = process.env): string | null {
  return env[DODO_PRODUCT_ENV[plan]]?.trim() || null;
}

/** Reverse lookup: Dodo product id → what we sell under it. */
export function planForDodoProduct(
  productId: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): PlanKey | null {
  if (!productId) return null;
  for (const plan of Object.keys(DODO_PRODUCT_ENV) as PlanKey[]) {
    if (dodoProductId(plan, env) === productId) return plan;
  }
  return null;
}

export function subscriptionCredits(plan: PlanKey): number | null {
  return SUBSCRIPTION_PRODUCTS[plan]?.credits ?? null;
}

export function topupCredits(plan: PlanKey): number | null {
  return CONSUMABLE_PRODUCTS[plan] ?? null;
}

/**
 * Verify a Dodo webhook. Dodo follows the Standard Webhooks spec:
 *   signed content = `${webhook-id}.${webhook-timestamp}.${raw body}`
 *   key            = base64-decode(secret without its `whsec_` prefix)
 *   header         = space-separated `v1,<base64 HMAC-SHA256>` entries
 * and a timestamp more than 5 minutes off is rejected (replay).
 */
export function verifyDodoWebhook(args: {
  secret: string;
  id: string | null;
  timestamp: string | null;
  signature: string | null;
  body: string;
  nowSec?: number;
  toleranceSec?: number;
}): boolean {
  const { secret, id, timestamp, signature, body } = args;
  if (!secret || !id || !timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const now = args.nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > (args.toleranceSec ?? 300)) return false;

  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();

  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",", 2);
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/**
 * Open a Dodo hosted checkout for one product. Returns the URL to send the
 * customer to. The user id rides along in metadata so the webhook can credit
 * the right account; the email is a fallback for that match.
 */
export async function createDodoCheckout(args: {
  apiKey: string;
  productId: string;
  userId: string;
  email?: string | null;
  plan: PlanKey;
  returnUrl: string;
  env?: NodeJS.ProcessEnv;
}): Promise<string> {
  const res = await fetch(`${dodoApiBase(args.env)}/checkouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      product_cart: [{ product_id: args.productId, quantity: 1 }],
      ...(args.email ? { customer: { email: args.email } } : {}),
      metadata: { user_id: args.userId, plan: args.plan },
      return_url: args.returnUrl,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { checkout_url?: string | null; message?: string };
  if (!res.ok || !data.checkout_url) {
    throw new Error(`dodo checkout ${res.status}: ${data.message ?? "no checkout_url"}`);
  }
  return data.checkout_url;
}
