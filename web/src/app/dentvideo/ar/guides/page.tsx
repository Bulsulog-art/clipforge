import type { Metadata } from "next";
import { GuidesIndex } from "@/components/dentvid/guides-index";
import { guidesIndexMetadata } from "@/lib/dentvid/seo-guides";

// Arabic guides hub (dentvideo.com/ar/guides): in the ar folder so it gets the Arabic font from ar/layout.
export const metadata: Metadata = guidesIndexMetadata("ar");
// The same HTML for every visitor: prerendered once at build (kept explicit; the DentVideo 404
// boundary no longer reads request data, see app/dentvideo/not-found.tsx).
export const dynamic = "force-static";

export default function ArabicGuidesIndex() {
  return <GuidesIndex locale="ar" />;
}
