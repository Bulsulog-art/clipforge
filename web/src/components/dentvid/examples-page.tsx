import Link from "next/link";
import { ArrowRight, ArrowUpRight, Info, Plus } from "lucide-react";
import { LANDING_PATH, LANGUAGE_NAME, dirOf, type Locale } from "@/content/dentvideo";
import {
  EXAMPLES_PATH,
  EXAMPLES_UI,
  examplePath,
  examplePosterSrc,
  exampleTranslations,
  exampleVideoSrc,
  examplesFor,
  sampleOf,
  type ExampleVideo,
} from "@/content/dentvideo-examples";
import { GUIDE_UI } from "@/content/guides/ui";
import { exampleJsonLd, examplesHubJsonLd, jsonLdHtml } from "@/lib/dentvid/seo-guides";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, HtmlLang } from "./guide-parts";
import { PhoneFrame } from "./phone";

/**
 * The examples showcase: the sample videos, each on a page of its own, shown
 * and never handed out — a watch-only player (no download button, no embed
 * code), the poster until played, nothing fetched before the visitor asks
 * (preload="none"). Server-rendered; no client JavaScript of its own.
 */

/** A watch-only player: native controls without the download item, no picture-in-picture. */
function WatchOnlyVideo({ e, label }: { e: ExampleVideo; label: string }) {
  return (
    <video
      src={exampleVideoSrc(e)}
      poster={examplePosterSrc(e)}
      controls
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      playsInline
      preload="none"
      aria-label={label}
      className="absolute inset-0 h-full w-full object-cover"
      data-testid="example-player"
    />
  );
}

