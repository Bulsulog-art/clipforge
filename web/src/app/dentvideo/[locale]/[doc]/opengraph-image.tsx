import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { LEGAL_KINDS, isLegalKind } from "@/content/legal";
import { OG_SIZE } from "@/lib/dentvid/og";
import { legalCard, pageOgImage } from "@/lib/dentvid/og-page";

// One share card per legal page and language, rendered at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return SHARED_ROUTE_LOCALES.flatMap((locale) => LEGAL_KINDS.map((doc) => ({ locale, doc })));
}

export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

type Params = { locale: string; doc: string };

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const { locale, doc } = await params;
  const l = ((SHARED_ROUTE_LOCALES as string[]).includes(locale) ? locale : "en") as Locale;
  return pageOgImage(legalCard(isLegalKind(doc) ? doc : "terms", l));
}
