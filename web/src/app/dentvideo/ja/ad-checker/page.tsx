import type { Metadata } from "next";
import { CheckerPage } from "@/components/dentvid/checker-page";
import { checkerMetadata } from "@/lib/dentvid/seo-guides";

// The free ad checker in Japanese (own folder, so it loads the Japanese web font).
export const metadata: Metadata = checkerMetadata("ja");
// The same HTML for every visitor: prerendered once at build. The check itself runs in the browser.
export const dynamic = "force-static";

export default function JapaneseChecker() {
  return <CheckerPage locale="ja" />;
}
