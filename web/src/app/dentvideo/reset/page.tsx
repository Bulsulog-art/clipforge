import type { Metadata } from "next";
import { ResetForm } from "@/components/dentvid/reset-form";
import { RememberLocale } from "@/components/dentvid/chrome";
import { authText } from "@/content/dentvideo-auth";
import { asLocale } from "@/lib/dentvid/locale";
import { dvLocale } from "@/lib/dentvid/locale-server";

// dentvideo.com/reset — opened from the password-reset email.
type Props = { searchParams: Promise<{ token_hash?: string; lang?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const locale = asLocale((await searchParams).lang) ?? (await dvLocale());
  return { title: authText(locale).resetTitle, robots: { index: false, follow: false } };
}

export default async function ResetPage({ searchParams }: Props) {
  const sp = await searchParams;
  const fromLink = asLocale(sp.lang);
  const locale = fromLink ?? (await dvLocale());
  return (
    <>
      {/* The email link names the clinic's language: the header and footer follow it, even in a fresh browser. */}
      {fromLink && <RememberLocale locale={fromLink} />}
      <ResetForm tokenHash={sp.token_hash ?? null} locale={locale} />
    </>
  );
}
