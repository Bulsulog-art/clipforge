import { useId } from "react";

/**
 * DentVideo's logo, drawn once and used everywhere (header, footer, OG image,
 * the static files in public/dentvideo). Rules in docs/BRAND.md.
 *
 * The mark is a molar whose crown carries a rounded play glyph, set on a deep
 * teal tile. Geometry is on a 64-unit grid; the wordmark is Plus Jakarta Sans
 * Bold outlined to paths (tracking −35), so the lockup never depends on a
 * font loading.
 */

/** Molar silhouette, 64-unit grid. */
export const TOOTH_PATH =
  "M34.2 14.5C37.6 12.1 40.9 11.3 44.4 12.8C49.2 14.9 50.6 20.3 49.6 26C48.9 30.2 47.4 33.6 46.8 38C46.2 42.6 45.6 48.6 43 51.6C40.6 54.2 37.6 52.4 37 48.6C36.5 45 35.6 41.8 32 41.8C28.4 41.8 27.5 45 27 48.6C26.4 52.4 23.4 54.2 21 51.6C18.4 48.6 17.8 42.6 17.2 38C16.6 33.6 15.1 30.2 14.4 26C13.4 20.3 14.8 14.9 19.6 12.8C23.1 11.3 26.4 12.1 29.8 14.5Q32 16.1 34.2 14.5Z";
/** Rounded play glyph, knocked out of the crown (even-odd). */
export const PLAY_PATH = "M29.25 20.3Q27 19 27 21.6L27 32.4Q27 35 29.25 33.7L38.55 28.3Q40.8 27 38.55 25.7Z";
/** Tooth scaled into the tile with optical centring. */
export const TOOTH_TRANSFORM = "translate(32 32.6) scale(1.08) translate(-32 -32)";

export const WORDMARK_DENT =
  "M7.2 0V-74.5H31.5Q43.3 -74.5 52.05 -69.75Q60.8 -65 65.6 -56.65Q70.4 -48.3 70.4 -37.3Q70.4 -26.4 65.6 -17.95Q60.8 -9.5 52.05 -4.75Q43.3 0 31.5 0ZM20.8 -12H31.8Q39.4 -12 44.95 -15.15Q50.5 -18.3 53.6 -23.95Q56.7 -29.6 56.7 -37.3Q56.7 -45.1 53.6 -50.7Q50.5 -56.3 44.95 -59.4Q39.4 -62.5 31.8 -62.5H20.8ZM102.4 1.2Q94 1.2 87.7 -2.6Q81.4 -6.4 77.9 -12.9Q74.4 -19.4 74.4 -27.3Q74.4 -35.5 77.95 -41.85Q81.5 -48.2 87.65 -51.9Q93.8 -55.6 101.4 -55.6Q107.8 -55.6 112.65 -53.5Q117.5 -51.4 120.9 -47.7Q124.3 -44 126.1 -39.25Q127.9 -34.5 127.9 -29Q127.9 -27.6 127.75 -26.1Q127.6 -24.6 127.2 -23.5H85.2V-33.5H119.8L113.6 -28.8Q114.5 -33.4 113.15 -37Q111.8 -40.6 108.75 -42.7Q105.7 -44.8 101.4 -44.8Q97.3 -44.8 94.1 -42.75Q90.9 -40.7 89.25 -36.75Q87.6 -32.8 88 -27.2Q87.6 -22.2 89.35 -18.35Q91.1 -14.5 94.55 -12.4Q98 -10.3 102.5 -10.3Q107 -10.3 110.15 -12.2Q113.3 -14.1 115.1 -17.3L125.7 -12.1Q124.1 -8.2 120.7 -5.2Q117.3 -2.2 112.65 -0.5Q108 1.2 102.4 1.2ZM134.3 0V-54.4H146.6V-43.7L145.6 -45.6Q147.5 -50.5 151.85 -53.05Q156.2 -55.6 162 -55.6Q168 -55.6 172.65 -53Q177.3 -50.4 179.9 -45.75Q182.5 -41.1 182.5 -35V0H169.4V-31.9Q169.4 -35.5 168 -38.1Q166.6 -40.7 164.15 -42.15Q161.7 -43.6 158.4 -43.6Q155.2 -43.6 152.7 -42.15Q150.2 -40.7 148.8 -38.1Q147.4 -35.5 147.4 -31.9V0ZM214.9 0.6Q205.7 0.6 200.65 -4.45Q195.6 -9.5 195.6 -18.7V-42.7H186.2V-54.4H187.2Q191.2 -54.4 193.4 -56.5Q195.6 -58.6 195.6 -62.6V-66.8H208.7V-54.4H221.2V-42.7H208.7V-19.4Q208.7 -16.7 209.65 -14.8Q210.6 -12.9 212.65 -11.9Q214.7 -10.9 217.9 -10.9Q218.6 -10.9 219.55 -11Q220.5 -11.1 221.4 -11.2V0Q220 0.2 218.2 0.4Q216.4 0.6 214.9 0.6Z";
