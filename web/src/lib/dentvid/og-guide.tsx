import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import type { Guide } from "@/content/dentvideo";
import { GUIDE_UI } from "@/content/guides/ui";
import {
  LOCKUP_VIEWBOX,
  LOGO_COLORS,
  PLAY_PATH,
  TOOTH_PATH,
  TOOTH_TRANSFORM,
  WORDMARK_DENT,
  WORDMARK_TRANSFORM,
  WORDMARK_VIDEO,
} from "@/components/dentvid/mark";
import { OG_SIZE, SCRIPT_FONT, WORDLESS, googleFontSubset } from "./og";

/**
 * The social card for a guide: logo, "Guides" label and the guide's title, in brand type.
 * Japanese is drawn in Noto Sans JP (a build-time subset of exactly the card's glyphs, as on
 * the Japanese landing card). Arabic cannot be shaped by next/og, so its card, like the Arabic
 * landing card, carries the logo and dentvideo.com only; the link's title and description
 * carry the words. Without the network the Japanese card falls back to the same wordless card.
 */
export async function guideOgImage(g: Guide) {
  const root = process.cwd();
  const label = GUIDE_UI[g.locale].guides;
  const family = SCRIPT_FONT[g.locale];
  const [serif, sans, script] = await Promise.all([
    readFile(join(root, "assets/fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(root, "assets/fonts/PlusJakartaSans-SemiBold.ttf")),
    family ? googleFontSubset(family, 700, `${g.h1}${label}`) : Promise.resolve(null),
  ]);
  const L = LOGO_COLORS.light;
  const words = !WORDLESS.includes(g.locale) && (!family || script !== null);
  const titleFont = family ? "Script" : "Instrument";
  const labelFont = family ? "Script" : "Jakarta";
  // CJK glyphs are about twice as wide as Latin letters: size by visual width.
  const len = family ? g.h1.length * 2 : g.h1.length;
  const size = len > 70 ? 60 : len > 45 ? 70 : 80;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #faf7f2 0%, #f5efe6 60%, #e3efeb 100%)",
          fontFamily: "Jakarta",
          color: "#14211f",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", right: -180, bottom: -220, width: 640, height: 640, borderRadius: 9999, background: "rgba(143,209,198,0.35)", filter: "blur(80px)", display: "flex" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <svg width="254" height="64" viewBox={LOCKUP_VIEWBOX}>
            <defs>
              <linearGradient id="t" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor={L.tileFrom} />
                <stop offset="1" stopColor={L.tileTo} />
              </linearGradient>
            </defs>
            <rect width="64" height="64" rx="16" fill="url(#t)" />
            <path d={`${TOOTH_PATH}${PLAY_PATH}`} transform={TOOTH_TRANSFORM} fill={L.tooth} fillRule="evenodd" />
            <g transform={WORDMARK_TRANSFORM}>
              <path d={WORDMARK_DENT} fill={L.dent} />
              <path d={WORDMARK_VIDEO} fill={L.video} />
            </g>
          </svg>
          {words ? (
            <div style={{ display: "flex", padding: "10px 22px", borderRadius: 9999, background: "#0f5c5c", color: "#ffffff", fontSize: 24, fontFamily: labelFont }}>
              {label}
            </div>
          ) : null}
        </div>
        {words ? (
          <div style={{ display: "flex", fontFamily: titleFont, fontSize: size, lineHeight: family ? 1.3 : 1.04, letterSpacing: family ? 0 : "-0.01em", maxWidth: 1040 }}>{g.h1}</div>
        ) : (
          <div style={{ display: "flex" }} />
        )}
        <div style={{ display: "flex", fontSize: 24, color: "#3d4c49" }}>dentvideo.com</div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Instrument", data: serif, weight: 400, style: "normal" },
        { name: "Jakarta", data: sans, weight: 600, style: "normal" },
        ...(script ? [{ name: "Script", data: script, weight: 700 as const, style: "normal" as const }] : []),
      ],
    },
  );
}
