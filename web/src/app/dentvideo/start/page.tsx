import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { StartForm } from "@/components/dentvid/start-form";
import { Onboarding } from "@/components/dentvid/onboarding";
import { RememberLocale } from "@/components/dentvid/chrome";
import { appText } from "@/content/dentvideo-app";
import { asLocale } from "@/lib/dentvid/locale";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { dvSession } from "@/lib/dentvid/auth";
import { STEP_COOKIE, resolveStep } from "@/lib/dentvid/onboarding";
import { logoSignedUrl } from "@/lib/dentvid/logo-url";
import type { ClinicProfile } from "@/lib/dentvid/profile";
import { DV_FOUNDING, dvAvailablePlans, foundingCode, foundingOfferOpen } from "@/lib/dentvid/billing";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ lang?: string; step?: string; billing?: string }> };

/**
 * The paid funnel: 1 account → 2 clinic → 3 live preview → 4 plan and pay.
 * There is no free week — the preview is drawn in the browser, and the first
 * real week is made right after payment (api/dodo/webhook). A returning
 * visitor lands on the step they reached (lib/dentvid/onboarding.ts).
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const fromLink = asLocale((await searchParams).lang);
  const t = appText(fromLink ?? (await dvLocale()));
  return { title: t.start.metaTitle };
}

export default async function StartPage({ searchParams }: Props) {
  const sp = await searchParams;
  const fromLink = asLocale(sp.lang);
  const { db, user } = await dvSession();

  if (!user) {
    const locale = fromLink ?? (await dvLocale());
    return <StartForm locale={locale} remember={fromLink !== null} />;
  }

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path, plan").eq("owner_id", user.id).maybeSingle();
  const profile = (clinic?.profile ?? undefined) as Partial<ClinicProfile> | undefined;
  const where = resolveStep({
    signedIn: true,
    hasClinic: !!clinic,
    plan: (clinic as { plan?: string } | null)?.plan ?? null,
    requested: sp.step,
    reached: (await cookies()).get(STEP_COOKIE)?.value,
  });
  if (where.kind === "app") redirect("/dentvideo/app");
  const step = where.step === "account" ? "clinic" : where.step;

  const locale = fromLink ?? (await dvLocale(profile?.language));
  const logoUrl = await logoSignedUrl(db, clinic?.logo_path as string | null | undefined);
  return (
    <>
      <RememberLocale locale={locale} />
      <Onboarding
        locale={locale}
        step={step}
        initial={profile}
        logoUrl={logoUrl}
        plans={dvAvailablePlans()}
        founding={foundingOfferOpen() ? { priceUsd: DV_FOUNDING.priceUsd, code: foundingCode() } : null}
        checkoutCancelled={sp.billing === "cancelled"}
      />
    </>
  );
}
