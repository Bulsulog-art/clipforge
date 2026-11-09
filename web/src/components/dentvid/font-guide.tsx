import { IBM_Plex_Sans_Arabic, Noto_Sans_JP } from "next/font/google";
import type { Locale } from "@/content/dentvideo";

/**
 * The Japanese and Arabic faces for the guide pages. Every guide lives under
 * /guides/<slug> whatever its language, so these are not preloaded: an English
 * or German guide carries only their small @font-face rules, and the browser
 * fetches a face (in unicode-range slices) only when a page uses its script.
 * Same families and settings as font-ja / font-ar, so the files are shared.
 */
const jp = Noto_Sans_JP({ subsets: ["latin"], display: "swap", preload: false, fallback: ["Hiragino Sans", "Yu Gothic", "Meiryo", "sans-serif"] });
const ar = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  fallback: ["Geeza Pro", "Segoe UI", "Tahoma", "sans-serif"],
});

/** Points the DentVideo surface's script font variable (see dentvideo.css) at the face a guide needs. */
export function GuideScriptFont({ locale }: { locale: Locale }) {
  if (locale === "ja") return <style>{`body .dv{--dv-font-jp:${jp.style.fontFamily};}`}</style>;
  if (locale === "ar") return <style>{`body .dv{--dv-font-ar:${ar.style.fontFamily};}`}</style>;
  return null;
}
