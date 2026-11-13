import Link from "next/link";
import { Plus } from "lucide-react";
import { LANDING_PATH, dirOf, hasGuides, type Locale } from "@/content/dentvideo";
import { ENTITY } from "@/content/guides/entity";
import { GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { aboutJsonLd, jsonLdHtml } from "@/lib/dentvid/seo-guides";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, GuideCta, HtmlLang } from "./guide-parts";
import { CommercialLinks } from "./solution-page";
import { solutionsFor } from "@/content/solutions";

/** What DentVideo is, stated plainly, with the facts as a definition list. */
export function AboutPage({ locale }: { locale: Locale }) {
  const e = ENTITY[locale];
  const ui = GUIDE_UI[locale];
  return (
    <main lang={locale} dir={dirOf(locale)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(aboutJsonLd(locale)) }} />
      <HtmlLang locale={locale} />
      <header className="relative isolate overflow-hidden border-b border-dv-line">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-14">
          <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[locale] }, { name: ui.about }]} />
          <h1 className="dv-display mt-6 text-[2.75rem] leading-[1.02] text-dv-ink sm:text-[3.75rem]">{e.h1}</h1>
          <p className="mt-6 text-lg leading-relaxed text-dv-body sm:text-xl">{e.definition}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 pb-24 sm:px-6">
        <dl className="mt-10 divide-y divide-dv-line overflow-hidden rounded-[1.25rem] bg-white ring-1 ring-dv-line">
          {e.facts.map((f) => (
            <div key={f.label} className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6 sm:px-6">
              <dt className="text-sm font-semibold text-dv-ink">{f.label}</dt>
              <dd className="text-[0.9875rem] leading-relaxed text-dv-body">{f.value}</dd>
            </div>
          ))}
        </dl>

        {e.sections.map((s) => (
          <section key={s.heading} className="mt-14">
            <h2 className="text-[1.5rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.75rem]">{s.heading}</h2>
            {s.paragraphs.map((p, i) => (
              <p key={i} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">{p}</p>
            ))}
          </section>
        ))}

        {solutionsFor(locale).length > 0 && (
          <div className="mt-14">
            <CommercialLinks locale={locale} pages={solutionsFor(locale)} />
          </div>
        )}

        <section className="mt-16">
          <h2 className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{ui.faq}</h2>
          <div className="mt-6 divide-y divide-dv-line border-y border-dv-line">
            {e.faq.map((f, i) => (
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
