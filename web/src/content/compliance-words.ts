/**
 * The words and figures no editorial page (guide, /videos page) may use,
 * shared by the content tests. Built from docs/MARKETS.md do-not-say lists
 * and the landing rules: no superlatives, no promised patient results or
 * "painless"-type claims, no prices or percentages.
 */

/** Quoted words ("painless", „schmerzfrei“, «sin dolor», 「痛くない」) are examples of what is filtered out, not claims. */
export function unquoted(text: string): string {
  return text.replace(/“[^”]*”|„[^“”]*[“”]|«[^»]*»|「[^」]*」|"[^"]*"|‘[^’]*’/g, " ");
}

/** For titles, descriptions, H1s and intros: promises and superlatives in every site language. */
export const SNIPPET_BANNED =
  /\b(guarantee[ds]?|painless|best|cheapest|no\.? ?1|#1)\b|garantiert|schmerzfrei|\bbeste[nrs]?\b|garantizad|sin dolor|\bmejor(es)?\b|garanti|sans douleur|meilleur|garantili|ağrısız|acısız|en iyi|最高|日本一|一番|絶対|必ず|無痛|痛くない|保証|無料|الأفضل|مضمون|بدون ألم|الأرخص|najlepsz|gwarant|bezbolesn|\bnr 1\b|100\s?%/i;

/** For running text: superlatives and market do-not-say phrases (quoted examples excepted). */
export const BODY_BANNED =
  /\b(best|cheapest|no\.? ?1|#1|painless)\b|\bbeste[nrs]?\b|schmerzfrei|\bmejor(es)?\b|sin dolor|meilleur|sans douleur|en iyi|ağrısız|acısız|最高|日本一|一番|無痛|痛くない|無料|確実に集患|患者数.?倍|完全対応|100\s?%準拠|الأفضل|الأرخص|نتائج فورية|عرض لفترة محدودة|بدون ألم|najlepsz|bezbolesn|zgodne z prawem|\bnr 1\b/i;

/** A price, an amount of money or a percentage. */
export const MONEY = /[$€£₺¥]\s?\d|\d\s?(%|€|\$|£|TL\b|円|ريال|درهم|zł)/;
