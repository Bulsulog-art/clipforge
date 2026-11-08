import { NextResponse } from "next/server";
import { z } from "zod";
import { dvSession } from "@/lib/dentvid/auth";
import { dvErrors } from "@/lib/dentvid/locale-server";
import { DV_INTERVALS, DV_TIERS, buildDvCheckout, buildDvStaticLink } from "@/lib/dentvid/billing";
import { DodoCheckoutError, postDodoCheckout } from "@/lib/dodo";

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

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, plan").eq("owner_id", user.id).maybeSingle();
  const language = (clinic?.profile as { language?: string } | undefined)?.language;
  const err = await dvErrors(language);
  if (!clinic) return NextResponse.json({ error: err.setupFirst }, { status: 400 });
  if (clinic.plan === "active") return NextResponse.json({ error: err.alreadySubscribed }, { status: 409 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: err.invalidPlan }, { status: 400 });

  const built = buildDvCheckout({
    tier: parsed.data.plan,
    interval: parsed.data.interval,
    code: parsed.data.code,
    clinicId: clinic.id,
    ownerId: user.id,
    email: user.email,
    locale: language,
  });
  if (!built.ok) return NextResponse.json({ error: err.invalidPlan }, { status: 400 });

  // The same Dodo account as ClipForge: DODO_API_KEY, DODO_ENVIRONMENT=live.
  // Without an API key, Dodo's static payment link does the same job (same
  // product, metadata and return URL); the clinic types any code in Dodo.
  const apiKey = process.env.DODO_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ url: buildDvStaticLink(built), code: built.discount });

  try {
    return NextResponse.json({ url: await postDodoCheckout({ apiKey, body: built.body }) });
  } catch (e) {
    // The founding code is applied for the clinic; once its 100 uses are gone
    // (or it is switched off in Dodo) checkout must still open, at list price.
    if (built.autoDiscount && e instanceof DodoCheckoutError && e.status >= 400 && e.status < 500) {
      const withoutCode = { ...built.body };
      delete withoutCode.discount_codes;
      try {
        return NextResponse.json({ url: await postDodoCheckout({ apiKey, body: withoutCode }) });
      } catch (e2) {
        console.error("[dentvideo checkout] dodo checkout failed", (e2 as Error).message);
      }
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
