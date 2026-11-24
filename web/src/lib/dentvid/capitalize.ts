import type { Locale } from "@/content/dentvideo-locales";

/**
 * The same words with a capital first letter, for a phrase written to sit inside a sentence
 * ("how DentVideo compares with …") that is shown on its own as a title.
 *
 * Uses the language's own rules (Turkish "i" becomes "İ"), touches only a letter at the very
 * start (after any opening quote or bracket), and leaves scripts without capitals (Japanese,
 * Arabic), already capitalised text and text that starts with a number as they are.
 */
export function capitalizeFirst(text: string, locale: Locale): string {
  const m = /^([\s\p{P}]*)(\p{Ll})/u.exec(text);
  if (!m) return text;
  const [, lead, letter] = m;
  return lead + letter.toLocaleUpperCase(locale) + text.slice(lead.length + letter.length);
}
