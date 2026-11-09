/**
 * The sign-up consent line links to /terms and /privacy. Those pages are
 * being written separately, so the line is shown only once the owner sets
 * DENTVIDEO_LEGAL_PAGES=on (read on the server, passed to the form).
 */
export function legalPagesOn(env: Record<string, string | undefined> = process.env): boolean {
  return /^(on|1|true|yes)$/i.test(env.DENTVIDEO_LEGAL_PAGES?.trim() ?? "");
}

/** Split a consent sentence into text and its "{terms}" / "{privacy}" placeholders, in order. */
export function consentParts(sentence: string): string[] {
  return sentence.split(/(\{terms\}|\{privacy\})/).filter((p) => p !== "");
}