function Cta({ locale, where }: { locale: Locale; where: string }) {
  const ui = EXAMPLES_UI[locale];
  return (
    <aside className="dv-on-dark relative isolate overflow-hidden rounded-[1.25rem] bg-dv-teal-900 p-6 text-[#f7f1e7] sm:p-8" data-testid={`examples-cta-${where}`}>
      <p className="text-balance text-xl font-semibold leading-snug text-white sm:text-2xl">{ui.cta.title}</p>
      <p className="mt-3 max-w-2xl leading-relaxed text-[#cfe2df]">{ui.cta.text}</p>
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link href={dvHref(`/dentvideo/start?lang=${locale}`)} className="dv-btn dv-btn-light group px-6 py-3.5" data-cta="examples">
          {ui.cta.button}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
        </Link>
        <Link href={dvHref(`${LANDING_PATH[locale]}#pricing`)} className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-[#8fd1c6] underline-offset-4 hover:underline">
          {ui.cta.secondary}
        </Link>
      </div>
    </aside>
  );
}

/** "28 seconds" in the language of the page it is shown on. */
function Seconds({ locale, seconds }: { locale: Locale; seconds: number }) {
  return (
    <span className="tabular-nums" data-example-seconds>
      {EXAMPLES_UI[locale].seconds.replace("{s}", String(Math.round(seconds)))}
    </span>
  );
}

/**
 * On phones the poster sits beside the title, one card per row (a full-width 9:16 poster per card made
 * the hub over two thousand pixels tall, and two-up cards broke words mid-word); from sm up it stacks,
 * three cards across, each wide enough for its title. `eager`: the hub's first cards.
 *
 * A card from another language keeps its title in that language (lang and dir on the title alone);
 * the card itself and its length ("28 seconds") follow the page the visitor is reading. The title is
 * aligned to the page's side too: by its own direction alone, an Arabic title that wraps on an
 * English page went to the right while a short one stayed left, and both left the length behind.
 */
function ExampleCard({ e, pageLocale, eager = false }: { e: ExampleVideo; pageLocale: Locale; eager?: boolean }) {
  const s = sampleOf(e);
  return (
    <Link href={dvHref(examplePath(e))} className="dv-card dv-lift group flex h-full items-center gap-4 overflow-hidden p-4 sm:flex-col sm:items-stretch sm:gap-0">
      {/* The poster only: the card links to the video's page, where it plays. */}
      {/* The `eager` cards are the hub's first screen (the desktop LCP): fetched by the preload scanner, not lazily after layout. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={examplePosterSrc(e)} alt="" width={1080} height={1920} loading={eager ? "eager" : "lazy"} decoding="async" className="aspect-[9/16] w-24 shrink-0 rounded-xl bg-dv-sand object-cover sm:w-full" />
      <span className="flex min-w-0 flex-1 flex-col sm:mt-4">
        <span className="flex items-start justify-between gap-3">
          {/* Whole words; break-words only as a last resort, so a long word can never push the arrow out of the card. */}
          <span className={`min-w-0 break-words font-semibold leading-snug text-dv-ink ${dirOf(pageLocale) === "rtl" ? "text-right" : "text-left"}`} lang={e.locale} dir={dirOf(e.locale)} data-example-title>
            {s.name}
          </span>
          <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-dv-teal transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
        </span>
        <span className="mt-1 text-sm text-dv-muted">
          <Seconds locale={pageLocale} seconds={s.seconds} />
        </span>
      </span>
    </Link>
  );
}

/** dentvideo.com/examples (and /de/examples …): this language's sample videos, then the other languages'. */
export function ExamplesHub({ locale }: { locale: Locale }) {
  const ui = EXAMPLES_UI[locale];
  const mine = examplesFor(locale);
  return (
    <main lang={locale} dir={dirOf(locale)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(examplesHubJsonLd(locale)) }} />
      <HtmlLang locale={locale} />
      <header className="relative isolate overflow-hidden border-b border-dv-line">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute -end-40 -top-20 -z-10 h-96 w-96 rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-14">
          <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[locale] }, { name: ui.nav }]} locale={locale} />
          <h1 className="dv-display mt-6 max-w-4xl text-balance text-[2.25rem] leading-[1.05] text-dv-ink sm:text-[3.25rem]">{ui.h1}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-dv-body sm:text-xl">{ui.intro}</p>
          <div className="mt-7">
            <Link href={dvHref(`/dentvideo/start?lang=${locale}`)} className="dv-btn dv-btn-primary group px-6 py-3.5" data-cta="examples-hero">
              {ui.cta.button}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <section className="mt-12" aria-label={ui.nav}>
          <ul className="grid gap-5 sm:grid-cols-3" data-testid="examples-own">
            {mine.map((e) => (
              <li key={e.slug}>
                <ExampleCard e={e} pageLocale={locale} eager />
              </li>
            ))}
          </ul>
          <p className="mt-5 flex items-start gap-2 text-sm leading-relaxed text-dv-muted">
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {ui.demoNote} {ui.viewOnly}
            </span>
          </p>
        </section>

        <div className="mt-14">
          <Cta locale={locale} where="hub" />
        </div>

        <section className="mt-16" aria-labelledby="other-languages">
          <h2 id="other-languages" className="text-[1.5rem] font-semibold leading-snug tracking-tight text-dv-ink sm:text-[1.75rem]">{ui.moreHeading}</h2>
          {/* One language per row: three cards across the page, as wide as the hub's own (two languages side by side made them ~150px). */}
          <div className="mt-6 grid gap-10">
            {(Object.keys(EXAMPLES_PATH) as Locale[])
              .filter((l) => l !== locale && examplesFor(l).length > 0)
              .map((l) => (
                <div key={l}>
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-dv-muted rtl:tracking-normal" lang={l}>
                    {LANGUAGE_NAME[l]}
                  </h3>
                  <ul className="mt-3 grid gap-4 sm:grid-cols-3">
                    {examplesFor(l).map((e) => (
                      <li key={e.slug}>
                        <ExampleCard e={e} pageLocale={locale} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </section>

        <section className="mt-16 max-w-3xl">
          <h2 className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">{GUIDE_UI[locale].faq}</h2>
          <div className="mt-6 divide-y divide-dv-line border-y border-dv-line">
            {ui.faq.map((f, i) => (
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
      </div>
    </main>
  );
}

/** dentvideo.com/examples/<slug> (and /de/examples/<slug> …): one sample video, what it covers, and the way to get your own. */
export function ExampleView({ e }: { e: ExampleVideo }) {
  const L = e.locale;
  const ui = EXAMPLES_UI[L];
  const s = sampleOf(e);
  const siblings = examplesFor(L).filter((o) => o.slug !== e.slug);
  const translations = exampleTranslations(e).filter((o) => o.locale !== L);
  return (
    <main lang={L} dir={dirOf(L)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(exampleJsonLd(e)) }} />
      <HtmlLang locale={L} />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-12">
        <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[L] }, { name: ui.nav, href: EXAMPLES_PATH[L] }, { name: s.name }]} locale={L} />
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-16">
          <div>
            <PhoneFrame className="mx-auto max-w-[18rem]">
              <WatchOnlyVideo e={e} label={s.name} />
            </PhoneFrame>
            <p className="mx-auto mt-4 max-w-[18rem] text-xs leading-relaxed text-dv-muted">{ui.demoNote}</p>
          </div>
          <div>
            <h1 className="dv-display text-balance text-[2rem] leading-[1.08] text-dv-ink sm:text-[2.75rem]">{e.h1}</h1>
            <p className="mt-3 text-sm text-dv-muted">
              <Seconds locale={L} seconds={s.seconds} />
            </p>
            <p className="mt-5 inline-flex items-start gap-2 rounded-xl bg-white/80 px-3.5 py-2 text-sm font-medium text-dv-ink ring-1 ring-dv-line" data-testid="example-disclaimer">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-dv-teal" aria-hidden="true" />
              {ui.disclaimer}
            </p>

            <section className="mt-8">
              <h2 className="text-[1.375rem] font-semibold leading-snug tracking-tight text-dv-ink">{ui.summaryHeading}</h2>
              <p className="mt-3 text-[1.0625rem] leading-[1.75] text-[#33423f]">{e.summary}</p>
            </section>

            <section className="mt-8">
              <h2 className="text-[1.375rem] font-semibold leading-snug tracking-tight text-dv-ink">{ui.onScreenHeading}</h2>
              <ol className="mt-4 space-y-2.5">
                {e.onScreen.map((line, i) => (
                  <li key={i} className="flex gap-3 text-[1rem] leading-relaxed text-[#33423f]">
                    <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dv-teal-50 text-xs font-semibold text-dv-teal ring-1 ring-dv-teal-100">
                      {i + 1}
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-dv-muted">{ui.viewOnly}</p>
            </section>

            <div className="mt-10">
              <Cta locale={L} where="video" />
            </div>
          </div>
        </div>

        {translations.length > 0 && (
          <nav aria-label={ui.otherLanguages} className="mt-16">
            <h2 className="text-lg font-semibold text-dv-ink">{ui.otherLanguages}</h2>
            <ul className="mt-3 flex flex-wrap gap-3">
              {translations.map((o) => (
                <li key={o.slug}>
                  <Link href={dvHref(examplePath(o))} hrefLang={o.locale} lang={o.locale} dir={dirOf(o.locale)} className="inline-flex min-h-11 items-center rounded-2xl bg-white px-4 py-2 text-sm font-semibold leading-snug text-dv-teal ring-1 ring-dv-line transition-shadow hover:ring-dv-teal">
                    {LANGUAGE_NAME[o.locale]}: {sampleOf(o).name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <nav aria-label={ui.moreHeading} className="mt-14">
          <h2 className="text-lg font-semibold text-dv-ink">{ui.moreHeading}</h2>
          <ul className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-3">
            {siblings.map((o) => (
              <li key={o.slug}>
                <ExampleCard e={o} pageLocale={L} />
              </li>
            ))}
            <li className="flex">
              <Link href={dvHref(EXAMPLES_PATH[L])} className="dv-card flex min-h-14 w-full items-center justify-center p-5 text-center font-semibold text-dv-teal">
                {ui.seeAll}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </main>
  );
}
