import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  AudioWaveform,
  BadgeCheck,
  Check,
  Clock3,
  Download,
  MessageCircleQuestion,
  Plus,
  ShieldCheck,
  Stethoscope,
  TriangleAlert,
  X,
} from "lucide-react";
import { LANDING, LANDING_PATH, LANGUAGE_NAME, SAMPLE_VIDEOS, guidePath, guidesFor, type Locale } from "@/content/dentvideo";
import { appText } from "@/content/dentvideo-app";
import { landingJsonLd } from "@/lib/dentvid/seo";
import { HeroVideo, PhoneFrame } from "./phone";

const sample = (slug: string, ext: "mp4" | "jpg") => `/dentvideo/samples/${slug}.${ext}`;
const duration = (s: number) => `0:${String(s).padStart(2, "0")}`;

/** The seven production languages, as codes (shown in the "your clinic" visual). */
const LANGUAGE_CODES = ["EN", "DE", "ES", "FR", "IT", "PT", "TR"];

/** Section heading in the display serif. */
function H2({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <h2 id={id} className={`dv-display text-balance text-[2.375rem] leading-[1.05] sm:text-5xl lg:text-[3.5rem] ${className}`}>
      {children}
    </h2>
  );
}

function Hero({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  const chrome = appText(locale).chrome;
  const hero = SAMPLE_VIDEOS[0];
  return (
    <section className="relative isolate overflow-hidden">
      {/* backdrop: faint grid + two soft glows */}
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
      <div aria-hidden="true" className="absolute -right-40 top-10 -z-10 h-[34rem] w-[34rem] rounded-full bg-[#cfe6e0] opacity-70 blur-3xl" />
      <div aria-hidden="true" className="absolute -left-48 top-64 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#f3e3cc] opacity-60 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-16 px-4 pb-20 pt-10 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-10 lg:pb-28 lg:pt-20">
        <div className="min-w-0">
          <p className="dv-rise inline-flex items-center gap-2 rounded-full bg-white/80 py-1.5 pl-2 pr-3.5 text-sm font-medium text-dv-teal shadow-[0_1px_2px_rgba(20,33,31,0.05)] ring-1 ring-dv-line backdrop-blur">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-dv-teal-50">
              <span className="h-1.5 w-1.5 rounded-full bg-dv-teal" />
            </span>
            {c.hero.eyebrow}
          </p>
          <h1 className="dv-display dv-rise-2 mt-6 text-balancemax-w-[14ch] text-[2.75rem] leading-[1.02] text-dv-ink sm:text-6xl lg:max-w-[13ch] lg:text-[4.75rem] lg:leading-[0.98]">
            {c.hero.h1}
          </h1>
          <p className="dv-rise-3 mt-7 max-w-xl text-[1.0625rem] leading-relaxed text-dv-body sm:text-lg">{c.hero.lead}</p>
          <div className="dv-rise-3 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={`/dentvideo/start?lang=${locale}`} className="dv-btn dv-btn-primary group px-7 py-4 text-base">
              {c.hero.cta}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
            <a href="#how" className="dv-btn dv-btn-secondary px-6 py-4 text-base">{chrome.howItWorks}</a>
          </div>
          <p className="mt-6 flex items-center gap-2 text-sm text-dv-muted">
            <Check className="h-4 w-4 text-dv-teal" aria-hidden="true" />
            {c.hero.note}
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[22rem] lg:max-w-none">
          <div className="relative mx-auto w-[15.5rem] sm:w-[17.5rem] lg:w-[18.5rem]">
            <PhoneFrame>
              <HeroVideo src={sample(hero.slug, "mp4")} poster={sample(hero.slug, "jpg")} title={hero.name} labels={c.video} />
            </PhoneFrame>
          </div>

          {/* The patient's question… */}
          <div aria-hidden="true" className="dv-float absolute -left-1 -top-6 z-20 w-max max-w-[12rem] sm:-left-10 sm:top-8 sm:max-w-[13.5rem] lg:-left-16">
            <div className="dv-card flex items-start gap-2.5 p-3 pr-3.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dv-sand text-dv-teal">
                <MessageCircleQuestion className="h-4 w-4" />
              </span>
              <p className="text-[0.8125rem] font-semibold leading-snug text-dv-ink">{c.mock.hook}</p>
            </div>
          </div>

          {/* …answered, and checked before the dentist sees it. */}
          <div className="dv-float-slow absolute -bottom-14 -right-1 z-20 w-[13rem] sm:-right-8 sm:bottom-6 sm:w-[14.5rem] lg:-right-6">
            <div className="dv-card p-4">
              <p className="flex items-center gap-2 text-[0.8125rem] font-semibold text-dv-ink">
                <BadgeCheck className="h-[1.125rem] w-[1.125rem] text-dv-teal" aria-hidden="true" />
                {c.mock.label}
              </p>
              <ul className="mt-3 space-y-2 border-t border-dv-line pt-3">
                {c.checks.items.map((it) => (
                  <li key={it.title} className="flex items-center gap-2 text-xs font-medium text-dv-body">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-dv-teal text-white">
                      <Check className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden="true" />
                    </span>
                    {it.title}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const PROBLEM_ICONS = [Clock3, TriangleAlert, BadgeCheck];

function Problem({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <div className="grid gap-4 md:grid-cols-3">
        {c.problem.map((p, i) => {
          const Icon = PROBLEM_ICONS[i] ?? BadgeCheck;
          const last = i === c.problem.length - 1;
          return (
            <div
              key={p.title}
              className={
                last
                  ? "dv-grain relative overflow-hidden rounded-[1.25rem] bg-dv-teal p-7 text-[#f7f1e7] shadow-[0_24px_48px_-28px_rgba(15,92,92,0.8)]"
                  : "dv-card p-7"
              }
            >
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${last ? "bg-white/10 text-[#bfe3dc] ring-1 ring-white/15" : "bg-dv-sand text-dv-teal ring-1 ring-dv-line"}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className={`mt-5 text-lg font-semibold tracking-tight ${last ? "text-white" : "text-dv-ink"}`}>{p.title}</h2>
              <p className={`mt-2 leading-relaxed ${last ? "text-[#cfe2df]" : "text-dv-body"}`}>{p.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* --- "How it works" visuals: no words, only the product's shapes. --- */

function ClinicVisual() {
  return (
    <div className="dv-card mx-auto w-[85%] max-w-[16rem] p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e9dfcf]">
          <span className="h-3.5 w-3.5 rounded-[4px] bg-[#b6774f]" />
        </span>
        <div className="flex-1 space-y-1.5">
          <span className="block h-2 w-3/4 rounded-full bg-dv-ink/80" />
          <span className="block h-1.5 w-1/2 rounded-full bg-dv-ink/15" />
        </div>
      </div>
      <div className="mt-4 flex gap-1.5">
        {["#0f5c5c", "#8fd1c6", "#b6774f", "#efe7da"].map((c) => (
          <span key={c} className="h-6 flex-1 rounded-md ring-1 ring-black/5" style={{ background: c }} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {LANGUAGE_CODES.map((l, i) => (
          <span key={l} className={`rounded-md px-1.5 py-0.5 text-[0.625rem] font-semibold tracking-wide ${i === 0 ? "bg-dv-teal text-white" : "bg-dv-sand text-dv-muted"}`}>
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

function WeekVisual() {
  const posters = [SAMPLE_VIDEOS[1].slug, SAMPLE_VIDEOS[0].slug, SAMPLE_VIDEOS[2].slug];
  return (
    <div className="flex items-end justify-center">
      {[0, 1, 2, 3, 4].map((i) => {
        const slug = i >= 1 && i <= 3 ? posters[i - 1] : null;
        const rot = [-10, -5, 0, 5, 10][i];
        const lift = [10, 3, 0, 3, 10][i];
        return (
          <div
            key={i}
            className={`relative -mx-2.5 aspect-[9/16] w-[3.6rem] overflow-hidden rounded-xl bg-gradient-to-b from-[#1a6b66] to-[#0b3f3e] shadow-[0_10px_20px_-10px_rgba(8,46,45,0.6)] ring-2 ring-white sm:w-16 ${i === 2 ? "z-10 w-[4.25rem] sm:w-[4.6rem]" : ""}`}
            style={{ transform: `rotate(${rot}deg) translateY(${lift}px)` }}
          >
            {slug ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sample(slug, "jpg")} alt="" loading="lazy" className="h-full w-full object-cover" />
            ) : (
              <span className="absolute inset-x-2 top-1/2 space-y-1">
                <span className="block h-1 w-full rounded-full bg-white/70" />
                <span className="block h-1 w-2/3 rounded-full bg-white/50" />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ApproveVisual() {
  return (
    <div className="dv-card mx-auto flex w-[85%] max-w-[16rem] items-center gap-3 p-3">
      <div className="relative aspect-[9/16] w-14 shrink-0 overflow-hidden rounded-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={sample(SAMPLE_VIDEOS[2].slug, "jpg")} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block h-2 w-full rounded-full bg-dv-ink/75" />
        <span className="mt-1.5 block h-1.5 w-2/3 rounded-full bg-dv-ink/15" />
        <div className="mt-3 flex items-center gap-1.5">
          <span className="flex h-7 flex-1 items-center justify-center rounded-full bg-dv-teal text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-dv-muted ring-1 ring-dv-line">
            <X className="h-3.5 w-3.5" />
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-dv-muted ring-1 ring-dv-line">
            <Download className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

const STEP_VISUALS = [ClinicVisual, WeekVisual, ApproveVisual];

function How({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <H2 className="max-w-2xl">{c.how.heading}</H2>
      <ol className="mt-12 grid gap-5 md:grid-cols-3 lg:mt-16">
        {c.how.steps.map((s, i) => {
          const Visual = STEP_VISUALS[i] ?? ClinicVisual;
          return (
            <li key={s.title} className="dv-card flex flex-col overflow-hidden">
              <div aria-hidden="true" className="relative flex h-48 items-center justify-center overflow-hidden bg-gradient-to-b from-dv-sand to-[#f8f4ee]">
                <div className="dv-grid absolute inset-0 opacity-70" />
                <div className="relative w-full">
                  <Visual />
                </div>
              </div>
              <div className="flex flex-1 flex-col p-7">
                <span className="dv-display text-[1.75rem] leading-none text-dv-teal">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-dv-ink">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-dv-body">{s.text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Samples({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  return (
    <section id="samples" className="dv-grain relative overflow-hidden border-y border-dv-line bg-dv-sand">
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-end">
          <H2>{c.samples.heading}</H2>
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-dv-body lg:justify-self-end">{c.samples.text}</p>
        </div>
        <ul className="-mx-4 mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-8 sm:overflow-visible sm:px-0 lg:mt-16 lg:gap-12">
          {SAMPLE_VIDEOS.map(({ slug, name, seconds }) => (
            <li key={slug} className="w-[72%] shrink-0 snap-center sm:w-auto">
              <PhoneFrame className="mx-auto max-w-[18rem]">
                <video
                  src={sample(slug, "mp4")}
                  poster={sample(slug, "jpg")}
                  controls
                  playsInline
                  preload="none"
                  aria-label={name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </PhoneFrame>
              <div className="mx-auto mt-5 flex max-w-[18rem] items-start justify-between gap-3">
                <p className="text-[0.9375rem] font-semibold leading-snug text-dv-ink">{name}</p>
                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-dv-muted ring-1 ring-dv-line">{duration(seconds)}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-sm text-dv-muted">{c.samples.note}</p>
      </div>
    </section>
  );
}

const CHECK_ICONS = [ShieldCheck, Stethoscope, AudioWaveform];

function Checks({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  return (
    <section className="dv-on-dark dv-grain relative isolate overflow-hidden bg-dv-teal-900 text-[#f7f1e7]">
      <div aria-hidden="true" className="absolute -left-32 -top-32 -z-10 h-[30rem] w-[30rem] rounded-full bg-[#167269] opacity-50 blur-3xl" />
      <div aria-hidden="true" className="absolute -bottom-40 right-0 -z-10 h-[26rem] w-[26rem] rounded-full bg-[#0f5c5c] opacity-70 blur-3xl" />
      <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-[#bfe3dc] ring-1 ring-white/15">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <H2 className="mt-6 max-w-3xl text-white">{c.checks.heading}</H2>
        <div className="mt-12 grid gap-4 md:grid-cols-3 lg:mt-16">
          {c.checks.items.map((it, i) => {
            const Icon = CHECK_ICONS[i] ?? ShieldCheck;
            return (
              <div key={it.title} className="rounded-[1.25rem] bg-white/[0.06] p-7 ring-1 ring-inset ring-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8fd1c6]/15 text-[#bfe3dc]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span aria-hidden="true" className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8fd1c6] text-dv-teal-900">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-semibold tracking-tight text-white">{it.title}</h3>
                <p className="mt-2 leading-relaxed text-[#cfe2df]">{it.text}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Pricing({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <div className="dv-card relative isolate overflow-hidden px-6 py-14 text-center sm:px-12 sm:py-20">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute left-1/2 top-0 -z-10 h-72 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#cfe6e0] opacity-80 blur-3xl" />
        <H2 className="mx-auto max-w-2xl">{c.pricing.heading}</H2>
        <p className="mx-auto mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-dv-body">{c.pricing.text}</p>
        <Link href={`/dentvideo/start?lang=${locale}`} className="dv-btn dv-btn-primary group mt-9 px-7 py-4 text-base">
          {c.pricing.cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
        <p className="mt-5 flex items-center justify-center gap-2 text-sm text-dv-muted">
          <Check className="h-4 w-4 text-dv-teal" aria-hidden="true" />
          {c.hero.note}
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
    <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 sm:pb-32">
      <h2 className="dv-display text-[2rem] leading-tight sm:text-[2.5rem]">{c.guidesHeading}</h2>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {guides.map((g) => (
          <li key={g.slug}>
            <Link href={guidePath(g)} className="dv-card group flex h-full flex-col p-6 transition-shadow hover:shadow-[0_0_0_1px_rgba(15,92,92,0.35),0_18px_40px_-20px_rgba(15,92,92,0.35)]">
              <span className="flex items-start justify-between gap-4">
                <span className="font-semibold leading-snug text-dv-ink">{g.h1}</span>
                <ArrowUpRight className="mt-0.5 h-5 w-5 shrink-0 text-dv-teal transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
              <span className="mt-3 block text-sm leading-relaxed text-dv-body">{g.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Faq({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  return (
    <section className="border-t border-dv-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-24 sm:px-6 sm:py-32 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
        <div>
          <H2 className="lg:sticky lg:top-28">{c.faqHeading}</H2>
        </div>
        <div className="divide-y divide-dv-line border-y border-dv-line">
          {c.faq.map((f, i) => (
            <details key={f.q} className="group" open={i === 0}>
              <summary className="flex cursor-pointer items-start justify-between gap-6 py-6 text-left text-[1.0625rem] font-semibold leading-snug text-dv-ink">
                {f.q}
                <span aria-hidden="true" className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-dv-teal ring-1 ring-dv-line transition-transform duration-300 group-open:rotate-45">
                  <Plus className="h-4 w-4" />
                </span>
              </summary>
              <p className="-mt-1 max-w-2xl pb-7 pr-12 leading-relaxed text-dv-body">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DentVideoLanding({ locale }: { locale: Locale }) {
  return (
    <main lang={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd(locale)) }} />
      <Hero locale={locale} />
      <Problem locale={locale} />
      <How locale={locale} />
      <Samples locale={locale} />
      <Checks locale={locale} />
      <Pricing locale={locale} />
      <Guides locale={locale} />
      <Faq locale={locale} />
      <LanguageSwitcher current={locale} />
    </main>
  );
}

export function LanguageSwitcher({ current }: { current: Locale }) {
  return (
    <nav aria-label="Language" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <ul className="flex flex-wrap gap-2 text-sm">
        {(Object.keys(LANDING_PATH) as Locale[]).map((l) => (
          <li key={l}>
            {l === current ? (
              <span className="dv-chip inline-flex rounded-full bg-dv-teal px-3.5 py-1.5 font-semibold text-white" aria-current="page">{LANGUAGE_NAME[l]}</span>
            ) : (
              <Link href={LANDING_PATH[l]} hrefLang={l} lang={l} className="dv-chip inline-flex rounded-full bg-white px-3.5 py-1.5 font-medium text-dv-body ring-1 ring-dv-line transition hover:text-dv-ink hover:ring-dv-edge">
                {LANGUAGE_NAME[l]}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
