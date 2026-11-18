import type { Metadata } from "next";
import { devPreviewMeta } from "@/lib/dentvid/private-meta";
import { notFound } from "next/navigation";
import { RememberLocale } from "@/components/dentvid/chrome";
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
  en: { name: "Sample Dental Practice", city: "Bristol", country: "GB" },
  de: { name: "Demo Zahnarztpraxis", city: "München", country: "DE" },
  es: { name: "Clínica Dental Ejemplo", city: "Valencia", country: "ES" },
  tr: { name: "Örnek Diş Kliniği", city: "İzmir", country: "TR" },
  fr: { name: "Cabinet Dentaire Exemple", city: "Lyon", country: "FR" },
  ja: { name: "サンプル歯科", city: "横浜市", country: "JP" },
  ar: { name: "عيادة أسنان تجريبية", city: "دبي", country: "AE" },
  pl: { name: "Przykładowy Gabinet Stomatologiczny", city: "Kraków", country: "PL" },
};

const DEMO_EMAIL: Record<Locale, string> = {
  en: "hello@sample-dental-practice.example",
  de: "praxis@demo-zahnarztpraxis.example",
  es: "hola@clinica-dental-ejemplo.example",
  tr: "info@ornek-dis-klinigi.example",
  fr: "contact@cabinet-dentaire-exemple.example",
  ja: "info@sample-shika.example",
  ar: "info@demo-dental-clinic.example",
  pl: "rejestracja@przykladowy-gabinet.example",
};

export const dynamic = "force-dynamic";
export const generateMetadata = (): Metadata => devPreviewMeta("Funnel preview");

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
        <RememberLocale locale={locale} />
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
        brandColor: "B6774F",
      };
  // As /start does: the header and footer speak the wizard's language.
  return (
    <>
      <RememberLocale locale={locale} />
      <Onboarding
        locale={locale}
        step={step}
        initial={demo}
        plans={dvAvailablePlans()}
        checkoutCancelled={false}
        account={{ email: DEMO_EMAIL[locale], verified: sp.verified === "1" }}
        autoSendCode={false}
      />
    </>
  );
}
