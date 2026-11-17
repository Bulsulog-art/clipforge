import { NextResponse } from "next/server";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { accountErrors, ownClinic } from "@/lib/dentvid/account-route";
import { dodoApiKey } from "@/lib/dentvid/dodo-account";
import { raiseOwnerAlert } from "@/lib/dentvid/ops-server";
import { alerts } from "@/lib/dentvid/ops-alert";

// POST /api/dentvideo/billing/cancel-request — "Ask to cancel" in Settings while
// online billing is off (no DODO_API_KEY, so the portal answers 501). Nothing is
// cancelled here: the owner gets an urgent alert naming the clinic and its Dodo
// subscription, and cancels it in the Dodo dashboard the same day. The clinic is
// taken from the session only; the body is ignored, so no other clinic can be named.

const PAYING = new Set(["active", "paused"]);

export async function POST() {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:billing:user:${user.id}`, rule: LIMITS.billingUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;

  const clinic = await ownClinic(db, user.id);
  const err = await accountErrors(clinic);
  // With online billing on, the portal is the way to cancel (it cancels at once, no waiting for us).
  if (dodoApiKey()) return NextResponse.json({ error: err.noSubscription, fallback: "portal" }, { status: 409 });
  if (!clinic || !PAYING.has(String(clinic.plan))) return NextResponse.json({ error: err.noSubscription }, { status: 409 });

  const profile = (clinic.profile ?? {}) as { name?: string; country?: string };
  const sent = await raiseOwnerAlert(
    alerts.cancelRequested({
      clinic: { id: String(clinic.id), name: profile.name ?? null, country: profile.country ?? null, tier: (clinic.plan_tier as string | null) ?? null },
      plan: String(clinic.plan),
      subscriptionId: (clinic.dodo_subscription_id as string | null) ?? null,
      renewsAt: (clinic.plan_renews_at as string | null) ?? null,
      email: user.email ?? null,
    }),
  );
  // The request must reach the owner: "deduped" means it already did today. Anything else, the clinic writes instead.
  if (sent !== "sent" && sent !== "deduped") {
    console.error("[dentvideo billing] cancel request alert not delivered", sent);
    return NextResponse.json({ error: err.billingUnavailable, fallback: "email" }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
