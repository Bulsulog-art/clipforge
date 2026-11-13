import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dvHref } from "@/lib/dentvid/host";
import { StartForm } from "@/components/dentvid/start-form";
import { LazyOnboarding as Onboarding } from "@/components/dentvid/onboarding-lazy";
import { RememberLocale } from "@/components/dentvid/chrome";
import { LazyScriptFont } from "@/components/dentvid/font-lazy";
import { appText } from "@/content/dentvideo-app";
import { LANDING_PATH } from "@/content/dentvideo";
import { asLocale } from "@/lib/dentvid/locale";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { dvSession } from "@/lib/dentvid/auth";
import { STEP_COOKIE, resolveStep } from "@/lib/dentvid/onboarding";
import { logoSignedUrl } from "@/lib/dentvid/logo-url";
import { isEmailVerified } from "@/lib/dentvid/verify-email";
import { legalPagesOn } from "@/lib/dentvid/legal";
import type { ClinicProfile } from "@/lib/dentvid/profile";
import { DV_FOUNDING, dvAvailablePlans, foundingCode } from "@/lib/dentvid/billing";
import { adminOrNull, foundingForApp } from "@/lib/dentvid/billing-state";
import { DEMO_COOKIE, demoTokenFrom } from "@/lib/dentvid/demo-cookie";
import { loadActiveDemo } from "@/lib/dentvid/demos-server";
import { demoLogoSrc } from "@/lib/dentvid/demos";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ lang?: string; step?: string; billing?: string; demo?: string }> };

/**
 * The paid funnel: 1 account → 2 clinic → 3 live preview → 4 plan and pay.
 * There is no free week — the preview is drawn in the browser, and the first
 * real week is made right after payment (api/dodo/webhook). A returning
 * visitor lands on the step they reached (lib/dentvid/onboarding.ts).
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const fromLink = asLocale((await searchParams).lang);
  const locale = fromLink ?? (await dvLocale());
  const t = appText(locale);
  // noindex, but a shared sign-up link still unfurls: text and card in the link's language.
  // (Setting openGraph here replaces the inherited one, so the share image is named too.)
  const description = t.start.metaDescription;
  const title = `${t.start.metaTitle} · DentVideo`;
  const image = `${LANDING_PATH[locale]}/opengraph-image`;
  return {
    title: t.start.metaTitle,
    description,
    openGraph: { siteName: "DentVideo", type: "website", title, description, images: [{ url: image, width: 1200, height: 630, alt: "DentVideo" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function StartPage({ searchParams }: Props) {
  const sp = await searchParams;
  const fromLink = asLocale(sp.lang);
  const { db, user } = await dvSession();

  if (!user) {
    const locale = fromLink ?? (await dvLocale());
    return (
      <>
        <LazyScriptFont locale={locale} />
        <StartForm locale={locale} remember={fromLink !== null} legal={legalPagesOn()} />
      </>
    );
  }

  const { data: clinic } = await db.from("dentvid_clinics").select("id, profile, logo_path, plan").eq("owner_id", user.id).maybeSingle();
  const profile = (clinic?.profile ?? undefined) as Partial<ClinicProfile> | undefined;
  const cookieStore = await cookies();
  // From a personalised demo link (?demo= or the dv-demo cookie): a clinic without a name yet starts from the demo.
  const demoToken = profile?.name ? null : demoTokenFrom(sp.demo, cookieStore.get(DEMO_COOKIE)?.value);
  const demo = demoToken ? await loadActiveDemo(demoToken) : null;
  const where = resolveStep({
    signedIn: true,
    hasClinic: !!clinic,
    plan: (clinic as { plan?: string } | null)?.plan ?? null,
    requested: sp.step,
    reached: cookieStore.get(STEP_COOKIE)?.value,
  });
  if (where.kind === "app") redirect(dvHref("/dentvideo/app"));
  const step = where.step === "account" ? "clinic" : where.step;

  const locale = fromLink ?? (await dvLocale(profile?.language ?? demo?.language));
  const logoUrl = await logoSignedUrl(db, clinic?.logo_path as string | null | undefined);
  // The founding offer closes by itself once its 100 seats are taken (lib/dentvid/subscriptions).
  const founding = await foundingForApp(await adminOrNull());
  return (
    <>
      <RememberLocale locale={locale} />
      <LazyScriptFont locale={locale} />
      <Onboarding
        locale={locale}
        step={step}
        initial={profile}
        logoUrl={logoUrl}
        plans={dvAvailablePlans()}
        founding={founding.open ? { priceUsd: DV_FOUNDING.priceUsd, code: foundingCode(), ...(founding.reliable ? { left: founding.left } : {}) } : null}
        checkoutCancelled={sp.billing === "cancelled"}
        account={user.email ? { email: user.email, verified: isEmailVerified(user) } : undefined}
        demo={
          demo
            ? {
                token: demo.token,
                profile: {
                  name: demo.clinicName,
                  ...(demo.city ? { city: demo.city } : {}),
                  ...(demo.country ? { country: demo.country } : {}),
                  language: demo.language,
                  brandColor: demo.colour,
                },
                logoUrl: demo.hasLogo ? demoLogoSrc(demo.token) : null,
              }
            : undefined
        }
      />
    </>
  );
}
