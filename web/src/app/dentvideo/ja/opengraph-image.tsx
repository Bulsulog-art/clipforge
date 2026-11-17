import { OG_SIZE, dentvideoOgImage } from "@/lib/dentvid/og";

export const alt = "DentVideo";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image() {
  return dentvideoOgImage("ja");
}
