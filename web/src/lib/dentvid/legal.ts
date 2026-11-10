/**
 * The sign-up consent line links to the Terms and the Privacy Policy, which
 * exist in every site language. It is shown by default; DENTVIDEO_LEGAL_PAGES
 * set to off/0/false/no hides it (an emergency switch only).
 */
export function legalPagesOn(env: Record<string, string | undefined> = process.env): boolean {
  return !/^(off|0|false|no)$/i.test(env.DENTVIDEO_LEGAL_PAGES?.trim() ?? "");
}

/** Split a consent sentence into text and its "{terms}" / "{privacy}" placeholders, in order. */
export function consentParts(sentence: string): string[] {
  return sentence.split(/(\{terms\}|\{privacy\})/).filter((p) => p !== "");
}

/** Split a sentence into text and its "{name}" placeholders, in order. */
export function placeholderParts(sentence: string, names: readonly string[]): string[] {
  const re = new RegExp(`(${names.map((n) => `\\{${n}\\}`).join("|")})`);
  return sentence.split(re).filter((p) => p !== "");
}
