import { LOCALES, type Locale } from "@/content/dentvideo";
import { OG_SIZE, dentvideoOgImage } from "@/lib/dentvid/og";

// One card per localized landing, rendered at build time.
const OTHER = LOCALES.filter((l) => l !== "en");
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
  return dentvideoOgImage(((OTHER as string[]).includes(locale) ? locale : "en") as Locale);
}
