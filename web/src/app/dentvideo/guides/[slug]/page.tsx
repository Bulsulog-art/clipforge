import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, ExternalLink, Plus } from "lucide-react";
import { GUIDES, LANDING_PATH, LANGUAGE_NAME, findGuide, guidePath } from "@/content/dentvideo";
import { readingMinutes, relatedGuides, sectionId, translationsOf } from "@/content/guides/text";
import { GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { guideJsonLd, guideMetadata } from "@/lib/dentvid/seo";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, GuideCta, HtmlLang, RichText, formatDate } from "@/components/dentvid/guide-parts";

// Unknown values reach the page and its notFound(), so they get the DentVideo 404 (not-found.tsx)
// inside the header and footer rather than Next's bare default.
export const dynamicParams = true;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const g = findGuide((await params).slug);
  // Unknown: the 404's own (localized) title.
  if (!g) notFound();
  return guideMetadata(g);
}

export default async function GuidePage({ params }: Props) {
  const g = findGuide((await params).slug);
  if (!g) notFound();
  const ui = GUIDE_UI[g.locale];
  const L = g.locale;
  const related = relatedGuides(g);
  const translations = translationsOf(g).filter((o) => o.slug !== g.slug);
  const date = g.updated ?? g.published;

  return (
    <main lang={L}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideJsonLd(g)) }} />
      <HtmlLang locale={L} />

      <article>
        <header className="relative isolate overflow-hidden border-b border-dv-line">
          <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
          <div aria-hidden="true" className="absolute -right-40 -top-20 -z-10 h-96 w-96 rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
          <div className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-14">
            <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[L] }, { name: ui.breadcrumbGuides, href: GUIDES_INDEX_PATH[L] }, { name: g.h1 }]} />
            <h1 className="dv-display mt-6 text-balance text-[2.375rem] leading-[1.04] text-dv-ink sm:text-[3.25rem]">{g.h1}</h1>
            <p className="mt-6 text-lg leading-relaxed text-dv-body sm:text-xl">
              <RichText text={g.intro} locale={L} />
            </p>
            <p className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dv-muted">
              {date && (
                <span>
                  {ui.updated} <time dateTime={date}>{formatDate(date, L)}</time>
                </span>
              )}
              <span aria-hidden="true">·</span>
              <span>{ui.readingTime(readingMinutes(g))}</span>
              {g.category === "rules" && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{ui.notLegalAdvice}</span>
                </>
              )}
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:px-6">
          {g.sections.length > 3 && (
            <nav aria-label={ui.onThisPage} className="mt-8 rounded-2xl bg-dv-sand/70 p-5 ring-1 ring-dv-line sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dv-muted">{ui.onThisPage}</p>
              <ol className="mt-3 grid gap-x-8 gap-y-2 text-[0.9375rem] sm:grid-cols-2">
                {g.sections.map((s, i) => (
                  <li key={s.heading} className="flex gap-2.5">
                    <span className="w-5 shrink-0 text-right font-semibold tabular-nums text-dv-teal">{i + 1}</span>
                    <a href={`#${sectionId(s.heading, i)}`} className="text-dv-body underline-offset-4 hover:text-dv-ink hover:underline">
                      {s.heading}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {g.sections.map((s, i) => (
            <section key={s.heading} id={sectionId(s.heading, i)} className="mt-12 scroll-mt-24 sm:mt-14">
              <h2 className="text-balance text-[1.5rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.75rem]">{s.heading}</h2>
              {s.paragraphs.map((p, j) => (
                <p key={j} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">
                  <RichText text={p} locale={L} />
                </p>
              ))}
              {s.list && s.list.length > 0 &&
                (s.ordered ? (
                  <ol className="mt-5 space-y-3">
                    {s.list.map((item, j) => (
                      <li key={j} className="flex gap-3.5 text-[1.0625rem] leading-[1.7] text-[#33423f]">
                        <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dv-teal-50 text-sm font-semibold text-dv-teal ring-1 ring-dv-teal-100">
                          {j + 1}
                        </span>
                        <span>
                          <RichText text={item} locale={L} />
                        </span>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <ul className="mt-5 space-y-3 rounded-2xl bg-white p-5 ring-1 ring-dv-line sm:p-6">
                    {s.list.map((item, j) => (
                      <li key={j} className="flex gap-3 text-[1.0625rem] leading-[1.65] text-[#33423f]">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-dv-teal" aria-hidden="true" />
                        <span>
                          <RichText text={item} locale={L} />
                        </span>
                      </li>
                    ))}
                  </ul>
                ))}
              {s.after?.map((p, j) => (
                <p key={j} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">
                  <RichText text={p} locale={L} />
                </p>
              ))}
            </section>
          ))}

          <div className="mt-16">
            <GuideCta locale={L} />
          </div>

          <section className="mt-16">
            <h2 className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{ui.faq}</h2>
            <div className="mt-6 divide-y divide-dv-line border-y border-dv-line">
              {g.faq.map((f, i) => (
                <details key={f.q} className="group" open={i === 0}>
                  <summary className="flex cursor-pointer items-start justify-between gap-6 py-5 text-left font-semibold leading-snug text-dv-ink">
                    {f.q}
                    <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-dv-teal ring-1 ring-dv-line transition-transform duration-300 group-open:rotate-45">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="-mt-1 pb-6 pr-12 leading-relaxed text-dv-body">
                    <RichText text={f.a} locale={L} />
                  </p>
                </details>
              ))}
            </div>
          </section>

          {g.sources && g.sources.length > 0 && (
            <section className="mt-14">
              <h2 className="text-lg font-semibold text-dv-ink">{ui.sources}</h2>
              <ul className="mt-4 space-y-2.5">
                {g.sources.map((s) => (
                  <li key={s.url} className="flex gap-2.5 text-[0.9375rem] leading-relaxed">
                    <ExternalLink className="mt-1 h-3.5 w-3.5 shrink-0 text-dv-muted" aria-hidden="true" />
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-dv-teal underline decoration-dv-teal/30 underline-offset-[3px] hover:decoration-dv-teal">
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-dv-muted">{ui.sourcesNote}</p>
            </section>
          )}

          {translations.length > 0 && (
            <p className="mt-10 flex flex-wrap gap-x-4 gap-y-2 text-sm text-dv-muted">
              {translations.map((o) => (
                <Link key={o.slug} href={dvHref(guidePath(o))} hrefLang={o.locale} lang={o.locale} className="inline-block rounded-md py-0.5 font-medium text-dv-teal underline-offset-4 hover:underline">
                  {LANGUAGE_NAME[o.locale]}
                </Link>
              ))}
            </p>
          )}
        </div>
      </article>

      <nav aria-label={ui.related} className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        <h2 className="text-lg font-semibold text-dv-ink">{ui.related}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {related.map((o) => (
            <li key={o.slug}>
              <Link href={dvHref(guidePath(o))} className="dv-card group flex h-full items-start justify-between gap-4 p-5 font-semibold leading-snug text-dv-ink">
                {o.h1}
                <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-dv-teal transition-transform group-hover:-translate-x-0 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <Link href={dvHref(GUIDES_INDEX_PATH[L])} className="dv-card group flex h-full items-start justify-between gap-4 p-5 font-semibold leading-snug text-dv-teal">
              {ui.allGuides}
              <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
