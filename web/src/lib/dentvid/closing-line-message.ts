import type { Locale } from "@/content/dentvideo";
import { appText, fmt } from "@/content/dentvideo-app";
import { CLOSING_LINE_MAX, closingLineReasons } from "./closing-line";

/**
 * Why a clinic's closing line cannot go out, as one calm sentence in the
 * interface language (the first reason; the rest usually go with it), or
 * null when it can. Shared by the settings form (as the clinic types) and the
 * clinic API route (before anything is stored), so both say the same thing.
 */
export function closingLineNote(line: string, country: string | undefined, locale: Locale): string | null {
  const [first] = closingLineReasons(line, country);
  if (!first) return null;
  return fmt(appText(locale).form.closingLineReasons[first], { max: CLOSING_LINE_MAX });
}

/** The save error for a refused closing line, or null when the line can be stored. */
export function closingLineMessage(line: string, country: string | undefined, locale: Locale): string | null {
  const note = closingLineNote(line, country, locale);
  return note ? fmt(appText(locale).errors.closingLine, { reason: note }) : null;
}
