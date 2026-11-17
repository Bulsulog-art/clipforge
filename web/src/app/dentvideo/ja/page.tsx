import type { Metadata } from "next";
import { DentVideoLanding } from "@/components/dentvid/landing";
import { landingMetadata } from "@/lib/dentvid/seo";

export const metadata: Metadata = landingMetadata("ja");
// The same HTML for every visitor: prerendered once at build (kept explicit; the DentVideo 404
// boundary no longer reads request data, see app/dentvideo/not-found.tsx).
export const dynamic = "force-static";

export default function JapaneseLanding() {
  return <DentVideoLanding locale="ja" />;
}
