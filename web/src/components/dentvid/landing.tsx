import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, Mail, Minus, Plus } from "lucide-react";
import { LANDING, LANDING_PATH, LANGUAGE_NAME, LOCALES, dirOf, guidePath, guidesFor, type Locale } from "@/content/dentvideo";
import { landingSamples, sampleSrc } from "@/content/dentvideo-samples";
import { EXAMPLES_PATH, EXAMPLES_UI, examplePath } from "@/content/dentvideo-examples";
import { appText } from "@/content/dentvideo-app";
import { GROUP_CONTACT, groupMailto } from "@/content/dentvideo-group";
import { SHOWCASE } from "@/content/dentvideo-showcase";
import { OPERATOR } from "@/content/guides/operator";
import { LEGAL_NAV, legalPath } from "@/content/legal/nav";
import { GUIDES_INDEX_PATH, GUIDE_UI } from "@/content/guides/ui";
import { RULES_GUIDE_LINKS } from "@/content/landing/rules-guides";
import { LEGAL_KINDS } from "@/content/legal/types";
import { landingJsonLd } from "@/lib/dentvid/seo";
import { dvHref } from "@/lib/dentvid/host";
import { HeroVideo, PhoneFrame } from "./phone";
import { CurrencyNote, FromPrice, PriceRegion, TaxSuffix, TierPrice } from "./price";
import { SampleVideo } from "./sample-video";
import { Teaser } from "./teaser";
import { LandingView, TrackedLink, TryLink } from "./track";
import { HtmlLang } from "./guide-parts";
import { LanguageHint } from "./lang-hint";

/**
 * The DentVideo landing, in every language. One story, in the order a careful
 * owner-dentist asks it: what arrives (hero, every Monday, samples), will it
 * look like my clinic (the logo preview, right under the hero), what changes,
 * how, can it get me in trouble (control, rules), is it for me (fit, the
 * alternatives), what does it cost and can I leave (pricing, scope, before you
 * decide, who is behind it), questions, one last action.
 *
 * Everything here is a server component: static text, real images and the
 * three small client islands that were already on the page (the hero video,
 * the logo preview, the sample players). No motion beyond one entrance on the
 * hero copy (dentvideo.css); no icon wells, no flags, no drawn mock-ups.
 */

/** The landing's plan cards, in order: Starter, Practice (Group follows as "Contact us"). */
const TIER_IDS = ["starter", "practice"] as const;

const duration = (s: number) => `0:${String(s).padStart(2, "0")}`;

/** The three app screens shown in "How it works" (public/dentvideo/landing/<locale>/…), 9:16 like the phone. */
const SHOTS = ["setup", "week", "card"] as const;
const SHOT_W = 540;
const SHOT_H = 960;
const shotSrc = (locale: Locale, name: (typeof SHOTS)[number] | "review") => `/dentvideo/landing/${locale}/${name}.webp`;

/* ------------------------------------------------------------------ */
/* Type                                                                  */
/* ------------------------------------------------------------------ */

/** The one eyebrow style: small caps in teal, no pill. */
function Eyebrow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`dv-eyebrow ${className}`}>{children}</p>;
}

/** Section heading in the display serif: H2 only (cards and prices stay in the sans). */
function H2({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={`dv-display dv-h2 text-balance text-dv-ink ${className}`}>
      {children}
    </h2>
  );
}

/** A section's shell: one idea per section, the same rhythm everywhere. */
function Section({ id, labelledBy, className = "", inner = "", children }: { id?: string; labelledBy?: string; className?: string; inner?: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={`scroll-mt-20 ${className}`}>
      <div className={`mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-24 lg:py-28 ${inner}`}>{children}</div>
    </section>
  );
}

function Tick({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`mt-[0.2rem] flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-dv-teal-50 text-dv-teal ring-1 ring-inset ring-dv-teal/20 ${className}`}>
      <Check className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

function Dash({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`mt-[0.2rem] flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-[#f1ece4] text-dv-muted ring-1 ring-inset ring-dv-line ${className}`}>
      <Minus className="h-3 w-3" strokeWidth={3} />
    </span>
  );
}

/** A real screen of the app, in the phone frame. Sized, lazy, never part of the first paint. */
function Screen({ locale, name, alt, className = "" }: { locale: Locale; name: (typeof SHOTS)[number] | "review"; alt: string; className?: string }) {
  return (
    <PhoneFrame className={className} tightShadow>
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed-size WebP; next/image would add a client hop for nothing */}
      <img src={shotSrc(locale, name)} alt={alt} width={SHOT_W} height={SHOT_H} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full bg-white object-cover object-top" />
    </PhoneFrame>
  );
}

/* ------------------------------------------------------------------ */
/* §1 Hero                                                               */
/* ------------------------------------------------------------------ */

