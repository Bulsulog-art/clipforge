import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StartForm } from "@/components/dentvid/start-form";
import { Onboarding } from "@/components/dentvid/onboarding";
import { FirstWeek } from "@/components/dentvid/first-week";
import { asLocale } from "@/lib/dentvid/locale";
import { dirOf, type Locale } from "@/content/dentvideo";
import { asStep } from "@/lib/dentvid/onboarding";
import { legalPagesOn } from "@/lib/dentvid/legal";
import { dvAvailablePlans } from "@/lib/dentvid/billing";
import { SERVICE_HINTS, splitServices } from "@/lib/dentvid/service-hints";

const DEMO_CLINIC: Record<Locale, { name: string; city: string; country: string }> = {
  en: { name: "Riverside Dental", city: "Bristol", country: "GB" },
  de: { name: "Zahnarztpraxis am Park", city: "München", country: "DE" },
  es: { name: "Clínica Dental Sonrisa", city: "Valencia", country: "ES" },
  tr: { name: "Gülümse Diş Kliniği", city: "İzmir", country: "TR" },
  fr: { name: "Cabinet Dentaire du Parc", city: "Lyon", country: "FR" },
  ja: { name: "さくら歯科クリニック", city: "横浜市", country: "JP" },
  ar: { name: "عيادة الابتسامة لطب الأسنان", city: "دبي", country: "AE" },
  pl: { name: "Gabinet Stomatologiczny Uśmiech", city: "Kraków", country: "PL" },
};

const DEMO_EMAIL: Record<Locale, string> = {
  en: "hello@riverside-dental.example",
  de: "praxis@zahnarzt-am-park.example",
  es: "hola@clinicasonrisa.example",
  tr: "info@gulumsedis.example",
  fr: "contact@cabinet-du-parc.example",
  ja: "info@sakura-dental.example",
  ar: "info@smile-dental.example",
  pl: "rejestracja@gabinet-usmiech.example",
};

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Funnel preview", robots: { index: false, follow: false } };

/**
 * Dev-only: every step of the onboarding wizard without a session, for
 * design review and screenshots. 404 unless DENTVIDEO_DEV_PREVIEW=1.
 *   /dentvideo/dev/funnel?step=account|clinic|preview|plan|first-week|activating&lang=tr
 * The plan step shows the email-code card; &verified=1 hides it.
 * first-week takes &delay=retrying|delayed (the worker's "taking a little longer" note).
 */
export default async function FunnelPreview({ searchParams }: { searchParams: Promise<{ step?: string; lang?: string; empty?: string; verified?: string; delay?: string }> }) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") notFound();
  const sp = await searchParams;
  const locale = asLocale(sp.lang) ?? "en";
  if (sp.step === "first-week" || sp.step === "activating") {
    return (
      <main lang={locale} dir={dirOf(locale)} className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <FirstWeek locale={locale} paid={sp.step === "first-week"} pollMs={3_600_000} delay={sp.delay === "retrying" || sp.delay === "delayed" ? sp.delay : null} />
      </main>
    );
  }
  const step = asStep(sp.step) ?? "account";
  if (step === "account") return <StartForm locale={locale} remember legal={legalPagesOn()} />;
  const demo = sp.empty
    ? undefined
    : {
        ...DEMO_CLINIC[locale],
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
      checkoutCancelled={false}
      account={{ email: DEMO_EMAIL[locale], verified: sp.verified === "1" }}
      autoSendCode={false}
    />
  );
}
