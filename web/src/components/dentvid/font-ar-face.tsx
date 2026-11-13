"use client";

import { IBM_Plex_Sans_Arabic } from "next/font/google";

/**
 * IBM Plex Sans Arabic for pages that are Arabic only sometimes (a guide, the
 * sign-up), reached through font-lazy. Not preloaded, and declared only on
 * the pages that render it: wherever its @font-face rules are present, the
 * "العربية" link in the language switcher alone makes the browser fetch two
 * of its files. Same family and settings as font-ar, so the files are shared.
 */
const ar = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  fallback: ["Geeza Pro", "Segoe UI", "Tahoma", "sans-serif"],
});

export default function ArabicFace() {
  return <style>{`body .dv{--dv-font-ar:${ar.style.fontFamily};}`}</style>;
}
