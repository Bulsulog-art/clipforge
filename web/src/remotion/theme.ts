// GENERATED from worker/src/remotion/theme.ts by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import type { ThemeId } from "./scene-plan";
import { fontStackFor, layoutUnits, scriptOfLanguage, visualLength, type Script } from "./script";

/**
 * The look of the output.
 *
 * A generated video reads as cheap for reasons that have nothing to do with
 * the idea in it: type that is too small, contrast that is too low, six
 * colours where two would do, and a drop shadow doing the work a background
 * should be doing. So the themes here are deliberately narrow — two type
 * weights, one accent, one surface — and the scene components are not allowed
 * to invent colours outside them. Constraint is what makes generated output
 * look designed rather than assembled.
 *
 * Every theme is checked for contrast in theme.test.ts. A theme that fails
 * WCAG AA for large text is not a stylistic choice, it is an unreadable video
 * on a phone in daylight.
 */

export type Theme = {
  id: ThemeId;
  /** Human name, shown when the user picks a look. */
  name: string;
  /** Painted behind everything. Two stops, angled — flat fills read as flat. */
  background: [string, string];
  backgroundAngle: number;
  /** Body and heading colour. */
  foreground: string;
  /** Secondary text: labels, attributions, captions. */
  muted: string;
  /** The one colour that carries emphasis. Used sparingly, which is the point. */
  accent: string;
  /** Text drawn on top of the accent. */
  onAccent: string;
  /** Cards, list rows, quote blocks. */
  surface: string;
  /** Hairlines and dividers. */
  border: string;
  /** Display type — headlines, stats, hooks. */
  displayFont: string;
  /** Everything else. */
  bodyFont: string;
  /** Corner radius for surfaces, in px at 1080 wide. */
  radius: number;
  /** Whether display type is set in caps. Editorial looks want it off. */
  uppercaseDisplay: boolean;
  /** The writing system of the video's text (localizeTheme); absent = Latin. */
  script?: Script;
};

const SANS = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
// Playfair Display was never installed in the worker image, so the Editorial
// look rendered in whatever serif fontconfig fell back to (Times-like
// Liberation/DejaVu). Noto Serif Display — a high-contrast display serif from
// fonts-noto-core, with full Latin Extended (ą ę ł ń ś ź ż, ğ ş İ, ő ű) — is
// what renders now; Playfair stays second for browsers that have it.
const SERIF = '"Noto Serif Display", "Playfair Display", Georgia, "Times New Roman", serif';

/**
 * Every family a theme or a language stack leads with, all installed in the
 * worker image (worker/Dockerfile checks each one at build time). A family
 * that is not here renders in a fallback nobody chose — theme.test.ts fails
 * if a theme or a language's stack starts with anything else.
 */
export const RENDER_FONTS = [
  "Inter", // fonts-inter
  "Noto Serif Display", // fonts-noto-core
  "Noto Sans CJK JP", // fonts-noto-cjk
  "Noto Sans CJK SC",
  "Noto Sans CJK TC",
  "Noto Kufi Arabic", // fonts-noto-core
  "Noto Sans Arabic",
] as const;

export const THEME_LIST: Theme[] = [
  {
    id: "midnight",
    name: "Midnight",
    background: ["#0B1020", "#131A33"],
    backgroundAngle: 160,
    foreground: "#F4F6FF",
    muted: "#98A2C8",
    accent: "#6C8CFF",
    onAccent: "#080C1A",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    displayFont: SANS,
    bodyFont: SANS,
    radius: 28,
    uppercaseDisplay: false,
  },
  {
    id: "sunrise",
    name: "Sunrise",
    background: ["#2A0E2E", "#7A2B3A"],
    backgroundAngle: 155,
    foreground: "#FFF3EC",
    muted: "#E3B4A6",
    accent: "#FFB454",
    onAccent: "#2A0E2E",
    surface: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.14)",
    displayFont: SANS,
    bodyFont: SANS,
    radius: 30,
    uppercaseDisplay: false,
  },
  {
    id: "mono",
    name: "Mono",
    background: ["#0A0A0A", "#171717"],
    backgroundAngle: 180,
    foreground: "#FFFFFF",
    muted: "#9A9A9A",
    accent: "#FFFFFF",
    onAccent: "#0A0A0A",
    surface: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.18)",
    displayFont: SANS,
    bodyFont: SANS,
    radius: 8,
    uppercaseDisplay: true,
  },
  {
    id: "candy",
    name: "Candy",
    background: ["#2B1055", "#7134B8"],
    backgroundAngle: 150,
    foreground: "#FFFFFF",
    muted: "#D6BEF5",
    accent: "#FF5FA2",
    // White on this pink is 2.8:1 — under the bar. The deep purple from the
    // background reads at 5.6:1 and keeps the theme's palette intact.
    onAccent: "#2B1055",
    surface: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.18)",
    displayFont: SANS,
    bodyFont: SANS,
    radius: 40,
    uppercaseDisplay: false,
  },
  {
    id: "editorial",
    name: "Editorial",
    background: ["#F6F1E7", "#EDE4D3"],
    backgroundAngle: 170,
    foreground: "#1A1712",
    muted: "#6B6154",
    accent: "#A33B24",
    onAccent: "#FFF8EF",
    surface: "rgba(26,23,18,0.05)",
    border: "rgba(26,23,18,0.14)",
    displayFont: SERIF,
    bodyFont: SANS,
    radius: 4,
    uppercaseDisplay: false,
  },
];

