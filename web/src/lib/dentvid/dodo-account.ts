import { dodoApiBase } from "@/lib/dodo";

/**
 * The few Dodo Payments calls DentVideo's self-serve account needs, server
 * side only (they carry DODO_API_KEY). Paths follow Dodo's API reference
 * (the same spec its official SDK is generated from):
 *
 *   GET   /subscriptions/{id}                              → { customer: { customer_id }, status, product_id, … }
 *   POST  /customers/{customer_id}/customer-portal/session  ?return_url=…  → { link }
 *   POST  /subscriptions/{id}/change-plan                   { product_id, quantity, proration_billing_mode }
 *   PATCH /subscriptions/{id}                               { status: "cancelled" }
 */

export class DodoApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(`dodo ${status}: ${message}`);
  }
}

export type DodoSubscription = {
  subscription_id: string;
  status: string;
  product_id?: string | null;
  cancel_at_next_billing_date?: boolean | null;
  customer?: { customer_id?: string | null } | null;
  metadata?: Record<string, unknown> | null;
};

/** Statuses after which nothing will be charged again. */
const ENDED = new Set(["cancelled", "expired", "failed"]);
export const subscriptionEnded = (status: string | null | undefined) => !!status && ENDED.has(status);

type Opts = { apiKey: string; env?: NodeJS.ProcessEnv; fetchImpl?: typeof fetch };

/** Dodo ids are short opaque tokens; refuse anything that could change the path. */
const ID = /^[A-Za-z0-9_-]{1,80}$/;
function safeId(id: string): string {
  if (!ID.test(id)) throw new DodoApiError(400, "bad id");
  return id;
}

async function call<T>(o: Opts, method: string, path: string, body?: unknown): Promise<T> {
  const res = await (o.fetchImpl ?? fetch)(`${dodoApiBase(o.env)}${path}`, {
    method,
    headers: { Authorization: `Bearer ${o.apiKey}`, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await res.text().catch(() => "");
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!res.ok) throw new DodoApiError(res.status, (data as { message?: string }).message ?? res.statusText ?? "error");
  return data as T;
}

export function dodoGetSubscription(o: Opts, subscriptionId: string): Promise<DodoSubscription> {
  return call<DodoSubscription>(o, "GET", `/subscriptions/${safeId(subscriptionId)}`);
}

export type DodoPayment = {
  payment_id: string;
  subscription_id?: string | null;
  brand_id?: string | null;
  metadata?: Record<string, unknown> | null;
  product_cart?: { product_id: string; quantity?: number }[] | null;
};

/** One payment (refunds and disputes name only the payment: this finds whose it is). */
export function dodoGetPayment(o: Opts, paymentId: string): Promise<DodoPayment> {
  return call<DodoPayment>(o, "GET", `/payments/${safeId(paymentId)}`);
}

/** A one-time link to Dodo's hosted customer portal (cancel, card, invoices). */
export async function dodoPortalLink(o: Opts, customerId: string, returnUrl: string): Promise<string> {
  const q = new URLSearchParams({ return_url: returnUrl });
  const data = await call<{ link?: string }>(o, "POST", `/customers/${safeId(customerId)}/customer-portal/session?${q}`);
  if (!data.link) throw new DodoApiError(502, "no portal link");
  return data.link;
}

/** Move a subscription to another product, charging the prorated difference now. */
export async function dodoChangePlan(o: Opts, subscriptionId: string, productId: string): Promise<void> {
  await call(o, "POST", `/subscriptions/${safeId(subscriptionId)}/change-plan`, {
    product_id: safeId(productId),
    quantity: 1,
    proration_billing_mode: "prorated_immediately",
  });
}

/** Cancel a subscription now (used only when the clinic deletes its account). */
export async function dodoCancelSubscription(o: Opts, subscriptionId: string): Promise<void> {
  await call(o, "PATCH", `/subscriptions/${safeId(subscriptionId)}`, { status: "cancelled" });
}

/** The API key when self-serve billing is on; null keeps the email path. */
export function dodoApiKey(env: NodeJS.ProcessEnv = process.env): string | null {
  return env.DODO_API_KEY?.trim() || null;
}
