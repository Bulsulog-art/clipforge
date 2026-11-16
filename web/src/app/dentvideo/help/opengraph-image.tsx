import { OG_SIZE } from "@/lib/dentvid/og";
import { helpCard, pageOgImage } from "@/lib/dentvid/og-page";

// The share card of the English help center, rendered at build time.
export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pageOgImage(helpCard("en"));
}