const BY_ID = new Map(THEME_LIST.map((t) => [t.id, t]));

export function theme(id: ThemeId): Theme {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`unknown theme: ${id}`);
  return found;
}

export function backgroundCss(t: Theme): string {
  return `linear-gradient(${t.backgroundAngle}deg, ${t.background[0]} 0%, ${t.background[1]} 100%)`;
}

// MARK: - Type scale

/**
 * Type sizes in px, expressed for a 1080-wide frame and scaled by the caller
 * for other aspects. The jumps are large on purpose: a phone screen held at
 * arm's length forgives nothing, and "one size smaller" reliably becomes
 * "nobody read it".
 *
 * These were raised after looking at the first renders. The earlier scale was
 * defensible on paper and wrong on screen: in a 1080x1920 frame the content
 * sat as a thin band in the middle with a third of the height empty above and
 * below it, which reads as timid next to anything else in a feed. Short-form
 * type is set far larger than page type, and the frame has to feel full.
 */
export const TYPE = {
  hook: 132,
  display: 116,
  statValue: 224,
  heading: 82,
  body: 54,
  listItem: 52,
  label: 34,
  caption: 40,
  /** The @handle on the sign-off: the one thing the viewer has to copy. */
  handle: 44,
} as const;

/**
 * Where Instagram Reels and TikTok draw their own UI over a 9:16 video, as
 * fractions of the frame: the header (account, "Reels", camera, search)
 * across the top, the caption block, audio line and progress bar across the
 * bottom, and the like/comment/share rail down the reading-end side (right in
 * a left-to-right app, left in an Arabic one). The union of both apps'
 * keep-out areas at 1080×1920. Nothing that has to be read may sit in them.
 */
export const SAFE_ZONES = { top: 0.12, bottom: 0.2, end: 0.115, start: 0.05 } as const;

/** Breathing room between the platform UI and our type, as a fraction of the frame. */
const SAFE_GAP = { y: 0.012, start: 0.025 } as const;

export type SafeFrame = { top: number; bottom: number; start: number; end: number };

/**
 * The padding, in px, that keeps content clear of the platform UI. Portrait
 * frames get the measured Reels/TikTok zones — deeper at the bottom than the
 * top, wider on the rail side than the reading-start side — so the content's
 * optical centre sits slightly above the frame's, where the eye lands.
 * `start`/`end` are logical sides: the composition applies them as
 * inline-start/end padding, so a right-to-left frame mirrors them for free.
 * Square and landscape frames (feeds, YouTube) keep a plain margin.
 */
export function safeFrame(width: number, height: number): SafeFrame {
  if (height <= width) {
    return { top: height * 0.09, bottom: height * 0.09, start: width * 0.085, end: width * 0.085 };
  }
  return {
    top: height * (SAFE_ZONES.top + SAFE_GAP.y),
    bottom: height * (SAFE_ZONES.bottom + SAFE_GAP.y),
    start: width * (SAFE_ZONES.start + SAFE_GAP.start),
    end: width * SAFE_ZONES.end,
  };
}

/** Width text may use, in 1080-wide authoring units: a portrait frame between its safe sides. */
export const TEXT_WIDTH = (() => {
  const f = safeFrame(1080, 1920);
  return Math.floor(1080 - f.start - f.end);
})();
/** A generous average advance of one bold glyph, in ems. */
const GLYPH_EM = 0.62;

/**
 * Longer lines need to come down a step or they wrap into a wall. And no
 * single word may be wider than the frame: a line can wrap between words but
 * not inside one, so German and Turkish compounds ("Zahnfleischprobleme",
 * "Temizlenmediğinde") ran off the right edge at full size.
 */
