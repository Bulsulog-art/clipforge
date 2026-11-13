import { LANDING_PATH, LOCALES, hasGuideHub as hasGuides, type Locale } from "@/content/dentvideo-locales";
import { ABOUT_PATH, CHECKER_PATH, GUIDES_INDEX_PATH } from "@/content/guides/ui";
import { isLegalKind, legalPath } from "@/content/legal/nav";

/**
 * Where the language switcher takes a visitor: the same page in `target`
 * when that page exists in every language (landing, guides hub, About, the ad checker, the
 * legal pages), the guides hub from a single guide (each guide has its own
 * slug per language), else that language's landing. In-app paths
 * ("/dentvideo/…"); the caller passes them through dvHref.
 *
 * `pathname` may be the clean dentvideo.com path ("/tr/privacy") or the
 * in-app one ("/dentvideo/tr/privacy").
 */
export function equivalentPath(pathname: string, target: Locale): string {
  const all = pathname.split(/[?#]/)[0].split("/").filter(Boolean);
  const parts = all[0] === "dentvideo" ? all.slice(1) : all;
  const rest = parts.length > 0 && (LOCALES as readonly string[]).includes(parts[0]) ? parts.slice(1) : parts;
  const guidesHub = hasGuides(target) ? GUIDES_INDEX_PATH[target] : LANDING_PATH[target];
  if (rest.length === 0) return LANDING_PATH[target];
  if (rest[0] === "guides") return guidesHub;
  if (rest.length === 1 && rest[0] === "about") return ABOUT_PATH[target];
  if (rest.length === 1 && CHECKER_PATH.en.endsWith(`/${rest[0]}`)) return CHECKER_PATH[target];
  if (rest.length === 1 && isLegalKind(rest[0])) return legalPath(rest[0], target);
  return LANDING_PATH[target];
}
