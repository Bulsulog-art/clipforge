import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { dvBaseUrl } from "@/lib/dentvid/billing";
import { accountErrors, ownClinic } from "@/lib/dentvid/account-route";
import { dodoApiKey, dodoGetSubscription, dodoPortalLink } from "@/lib/dentvid/dodo-account";

// POST /api/dentvideo/billing/portal — a one-time Dodo customer-portal link
// for the signed-in clinic's own subscription (cancel, card, invoices).
// The customer is looked up from the subscription id the webhook stored on
// the clinic; nothing the browser sends picks the customer. Without
// DODO_API_KEY the settings screen keeps the email path and this says so.

export async function POST() {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:billing:user:${user.id}`, rule: LIMITS.billingUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;

  const clinic = await ownClinic(db, user.id);
  const err = await accountErrors(clinic);
  const apiKey = dodoApiKey();
  if (!apiKey) return NextResponse.json({ error: err.billingUnavailable, fallback: "email" }, { status: 501 });
  const subId = typeof clinic?.dodo_subscription_id === "string" ? clinic.dodo_subscription_id : null;
  if (!clinic || !subId) return NextResponse.json({ error: err.noSubscription }, { status: 409 });

  try {
    const sub = await dodoGetSubscription({ apiKey }, subId);
    // The stored id is written only by the verified webhook; still, refuse a
    // subscription whose metadata names another clinic.
    const metaClinic = sub.metadata?.clinic_id;
    if (typeof metaClinic === "string" && metaClinic !== clinic.id) return NextResponse.json({ error: err.noSubscription }, { status: 409 });
    const customerId = sub.customer?.customer_id;
    if (!customerId) return NextResponse.json({ error: err.billingFailed }, { status: 502 });
    const url = await dodoPortalLink({ apiKey }, customerId, `${dvBaseUrl()}/app/settings`);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[dentvideo billing] portal failed", (e as Error).message);
    return NextResponse.json({ error: err.billingFailed }, { status: 502 });
  }
}
