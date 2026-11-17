"use client";

import { Noto_Sans_JP } from "next/font/google";

/**
 * Noto Sans JP for pages that are Japanese only sometimes (a guide, the
 * sign-up), reached through font-ja-lazy: its stylesheet — over 120
 * unicode-range slices, about 33 KB compressed and render-blocking — then
 * reaches only the pages that render it. Same family and settings as
 * font-ja, so the font files themselves are shared.
 */
const jp = Noto_Sans_JP({ subsets: ["latin"], display: "swap", preload: false, fallback: ["Hiragino Sans", "Yu Gothic", "Meiryo", "sans-serif"] });

export default function JapaneseFace() {
  return <style>{`body .dv{--dv-font-jp:${jp.style.fontFamily};}`}</style>;
}
