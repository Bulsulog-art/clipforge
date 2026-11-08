import type { Metadata } from "next";
import { StartForm } from "@/components/dentvid/start-form";
import { appText } from "@/content/dentvideo-app";
import { asLocale } from "@/lib/dentvid/locale";
import { dvLocale } from "@/lib/dentvid/locale-server";

type Props = { searchParams: Promise<{ lang?: string }> };

async function pageLocale(searchParams: Props["searchParams"]) {
  const fromLink = asLocale((await searchParams).lang);
  return { locale: fromLink ?? (await dvLocale()), fromLink: fromLink !== null };
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { locale } = await pageLocale(searchParams);
  return { title: appText(locale).start.metaTitle };
}

export default async function StartPage({ searchParams }: Props) {
  const { locale, fromLink } = await pageLocale(searchParams);
  return <StartForm locale={locale} remember={fromLink} />;
}
