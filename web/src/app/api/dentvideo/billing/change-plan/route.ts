import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors, dvLocale } from "@/lib/dentvid/locale-server";
import { LIMITS } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { DV_INTERVALS, DV_PRICES_USD, DV_TIERS, dvPlanForProduct, dvProductId, isSelfServeTier } from "@/lib/dentvid/billing";
import { GROUP_CONTACT, GROUP_CONTACT_EMAIL, groupMailto } from "@/content/dentvideo-group";
import { accountErrors, ownClinic } from "@/lib/dentvid/account-route";
import { dodoApiKey, dodoChangePlan, dodoGetSubscription, subscriptionEnded } from "@/lib/dentvid/dodo-account";

// POST /api/dentvideo/billing/change-plan — move the signed-in clinic's own
// Dodo subscription to another tier, prorated immediately. The clinic's
// plan_tier is not written here: Dodo's subscription.plan_changed webhook
// does it (billing.ts dvTransition), so the database follows what was
// actually charged. Without DODO_API_KEY the screen keeps the email path.

const Body = z.object({ plan: z.enum(DV_TIERS), interval: z.enum(DV_INTERVALS).default("month") });

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const limited = await rateLimited([{ key: `rl:billing:user:${user.id}`, rule: LIMITS.billingUser }], async () => (await dvErrors()).tooMany);
  if (limited) return limited;

  const clinic = await ownClinic(db, user.id);
  const err = await accountErrors(clinic);
  const apiKey = dodoApiKey();
  if (!apiKey) return NextResponse.json({ error: err.billingUnavailable, fallback: "email" }, { status: 501 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: (await dvErrors()).invalidPlan }, { status: 400 });
  const { plan, interval } = parsed.data;
  // Group (multi-location) is "Contact us": never a self-serve switch either.
  if (!isSelfServeTier(plan)) {
    const locale = await dvLocale((clinic?.profile as { language?: string } | undefined)?.language);
    const g = GROUP_CONTACT[locale];
    return NextResponse.json({ error: `${g.text} ${GROUP_CONTACT_EMAIL}`, code: "contact_sales", contact: groupMailto(locale) }, { status: 400 });
  }
  const productId = dvProductId(plan, interval);
  if (!productId || !DV_PRICES_USD[plan][interval]) return NextResponse.json({ error: (await dvErrors()).invalidPlan }, { status: 400 });

  const subId = typeof clinic?.dodo_subscription_id === "string" ? clinic.dodo_subscription_id : null;
  if (!clinic || !subId || clinic.plan !== "active") return NextResponse.json({ error: err.noSubscription }, { status: 409 });

  try {
    const sub = await dodoGetSubscription({ apiKey }, subId);
    const metaClinic = sub.metadata?.clinic_id;
    if ((typeof metaClinic === "string" && metaClinic !== clinic.id) || subscriptionEnded(sub.status)) {
      return NextResponse.json({ error: err.noSubscription }, { status: 409 });
    }
    const current = dvPlanForProduct(sub.product_id);
    if (sub.product_id === productId || (current && current.tier === plan && current.interval === interval)) {
      return NextResponse.json({ error: err.samePlan }, { status: 409 });
    }
    await dodoChangePlan({ apiKey }, subId, productId);
    return NextResponse.json({ ok: true, plan, interval });
  } catch (e) {
    console.error("[dentvideo billing] change plan failed", (e as Error).message);
    return NextResponse.json({ error: err.billingFailed }, { status: 502 });
  }
}
