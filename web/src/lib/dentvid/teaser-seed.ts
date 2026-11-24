/**
 * What the landing's "try it with your logo" teaser left in sessionStorage
 * (TEASER_KEY in ./onboarding, written by components/dentvid/teaser.tsx),
 * read back for the sign-up page's recap. Pure and defensive: the value comes
 * from the browser, so anything malformed (not JSON, wrong types, a name too
 * long, a colour that is not #rrggbb, a logo that is not an image data URL)
 * is dropped, and a seed with neither a name nor a logo is no recap at all.
 */

export type TeaserSeed = {
  /** The clinic's name as typed (trimmed, at most 80 characters), or null. */
  name: string | null;
  /** "#rrggbb", lower case. */
  brandColor: string;
  /** The logo as an image data URL, or null (none chosen, or too big to carry). */
  logo: string | null;
};

/** The teaser's first colour, used when the stored one is not a colour. */
export const TEASER_DEFAULT_COLOR = "#0f5c5c";
/** The teaser cuts the name at 80 characters; anything longer did not come from it. */
const MAX_NAME = 80;
/** The teaser carries logos up to 1.5 MB, about 2 MB as a data URL; leave room, refuse the absurd. */
const MAX_LOGO = 3_000_000;
const LOGO = /^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/;

/** The seed from the stored string (sessionStorage.getItem(TEASER_KEY)), or null. Never throws. */
export function parseTeaserSeed(raw: unknown): TeaserSeed | null {
  if (typeof raw !== "string" || !raw || raw.length > MAX_LOGO + 10_000) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const seed = value as Record<string, unknown>;
  const name = typeof seed.name === "string" && seed.name.trim() && seed.name.trim().length <= MAX_NAME ? seed.name.trim() : null;
  const brandColor = typeof seed.brandColor === "string" && /^#[0-9a-f]{6}$/i.test(seed.brandColor) ? seed.brandColor.toLowerCase() : TEASER_DEFAULT_COLOR;
  const logo = typeof seed.logo === "string" && seed.logo.length <= MAX_LOGO && LOGO.test(seed.logo) ? seed.logo : null;
  if (!name && !logo) return null;
  return { name, brandColor, logo };
}

/** Reads and parses the seed; storage that is missing or throws (Safari private mode, blocked cookies) is no seed. */
export function readTeaserSeed(storage: Pick<Storage, "getItem"> | null | undefined, key: string): TeaserSeed | null {
  try {
    return parseTeaserSeed(storage?.getItem(key));
  } catch {
    return null;
  }
}

/** The clinic's initial for the tile when there is no logo ("Örnek" → "Ö", "サンプル歯科" → "サ"). */
export function clinicInitial(name: string | null, locale?: string): string {
  const first = Array.from((name ?? "").trim())[0] ?? "";
  try {
    return first.toLocaleUpperCase(locale);
  } catch {
    return first.toUpperCase();
  }
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
}

/** White or dark ink for text on the brand colour: whichever contrasts more (WCAG). */
export function inkOn(brandColor: string): "#ffffff" | "#14211f" {
  if (!/^#[0-9a-f]{6}$/i.test(brandColor)) return "#ffffff";
  const l = luminance(brandColor);
  const onWhite = 1.05 / (l + 0.05);
  const onDark = (l + 0.05) / (luminance("#14211f") + 0.05);
  return onWhite >= onDark ? "#ffffff" : "#14211f";
}
