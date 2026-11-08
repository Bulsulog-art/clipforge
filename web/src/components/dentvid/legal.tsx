import type { Metadata } from "next";
import { LANDING_PATH } from "@/content/dentvideo";
import {
  LEGAL_LOCALES,
  LEGAL_UPDATED,
  PRIVACY,
  PRIVACY_PATH,
  TERMS,
  TERMS_PATH,
  type LegalDoc,
  type LegalLocale,
} from "@/content/dentvideo-legal";
import { dvUrl } from "@/lib/dentvid/host";

export type LegalKind = "terms" | "privacy";

const DOCS: Record<LegalKind, Record<LegalLocale, LegalDoc>> = { terms: TERMS, privacy: PRIVACY };
const PATHS: Record<LegalKind, Record<LegalLocale, string>> = { terms: TERMS_PATH, privacy: PRIVACY_PATH };

export function legalMetadata(kind: LegalKind, locale: LegalLocale): Metadata {
  const doc = DOCS[kind][locale];
  const languages = Object.fromEntries(LEGAL_LOCALES.map((l) => [l, dvUrl(PATHS[kind][l])]));
  return {
    title: doc.title,
    description: doc.metaDescription,
    alternates: { canonical: dvUrl(PATHS[kind][locale]), languages: { ...languages, "x-default": dvUrl(PATHS[kind].en) } },
  };
}

/** Terms or Privacy, as a plain readable document. */
export function LegalPage({ kind, locale }: { kind: LegalKind; locale: LegalLocale }) {
  const doc = DOCS[kind][locale];
  return (
    <main lang={locale} className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6 sm:pt-16">
      <p className="text-sm">
        <a href={LANDING_PATH[locale]} className="text-dv-body underline-offset-4 hover:underline">DentVideo</a>
      </p>
      <h1 className="dv-display mt-4 text-[2.5rem] leading-[1.05] text-dv-ink sm:text-[3.25rem]">{doc.title}</h1>
      <p className="mt-3 text-sm text-dv-body">
        {doc.updatedLabel}: <time dateTime={LEGAL_UPDATED}>{LEGAL_UPDATED}</time>
      </p>
      {doc.intro.map((p, i) => (
        <p key={i} className="mt-6 text-[1.0625rem] leading-[1.75] text-[#33423f]">{p}</p>
      ))}
      {doc.sections.map((s) => (
        <section key={s.heading} className="mt-12">
          <h2 className="text-[1.375rem] font-semibold leading-snug tracking-tight text-dv-ink">{s.heading}</h2>
          {s.blocks.map((b, i) =>
            typeof b === "string" ? (
              <p key={i} className="mt-4 text-[1.0625rem] leading-[1.75] text-[#33423f]">{b}</p>
            ) : (
              <ul key={i} className="mt-4 list-disc space-y-2 pl-6 text-[1.0625rem] leading-[1.7] text-[#33423f]">
                {b.list.map((li) => <li key={li}>{li}</li>)}
              </ul>
            ),
          )}
        </section>
      ))}
    </main>
  );
}
