import type { ThemeId } from "./scene-plan.js";

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
};

const SANS = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';

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
 */
export const TYPE = {
  hook: 104,
  display: 92,
  statValue: 168,
  heading: 64,
  body: 48,
  listItem: 46,
  label: 32,
  caption: 36,
} as const;

/** Longer lines need to come down a step or they wrap into a wall. */
export function fitText(size: number, text: string, comfortable = 42): number {
  if (text.length <= comfortable) return size;
  const ratio = comfortable / text.length;
  // Never below 58% — past that the shrinking is what looks broken.
  return Math.round(size * Math.max(0.58, Math.sqrt(ratio)));
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

/** The darker end of the gradient — the worst case text sits on. */
export function worstBackground(t: Theme): string {
  const [from, to] = t.background;
  return luminance(from) < luminance(to) ? from : to;
}
