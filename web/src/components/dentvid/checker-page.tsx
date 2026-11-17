import Link from "next/link";
import { ArrowUpRight, ExternalLink, Lock, Plus } from "lucide-react";
import { LANDING_PATH, dirOf, findGuide, guidePath, hasGuides, type Locale } from "@/content/dentvideo";
import { CHECKER } from "@/content/dentvideo-checker";
import { GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { checkerJsonLd, jsonLdHtml } from "@/lib/dentvid/seo-guides";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, GuideCta, HtmlLang } from "./guide-parts";
import { AdChecker } from "./ad-checker";

/**
 * "Is my post allowed?" — the free health-advertising checker for dentists,
 * one page per language. The page is static; the checker itself
 * (components/dentvid/ad-checker.tsx) runs in the browser and gets only this
 * language's interface words.
 */
export function CheckerPage({ locale }: { locale: Locale }) {
  const c = CHECKER[locale];
  const ui = GUIDE_UI[locale];
  const guide = findGuide(c.guide.slug);
  return (
    <main lang={locale} dir={dirOf(locale)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(checkerJsonLd(locale)) }} />
      <HtmlLang locale={locale} />
      <header className="relative isolate overflow-hidden border-b border-dv-line">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute -end-40 -top-20 -z-10 h-96 w-96 rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-14">
          <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[locale] }, { name: c.nav }]} />
          <h1 className="dv-display mt-6 max-w-4xl text-balance text-[2.25rem] leading-[1.05] text-dv-ink sm:text-[3.25rem]">{c.h1}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-dv-body sm:text-xl">{c.intro}</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-sm font-medium text-dv-teal ring-1 ring-dv-line">
            <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
            {c.ui.privacy}
          </p>
        </div>
      </header>

      <section aria-label={c.nav} className="mx-auto max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
        <AdChecker locale={locale} ui={c.ui} landingPath={LANDING_PATH[locale]} />
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <section className="mt-16">
          <h2 className="text-[1.5rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.75rem]">{c.how.heading}</h2>
          {c.how.paragraphs.map((p, i) => (
            <p key={i} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">
              {p}
            </p>
          ))}
        </section>

        <section className="mt-14">
          <h2 className="text-[1.5rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.75rem]">{c.rulesHeading}</h2>
          <div className="mt-6 space-y-4">
            {c.rules.map((r) => (
              <article key={r.heading} className="rounded-2xl bg-white p-5 ring-1 ring-dv-line sm:p-6">
                <h3 className="text-lg font-semibold text-dv-ink">{r.heading}</h3>
                <p className="mt-2 leading-relaxed text-[#33423f]">{r.text}</p>
                <ul className="mt-4 space-y-2">
                  {r.sources.map((s) => (
                    <li key={s.url} className="flex gap-2.5 text-sm leading-relaxed">
                      <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-dv-muted" aria-hidden="true" />
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-dv-teal underline decoration-dv-teal/30 underline-offset-[3px] hover:decoration-dv-teal">
                        {s.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-dv-muted">{c.notLegalAdvice}</p>
          {guide && (
            <p className="mt-5">
              <Link href={dvHref(guidePath(guide))} className="group inline-flex items-center gap-1.5 font-semibold text-dv-teal underline-offset-4 hover:underline">
                {c.guide.label}
                <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </p>
          )}
        </section>

        <section className="mt-16">
          <h2 className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{ui.faq}</h2>
          <div className="mt-6 divide-y divide-dv-line border-y border-dv-line">
            {c.faq.map((f, i) => (
              <details key={f.q} className="group" open={i === 0}>
                <summary className="flex cursor-pointer items-start justify-between gap-6 py-5 text-start font-semibold leading-snug text-dv-ink">
                  {f.q}
                  <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-dv-teal ring-1 ring-dv-line transition-transform duration-300 group-open:rotate-45">
                    <Plus className="h-4 w-4" />
                  </span>
                </summary>
                <p className="-mt-1 pb-6 pe-12 leading-relaxed text-dv-body">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <div className="mt-16">
          <GuideCta locale={locale} />
        </div>
        {hasGuides(locale) && (
          <p className="mt-8 text-sm">
            <Link href={dvHref(GUIDES_INDEX_PATH[locale])} className="font-semibold text-dv-teal underline-offset-4 hover:underline">
              {ui.allGuides}
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
