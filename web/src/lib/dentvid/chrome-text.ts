import { LOCALES, type Locale } from "@/content/dentvideo-locales";
import { appText, type AppText } from "@/content/dentvideo-app";
import { GUIDE_UI } from "@/content/guides/ui";
import { SOLUTION_UI } from "@/content/solutions/ui";
import { LEGAL_NAV } from "@/content/legal/nav";
import { CHECKER } from "@/content/dentvideo-checker";
import { EXAMPLES_UI } from "@/content/dentvideo-examples";
import type { LegalKind } from "@/content/legal/types";
import { HELP_LINK_TEXT } from "@/content/dentvideo-help-links";
import { LANDING } from "@/content/dentvideo";
import { HEADER_TEXT } from "@/content/dentvideo-header-cta";

/**
 * The words the DentVideo header and footer show, in one language: the
 * chrome strings and the few labels they borrow from the guide, commercial
 * and legal pages.
 *
 * The header and footer are client components on every DentVideo page. If
 * they imported the content modules these words come from (all languages of
 * the app's interface, the guides' interface, the legal navigation), those
 * would ship to every visitor's browser as JavaScript. Instead the layout
 * (a server component) builds this small table once and passes it down.
 */
export type ChromeWords = AppText["chrome"] & {
  guides: string;
  about: string;
  /** The free ad checker (/ad-checker). */
  checker: string;
  /** The sample-video showcase (/examples). */
  examples: string;
  /** The help center (/help). */
  helpCenter: string;
  signIn: string;
  /** The header's start button for signed-out visitors: the landing hero's own button ("See it with your logo"). */
  start: string;
  /** The visually hidden skip link, first on every page. */
  skip: string;
  legal: string;
  legalNav: Record<LegalKind, string>;
};

export type ChromeText = Record<Locale, ChromeWords>;

export function chromeWords(locale: Locale): ChromeWords {
  return {
    ...appText(locale).chrome,
    guides: GUIDE_UI[locale].guides,
    about: GUIDE_UI[locale].about,
    checker: CHECKER[locale].nav,
    examples: EXAMPLES_UI[locale].nav,
    helpCenter: HELP_LINK_TEXT[locale].center,
    signIn: SOLUTION_UI[locale].signIn,
    start: LANDING[locale].hero.cta,
    skip: HEADER_TEXT[locale].skip,
    legal: LEGAL_NAV[locale].legal,
    legalNav: LEGAL_NAV[locale].nav,
  };
}

export function chromeText(): ChromeText {
  return Object.fromEntries(LOCALES.map((l) => [l, chromeWords(l)])) as ChromeText;
}
