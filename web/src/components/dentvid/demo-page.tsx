import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { LANDING_PATH, dirOf, type Locale } from "@/content/dentvideo";
import { DEMO_COPY, fillDemo } from "@/content/dentvideo-demo";
import { OPERATOR } from "@/content/guides/operator";
import { demoLogoSrc, demoStartPath, type PublicDemo } from "@/lib/dentvid/demos";
import { dvHref } from "@/lib/dentvid/host";
import { exampleServices } from "@/lib/dentvid/service-hints";
import { DemoActions, DemoPreview, DemoView } from "./demo-client";

/**
 * A personalised demo page (/<lang>/d/<token>): one clinic's own branded
 * preview, made by us from its public business information, shown without
 * a sign-up — and a clear way to start with exactly those settings.
 *
 * Never indexed or followed. Unknown, expired and switched-off tokens get
 * the ordinary DentVideo 404 (which links to the landing), and nothing on
 * the page names any other demo.
 */

/** Robots rules for every demo page, its 404 included. */
export const DEMO_ROBOTS: Metadata["robots"] = { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } };

export function demoMetadata(locale: Locale, demo: PublicDemo | null): Metadata {
  if (!demo) return { robots: DEMO_ROBOTS };
  const t = DEMO_COPY[locale];
  const title = fillDemo(t.metaTitle, { name: demo.clinicName });
  const description = fillDemo(t.lead, { name: demo.clinicName });
  const image = `${LANDING_PATH[locale]}/opengraph-image`;
  return {
    title,
    description,
    robots: DEMO_ROBOTS,
    // A shared link unfurls with the clinic's name; the page itself is never indexed.
    openGraph: { siteName: "DentVideo", type: "website", title: `${title} · DentVideo`, description, images: [{ url: image, width: 1200, height: 630, alt: "DentVideo" }] },
    twitter: { card: "summary_large_image", title: `${title} · DentVideo`, description, images: [image] },
    referrer: "no-referrer",
  };
}

export function DemoPage({ locale, demo, logoSrc }: { locale: Locale; demo: PublicDemo | null; /** Dev harness: a static logo instead of the stored copy. */ logoSrc?: string }) {
  if (!demo) notFound();
  const t = DEMO_COPY[locale];
  const name = demo.clinicName;
  const colour = demo.colour;
  const facts = [t.facts.from, t.facts.cancel, t.facts.approve, t.facts.rules];
  const mailHref = `mailto:${OPERATOR.productEmail}?subject=${encodeURIComponent(fillDemo(t.mailSubject, { name }))}`;
  const profile = {
    name,
    language: demo.language,
    services: exampleServices(demo.language),
    brandColor: colour,
    ...(demo.hasLogo ? { logoUrl: logoSrc ?? demoLogoSrc(demo.token) } : {}),
  };

  return (
    <main lang={locale} dir={dirOf(locale)} className="relative isolate overflow-hidden" data-testid="demo-page">
      <DemoView token={demo.token} campaign={demo.campaign} locale={locale} />
      <div aria-hidden="true" className="dv-grid absolute inset-x-0 top-0 -z-10 h-[40rem]" />
      <div aria-hidden="true" className="absolute -end-40 top-0 -z-10 h-[30rem] w-[30rem] rounded-full opacity-25 blur-3xl" style={{ background: colour }} />
      {/* One preview for every width: under the headline on phones, beside the text from lg up. */}
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-16 px-4 pb-20 pt-8 sm:px-6 sm:pt-14 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0 lg:col-start-1">
          <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-dv-ink ring-1 ring-dv-line">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: colour }} />
            {fillDemo(t.eyebrow, { name })}
          </p>
          <h1 className="dv-display mt-5 text-balance text-[2.35rem] leading-[1.05] text-dv-ink [word-break:auto-phrase] sm:text-[3.4rem]">
            {fillDemo(t.headline, { name })}
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-[1.0625rem] leading-relaxed text-dv-body">{t.lead}</p>
        </div>

        <div className="mt-8 min-w-0 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start">
          <DemoPreview token={demo.token} profile={profile} />
          <p className="mx-auto mt-3 max-w-[300px] text-center text-xs leading-relaxed text-dv-muted">{t.sample}</p>
        </div>

        <div className="min-w-0 lg:col-start-1">
          <ul className="mt-8 space-y-3">
            {t.points.map((p) => (
              <li key={p} className="flex gap-3 text-[1.0625rem] leading-snug text-dv-ink">
                <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: colour }}>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span>{p}</span>
              </li>
            ))}
          </ul>

          <section aria-labelledby="demo-facts" className="dv-card mt-8 p-5 sm:p-6">
            <h2 id="demo-facts" className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">
              {t.factsTitle}
            </h2>
            <ul className="mt-3 space-y-2 text-[0.975rem] leading-snug text-dv-body">
              {facts.map((f) => (
                <li key={f} className="flex gap-2">
                  <span aria-hidden="true" className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-dv-teal" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="mt-8">
            <DemoActions
              token={demo.token}
              locale={locale}
              startHref={dvHref(demoStartPath(demo))}
              mailHref={mailHref}
              cta={t.cta}
              ask={t.ask}
              colour={colour}
            />
            <p className="mt-3 text-sm text-dv-muted">{t.ctaNote}</p>
          </div>

          <p className="mt-10 max-w-xl border-t border-dv-line pt-5 text-xs leading-relaxed text-dv-muted" data-testid="demo-privacy">
            {fillDemo(t.privacy, { name })}
          </p>
        </div>
      </div>
    </main>
  );
}
