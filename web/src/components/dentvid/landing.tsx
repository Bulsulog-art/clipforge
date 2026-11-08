import Link from "next/link";
import { LANDING, LANDING_PATH, guidePath, guidesFor, type Locale } from "@/content/dentvideo";
import { landingJsonLd } from "@/lib/dentvid/seo";

/** A pure CSS phone showing a vertical video frame with a caption line. */
function PhoneMock({ locale }: { locale: Locale }) {
  const m = LANDING[locale].mock;
  return (
    <div aria-hidden="true" className="relative mx-auto w-[220px] shrink-0 lg:w-[260px]">
      <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-[#e6efed]" />
      <div className="rounded-[2.4rem] border border-[#e8e1d5] bg-[#14211f] p-2.5 shadow-[0_30px_60px_-30px_rgba(15,92,92,0.55)]">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.9rem] bg-gradient-to-b from-[#f5efe6] via-[#faf7f2] to-[#e8e1d5]">
          <div className="absolute left-1/2 top-2 h-4 w-20 -translate-x-1/2 rounded-full bg-[#14211f]" />
          <div className="absolute inset-x-0 top-0 h-1.5 bg-[#0f5c5c]" />
          <div className="absolute left-4 top-9 flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-[#0f5c5c]" />
            <span className="h-2 w-16 rounded-full bg-[#0f5c5c]/25" />
          </div>
          {/* A seated speaker silhouette */}
          <div className="absolute bottom-[22%] left-1/2 h-[30%] w-[70%] -translate-x-1/2 rounded-t-[5rem] bg-[#0f5c5c]/85" />
          <div className="absolute left-1/2 top-[34%] h-20 w-20 -translate-x-1/2 rounded-full bg-[#d9cfbf] ring-4 ring-[#faf7f2]" />
          <div className="absolute inset-x-3 top-[18%] rounded-xl bg-white/90 px-3 py-2 text-center text-[13px] font-semibold leading-snug text-[#14211f] shadow-sm">
            {m.hook}
          </div>
          <div className="absolute inset-x-3 bottom-12 rounded-lg bg-[#14211f]/80 px-3 py-1.5 text-center text-[12px] leading-snug text-white">
            {m.caption}
          </div>
          <div className="absolute inset-x-4 bottom-6 h-1 overflow-hidden rounded-full bg-white/60">
            <div className="h-full w-2/5 bg-[#0f5c5c]" />
          </div>
        </div>
      </div>
      <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#0f5c5c] px-3 py-1 text-xs font-medium text-[#f5efe6] shadow">
        ✓ {m.label}
      </span>
    </div>
  );
}

export function DentVideoLanding({ locale }: { locale: Locale }) {
  const c = LANDING[locale];
  const guides = guidesFor(locale);
  const cta = "rounded-full bg-[#0f5c5c] px-7 py-3.5 font-medium text-[#f5efe6] transition hover:bg-[#0c4a4a]";

  return (
    <main lang={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(landingJsonLd(locale)) }} />

      <section className="mx-auto flex max-w-6xl flex-col gap-14 px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:flex-row lg:items-center lg:gap-10">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#0f5c5c]">{c.hero.eyebrow}</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">{c.hero.h1}</h1>
          <p className="mt-6 max-w-2xl text-lg text-[#4a5a57]">{c.hero.lead}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href={`/dentvideo/start?lang=${locale}`} className={cta}>{c.hero.cta}</Link>
            <span className="text-sm text-[#6b7a77]">{c.hero.note}</span>
          </div>
        </div>
        <div className="hidden sm:block lg:pr-6">
          <PhoneMock locale={locale} />
        </div>
      </section>

      <section className="border-y border-[#e8e1d5] bg-[#f3eee5]">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:grid-cols-3 sm:px-6">
          {c.problem.map((p) => (
            <div key={p.title}>
              <h2 className="font-semibold">{p.title}</h2>
              <p className="mt-2 text-[#4a5a57]">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">{c.how.heading}</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {c.how.steps.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-[#e8e1d5] bg-white p-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6efed] font-semibold text-[#0f5c5c]">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-[#4a5a57]">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-[#0f5c5c] text-[#f5efe6]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight">{c.checks.heading}</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {c.checks.items.map((it) => (
              <div key={it.title}>
                <h3 className="font-semibold">{it.title}</h3>
                <p className="mt-2 text-[#cfe2df]">{it.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">{c.pricing.heading}</h2>
        <p className="mt-3 max-w-2xl text-[#4a5a57]">{c.pricing.text}</p>
        <Link href={`/dentvideo/start?lang=${locale}`} className={`mt-8 inline-block ${cta}`}>{c.pricing.cta}</Link>
      </section>

      {guides.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">{c.guidesHeading}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={guidePath(g)} className="block h-full rounded-2xl border border-[#e8e1d5] bg-white p-5 transition hover:border-[#0f5c5c]">
                  <span className="font-semibold leading-snug">{g.h1}</span>
                  <span className="mt-2 block text-sm text-[#4a5a57]">{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight">{c.faqHeading}</h2>
        <dl className="mt-8 space-y-6">
          {c.faq.map((f) => (
            <div key={f.q} className="border-b border-[#e8e1d5] pb-6">
              <dt className="font-semibold">{f.q}</dt>
              <dd className="mt-2 text-[#4a5a57]">{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <LanguageSwitcher current={locale} />
    </main>
  );
}

const LANGUAGE_NAME: Record<Locale, string> = { en: "English", de: "Deutsch", es: "Español", tr: "Türkçe", fr: "Français" };

export function LanguageSwitcher({ current }: { current: Locale }) {
  return (
    <nav aria-label="Language" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#4a5a57]">
        {(Object.keys(LANDING_PATH) as Locale[]).map((l) => (
          <li key={l}>
            {l === current ? (
              <span className="font-semibold text-[#0f5c5c]" aria-current="page">{LANGUAGE_NAME[l]}</span>
            ) : (
              <Link href={LANDING_PATH[l]} hrefLang={l} lang={l} className="underline-offset-4 hover:underline">{LANGUAGE_NAME[l]}</Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
