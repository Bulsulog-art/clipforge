import { LANDING } from "@/content/dentvideo";
import { OG_SIZE, dentvideoOgImage } from "@/lib/dentvid/og";

export const alt = LANDING.en.meta.title;
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return dentvideoOgImage("en");
}