function Hero({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  const hero = landingSamples(locale)[0];
  return (
    <section className="relative isolate overflow-hidden bg-gradient-to-b from-[#f4efe6] via-[#f8f4ee] to-dv-paper">
      {/*
        Phones: what arrives, the main action and the price, then a large playing sample, then the three facts.
        From lg: the copy on the left, the phone on the right; the facts under the copy.
      */}
      <div className="mx-auto grid max-w-6xl gap-x-16 gap-y-10 px-4 pb-16 pt-8 [grid-template-areas:'text'_'phone'_'facts'] sm:px-6 sm:pt-14 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:grid-rows-[auto_1fr] lg:pb-28 lg:pt-20 lg:[grid-template-areas:'text_phone'_'facts_phone']">
        <div className="dv-rise min-w-0 [grid-area:text]">
          <Eyebrow>{c.hero.eyebrow}</Eyebrow>
          <h1 className="dv-display dv-h1 mt-4 text-balance text-dv-ink">{c.hero.h1}</h1>
          <p className="mt-5 max-w-[36rem] text-[1.0625rem] leading-relaxed text-dv-body sm:text-lg">{c.hero.lead}</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* Down to the no-account logo preview right below the hero; the sign-up is the next step from there. */}
            <TryLink locale={locale} className="dv-btn dv-btn-primary px-7 py-4 text-base">
              {c.hero.cta}
              <ArrowRight className="dv-nudge h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
            </TryLink>
            <a href="#samples" className="dv-link inline-flex min-h-11 items-center justify-center gap-1.5 font-semibold sm:justify-start">
              {c.hero.samplesLink}
              <span aria-hidden="true">↓</span>
            </a>
          </div>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-dv-muted">
            <span className="font-medium text-dv-ink">{c.hero.ctaHint}</span>
            <span aria-hidden="true"> · </span>
            <a href="#pricing" className="underline decoration-dv-line underline-offset-4 hover:decoration-dv-teal">
              <FromPrice locale={locale} template={c.pricing.from} /> <TaxSuffix locale={locale} />
            </a>
            <span aria-hidden="true"> · </span>
            {c.hero.priceNote}
          </p>
        </div>

        {/* Three short facts: a column on phones, three equal columns under the copy from sm up. */}
        <ul className="grid min-w-0 gap-3 border-t border-dv-line pt-6 [grid-area:facts] sm:grid-cols-3 sm:gap-6 lg:self-start" data-hero-points>
          {c.hero.facts.map((f) => (
            <li key={f} className="flex items-start gap-3 text-[0.9375rem] leading-snug text-dv-ink sm:gap-2.5 sm:text-sm">
              <Tick />
              {f}
            </li>
          ))}
        </ul>

        <div className="relative mx-auto w-full max-w-[15.5rem] [grid-area:phone] sm:max-w-[17rem] lg:max-w-[19.5rem] lg:self-center">
          {/* A soft halo and two hairline lens rings behind the phone (CSS only, no image). */}
          <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 -z-10 aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2">
            <div className="dv-halo absolute inset-0 rounded-full" />
            <div className="dv-rings absolute inset-[30%] max-sm:hidden" />
          </div>
          <PhoneFrame>
            {hero ? (
              <HeroVideo src={sampleSrc(locale, hero.slug, "mp4")} poster={sampleSrc(locale, hero.slug, "jpg")} title={hero.name} labels={c.video} loop={hero.hero} />
            ) : null}
          </PhoneFrame>
          {/* The app's own words, beside the phone (from md up; on a phone the video speaks for itself). */}
          <p aria-hidden="true" className="dv-glass-note absolute -start-32 top-[20%] hidden items-center gap-2.5 py-2 pe-4 ps-2 text-[0.8125rem] font-semibold text-dv-ink md:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dv-teal-50 ring-1 ring-inset ring-dv-teal/20">
              <span className="h-2 w-2 rounded-full bg-dv-teal" />
            </span>
            {c.mock.ready}
          </p>
          <p aria-hidden="true" className="dv-glass-note absolute -end-20 bottom-[18%] hidden items-center gap-2.5 py-2 pe-4 ps-2 text-[0.8125rem] font-semibold text-dv-ink md:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-dv-teal text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            {c.mock.copied}
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* §3 What arrives every Monday                                          */
/* ------------------------------------------------------------------ */

function Monday({ locale }: { locale: Locale }) {
  const m = LANDING[locale].monday;
  const week = landingSamples(locale);
  // A current-style sample other than the hero's where there is one (the older text-only ones come last).
  const current = week.filter((v) => !v.legacy);
  const shown = current[1] ?? current[0] ?? week[1];
  return (
    <Section id="monday" labelledBy="monday-heading" className="border-t border-dv-line">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-20">
        <div>
          <H2 id="monday-heading">{m.heading}</H2>
          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-dv-body">{m.lead}</p>
          {shown && (
            // The week as a small fanned stack: the sample in front, two of the others behind it (desktop only).
            <div className="relative mt-14 hidden h-[27rem] w-[19rem] lg:block">
              {week
                .filter((v) => v.slug !== shown.slug)
                .slice(0, 2)
                .map((v, i) => (
                  // eslint-disable-next-line @next/next/no-img-element -- the samples' own posters (540 × 960 JPEG), decoration
                  <img
                    key={v.slug}
                    src={sampleSrc(locale, v.slug, "jpg")}
                    alt=""
                    width={540}
                    height={960}
                    loading="lazy"
                    decoding="async"
                    className={`absolute top-6 w-[11rem] rounded-[1.5rem] object-cover opacity-90 shadow-[0_0_0_1px_rgba(20,33,31,0.08),0_24px_40px_-24px_rgba(8,46,45,0.5)] ${i === 0 ? "left-0 -rotate-6" : "right-0 rotate-6"}`}
                  />
                ))}
              <div className="absolute left-1/2 top-0 w-[13rem] -translate-x-1/2">
                <PhoneFrame tightShadow>
                  {/* eslint-disable-next-line @next/next/no-img-element -- the sample's own poster (540 × 960 JPEG) */}
                  <img src={sampleSrc(locale, shown.slug, "jpg")} alt={shown.name} width={540} height={960} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
                </PhoneFrame>
              </div>
            </div>
          )}
        </div>
        <div>
          <ol className="divide-y divide-dv-line border-y border-dv-line">
            {m.items.map((it) => (
              <li key={it.title} className="flex gap-3.5 py-3 sm:gap-4 sm:py-5">
                <Tick />
                <p className="text-[0.9375rem] leading-relaxed text-dv-body sm:text-[1.0625rem]">
                  <strong className="font-semibold text-dv-ink">{it.title}</strong> {it.text}
                </p>
              </li>
            ))}
          </ol>
          {week.length > 0 && (
            <div className="mt-8 max-sm:hidden">
              <p className="text-sm text-dv-muted">{m.exampleLabel}</p>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {week.map((v) => (
                  <li key={v.slug} className="rounded-lg bg-white px-3 py-1.5 font-medium text-dv-ink ring-1 ring-dv-line">
                    {v.topic}
                  </li>
                ))}
                <li className="rounded-lg border border-dashed border-dv-edge px-3 py-1.5 font-medium text-dv-muted">{m.more}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §4 Sample videos                                                      */
/* ------------------------------------------------------------------ */

function Samples({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  const week = landingSamples(locale);
  if (week.length === 0) return null;
  return (
    // The sideways-scrolling row below is its own compositing layer on phones: no grain on this section.
    <section id="samples" aria-labelledby="samples-heading" className="scroll-mt-20 border-y border-dv-line bg-dv-sand">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-24 lg:py-28">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
          <div>
            <H2 id="samples-heading">{c.samples.heading}</H2>
            <p className="mt-4 flex items-center gap-2 text-sm font-medium text-dv-muted">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-dv-teal" />
              {c.samples.badge}
            </p>
          </div>
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-dv-body">{c.samples.text}</p>
        </div>
        {/* On phones this row scrolls sideways, so keyboard users can focus and scroll it too. */}
        <ul tabIndex={0} aria-label={c.samples.heading} className="-mx-4 mt-10 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto rounded-2xl px-4 pb-4 [scrollbar-width:none] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-dv-teal sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0 lg:mt-14 lg:gap-12">
          {week.map(({ slug, name, seconds, topic }, i) => (
            <li key={slug} className="w-[68%] shrink-0 snap-start sm:w-auto">
              <PhoneFrame className="mx-auto max-w-[17rem]" tightShadow>
                <SampleVideo src={sampleSrc(locale, slug, "mp4")} poster={sampleSrc(locale, slug, "jpg")} title={name} playLabel={c.video.play} />
              </PhoneFrame>
              <div className="mx-auto mt-4 max-w-[17rem]">
                {/* Each sample has its own page: what it covers, its on-screen text, and how to get your own. */}
                <Link href={dvHref(examplePath({ locale, slug }))} className="block min-h-11 py-1 text-[0.9375rem] font-semibold leading-snug text-dv-ink underline decoration-dv-teal/30 underline-offset-[3px] hover:decoration-dv-teal">
                  {topic}
                </Link>
                <p className="text-[0.8125rem] text-dv-muted">
                  <span>{SHOWCASE[locale].videoOf.replace("{n}", String(i + 1))}</span>
                  <span aria-hidden="true"> · </span>
                  <span className="tabular-nums" dir="ltr">{duration(seconds)}</span>
                </p>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 sm:mt-10">
          <Link href={dvHref(EXAMPLES_PATH[locale])} className="dv-link inline-flex min-h-11 items-center gap-1.5 font-semibold" data-testid="landing-examples-link">
            {EXAMPLES_UI[locale].seeAll}
            <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* §5 What changes for your clinic                                       */
/* ------------------------------------------------------------------ */

function Value({ locale }: { locale: Locale }) {
  const v = LANDING[locale].value;
  return (
    <Section id="value" labelledBy="value-heading">
      <H2 id="value-heading" className="max-w-3xl">{v.heading}</H2>
      {/* A small bento: four equal cards, then the honest ROI line across the full width on deep teal. */}
      <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 sm:gap-5 lg:mt-14">
        {v.items.map((it, i) => (
          <div key={it.title} className="dv-card flex gap-4 p-5 sm:flex-col sm:gap-5 sm:p-8">
            <span aria-hidden="true" className="dv-index">{i + 1}</span>
            <div className="min-w-0">
              <h3 className="text-lg font-semibold leading-snug tracking-tight text-dv-ink">{it.title}</h3>
              <p className="mt-2 max-w-[34rem] leading-relaxed text-dv-body">{it.text}</p>
            </div>
          </div>
        ))}
        {/* The ROI line: honest, no figures. */}
        <figure className="dv-on-dark dv-grain relative overflow-hidden rounded-[1.25rem] bg-dv-teal-900 px-6 py-8 sm:col-span-2 sm:px-10 sm:py-11">
          <div aria-hidden="true" className="pointer-events-none absolute -end-24 -top-32 -z-10 h-80 w-80 rounded-full bg-[#167269]/50 blur-3xl" />
          <blockquote className="dv-display max-w-3xl text-balance text-[1.5rem] leading-[1.2] text-white sm:text-[2rem]">{v.roi}</blockquote>
          <figcaption className="mt-4 max-w-2xl text-sm leading-relaxed text-[#b9d3ce]">{v.roiNote}</figcaption>
        </figure>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §6 How it works                                                       */
/* ------------------------------------------------------------------ */

function How({ locale }: { locale: Locale }) {
  const h = LANDING[locale].how;
  return (
    <Section id="how" labelledBy="how-heading" className="border-t border-dv-line">
      <H2 id="how-heading">{h.heading}</H2>
      <ol className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-3 lg:gap-6">
        {h.steps.map((s, i) => (
          // Phones and tablets: the words beside a real screen; from lg: a card whose screen rises out of a tinted
          // panel (dentvideo.css .dv-step), the words under it.
          // content-start: a step whose text runs shorter than its neighbour's must not stretch its rows, or its
          // number and title drop below the others' (the three columns share one row height).
          <li key={s.title} className="dv-step grid grid-cols-[minmax(0,1fr)_7.5rem] content-start items-start gap-5 sm:grid-cols-[minmax(0,1fr)_9rem] sm:items-center sm:gap-10 lg:grid-cols-1 lg:items-start lg:gap-0">
            <div className="dv-step-panel order-2 lg:order-none">
              <Screen locale={locale} name={SHOTS[i]} alt={h.shots[i]} className="w-full" />
            </div>
            <div className="sm:max-w-md lg:max-w-none lg:px-7 lg:pb-8 lg:pt-6">
              <span aria-hidden="true" className="dv-index">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold leading-snug tracking-tight text-dv-ink">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-dv-body">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §7 You stay in control                                                */
/* ------------------------------------------------------------------ */

function Control({ locale }: { locale: Locale }) {
  const c = LANDING[locale].control;
  return (
    <Section id="control" labelledBy="control-heading" className="bg-dv-sand" inner="grid gap-10 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-center lg:gap-20">
      <div className="order-2 max-sm:hidden lg:order-none">
        <Screen locale={locale} name="review" alt={LANDING[locale].how.shots[2]} className="mx-auto w-[11.5rem] sm:w-[15rem] lg:w-[17rem]" />
      </div>
      <div>
        <H2 id="control-heading">{c.heading}</H2>
        <p className="mt-4 text-[1.0625rem] font-medium text-dv-teal">{c.lead}</p>
        <ul className="mt-6 grid gap-x-10 gap-y-3 sm:mt-8 sm:grid-cols-2 sm:gap-y-6">
          {c.points.map((p) => (
            <li key={p.title} className="flex gap-3">
              <Tick />
              {/* Phones: the six statements, read at a glance; the detail from sm up (and in the FAQ). */}
              <p className="leading-relaxed text-dv-body">
                <strong className="font-semibold text-dv-ink">{p.title}</strong> <span className="max-sm:hidden">{p.text}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §8 Advertising rules, honestly — the one dark section                 */
/* ------------------------------------------------------------------ */

function Rules({ locale }: { locale: Locale }) {
  const r = LANDING[locale].rules;
  const links = RULES_GUIDE_LINKS[locale] ?? [];
  return (
    <section id="rules" aria-labelledby="rules-heading" className="dv-on-dark dv-grain relative scroll-mt-20 overflow-hidden bg-dv-teal-900 text-[#f7f1e7]" data-rules>
      <div aria-hidden="true" className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-[#167269]/40 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-24 lg:py-28">
        <H2 id="rules-heading" className="max-w-3xl !text-white">{r.heading}</H2>
        <p className="mt-5 max-w-3xl text-[1.0625rem] leading-relaxed text-[#d5e6e2]">{r.lead}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 md:gap-5 lg:mt-14">
          <div className="rounded-[1.25rem] bg-white/[0.06] p-6 ring-1 ring-inset ring-white/10 sm:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8fd1c6]">{r.doesHeading}</h3>
            <ul className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
              {r.does.map((d) => (
                <li key={d} className="flex gap-3 text-[0.9375rem] leading-relaxed text-[#e8f1ef] sm:text-base">
                  <span aria-hidden="true" className="mt-[0.2rem] flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full bg-[#8fd1c6] text-dv-teal-900">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-[1.25rem] p-6 ring-1 ring-inset ring-white/10 sm:p-8">
            <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-[#8fd1c6]">{r.doesNotHeading}</h3>
            <ul className="mt-4 space-y-4 sm:mt-5 sm:space-y-5">
              {r.doesNot.map((d) => (
                <li key={d} className="flex gap-3 text-[0.9375rem] leading-relaxed text-[#e8f1ef] sm:text-base">
                  <span aria-hidden="true" className="mt-[0.2rem] flex h-[1.125rem] w-[1.125rem] shrink-0 items-center justify-center rounded-full ring-1 ring-inset ring-white/40 text-white/80">
                    <Minus className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {d}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-8 text-[0.9375rem] leading-relaxed text-[#d5e6e2] lg:mt-10">{r.close}</p>
        {links.length > 0 && (
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-1" data-rules-guides>
            {links.map((l) => {
              const g = guidesFor(locale).find((x) => x.slug === l.slug);
              if (!g) return null;
              return (
                <li key={l.slug}>
                  <Link href={dvHref(guidePath(g))} className="inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-white underline decoration-white/40 underline-offset-[3px] hover:decoration-white">
                    {l.label}
                    <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* §9 Who it is for                                                      */
/* ------------------------------------------------------------------ */

function Fit({ locale }: { locale: Locale }) {
  const f = LANDING[locale].fit;
  return (
    <Section id="fit" labelledBy="fit-heading">
      <H2 id="fit-heading" className="max-w-3xl">{f.heading}</H2>
      <div className="mt-10 grid gap-10 md:grid-cols-2 lg:mt-12 lg:gap-16">
        <div>
          <h3 className="text-lg font-semibold text-dv-ink">{f.yesHeading}</h3>
          <ul className="mt-4 space-y-3.5">
            {f.yes.map((y) => (
              <li key={y} className="flex gap-3 leading-relaxed text-dv-body">
                <Tick />
                {y}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-dv-ink">{f.noHeading}</h3>
          <ul className="mt-4 space-y-3.5">
            {f.no.map((n) => (
              <li key={n} className="flex gap-3 leading-relaxed text-dv-body">
                <Dash />
                {n}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §10 Comparison                                                        */
/* ------------------------------------------------------------------ */

/** "{starter} or {practice} a month", with both list prices in the visitor's currency. */
function TwoPrices({ locale, template }: { locale: Locale; template: string }) {
  const parts = template.split(/(\{starter\}|\{practice\})/);
  return (
    <>
      {parts.map((p, i) =>
        p === "{starter}" ? (
          <span key={i} dir="ltr">
            <TierPrice locale={locale} tier="starter" />
          </span>
        ) : p === "{practice}" ? (
          <span key={i} dir="ltr">
            <TierPrice locale={locale} tier="practice" />
          </span>
        ) : (
          p
        ),
      )}
    </>
  );
}

function Compare({ locale }: { locale: Locale }) {
  const { compare: c } = LANDING[locale];
  const [us, ...others] = c.columns;
  const rows = [
    ...c.rows.map((r) => ({ label: r.label, ours: r.values[0] as React.ReactNode, rest: [r.values[1], r.values[2]] })),
    { label: c.cost.label, ours: <TwoPrices locale={locale} template={c.cost.ours} />, rest: [c.cost.agency, c.cost.diy] },
  ];
  return (
    <Section id="compare" labelledBy="compare-heading" className="border-t border-dv-line">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end lg:gap-16">
        <H2 id="compare-heading">{c.heading}</H2>
        <p className="max-w-xl text-[1.0625rem] leading-relaxed text-dv-body">{c.text}</p>
      </div>

      {/* md and up: a real table, DentVideo's column tinted. */}
      <div className="dv-card mt-10 hidden overflow-hidden md:block lg:mt-14">
        <table className="w-full table-fixed border-collapse text-start">
          <caption className="sr-only">{c.heading}</caption>
          <colgroup>
            <col className="w-[20%]" />
            <col className="w-[30%]" />
            <col className="w-[25%]" />
            <col className="w-[25%]" />
          </colgroup>
          <thead>
            <tr>
              <td className="p-0" />
              <th scope="col" className="bg-dv-teal px-6 py-5 text-start text-base font-semibold tracking-tight text-white">{us}</th>
              {others.map((col) => (
                <th key={col} scope="col" className="px-6 py-5 text-start text-base font-semibold tracking-tight text-dv-ink">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-dv-line">
                <th scope="row" className="px-6 py-5 text-start align-top text-sm font-semibold text-dv-ink">{r.label}</th>
                <td className="bg-dv-teal-50 px-6 py-5 align-top text-[0.9375rem] font-medium leading-snug text-dv-ink">{r.ours}</td>
                <td className="px-6 py-5 align-top text-[0.9375rem] leading-snug text-dv-body">{r.rest[0]}</td>
                <td className="px-6 py-5 align-top text-[0.9375rem] leading-snug text-dv-body">{r.rest[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one card per row, DentVideo first, the row label kept as text. */}
      <ul className="mt-8 space-y-5 md:hidden">
        {rows.map((r) => (
          <li key={r.label} className="border-t border-dv-line pt-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">{r.label}</p>
            <p className="mt-1.5 flex gap-2 text-[0.9375rem] font-semibold leading-snug text-dv-ink">
              <Tick />
              <span>
                <span className="text-dv-teal">{us}: </span>
                {r.ours}
              </span>
            </p>
            <dl className="mt-2 grid grid-cols-2 gap-3 ps-7">
              {others.map((col, i) => (
                <div key={col}>
                  <dt className="text-xs font-semibold text-dv-muted">{col}</dt>
                  <dd className="mt-0.5 text-sm leading-snug text-dv-body">{r.rest[i]}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-dv-muted">{c.source}</p>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §11 Pricing, with what is and is not included, §12 before you decide  */
/* ------------------------------------------------------------------ */

function Pricing({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  const p = c.pricing;
  const start = dvHref(`/dentvideo/start?lang=${locale}`);
  return (
    <section id="pricing" aria-labelledby="pricing-heading" className="scroll-mt-20 border-t border-dv-line bg-gradient-to-b from-dv-paper to-[#f6f1e9]">
      {/* Shows EUR / TL instead of USD where that is what Dodo charges the visitor (the hero's "from" price too). */}
      <PriceRegion locale={locale} />
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-24 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <H2 id="pricing-heading">{p.heading}</H2>
          <p className="mx-auto mt-5 max-w-2xl text-[1.0625rem] leading-relaxed text-dv-body">{p.text}</p>
        </div>

        {/* From md: the two plans side by side, Group as a slim row across under them (it has no price to compare). */}
        <ul className="mx-auto mt-10 grid max-w-[60rem] gap-5 md:grid-cols-2 md:items-stretch lg:mt-14 lg:gap-6">
          {p.tiers.map((tier, i) => {
            const featured = i === 1;
            return (
              <li key={tier.name} data-tier={TIER_IDS[i]} className={`relative flex flex-col rounded-[1.5rem] p-7 sm:p-8 ${featured ? "dv-featured" : "dv-card"}`}>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-dv-ink">{tier.name}</h3>
                  {featured && <span className="rounded-full bg-dv-teal-50 px-3 py-1 text-xs font-semibold text-dv-teal ring-1 ring-inset ring-dv-teal/25">{p.recommended}</span>}
                </div>
                {/* Held to the same height from md up, so the prices of the side-by-side plans sit on one line. */}
                <p className="mt-1 text-sm leading-relaxed text-dv-muted md:min-h-[2lh]">{tier.blurb}</p>
                <p className="mt-5 flex flex-wrap items-baseline gap-x-1.5">
                  <span dir="ltr" className="dv-price text-[3rem] font-semibold leading-none tracking-tight text-dv-ink sm:text-[3.25rem]">
                    <TierPrice locale={locale} tier={TIER_IDS[i]} />
                  </span>
                  <span className="text-[0.9375rem] font-medium text-dv-muted">{p.perMonth}</span>
                  <span className="text-xs font-medium text-dv-muted" data-tax>
                    <TaxSuffix locale={locale} />
                  </span>
                </p>
                <ul className="mt-6 space-y-3 border-t border-dv-line pt-6">
                  {tier.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[0.9375rem] leading-snug text-dv-body">
                      <Tick />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-8">
                  <TrackedLink href={start} locale={locale} where="pricing" className={`dv-btn w-full px-5 py-3.5 text-[0.9375rem] ${featured ? "dv-btn-primary" : "dv-btn-secondary !text-dv-teal"}`}>
                    {p.cta}
                    <ArrowRight className="dv-nudge h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
                  </TrackedLink>
                </div>
              </li>
            );
          })}
          <GroupCard locale={locale} />
        </ul>

        {/* Two short facts, each with its own tick, so neither line starts with a stray separator on a phone. */}
        <ul className="mx-auto mt-8 flex max-w-4xl flex-col gap-2 text-sm text-dv-muted sm:flex-row sm:justify-center sm:gap-6">
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-dv-teal" aria-hidden="true" />
            <span>{p.cancel}</span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-dv-teal" aria-hidden="true" />
            <span>
              <CurrencyNote template={p.note} />
            </span>
          </li>
        </ul>

        {/* The fine print under the plans keeps the plans' width, so the whole block reads as one column. */}
        <div className="mx-auto max-w-[60rem]">
          <Scope locale={locale} />

          <div className="mt-6 grid gap-6">
            <Before locale={locale} />
            <details className="group h-fit rounded-[1.25rem] bg-white/70 ring-1 ring-inset ring-dv-line" data-pricing-why>
              <summary className="flex min-h-11 cursor-pointer items-start justify-between gap-6 p-6 text-lg font-semibold leading-snug text-dv-ink sm:p-8">
                {c.pricingWhy.q}
                <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-dv-teal ring-1 ring-dv-line transition-transform duration-200 group-open:rotate-45">
                  <Plus className="h-4 w-4" />
                </span>
              </summary>
              <p className="-mt-2 px-6 pb-6 leading-relaxed text-dv-body sm:px-8 sm:pb-8">{c.pricingWhy.a}</p>
            </details>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Group (multi-location): no price, no checkout — "Contact us" by email, subject in the page's language. */
function GroupCard({ locale }: { locale: Locale }) {
  const g = GROUP_CONTACT[locale];
  return (
    <li className="dv-card relative flex flex-col gap-5 p-7 sm:p-8 md:col-span-2 md:flex-row md:items-center md:gap-10" data-tier="group">
      <div className="md:w-56 md:shrink-0">
        <h3 className="text-lg font-semibold text-dv-ink">{g.name}</h3>
        <p className="mt-1 text-[0.9375rem] font-semibold leading-snug text-dv-teal">{g.price}</p>
      </div>
      <p className="border-t border-dv-line pt-5 text-[0.9375rem] leading-relaxed text-dv-body md:flex-1 md:border-s md:border-t-0 md:ps-10 md:pt-0">{g.text}</p>
      <div className="md:shrink-0">
        <a href={groupMailto(locale)} className="dv-btn dv-btn-secondary w-full px-6 py-3.5 text-[0.9375rem] !text-dv-teal md:w-auto">
          <Mail className="h-4 w-4" aria-hidden="true" />
          {g.cta}
        </a>
      </div>
    </li>
  );
}

/** Right under the plans: what a clinic gets each week, and plainly what it does not. */
function Scope({ locale }: { locale: Locale }) {
  const s = LANDING[locale].scope;
  return (
    <div className="dv-card mt-12 p-6 sm:p-8 lg:mt-16" data-scope>
      <h3 className="text-xl font-semibold tracking-tight text-dv-ink">{s.heading}</h3>
      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-dv-teal">{s.includedHeading}</p>
          <ul className="mt-3 space-y-2.5">
            {s.included.map((x) => (
              <li key={x} className="flex gap-3 leading-snug text-dv-body">
                <Tick />
                {x}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-dv-muted">{s.excludedHeading}</p>
          <ul className="mt-3 space-y-2.5">
            {s.excluded.map((x) => (
              <li key={x} className="flex gap-3 leading-snug text-dv-body">
                <Dash />
                {x}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** Risk reversal from facts that already exist: no guarantee, refund or satisfaction offer (owner decision). */
function Before({ locale }: { locale: Locale }) {
  const b = LANDING[locale].before;
  return (
    <div className="rounded-[1.25rem] bg-white/70 p-6 ring-1 ring-inset ring-dv-line sm:p-8" data-before>
      <h3 className="text-lg font-semibold text-dv-ink">{b.heading}</h3>
      <ul className="mt-5 grid gap-x-10 gap-y-4 md:grid-cols-2">
        {b.items.map((it) => (
          <li key={it.title} className="flex gap-3 leading-relaxed text-dv-body">
            <Tick />
            <p>
              <strong className="font-semibold text-dv-ink">{it.title}</strong> {it.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* §13 Who is behind DentVideo                                           */
/* ------------------------------------------------------------------ */

/**
 * Who runs DentVideo, who takes the money, what happens to the data, how to
 * leave, then patient data, the DPA and AI disclosure — facts from the legal
 * pages only, with links to them. No testimonials, logos or ratings: there are
 * none yet, and invented ones are banned.
 */
function Trust({ locale }: { locale: Locale }) {
  const t = LANDING[locale].trust;
  const nav = LEGAL_NAV[locale];
  return (
    <Section id="trust" labelledBy="trust-heading" className="border-t border-dv-line">
      <H2 id="trust-heading">{t.heading}</H2>
      <p className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-[0.9375rem] text-dv-body">
        <span>
          {t.director}: <span className="font-semibold text-dv-ink">{OPERATOR.director}</span>
        </span>
        <span>
          {t.contact}{" "}
          <a href={`mailto:${OPERATOR.productEmail}`} className="dv-link font-semibold" dir="ltr">
            {OPERATOR.productEmail}
          </a>
        </span>
      </p>
      <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {t.items.map((it) => (
          <li key={it.title} className="border-t border-dv-teal/40 pt-5">
            <h3 className="font-semibold tracking-tight text-dv-ink">{it.title}</h3>
            <p className="mt-2 text-[0.9375rem] leading-relaxed text-dv-body">{it.text}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10 rounded-[1.25rem] bg-dv-sand p-6 ring-1 ring-inset ring-dv-line sm:p-8" data-trust-data>
        <ul className="grid gap-8 md:grid-cols-3">
          {t.data.map((d) => (
            <li key={d.title}>
              <h3 className="font-semibold tracking-tight text-dv-ink">{d.title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-dv-body">{d.text}</p>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href={dvHref(legalPath("dpa", locale))} className="dv-link inline-flex min-h-11 items-center gap-1.5 font-semibold">
            {t.dpaLink}
            <ArrowUpRight className="h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </p>
      </div>
      <nav aria-label={t.legal} className="mt-6">
        <p className="flex flex-wrap items-center gap-x-4 text-sm lg:gap-y-2">
          <span className="font-medium text-dv-muted">{t.legal}:</span>
          {LEGAL_KINDS.map((k) => (
            <Link key={k} href={dvHref(legalPath(k, locale))} className="inline-flex min-h-11 items-center rounded-md font-medium text-dv-teal underline-offset-4 hover:underline lg:min-h-0">
              {nav.nav[k]}
            </Link>
          ))}
        </p>
      </nav>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* §14 FAQ, §15 final action                                             */
/* ------------------------------------------------------------------ */

function Faq({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  return (
    <Section id="faq" labelledBy="faq-heading" className="border-t border-dv-line" inner="grid gap-10 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)] lg:gap-16">
      <div>
        <div className="lg:sticky lg:top-28">
          <H2 id="faq-heading">{c.faqHeading}</H2>
          {/* Who answers when the list does not: the same words and address as "Who is behind DentVideo". */}
          <p className="mt-5 max-w-xs text-[0.9375rem] leading-relaxed text-dv-body">
            {c.trust.contact}{" "}
            <a href={`mailto:${OPERATOR.productEmail}`} className="dv-link font-semibold" dir="ltr">
              {OPERATOR.productEmail}
            </a>
          </p>
        </div>
      </div>
      <div className="divide-y divide-dv-line border-y border-dv-line">
        {c.faq.map((f, i) => (
          <details key={f.q} className="group" open={i === 0}>
            <summary className="flex min-h-11 cursor-pointer items-start justify-between gap-6 py-5 text-start text-[1.0625rem] font-semibold leading-snug text-dv-ink">
              {f.q}
              <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-dv-teal ring-1 ring-dv-line transition-transform duration-200 group-open:rotate-45">
                <Plus className="h-4 w-4" />
              </span>
            </summary>
            <p className="-mt-1 max-w-2xl pb-6 pe-10 leading-relaxed text-dv-body">{f.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

function Final({ locale }: { locale: Locale }) {
  const f = LANDING[locale].final;
  return (
    <section aria-labelledby="final-heading" className="px-4 pb-16 sm:px-6 sm:pb-24" data-final>
      {/* The page's last word on deep teal: the one action again, with the price beside it. */}
      <div className="dv-on-dark dv-grain relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] bg-dv-teal-900 px-6 py-14 text-center sm:px-10 sm:py-20">
        <div aria-hidden="true" className="pointer-events-none absolute -top-48 left-1/2 -z-10 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-[#167269]/60 blur-3xl" />
        <H2 id="final-heading" className="mx-auto max-w-2xl !text-white">{f.heading}</H2>
        <p className="mx-auto mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-[#d5e6e2]">{f.text}</p>
        <TryLink locale={locale} where="final" className="dv-btn dv-btn-light mt-9 px-7 py-4 text-base">
          {f.cta}
          <ArrowRight className="dv-nudge h-4 w-4 shrink-0 rtl:-scale-x-100" aria-hidden="true" />
        </TryLink>
        <p className="mt-5 text-sm text-[#a9c7c1]">
          <FromPrice locale={locale} template={f.small} />
        </p>
      </div>
    </section>
  );
}

function Guides({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  const guides = guidesFor(locale);
  if (guides.length === 0) return null;
  return (
    // After the final action: reading for later, just above the footer.
    <section id="guides" className="border-t border-dv-line">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="text-xl font-semibold tracking-tight text-dv-ink">{c.guidesHeading}</h2>
        <ul className="mt-6 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g, i) => (
            // Phones: the first six (the page is long enough); the hub link below has them all.
            <li key={g.slug} className={i >= 6 ? "max-sm:hidden" : undefined}>
              <Link href={dvHref(guidePath(g))} className="group flex min-h-11 items-start justify-between gap-4 border-b border-dv-line py-3 text-[0.9375rem] font-medium leading-snug text-dv-ink hover:text-dv-teal">
                <span>{g.h1}</span>
                <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-dv-teal rtl:-scale-x-100" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link href={dvHref(GUIDES_INDEX_PATH[locale])} className="dv-link inline-flex min-h-11 items-center gap-1.5 font-semibold">
            {GUIDE_UI[locale].allGuides}
            <ArrowRight className="h-4 w-4 rtl:-scale-x-100" aria-hidden="true" />
          </Link>
        </p>
      </div>
    </section>
  );
}

export function DentVideoLanding({ locale }: { locale: Locale }) {
  return (
    <main lang={locale} dir={dirOf(locale)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd(locale)) }} />
      <HtmlLang locale={locale} />
      <LandingView locale={locale} />
      {/* English only: "this page is also in <your language>", picked before the first paint (lib/dentvid/lang-hint). */}
      {locale === "en" && <LanguageHint />}
      <Hero locale={locale} />
      <Teaser locale={locale} copy={LANDING[locale].teaser} href={dvHref(`/dentvideo/start?lang=${locale}`)} />
      <Monday locale={locale} />
      <Samples locale={locale} />
      <Value locale={locale} />
      <How locale={locale} />
      <Control locale={locale} />
      <Rules locale={locale} />
      <Compare locale={locale} />
      <Pricing locale={locale} />
      {/* After the plans (dentist review 2026-11-15: pricing sat ~13 phone screens down): beside "what is and is not included". */}
      <Fit locale={locale} />
      <Trust locale={locale} />
      <Faq locale={locale} />
      <Final locale={locale} />
      <Guides locale={locale} />
      <LanguageSwitcher current={locale} label={appText(locale).chrome.language} />
    </main>
  );
}

export function LanguageSwitcher({ current, label }: { current: Locale; label: string }) {
  return (
    <nav aria-label={label} className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <ul className="flex flex-wrap gap-2 text-sm">
        {LOCALES.map((l) => (
          <li key={l}>
            {l === current ? (
              <span lang={l} className="dv-chip inline-flex min-h-11 items-center rounded-full bg-dv-teal px-4 font-semibold text-white lg:min-h-9 lg:px-3.5" aria-current="page">{LANGUAGE_NAME[l]}</span>
            ) : (
              <Link href={dvHref(LANDING_PATH[l])} hrefLang={l} lang={l} dir={dirOf(l)} className="dv-chip inline-flex min-h-11 items-center rounded-full bg-white px-4 font-medium text-dv-body ring-1 ring-dv-line transition hover:text-dv-ink hover:ring-dv-edge lg:min-h-9 lg:px-3.5">
                {LANGUAGE_NAME[l]}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
