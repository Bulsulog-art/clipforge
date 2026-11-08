import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StartForm } from "@/components/dentvid/start-form";
import { Onboarding } from "@/components/dentvid/onboarding";
import { FirstWeek } from "@/components/dentvid/first-week";
import { asLocale } from "@/lib/dentvid/locale";
import { asStep } from "@/lib/dentvid/onboarding";
import { DV_FOUNDING, dvAvailablePlans, foundingCode } from "@/lib/dentvid/billing";
import { SERVICE_HINTS, splitServices } from "@/lib/dentvid/service-hints";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Funnel preview", robots: { index: false, follow: false } };

/**
 * Dev-only: every step of the onboarding wizard without a session, for
 * design review and screenshots. 404 unless DENTVIDEO_DEV_PREVIEW=1.
 *   /dentvideo/dev/funnel?step=account|clinic|preview|plan|first-week|activating&lang=tr
 */
export default async function FunnelPreview({ searchParams }: { searchParams: Promise<{ step?: string; lang?: string; empty?: string }> }) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") notFound();
  const sp = await searchParams;
  const locale = asLocale(sp.lang) ?? "en";
  if (sp.step === "first-week" || sp.step === "activating") {
    return (
      <main lang={locale} className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <FirstWeek locale={locale} paid={sp.step === "first-week"} pollMs={3_600_000} />
      </main>
    );
  }
  const step = asStep(sp.step) ?? "account";
  if (step === "account") return <StartForm locale={locale} remember={false} />;
  const demo = sp.empty
    ? undefined
    : {
        name: { en: "Riverside Dental", de: "Zahnarztpraxis am Park", es: "Clínica Dental Sonrisa", tr: "Gülümse Diş Kliniği", fr: "Cabinet Dentaire du Parc" }[locale],
        city: { en: "Bristol", de: "München", es: "Valencia", tr: "İzmir", fr: "Lyon" }[locale],
        country: { en: "GB", de: "DE", es: "ES", tr: "TR", fr: "FR" }[locale],
        language: locale,
        services: splitServices(SERVICE_HINTS[locale]).slice(0, 4),
        tone: "warm" as const,
        address: "formal" as const,
        handle: "riverside.dental",
        brandColor: "B6774F",
      };
  return (
    <Onboarding
      locale={locale}
      step={step}
      initial={demo}
      plans={dvAvailablePlans()}
      founding={{ priceUsd: DV_FOUNDING.priceUsd, code: foundingCode() }}
      checkoutCancelled={false}
    />
  );
}
