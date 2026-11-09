import type { Metadata } from "next";
import { AboutPage } from "@/components/dentvid/about";
import { aboutMetadata } from "@/lib/dentvid/seo-guides";

// dentvideo.com/about; other languages: [locale]/about.
export const metadata: Metadata = aboutMetadata("en");
// The same HTML for every visitor: prerendered once at build (the DentVideo 404
// boundary reads a cookie, which would otherwise render this page per request).
export const dynamic = "force-static";

export default function EnglishAbout() {
  return <AboutPage locale="en" />;
}
