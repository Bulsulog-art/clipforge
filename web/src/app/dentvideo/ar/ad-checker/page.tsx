import type { Metadata } from "next";
import { CheckerPage } from "@/components/dentvid/checker-page";
import { checkerMetadata } from "@/lib/dentvid/seo-guides";

// The free ad checker in Arabic (own folder, so it loads the Arabic web font; right to left).
export const metadata: Metadata = checkerMetadata("ar");
// The same HTML for every visitor: prerendered once at build. The check itself runs in the browser.
export const dynamic = "force-static";

export default function ArabicChecker() {
  return <CheckerPage locale="ar" />;
}
