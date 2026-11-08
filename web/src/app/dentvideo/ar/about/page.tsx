import type { Metadata } from "next";
import { AboutPage } from "@/components/dentvid/about";
import { aboutMetadata } from "@/lib/dentvid/seo-guides";

export const metadata: Metadata = aboutMetadata("ar");

export default function ArabicAbout() {
  return <AboutPage locale="ar" />;
}
