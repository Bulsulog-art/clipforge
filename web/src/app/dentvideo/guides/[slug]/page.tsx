import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Check, ExternalLink, Plus } from "lucide-react";
import { GUIDES, LANDING_PATH, LANGUAGE_NAME, dirOf, findGuide, guidePath } from "@/content/dentvideo";
import { guideSample, readingMinutes, relatedGuides, reviewedDate, sectionId, translationsOf } from "@/content/guides/text";
import { sampleSrc } from "@/content/dentvideo-samples";
import { PhoneFrame } from "@/components/dentvid/phone";
import { GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { GUIDE_SAMPLE_UI } from "@/content/guides/ui-sample";
import { guideJsonLd, guideMetadata } from "@/lib/dentvid/seo";
import { jsonLdHtml } from "@/lib/dentvid/seo-guides";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, Byline, GuideCta, HtmlLang, RichText, SectionTableView, formatDate } from "@/components/dentvid/guide-parts";
import { GuideScriptFont } from "@/components/dentvid/font-guide";
import { CommercialLinks } from "@/components/dentvid/solution-page";
import { CheckerCallout } from "@/components/dentvid/checker-callout";
import { commercialPageForGuide } from "@/content/solutions";

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
  // The commercial page this guide's reader most likely wants next (descriptive anchor, same language).
  const commercial = commercialPageForGuide(g);
  // A real DentVideo sample on the guide's topic, in its language (loads nothing until played).
  const sample = guideSample(g);

  return (
    <main lang={L} dir={dirOf(L)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(guideJsonLd(g)) }} />
      <HtmlLang locale={L} />
      <GuideScriptFont locale={L} />

      <article>
        <header className="relative isolate overflow-hidden border-b border-dv-line">
          <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
          <div aria-hidden="true" className="absolute -end-40 -top-20 -z-10 h-96 w-96 rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
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
            <p className="mt-2 text-sm text-dv-muted">
              <Byline locale={L} reviewed={reviewedDate(g)} />
            </p>
          </div>
        </header>

        <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:px-6">
          {sample && (
            <figure aria-labelledby="guide-sample" className="mt-8 flex flex-col items-center gap-6 rounded-2xl bg-dv-sand/70 p-5 ring-1 ring-dv-line sm:flex-row sm:items-start sm:p-6">
              <PhoneFrame tightShadow className="w-[11.5rem] shrink-0">
                <video
                  src={sampleSrc(L, sample.slug, "mp4")}
                  poster={sampleSrc(L, sample.slug, "jpg")}
                  controls
                  playsInline
                  preload="none"
                  aria-label={sample.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </PhoneFrame>
              <figcaption className="text-start">
                <p id="guide-sample" className="text-xs font-semibold uppercase tracking-[0.14em] text-dv-muted">
                  {GUIDE_SAMPLE_UI[L].heading}
                </p>
                <p className="mt-3 text-lg font-semibold leading-snug text-dv-ink">{sample.name}</p>
                <p className="mt-3 text-sm leading-relaxed text-dv-muted">{GUIDE_SAMPLE_UI[L].note}</p>
              </figcaption>
            </figure>
          )}

          {g.sections.length > 3 && (
            <nav aria-label={ui.onThisPage} className="mt-8 rounded-2xl bg-dv-sand/70 p-5 ring-1 ring-dv-line sm:p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dv-muted">{ui.onThisPage}</p>
              <ol className="mt-3 grid gap-x-8 gap-y-2 text-[0.9375rem] sm:grid-cols-2">
                {g.sections.map((s, i) => (
                  <li key={s.heading} className="flex gap-2.5">
                    <span className="w-5 shrink-0 text-end font-semibold tabular-nums text-dv-teal">{i + 1}</span>
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
              {s.table && <SectionTableView table={s.table} locale={L} />}
              {s.after?.map((p, j) => (
                <p key={j} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">
                  <RichText text={p} locale={L} />
                </p>
              ))}
            </section>
          ))}

          {g.category === "rules" && (
            <div className="mt-14">
              <CheckerCallout locale={L} />
            </div>
          )}

          {commercial && (
            <div className="mt-14">
              <CommercialLinks locale={L} pages={[commercial]} />
            </div>
          )}

          <div className="mt-16">
            <GuideCta locale={L} />
          </div>

          <section className="mt-16">
            <h2 className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{ui.faq}</h2>
            <div className="mt-6 divide-y divide-dv-line border-y border-dv-line">
              {g.faq.map((f, i) => (
                <details key={f.q} className="group" open={i === 0}>
                  <summary className="flex cursor-pointer items-start justify-between gap-6 py-5 text-start font-semibold leading-snug text-dv-ink">
                    {f.q}
                    <span aria-hidden="true" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-dv-teal ring-1 ring-dv-line transition-transform duration-300 group-open:rotate-45">
                      <Plus className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="-mt-1 pb-6 pe-12 leading-relaxed text-dv-body">
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
                <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-dv-teal transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
          <li>
            <Link href={dvHref(GUIDES_INDEX_PATH[L])} className="dv-card group flex h-full items-start justify-between gap-4 p-5 font-semibold leading-snug text-dv-teal">
              {ui.allGuides}
              <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      </nav>
    </main>
  );
}
