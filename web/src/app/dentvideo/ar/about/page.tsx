import type { Metadata } from "next";
import { AboutPage } from "@/components/dentvid/about";
import { aboutMetadata } from "@/lib/dentvid/seo-guides";

export const metadata: Metadata = aboutMetadata("ar");
// The same HTML for every visitor: prerendered once at build (kept explicit; the DentVideo 404
// boundary no longer reads request data, see app/dentvideo/not-found.tsx).
export const dynamic = "force-static";

export default function ArabicAbout() {
  return <AboutPage locale="ar" />;
}
