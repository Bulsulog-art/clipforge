import Link from "next/link";
import { Fragment } from "react";
import { Link2, Mail } from "lucide-react";
import { LANDING_PATH, dirOf, type Locale } from "@/content/dentvideo";
import { HELP, HELP_ARTICLE_META, helpShotSrc, type HelpId } from "@/content/help";
import { LEGAL_NAV, legalPath } from "@/content/legal";
import { CHECKER, CHECKER_PATH } from "@/content/dentvideo-checker";
import { LANDING } from "@/content/dentvideo";
import { helpMailto, SUPPORT_EMAIL } from "@/content/dentvideo-support";
import { helpJsonLd, helpSections, jsonLdHtml } from "@/lib/dentvid/seo-guides";
import { dvHref } from "@/lib/dentvid/host";
import { Breadcrumbs, HtmlLang } from "./guide-parts";
import { HelpSearch } from "./help-search";
import { HelpCheckSources } from "./help-check-sources";

/**
 * The help center for one language (dentvideo.com/help, /de/help …): a search
 * box, the topics, and every answer visible on the page under a stable anchor
 * (#cancel, #needs-a-look …) that the app and the emails link to. The page is
 * server HTML; only the search box runs in the browser.
 */
export function HelpCenter({ locale }: { locale: Locale }) {
  const h = HELP[locale];
  const sections = helpSections(locale);
  return (
    <main lang={locale} dir={dirOf(locale)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(helpJsonLd(locale)) }} />
      <HtmlLang locale={locale} />
      <header className="relative isolate overflow-hidden border-b border-dv-line">
        <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
        <div aria-hidden="true" className="absolute -start-40 -top-24 -z-10 h-96 w-96 rounded-full bg-[#cfe6e0] opacity-60 blur-3xl" />
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-14">
          <Breadcrumbs items={[{ name: "DentVideo", href: LANDING_PATH[locale] }, { name: h.nav }]} />
          <h1 className="dv-display mt-6 max-w-3xl text-balance text-[2.75rem] leading-[1.02] text-dv-ink sm:text-[3.75rem]">{h.h1}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-dv-body sm:text-xl">{h.lead}</p>
          <HelpSearch label={h.search.label} placeholder={h.search.placeholder} none={h.search.none} one={h.search.count.one} other={h.search.count.other} />
          <nav aria-labelledby="help-topics" className="mt-4">
            <h2 id="help-topics" className="sr-only">
              {h.topics}
            </h2>
            <ul className="flex flex-wrap gap-2">
              {sections.map((s) => (
                <li key={s.category}>
                  <a
                    href={`#topic-${s.category}`}
                    className="inline-flex min-h-11 items-center rounded-full bg-white/80 px-4 text-sm font-medium text-dv-ink ring-1 ring-inset ring-dv-line transition-colors hover:bg-white hover:ring-dv-teal/40"
                  >
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        {sections.map((s) => (
          <section key={s.category} id={`topic-${s.category}`} aria-labelledby={`topic-${s.category}-title`} data-help-section className="mt-14 scroll-mt-24 sm:mt-16 [&[hidden]]:!hidden">
            <h2 id={`topic-${s.category}-title`} className="dv-display text-[2rem] leading-tight text-dv-ink sm:text-[2.5rem]">
              {s.title}
            </h2>
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {s.ids.map((id) => (
                <Answer key={id} locale={locale} id={id} />
              ))}
            </div>
          </section>
        ))}

        <section aria-labelledby="help-stuck" className="dv-card mt-20 flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="max-w-2xl">
            <h2 id="help-stuck" className="dv-display text-[1.875rem] leading-tight text-dv-ink sm:text-[2.25rem]">
              {h.stuck.title}
            </h2>
            <p className="mt-3 leading-relaxed text-dv-body">
              <WithEmail text={h.stuck.body} />
            </p>
          </div>
          <a href={helpMailto(locale, {})} className="dv-btn dv-btn-primary shrink-0 px-6 py-3" data-testid="help-stuck-mail">
            <Mail className="h-4 w-4" aria-hidden="true" />
            <span dir="ltr">{SUPPORT_EMAIL}</span>
          </a>
        </section>
      </div>
    </main>
  );
}

function Answer({ locale, id }: { locale: Locale; id: HelpId }) {
  const h = HELP[locale];
  const a = h.articles[id];
  const meta = HELP_ARTICLE_META[id];
  // Steps first (what to do), then the explanation.
  const paragraphs = a.a.split("\n\n");
  return (
    <article
      id={id}
      data-help-article
      className="dv-card scroll-mt-24 p-5 transition-shadow target:ring-2 target:ring-dv-teal sm:p-6 [&[hidden]]:!hidden"
      aria-labelledby={`${id}-q`}
    >
      <h3 id={`${id}-q`} className="flex items-start justify-between gap-3 text-[1.125rem] font-semibold leading-snug text-dv-ink">
        <span>{a.q}</span>
        <a href={`#${id}`} className="-m-2 inline-flex shrink-0 rounded-md p-2 text-dv-muted hover:text-dv-teal" aria-label={a.q} tabIndex={-1}>
          <Link2 className="h-4 w-4" aria-hidden="true" />
        </a>
      </h3>
      <div className={meta.shot ? "mt-3 flex flex-col gap-5 sm:flex-row sm:items-start" : "mt-3"}>
        <div className="min-w-0 flex-1 space-y-3 text-[0.9375rem] leading-relaxed text-dv-body">
          {a.steps && (
            <ol className="space-y-2">
              {a.steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-dv-teal-50 text-xs font-semibold text-dv-teal ring-1 ring-inset ring-dv-teal/15">
                    {i + 1}
                  </span>
                  <span className="min-w-0">{step}</span>
                </li>
              ))}
            </ol>
          )}
          {paragraphs.map((p, i) => (
            <p key={i}>
              <WithEmail text={p} />
            </p>
          ))}
          {meta.sources && <HelpCheckSources locale={locale} />}
          {meta.see?.length || meta.legal?.length || meta.checker ? (
            <p className="text-sm text-dv-muted">
              {h.readMore}{" "}
              {(meta.see ?? []).map((s, i) => (
                <Fragment key={s}>
                  {i > 0 && " · "}
                  <a href={`#${s}`} className="font-medium text-dv-teal underline-offset-4 hover:underline" data-help-see={s}>
                    {h.articles[s].q}
                  </a>
                </Fragment>
              ))}
              {(meta.legal ?? []).map((k, i) => (
                <Fragment key={k}>
                  {(i > 0 || Boolean(meta.see?.length)) && " · "}
                  <Link href={dvHref(legalPath(k, locale))} className="font-medium text-dv-teal underline-offset-4 hover:underline">
                    {LEGAL_NAV[locale].nav[k]}
                  </Link>
                </Fragment>
              ))}
              {meta.checker && (
                <>
                  {meta.legal?.length || meta.see?.length ? " · " : null}
                  <Link href={dvHref(CHECKER_PATH[locale])} className="font-medium text-dv-teal underline-offset-4 hover:underline" data-help-checker>
                    {CHECKER[locale].h1}
                  </Link>
                </>
              )}
            </p>
          ) : null}
        </div>
        {meta.shot && (
          <figure className="mx-auto w-40 shrink-0 sm:mx-0 sm:w-44">
            <img
              src={helpShotSrc(locale, meta.shot)}
              alt={landingShotAlt(locale, meta.shot)}
              width={540}
              height={960}
              loading="lazy"
              decoding="async"
              className="aspect-[9/16] w-full rounded-2xl bg-white object-cover object-top ring-1 ring-dv-line"
            />
            <figcaption className="mt-2 text-xs leading-snug text-dv-muted">{h.shots[meta.shot]}</figcaption>
          </figure>
        )}
      </div>
    </article>
  );
}

/** The landing's own alt text for the same app screen, in the page's language. */
function landingShotAlt(locale: Locale, shot: "setup" | "week" | "card"): string {
  const shots = LANDING[locale].how.shots;
  return shot === "setup" ? shots[0] : shot === "week" ? shots[1] : shots[2];
}

/** Text with {email} as a mail link to hello@dentvideo.com. */
function WithEmail({ text }: { text: string }) {
  const parts = text.split("{email}");
  return (
    <>
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && (
            <a dir="ltr" href={`mailto:${SUPPORT_EMAIL}`} className="font-medium text-dv-teal underline-offset-4 hover:underline">
              {SUPPORT_EMAIL}
            </a>
          )}
          {p}
        </Fragment>
      ))}
    </>
  );
}
