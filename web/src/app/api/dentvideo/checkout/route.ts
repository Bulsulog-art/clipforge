import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors, dvLocale } from "@/lib/dentvid/locale-server";
import { isEmailVerified } from "@/lib/dentvid/verify-email";
import { verifyText } from "@/content/dentvideo-auth";
import { LIMITS, clientIp } from "@/lib/rate-limit";
import { rateLimited } from "@/lib/rate-limit-server";
import { DV_INTERVALS, DV_TIERS, buildDvCheckout, buildDvStaticLink, isSelfServeTier } from "@/lib/dentvid/billing";
import { GROUP_CONTACT, GROUP_CONTACT_EMAIL, groupMailto } from "@/content/dentvideo-group";
import { DodoCheckoutError, postDodoCheckout } from "@/lib/dodo";
import { recordEvent } from "@/lib/dentvid/events-server";
import { geoCountry } from "@/lib/dentvid/events";
import { adminOrNull, checkoutBlockMessage, foundingForApp, foundingFullMessage, loadCheckoutBlock } from "@/lib/dentvid/billing-state";
import { markFoundingClosed } from "@/lib/dentvid/subscriptions";

// POST /api/dentvideo/checkout — open a Dodo hosted checkout for the signed-in
// clinic owner's plan. The clinic and owner ride along in metadata, which
// Dodo copies onto the subscription; /api/dodo/webhook reads it back.

const Body = z.object({
  plan: z.enum(DV_TIERS),
  interval: z.enum(DV_INTERVALS).default("month"),
  code: z.string().max(60).optional().nullable(),
});

export async function POST(req: Request) {
  const { db, user } = await dvSession();
  if (!user) return NextResponse.json({ error: (await dvErrors()).signIn }, { status: 401 });
  const ip = clientIp(req.headers);
  const limited = await rateLimited(
    [
      { key: `rl:checkout:user:${user.id}`, rule: LIMITS.checkoutUser },
      { key: `rl:checkout:ip:${ip}`, rule: LIMITS.checkoutIp },
    ],
    async () => (await dvErrors()).tooMany,
  );
  if (limited) return limited;

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, plan, dodo_subscription_id").eq("owner_id", user.id).maybeSingle();
  const language = (clinic?.profile as { language?: string } | undefined)?.language;
  const err = await dvErrors(language);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  // Group (multi-location) is "Contact us": no self-serve purchase, monthly or yearly.
  if (parsed.success && !isSelfServeTier(parsed.data.plan)) return contactSales(await dvLocale(language));
  if (!clinic) return NextResponse.json({ error: err.setupFirst }, { status: 400 });
  // A clinic whose subscription has not ended must not open a second one (it would be charged twice):
  // active, paid-but-not-yet-active, on hold (update the card instead), cancelled but still paid up.
  const admin = await adminOrNull();
  const block = await loadCheckoutBlock(
    { id: clinic.id as string, plan: clinic.plan as string, dodo_subscription_id: (clinic as { dodo_subscription_id?: string | null }).dodo_subscription_id ?? null },
    admin,
  );
  if (block) {
    const message = checkoutBlockMessage(block, language, { selfServe: !!process.env.DODO_API_KEY?.trim(), alreadySubscribed: err.alreadySubscribed });
    return NextResponse.json({ error: message, code: block.code, ...(block.code === "cancelled_pending" ? { until: block.until } : {}) }, { status: 409 });
  }
  // Paying is where an address starts getting mail (welcome, "videos ready"): it must be proven first.
  if (!isEmailVerified(user)) {
    return NextResponse.json({ error: verifyText(await dvLocale(language)).checkoutBlocked, code: "email_unverified", email: user.email }, { status: 403 });
  }

  if (!parsed.success) return NextResponse.json({ error: err.invalidPlan }, { status: 400 });

  // The founding offer closes by itself at 100 seats: then the checkout is at list price, as the app shows.
  const founding = await foundingForApp(admin);
  const env = founding.open ? process.env : { ...process.env, DENTVIDEO_FOUNDING_OFFER: "off" };
  const built = buildDvCheckout({
    tier: parsed.data.plan,
    interval: parsed.data.interval,
    code: parsed.data.code,
    clinicId: clinic.id,
    ownerId: user.id,
    email: user.email,
    locale: language,
  }, env);
  if (!built.ok) return built.reason === "contact_sales" ? contactSales(await dvLocale(language)) : NextResponse.json({ error: err.invalidPlan }, { status: 400 });
  // Funnel: a checkout URL was handed to the clinic (fire-and-forget).
  const opened = (url: string, via: "api" | "link", founding: boolean) => {
    void recordEvent("checkout_opened", {
      locale: language,
      clinicId: clinic.id as string,
      props: { tier: parsed.data.plan, interval: parsed.data.interval, founding, via },
      geo: geoCountry(req.headers),
    });
    return url;
  };

  // The same Dodo account as ClipForge: DODO_API_KEY, DODO_ENVIRONMENT=live.
  // Without an API key, Dodo's static payment link does the same job (same
  // product, metadata and return URL); the clinic types any code in Dodo.
  const apiKey = process.env.DODO_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ url: opened(buildDvStaticLink(built), "link", built.autoDiscount), code: built.discount });

  try {
    return NextResponse.json({ url: opened(await postDodoCheckout({ apiKey, body: built.body }), "api", built.autoDiscount) });
  } catch (e) {
    // The founding code was applied for the clinic and Dodo refused it (its uses are gone, or it was
    // switched off): never charge the list price silently while the page showed the founding price.
    // The offer is closed for everyone now; the clinic sees the real price and chooses again.
    if (built.autoDiscount && e instanceof DodoCheckoutError && e.status >= 400 && e.status < 500) {
      console.warn("[dentvideo checkout] founding code refused by Dodo; closing the offer", e.status);
      await markFoundingClosed().catch(() => {});
      return NextResponse.json({ error: foundingFullMessage(language), code: "founding_full" }, { status: 409 });
    } else {
      console.error("[dentvideo checkout] dodo checkout failed", (e as Error).message);
      // A code the clinic typed that Dodo refuses: say so rather than "try again".
      if (built.discount && !built.autoDiscount && e instanceof DodoCheckoutError && e.status >= 400 && e.status < 500) {
        return NextResponse.json({ error: err.invalidCode }, { status: 400 });
      }
    }
    return NextResponse.json({ error: err.checkoutFailed }, { status: 502 });
  }
}

/** 400 for a tier that is sold by contact only (Group): say where to write instead. */
function contactSales(locale: Awaited<ReturnType<typeof dvLocale>>) {
  const g = GROUP_CONTACT[locale];
  return NextResponse.json({ error: `${g.text} ${GROUP_CONTACT_EMAIL}`, code: "contact_sales", contact: groupMailto(locale) }, { status: 400 });
}
