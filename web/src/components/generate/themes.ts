/**
 * The five looks a generated video can have.
 *
 * These values mirror `worker/src/remotion/theme.ts`, which is the source of
 * truth — the renderer never reads this file. They are duplicated here so the
 * preview a person sees before they spend a credit is the same palette the
 * renderer will actually paint, rather than an approximation of it.
 *
 * If a theme changes in the worker, change it here too. The contrast ratios
 * were chosen there and are asserted by the worker's theme tests.
 */

export type ThemeId = "midnight" | "sunrise" | "mono" | "candy" | "editorial";

export type ThemePreset = {
  id: ThemeId;
  name: string;
  /** One line on when to reach for it, shown under the swatch. */
  mood: string;
  background: [string, string];
  backgroundAngle: number;
  foreground: string;
  muted: string;
  accent: string;
  onAccent: string;
  surface: string;
  border: string;
  displayFont: string;
  radius: number;
  uppercaseDisplay: boolean;
};

const SANS = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = '"Playfair Display", Georgia, "Times New Roman", serif';

export const THEMES: ThemePreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    mood: "Tech, business, anything that should read as serious",
    background: ["#0B1020", "#131A33"],
    backgroundAngle: 160,
    foreground: "#F4F6FF",
    muted: "#98A2C8",
    accent: "#6C8CFF",
    onAccent: "#080C1A",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    displayFont: SANS,
    radius: 28,
    uppercaseDisplay: false,
  },
  {
    id: "sunrise",
    name: "Sunrise",
    mood: "Warm and personal — stories, health, motivation",
    background: ["#2A0E2E", "#7A2B3A"],
    backgroundAngle: 155,
    foreground: "#FFF3EC",
    muted: "#E3B4A6",
    accent: "#FFB454",
    onAccent: "#2A0E2E",
    surface: "rgba(255,255,255,0.08)",
    border: "rgba(255,255,255,0.14)",
    displayFont: SANS,
    radius: 30,
    uppercaseDisplay: false,
  },
  {
    id: "mono",
    name: "Mono",
    mood: "Stark black and white. Nothing to hide behind",
    background: ["#0A0A0A", "#171717"],
    backgroundAngle: 180,
    foreground: "#FFFFFF",
    muted: "#9A9A9A",
    accent: "#FFFFFF",
    onAccent: "#0A0A0A",
    surface: "rgba(255,255,255,0.07)",
    border: "rgba(255,255,255,0.18)",
    displayFont: SANS,
    radius: 8,
    uppercaseDisplay: true,
  },
  {
    id: "candy",
    name: "Candy",
    mood: "Loud and young. Built to stop a thumb",
    background: ["#2B1055", "#7134B8"],
    backgroundAngle: 150,
    foreground: "#FFFFFF",
    muted: "#D6BEF5",
    accent: "#FF5FA2",
    onAccent: "#2B1055",
    surface: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.18)",
    displayFont: SANS,
    radius: 40,
    uppercaseDisplay: false,
  },
  {
    id: "editorial",
    name: "Editorial",
    mood: "Paper and ink. Quiet, considered, expensive",
    background: ["#F6F1E7", "#EDE4D3"],
    backgroundAngle: 170,
    foreground: "#1A1712",
    muted: "#6B6154",
    accent: "#A33B24",
    onAccent: "#FFF8EF",
    surface: "rgba(26,23,18,0.05)",
    border: "rgba(26,23,18,0.14)",
    displayFont: SERIF,
    radius: 4,
    uppercaseDisplay: false,
  },
];

export function backgroundCss(t: ThemePreset): string {
  return `linear-gradient(${t.backgroundAngle}deg, ${t.background[0]} 0%, ${t.background[1]} 100%)`;
}

export type AspectId = "9:16" | "1:1" | "16:9";

export const ASPECTS: { id: AspectId; label: string; where: string; ratio: number }[] = [
  { id: "9:16", label: "9:16", where: "Reels · TikTok · Shorts", ratio: 9 / 16 },
  { id: "1:1", label: "1:1", where: "Feed posts", ratio: 1 },
  { id: "16:9", label: "16:9", where: "YouTube · LinkedIn", ratio: 16 / 9 },
];
