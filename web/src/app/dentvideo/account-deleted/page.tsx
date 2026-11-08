import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { dirOf } from "@/content/dentvideo";
import { accountText } from "@/content/dentvideo-account";
import { asLocale } from "@/lib/dentvid/locale";
import { dvLocale } from "@/lib/dentvid/locale-server";
import { dvHref } from "@/lib/dentvid/host";
import { ArabicFont } from "@/components/dentvid/font-ar";
import { JapaneseFont } from "@/components/dentvid/font-ja";

// dentvideo.com/account-deleted — where the settings screen sends a clinic
// after its account is deleted (the session is already gone). No data is
// read here: the language comes from the link.

type Props = { searchParams: Promise<{ lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = asLocale((await searchParams).lang) ?? (await dvLocale());
  return { title: accountText(locale).deletedMeta, robots: { index: false, follow: false } };
}

export default async function AccountDeleted({ searchParams }: Props) {
  const locale = asLocale((await searchParams).lang) ?? (await dvLocale());
  const t = accountText(locale);
  const home = locale === "en" ? "/dentvideo" : `/dentvideo/${locale}`;
  return (
    <main lang={locale} dir={dirOf(locale)} className="relative isolate overflow-hidden">
      <JapaneseFont />
      <ArabicFont />
      <div aria-hidden="true" className="dv-grid absolute inset-0 -z-10" />
      <div className="mx-auto flex max-w-lg flex-col px-4 pb-24 pt-12 text-center sm:px-6 sm:pt-20">
        <CheckCircle2 className="mx-auto h-12 w-12 text-dv-teal" aria-hidden="true" />
        <h1 className="dv-display mt-6 text-[2.5rem] leading-[1.05] text-dv-ink sm:text-5xl">{t.deletedTitle}</h1>
        <p role="status" className="mt-4 leading-relaxed text-dv-body">
          {t.deletedBody}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-dv-muted">{t.deletedBilling}</p>
        <Link href={dvHref(home)} className="dv-btn dv-btn-primary mx-auto mt-9 px-6 py-3 text-base">
          {t.deletedBack}
        </Link>
      </div>
    </main>
  );
}
