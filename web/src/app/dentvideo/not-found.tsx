import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LANDING_PATH, LANGUAGE_NAME, LOCALES } from "@/content/dentvideo";
import { GUIDES_INDEX_PATH } from "@/content/guides/ui";
import { dvHref } from "@/lib/dentvid/host";

// A DentVideo 404 inside the DentVideo header and footer, instead of Next's
// unbranded default. Unknown addresses under a page's language are not known
// here, so it is in English and offers every landing.
export const metadata: Metadata = {
  title: { absolute: "Page not found · DentVideo" },
  robots: { index: false, follow: true },
};

export default function DentVideoNotFound() {
  return (
    <main lang="en" className="relative isolate overflow-hidden">
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-dv-teal">404</p>
        <h1 className="dv-display mt-4 text-balance text-[2.75rem] leading-[1.02] text-dv-ink sm:text-[3.75rem]">This page doesn&apos;t exist.</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-dv-body">
          The address may be mistyped, or the page has moved. Everything about DentVideo starts from the home page.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href={dvHref(LANDING_PATH.en)} className="dv-btn dv-btn-primary group px-7 py-4 text-base">
            DentVideo home
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
          <Link href={dvHref(GUIDES_INDEX_PATH.en)} className="dv-btn dv-btn-secondary px-6 py-4 text-base">
            Guides for dental clinics
          </Link>
        </div>
        <nav aria-label="Language" className="mt-12">
          <ul className="flex flex-wrap gap-2 text-sm">
            {LOCALES.map((l) => (
              <li key={l}>
                <Link
                  href={dvHref(LANDING_PATH[l])}
                  hrefLang={l}
                  lang={l}
                  className="dv-chip inline-flex rounded-full bg-white px-3.5 py-1.5 font-medium text-dv-body ring-1 ring-dv-line transition hover:text-dv-ink hover:ring-dv-edge"
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
