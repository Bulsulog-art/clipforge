import { IBM_Plex_Sans_Arabic } from "next/font/google";

/**
 * IBM Plex Sans Arabic, self-hosted by next/font: a calm, clinical sans that
 * pairs with Plus Jakarta Sans and carries its own Latin. Imported only by the
 * Arabic pages and the per-visitor app screens.
 */
const ar = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600", "700"], display: "swap", fallback: ["Geeza Pro", "Segoe UI", "Tahoma", "sans-serif"] });

/** Points the DentVideo surface's Arabic font variable at the loaded face (see dentvideo.css). */
export function ArabicFont() {
  return <style>{`body .dv{--dv-font-ar:${ar.style.fontFamily};}`}</style>;
}
