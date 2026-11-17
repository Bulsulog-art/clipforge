import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { DemoRoute, demoRouteMetadata } from "@/components/dentvid/demo-route";
import { DEMO_ROBOTS } from "@/components/dentvid/demo-page";

// A personalised demo link (/de, /es, /tr, /fr, /pl): never cached or indexed (components/dentvid/demo-page).
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string; token: string }> };

const asLocale = (v: string): Locale | null => ((SHARED_ROUTE_LOCALES as string[]).includes(v) ? (v as Locale) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, token } = await params;
  const l = asLocale(locale);
  if (!l) return { robots: DEMO_ROBOTS };
  return demoRouteMetadata(l, token);
}

export default async function LocalizedDemo({ params }: Props) {
  const { locale, token } = await params;
  const l = asLocale(locale);
  if (!l) notFound();
  return <DemoRoute locale={l} token={token} />;
}
