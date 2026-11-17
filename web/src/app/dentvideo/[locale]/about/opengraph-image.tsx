import { SHARED_ROUTE_LOCALES, type Locale } from "@/content/dentvideo";
import { OG_SIZE } from "@/lib/dentvid/og";
import { aboutCard, pageOgImage } from "@/lib/dentvid/og-page";

// One share card per About page, rendered at build time.
const OTHER = SHARED_ROUTE_LOCALES;
export const dynamicParams = false;

export function generateStaticParams() {
  return OTHER.map((locale) => ({ locale }));
}

export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

type Params = { locale: string };

export default async function Image({ params }: { params: Params | Promise<Params> }) {
  const { locale } = await params;
  return pageOgImage(aboutCard(((OTHER as string[]).includes(locale) ? locale : "en") as Locale));
}