export const WORDMARK_VIDEO =
  "M248.9 0 222.9 -74.5H237.7L258.1 -12.8H255.2L275.6 -74.5H290.4L264.5 0ZM294.1 0V-54.4H307.2V0ZM294.1 -60.5V-74.5H307.2V-60.5ZM341.1 1.2Q333.2 1.2 327 -2.55Q320.8 -6.3 317.2 -12.8Q313.6 -19.3 313.6 -27.2Q313.6 -35.2 317.2 -41.6Q320.8 -48 327.05 -51.8Q333.3 -55.6 341 -55.6Q347.2 -55.6 352.05 -53.15Q356.9 -50.7 359.7 -46.3L357.7 -43.6V-75.7H370.8V0H358.4V-10.5L359.8 -7.9Q357 -3.5 352 -1.15Q347 1.2 341.1 1.2ZM342.5 -10.8Q347 -10.8 350.4 -12.9Q353.8 -15 355.75 -18.7Q357.7 -22.4 357.7 -27.2Q357.7 -31.9 355.75 -35.65Q353.8 -39.4 350.4 -41.5Q347 -43.6 342.5 -43.6Q338.1 -43.6 334.6 -41.45Q331.1 -39.3 329.15 -35.65Q327.2 -32 327.2 -27.2Q327.2 -22.4 329.15 -18.7Q331.1 -15 334.6 -12.9Q338.1 -10.8 342.5 -10.8ZM405.3 1.2Q396.9 1.2 390.6 -2.6Q384.3 -6.4 380.8 -12.9Q377.3 -19.4 377.3 -27.3Q377.3 -35.5 380.85 -41.85Q384.4 -48.2 390.55 -51.9Q396.7 -55.6 404.3 -55.6Q410.7 -55.6 415.55 -53.5Q420.4 -51.4 423.8 -47.7Q427.2 -44 429 -39.25Q430.8 -34.5 430.8 -29Q430.8 -27.6 430.65 -26.1Q430.5 -24.6 430.1 -23.5H388.1V-33.5H422.7L416.5 -28.8Q417.4 -33.4 416.05 -37Q414.7 -40.6 411.65 -42.7Q408.6 -44.8 404.3 -44.8Q400.2 -44.8 397 -42.75Q393.8 -40.7 392.15 -36.75Q390.5 -32.8 390.9 -27.2Q390.5 -22.2 392.25 -18.35Q394 -14.5 397.45 -12.4Q400.9 -10.3 405.4 -10.3Q409.9 -10.3 413.05 -12.2Q416.2 -14.1 418 -17.3L428.6 -12.1Q427 -8.2 423.6 -5.2Q420.2 -2.2 415.55 -0.5Q410.9 1.2 405.3 1.2ZM463.8 1.2Q455.8 1.2 449.25 -2.5Q442.7 -6.2 438.85 -12.6Q435 -19 435 -27.2Q435 -35.4 438.85 -41.8Q442.7 -48.2 449.2 -51.9Q455.7 -55.6 463.8 -55.6Q471.8 -55.6 478.3 -51.9Q484.8 -48.2 488.65 -41.85Q492.5 -35.5 492.5 -27.2Q492.5 -19 488.6 -12.6Q484.7 -6.2 478.2 -2.5Q471.7 1.2 463.8 1.2ZM463.8 -10.8Q468.2 -10.8 471.55 -12.9Q474.9 -15 476.85 -18.75Q478.8 -22.5 478.8 -27.2Q478.8 -32 476.85 -35.65Q474.9 -39.3 471.55 -41.45Q468.2 -43.6 463.8 -43.6Q459.3 -43.6 455.9 -41.45Q452.5 -39.3 450.55 -35.65Q448.6 -32 448.6 -27.2Q448.6 -22.5 450.55 -18.75Q452.5 -15 455.9 -12.9Q459.3 -10.8 463.8 -10.8Z";
/** Wordmark placed beside a 64-unit tile: cap height 27, centred on the tile. */
export const WORDMARK_TRANSFORM = "translate(75.4 45.5) scale(0.3624)";
/** Lockup canvas: tile (64) + gap (14) + wordmark. */
export const LOCKUP_VIEWBOX = "0 0 254 64";

export const LOGO_COLORS = {
  light: { tileFrom: "#167269", tileTo: "#0b4a48", tooth: "#f7f1e7", dent: "#14211f", video: "#0f5c5c", rim: "#ffffff" },
  dark: { tileFrom: "#1d8077", tileTo: "#0f5c5c", tooth: "#f7f1e7", dent: "#f7f1e7", video: "#8fd1c6", rim: "#ffffff" },
} as const;

type Tone = keyof typeof LOGO_COLORS;

function Tile({ tone, id }: { tone: Tone; id: string }) {
  const c = LOGO_COLORS[tone];
  return (
    <>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={c.tileFrom} />
          <stop offset="1" stopColor={c.tileTo} />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${id})`} />
      <rect x="0.5" y="0.5" width="63" height="63" rx="15.5" fill="none" stroke={c.rim} strokeOpacity="0.14" />
      <path d={`${TOOTH_PATH}${PLAY_PATH}`} transform={TOOTH_TRANSFORM} fill={c.tooth} fillRule="evenodd" />
    </>
  );
}

/** The app-icon mark on its own. Decorative unless given a label. */
export function DvIcon({ className = "h-8 w-8", tone = "light", title }: { className?: string; tone?: Tone; title?: string }) {
  const id = `dvg${useId().replace(/:/g, "")}`;
  return (
    <svg viewBox="0 0 64 64" className={className} role={title ? "img" : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <Tile tone={tone} id={id} />
    </svg>
  );
}

/** Mark + wordmark. `tone="dark"` for teal or ink backgrounds. */
export function DvLogo({ className = "h-8 w-auto", tone = "light" }: { className?: string; tone?: Tone }) {
  const id = `dvg${useId().replace(/:/g, "")}`;
  const c = LOGO_COLORS[tone];
  return (
    <svg viewBox={LOCKUP_VIEWBOX} className={className} role="img" aria-label="DentVideo">
      <Tile tone={tone} id={id} />
      <g transform={WORDMARK_TRANSFORM}>
        <path d={WORDMARK_DENT} fill={c.dent} />
        <path d={WORDMARK_VIDEO} fill={c.video} />
      </g>
    </svg>
  );
}

/** Kept for existing call sites: the lockup at text size. */
export function DvMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center ${className}`}>
      <DvLogo className="h-7 w-auto" />
    </span>
  );
}
