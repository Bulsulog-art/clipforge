import { cache } from "react";
import type { Metadata } from "next";
import type { Locale } from "@/content/dentvideo";
import { loadActiveDemo } from "@/lib/dentvid/demos-server";
import { DemoPage, demoMetadata } from "./demo-page";

/**
 * The demo route pages (/d/[token], /[locale]/d/[token], /ar/…, /ja/…) share
 * this: one database read per request (React cache dedupes metadata and page).
 */
const demoData = cache(async (token: string) => {
  const demo = await loadActiveDemo(token);
  return { demo };
});

export type DemoParams = { params: Promise<{ token: string }> };

export async function demoRouteMetadata(locale: Locale, token: string): Promise<Metadata> {
  return demoMetadata(locale, (await demoData(token)).demo);
}

export async function DemoRoute({ locale, token }: { locale: Locale; token: string }) {
  const { demo } = await demoData(token);
  return <DemoPage locale={locale} demo={demo} />;
}
