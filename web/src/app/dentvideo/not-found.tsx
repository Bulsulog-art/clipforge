import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight } from "lucide-react";
import { LANDING_PATH, LANGUAGE_NAME, LOCALES, dirOf, hasGuides, type Locale } from "@/content/dentvideo";
import { NOT_FOUND_COPY } from "@/content/dentvideo-404";
import { GUIDES_INDEX_PATH } from "@/content/guides/ui";
import { dvHref } from "@/lib/dentvid/host";
import { LANG_COOKIE, asLocale } from "@/lib/dentvid/locale";
import { ArabicFont } from "@/components/dentvid/font-ar";
import { JapaneseFont } from "@/components/dentvid/font-ja";

// A DentVideo 404 inside the DentVideo header and footer, instead of Next's
// unbranded default. It speaks the language the header does: the visitor's
// remembered one (the dv-lang cookie), else English — and offers every landing.
async function notFoundLocale(): Promise<Locale> {
  return asLocale((await cookies()).get(LANG_COOKIE)?.value) ?? "en";
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: `${NOT_FOUND_COPY[await notFoundLocale()].meta} · DentVideo` },
    robots: { index: false, follow: true },
  };
}

export default async function DentVideoNotFound() {
  const locale = await notFoundLocale();
  const t = NOT_FOUND_COPY[locale];
  return (
    <main lang={locale} dir={dirOf(locale)} className="relative isolate overflow-hidden">
      {locale === "ja" && <JapaneseFont />}
      {locale === "ar" && <ArabicFont />}
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-dv-teal">404</p>
        <h1 className="dv-display mt-4 text-balance text-[2.75rem] [word-break:auto-phrase] leading-[1.02] text-dv-ink sm:text-[3.75rem]">{t.title}</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-dv-body [word-break:auto-phrase]">{t.body}</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={dvHref(LANDING_PATH[locale])} className="dv-btn dv-btn-primary group px-7 py-4 text-base">
            {t.home}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5" aria-hidden="true" />
          </Link>
          {hasGuides(locale) && (
            <Link href={dvHref(GUIDES_INDEX_PATH[locale])} className="dv-btn dv-btn-secondary px-6 py-4 text-base">
              {t.guides}
            </Link>
          )}
        </div>
        <nav aria-label={t.languages} className="mt-12">
          <ul className="flex flex-wrap gap-2 text-sm">
            {LOCALES.map((l) => (
              <li key={l}>
                <Link
                  href={dvHref(LANDING_PATH[l])}
                  hrefLang={l}
                  lang={l}
                  dir={dirOf(l)}
                  aria-current={l === locale ? "true" : undefined}
                  className={`dv-chip inline-flex min-h-11 items-center rounded-full px-4 py-1.5 font-medium ring-1 transition ${
                    l === locale ? "bg-dv-teal text-white ring-dv-teal" : "bg-white text-dv-body ring-dv-line hover:text-dv-ink hover:ring-dv-edge"
                  }`}
                >
                  {LANGUAGE_NAME[l]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
