import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Plus } from "lucide-react";
import { LANDING_PATH, dirOf, findGuide, guidePath, type Locale } from "@/content/dentvideo";
import { sampleSrc, samplesFor } from "@/content/dentvideo-samples";
import { reviewedDate, sectionId } from "@/content/guides/text";
import { ABOUT_PATH, GUIDE_UI } from "@/content/guides/ui";
import { solutionPath, solutionsFor, type SolutionPage } from "@/content/solutions";
import { SOLUTION_UI } from "@/content/solutions/ui";
import { solutionJsonLd } from "@/lib/dentvid/seo-guides";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, Byline, GuideCta, HtmlLang, RichText, SectionTableView } from "./guide-parts";
import { GuideScriptFont } from "./font-guide";
import { PhoneFrame } from "./phone";

/**
 * A commercial page (/videos/<slug>): what DentVideo does for one search, with
 * the real sample videos, the checks, a comparison table where there is one,
 * an FAQ and the guides to read next. Server-rendered; the only media are the
 * sample videos, which load nothing until played (preload="none").
 */
export function SolutionView({ p }: { p: SolutionPage }) {
  const L = p.locale;
  const ui = SOLUTION_UI[L];
  const gui = GUIDE_UI[L];
  const samples = p.kind === "product" ? samplesFor(L) : undefined;
  const guides = p.guides.map(findGuide).filter((g): g is NonNullable<typeof g> => !!g && g.locale === L);
  const siblings = solutionsFor(L).filter((o) => o.slug !== p.slug);

  return (
    <main lang={L} dir={dirOf(L)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(solutionJsonLd(p)) }} />
      <HtmlLang locale={L} />
      <GuideScriptFont locale={L} />

      <header className="relative isolate overflow-hidden border-b border-dv-line">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute -end-40 -top-20 -z-10 h-96 w-96 rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-14">
          <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[L] }, { name: p.nav }]} />
          <h1 className="dv-display mt-6 text-balance text-[2.25rem] leading-[1.05] text-dv-ink sm:text-[3.25rem]">{p.h1}</h1>
          <p className="mt-6 text-lg leading-relaxed text-dv-body sm:text-xl">
            <RichText text={p.intro} locale={L} />
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link href={dvHref(`/dentvideo/start?lang=${L}`)} className="dv-btn dv-btn-primary group px-6 py-3.5">
              {ui.preview}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
            </Link>
            <Link href={dvHref(`${LANDING_PATH[L]}#pricing`)} className="rounded-md font-semibold text-dv-teal underline-offset-4 hover:underline">
              {ui.pricing}
            </Link>
          </div>
          <p className="mt-6 text-sm text-dv-muted">
            <Byline locale={L} reviewed={reviewedDate(p)} />
          </p>
        </div>
      </header>

      {samples && (
        <section aria-labelledby="samples" className="border-b border-dv-line bg-dv-sand">
          <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
            <h2 id="samples" className="text-balance text-[1.5rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.75rem]">{ui.samplesHeading}</h2>
            {/* On phones this row scrolls sideways, so keyboard users can focus and scroll it too. */}
            <ul tabIndex={0} aria-label={ui.samplesHeading} className="-mx-4 mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto rounded-2xl px-4 pb-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dv-teal sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0">
              {samples.map(({ slug, name }) => (
                <li key={slug} className="w-[62%] shrink-0 snap-center sm:w-auto">
                  <PhoneFrame className="mx-auto max-w-[15rem]">
                    <video
                      src={sampleSrc(L, slug, "mp4")}
                      poster={sampleSrc(L, slug, "jpg")}
                      controls
                      playsInline
                      preload="none"
                      aria-label={name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </PhoneFrame>
                  <p className="mx-auto mt-4 max-w-[15rem] text-[0.9375rem] font-semibold leading-snug text-dv-ink">{name}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-dv-muted">{ui.samplesNote}</p>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-4 sm:px-6">
        {p.table && (
          <section className="mt-12">
            <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" tabIndex={0} role="region" aria-label={p.table.caption}>
              <table className="w-full min-w-[40rem] border-separate border-spacing-0 overflow-hidden rounded-2xl bg-white text-start text-[0.9375rem] ring-1 ring-dv-line">
                <caption className="pb-4 text-start text-[1.25rem] font-semibold text-dv-ink">{p.table.caption}</caption>
                <thead>
                  <tr>
                    <th scope="col" className="w-[9rem] border-b border-dv-line p-3 text-start" />
                    {p.table.columns.map((c, i) => (
                      <th key={c} scope="col" className={`border-b border-dv-line p-3 text-start font-semibold ${i === 0 ? "bg-dv-teal-50 text-dv-teal" : "text-dv-ink"}`}>
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {p.table.rows.map((r) => (
                    <tr key={r.label}>
                      <th scope="row" className="border-b border-dv-line p-3 text-start align-top font-semibold text-dv-ink">{r.label}</th>
                      {r.values.map((v, i) => (
                        <td key={i} className={`border-b border-dv-line p-3 align-top leading-relaxed ${i === 0 ? "bg-dv-teal-50/60 text-dv-ink" : "text-dv-body"}`}>
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {p.table.note && <p className="mt-3 text-sm leading-relaxed text-dv-muted">{p.table.note}</p>}
            <p className="mt-2 text-xs leading-relaxed text-dv-muted">{ui.trademarks}</p>
          </section>
        )}

        {p.sections.map((s, i) => (
          <section key={s.heading} id={sectionId(s.heading, i)} className="mt-12 scroll-mt-24 sm:mt-14">
            <h2 className="text-balance text-[1.5rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.75rem]">{s.heading}</h2>
            {s.paragraphs.map((para, j) => (
              <p key={j} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">
                <RichText text={para} locale={L} />
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
            {s.after?.map((para, j) => (
              <p key={j} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">
                <RichText text={para} locale={L} />
              </p>
            ))}
          </section>
        ))}

        <section className="mt-16">
          <h2 className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{gui.faq}</h2>
          <div className="mt-6 divide-y divide-dv-line border-y border-dv-line">
            {p.faq.map((f, i) => (
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

        <div className="mt-16">
          <GuideCta locale={L} />
        </div>
      </div>

      <nav aria-label={ui.readNext} className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        <h2 className="text-lg font-semibold text-dv-ink">{ui.readNext}</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {siblings.map((o) => (
            <li key={o.slug}>
              <CardLink href={solutionPath(o)} label={o.h1} />
            </li>
          ))}
          {guides.map((g) => (
            <li key={g.slug}>
              <CardLink href={guidePath(g)} label={g.h1} />
            </li>
          ))}
          <li>
            <CardLink href={ABOUT_PATH[L]} label={GUIDE_UI[L].about} teal />
          </li>
        </ul>
      </nav>
    </main>
  );
}

function CardLink({ href, label, teal = false }: { href: string; label: string; teal?: boolean }) {
  return (
    <Link href={dvHref(href)} className={`dv-card group flex h-full items-start justify-between gap-4 p-5 font-semibold leading-snug ${teal ? "text-dv-teal" : "text-dv-ink"}`}>
      {label}
      <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-dv-teal transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
    </Link>
  );
}

/**
 * The link from a guide, a hub or the About page to the commercial page(s) of
 * that language, with a descriptive anchor (what the page is, not "click here").
 */
export function CommercialLinks({ locale, pages }: { locale: Locale; pages: SolutionPage[] }) {
  if (pages.length === 0) return null;
  const ui = SOLUTION_UI[locale];
  return (
    <aside aria-label={ui.forClinics} className="rounded-2xl bg-white p-5 ring-1 ring-dv-line sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-dv-muted">{ui.forClinics}</p>
      <ul className="mt-3 space-y-4">
        {pages.map((p) => (
          <li key={p.slug}>
            <Link href={dvHref(solutionPath(p))} className="group inline-flex items-start gap-2 text-[1.0625rem] font-semibold leading-snug text-dv-teal underline decoration-dv-teal/30 underline-offset-[3px] hover:decoration-dv-teal">
              {p.anchor}
              <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 no-underline rtl:-scale-x-100" aria-hidden="true" />
            </Link>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-dv-body">{p.blurb}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