export function fitText(size: number, text: string, comfortable = 42): number {
  let fitted = size;
  // Japanese characters are full-width: measured in Latin-glyph units so the
  // same "comfortable" length means the same width on screen.
  const length = visualLength(text);
  if (length > comfortable) {
    // Never below 58% for length alone — past that the shrinking is what looks broken.
    fitted = Math.round(size * Math.max(0.58, Math.sqrt(comfortable / length)));
  }
  // The widest unit that cannot wrap: a word, or a Japanese phrase.
  const longest = Math.max(1, ...layoutUnits(text).units.map((w) => visualLength(w)));
  return Math.min(fitted, Math.floor(TEXT_WIDTH / (longest * GLYPH_EM)));
}

/**
 * Can this run of text, kept on one line (it will not wrap), sit inside the
 * frame's safe width at this size? Uses the same generous glyph estimate as
 * fitText, so anything it accepts stays inside the frame in every language.
 */
export function fitsOneLine(size: number, text: string): boolean {
  return visualLength(text) * GLYPH_EM * size <= TEXT_WIDTH;
}

/**
 * The theme set up for the video's language: that script's fonts in front of
 * the theme's own (which stay as the fallback for Latin words, digits and
 * @handles), and the script recorded so scenes can drop letter-spacing for
 * Arabic and relax line height. Latin languages get the theme unchanged.
 */
export function localizeTheme(t: Theme, language: string | undefined): Theme {
  const script = scriptOfLanguage(language);
  if (script === "latin") return t;
  const display = fontStackFor(language, "display");
  const body = fontStackFor(language, "body");
  return {
    ...t,
    script,
    // Serif Latin display faces have no Japanese or Arabic; the script's sans leads.
    displayFont: display ? `${display}, ${t.displayFont}` : t.displayFont,
    bodyFont: body ? `${body}, ${t.bodyFont}` : t.bodyFont,
    uppercaseDisplay: false,
  };
}

/** Letter-spacing that is safe for the script: Arabic letters join, and any tracking pulls the joins apart. */
export function tracking(t: Pick<Theme, "script">, latin: string): string {
  return t.script === "arabic" ? "0" : t.script === "cjk" && latin.startsWith("-") ? "0" : latin;
}

/** Line height for the script: Arabic needs room for its dots and tall letters, Japanese a little more air. */
export function leading(t: Pick<Theme, "script">, latin: number): number {
  return t.script === "arabic" ? Math.max(latin, 1.0) + 0.3 : t.script === "cjk" ? Math.max(latin, 1.0) + 0.12 : latin;
}

// MARK: - Contrast

