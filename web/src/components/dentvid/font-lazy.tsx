"use client";

import dynamic from "next/dynamic";

/**
 * The Japanese and Arabic faces, on demand, for routes whose pages are in
 * those scripts only sometimes (guides, the sign-up).
 *
 * A next/font stylesheet belongs to every page of the route that imports it,
 * rendered or not. Behind next/dynamic each face is a chunk of its own, whose
 * stylesheet the server links only into a page that renders it. So an English
 * guide or sign-up page neither waits for the Japanese @font-face rules
 * (about 33 KB compressed, render-blocking) nor fetches Japanese and Arabic
 * font files for the "日本語" and "العربية" links in its language switcher.
 */
const JapaneseFace = dynamic(() => import("./font-ja-face"));
const ArabicFace = dynamic(() => import("./font-ar-face"));

export function LazyJapaneseFont() {
  return <JapaneseFace />;
}

export function LazyArabicFont() {
  return <ArabicFace />;
}

/** The face a page in `locale` needs, if any. */
export function LazyScriptFont({ locale }: { locale: string }) {
  if (locale === "ja") return <JapaneseFace />;
  if (locale === "ar") return <ArabicFace />;
  return null;
}
