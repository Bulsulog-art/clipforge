import type { Locale } from "@/content/dentvideo";
import { LazyScriptFont } from "./font-lazy";

/**
 * The Japanese and Arabic faces for the guide and commercial pages. Every
 * guide lives under /guides/<slug> whatever its language, so the faces come
 * through font-lazy: only a Japanese or Arabic page links its @font-face
 * rules, and the browser then fetches the face (in unicode-range slices,
 * not preloaded) for the text that uses it.
 * Same families and settings as font-ja / font-ar, so the files are shared.
 */
export function GuideScriptFont({ locale }: { locale: Locale }) {
  return <LazyScriptFont locale={locale} />;
}
