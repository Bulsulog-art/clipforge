import { Noto_Sans_JP } from "next/font/google";

/**
 * Noto Sans JP, self-hosted by next/font. Imported only by the Japanese pages
 * and the per-visitor app screens, so the other landings carry none of its
 * @font-face rules; the browser fetches only the unicode-range slices a page
 * actually uses. One variable face per slice (400–700 in one file) keeps the CSS small.
 */
const jp = Noto_Sans_JP({ subsets: ["latin"], display: "swap", preload: false, fallback: ["Hiragino Sans", "Yu Gothic", "Meiryo", "sans-serif"] });

/** Points the DentVideo surface's Japanese font variable at the loaded face (see dentvideo.css). */
export function JapaneseFont() {
  return <style>{`body .dv{--dv-font-jp:${jp.style.fontFamily};}`}</style>;
}
