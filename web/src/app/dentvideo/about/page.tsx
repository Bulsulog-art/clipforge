import type { Metadata } from "next";
import { AboutPage } from "@/components/dentvid/about";
import { aboutMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/about; other languages: [locale]/about.
export const metadata: Metadata = aboutMetadata("en");

export default function EnglishAbout() {
  return <AboutPage locale="en" />;
}