/** Relative luminance per WCAG 2.1. */
export function luminance(hex: string): number {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * The text colour to set on a fill: the first candidate that clears `min`
 * against it, else whichever contrasts most. Candidates go in order of
 * preference (the theme's own colours first), with white and near-black as
 * the fallbacks that always exist — so a highlight or a chip in any clinic
 * colour gets the most on-brand colour that is still readable.
 */
export function readableOn(fill: string, candidates: string[] = [], min = 4.5): string {
  const all = [...candidates, "#FFFFFF", "#0B0D10"];
  const pass = all.find((c) => contrastRatio(c, fill) >= min);
  return pass ?? all.reduce((best, c) => (contrastRatio(c, fill) > contrastRatio(best, fill) ? c : best));
}

/**
 * The least opacity of a `scrim` colour, laid over the worst pixel a photo or
 * clip could put behind a letter, at which `text` still clears `min`. Plus a
 * small margin for compression noise. 1 if even a solid scrim cannot.
 */
export function scrimAlpha(text: string, scrim: string, worstPixel: string, min = 4.5): number {
  for (let a = 0; a <= 1.0001; a += 0.01) {
    if (contrastRatio(text, mix(worstPixel, scrim, a)) >= min) return Math.min(1, Math.round((a + 0.04) * 100) / 100);
  }
  return 1;
}

/** The darker end of the gradient — the worst case text sits on. */
export function worstBackground(t: Theme): string {
  const [from, to] = t.background;
  return luminance(from) < luminance(to) ? from : to;
}

// MARK: - Clinic brand

export function mix(hex: string, toward: string, amount: number): string {
  const p = (h: string) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(toward)];
  return (
    "#" +
    a
      .map((c, i) => Math.round(c + (b[i] - c) * amount))
      .map((c) => c.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

/** Hue in degrees (0–360) of a hex colour; NaN for a pure grey. */
export function hue(hex: string): number {
  const m = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return NaN;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** Shortest distance between two hues, 0–180 (0 when either is grey). */
export function hueDistance(a: string, b: string): number {
  const d = Math.abs(hue(a) - hue(b));
  return Number.isNaN(d) ? 0 : Math.min(d, 360 - d);
}

/** HSL (h in degrees, s and l 0–1) to hex. */
export function hsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return "#" + [0, 8, 4].map((n) => Math.round(f(n) * 255).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** HSL saturation (0–1) of a hex colour. */
export function saturation(hex: string): number {
  const m = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
}

/**
 * The two background stops for a brand colour: its own hue taken deep, dark
 * enough that white type clears 7.5:1 on the lighter stop.
 *
 * Mixing toward black (what this used to do) keeps a strong colour's
 * character but drains a pale one: a blush-pink clinic got a grey-mauve frame
 * and a pastel-blue one a slate grey — nobody's brand. Holding the hue and
 * the saturation while lowering the lightness gives the pink clinic deep
 * raspberry and the pale-blue one navy. Yellows are the exception: a dark
 * yellow is olive, which reads as dirty, so they keep only a warm hint of
 * their hue on a charcoal ground and carry the colour in the accent instead.
 * A grey brand (no hue) gets a neutral charcoal.
 */
export function deepBrand(brand: string, fg = "#FFFFFF"): [string, string] {
  const h = hue(brand);
  if (Number.isNaN(h)) {
    let deep = 0.62;
    while (deep < 0.98 && contrastRatio(fg, mix(brand, "#05080A", deep - 0.18)) < 7.5) deep += 0.02;
    return [mix(brand, "#05080A", Math.min(0.98, deep)), mix(brand, "#05080A", deep - 0.18)];
  }
  const yellow = h >= 42 && h <= 75;
  const s = yellow ? 0.22 : Math.min(0.72, Math.max(0.3, saturation(brand)));
  let l = 0.42;
  while (l > 0.04 && contrastRatio(fg, hsl(h, s, l)) < 10) l -= 0.01;
  return [hsl(h, Math.min(1, s * 1.05), l * 0.55), hsl(h, s, l)];
}

/**
 * The theme repainted in a clinic's brand colour, so every video reads as
 * theirs. The background is the brand hue taken deep (dark enough that white
 * type clears 7:1 on both stops); the accent is the brand hue lifted until it
 * reads on that background. A pale brand colour still yields a dark,
 * legible frame, because legibility is not negotiable.
 *
 * `accentHex` is a second colour taken from the clinic's logo (see
 * dental/logo.ts). When it is a genuinely different hue from the brand it
 * becomes the accent — a navy-and-gold logo then gets a navy frame with gold
 * emphasis, which is what makes the video look like the clinic's letterhead
 * rather than a tint of it. It is held to exactly the same contrast bar as
 * the brand-derived accent, and is only used if it meets it without being
 * washed out toward white; otherwise the brand accent stands.
 */
export function brandTheme(base: Theme, brandHex?: string, accentHex?: string): Theme {
  if (!brandHex || !/^#?[0-9a-fA-F]{6}$/.test(brandHex)) return base;
  const brand = `#${brandHex.replace("#", "").toUpperCase()}`;
  const fg = "#FFFFFF";
  const [from, to] = deepBrand(brand, fg);
  let lift = 0;
  let accent = brand;
  while (lift < 0.9 && contrastRatio(accent, to) < 4.5) {
    lift += 0.05;
    accent = mix(brand, "#FFFFFF", lift);
  }
  if (accentHex && /^#?[0-9a-fA-F]{6}$/.test(accentHex)) {
    const logoAccent = `#${accentHex.replace("#", "").toUpperCase()}`;
    if (hueDistance(logoAccent, brand) >= 25) {
      // At most a 45% lift: past that a saturated logo colour turns into a
      // pastel nobody would recognise as theirs, and the brand accent is better.
      let l = 0;
      let candidate = logoAccent;
      while (l < 0.45 && contrastRatio(candidate, to) < 4.5) {
        l += 0.05;
        candidate = mix(logoAccent, "#FFFFFF", l);
      }
      if (contrastRatio(candidate, to) >= 4.5) accent = candidate;
    }
  }
  return {
    ...base,
    background: [from, to],
    foreground: fg,
    muted: mix(brand, "#FFFFFF", 0.7),
    accent,
    onAccent: from,
    surface: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.14)",
  };
}
