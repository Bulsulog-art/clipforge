import { OG_SIZE } from "@/lib/dentvid/og";
import { pageOgImage, legalCard } from "@/lib/dentvid/og-page";

// The share card of this legal page, rendered at build time.
export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return pageOgImage(legalCard("refunds", "en"));
}
