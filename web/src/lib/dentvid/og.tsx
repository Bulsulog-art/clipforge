import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LANDING, type Locale } from "@/content/dentvideo";
import { SAMPLE_VIDEOS, sampleSrc } from "@/content/dentvideo-samples";
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

export const OG_SIZE = { width: 1200, height: 630 };

/** The social card for a DentVideo landing: logo, the localized promise, a real sample on a phone. */
export async function dentvideoOgImage(locale: Locale) {
  const c = LANDING[locale];
  const root = process.cwd();
  const [serif, sans, poster] = await Promise.all([
    readFile(join(root, "assets/fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(root, "assets/fonts/PlusJakartaSans-SemiBold.ttf")),
    readFile(join(root, "public", sampleSrc(locale, SAMPLE_VIDEOS[locale][0].slug, "jpg"))),
  ]);
  const posterUri = `data:image/jpeg;base64,${poster.toString("base64")}`;
  const L = LOGO_COLORS.light;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #faf7f2 0%, #f5efe6 55%, #e3efeb 100%)",
          fontFamily: "Jakarta",
          color: "#14211f",
          position: "relative",
        }}
      >
        <div style={{ position: "absolute", right: -160, top: -120, width: 620, height: 620, borderRadius: 9999, background: "rgba(143,209,198,0.35)", filter: "blur(80px)", display: "flex" }} />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 0 64px 72px", width: 780 }}>
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
          <div style={{ display: "flex", fontFamily: "Instrument", fontSize: c.hero.h1.length > 60 ? 64 : 72, lineHeight: 1.02, letterSpacing: "-0.01em" }}>
            {c.hero.h1}
          </div>
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.4, color: "#3d4c49", maxWidth: 640 }}>{c.meta.ogDescription}</div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
          <div
            style={{
              display: "flex",
              padding: 10,
              borderRadius: 52,
              background: "#0b1110",
              boxShadow: "0 40px 80px -20px rgba(8,46,45,0.55)",
              transform: "rotate(4deg)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={posterUri} width={252} height={448} style={{ borderRadius: 42, objectFit: "cover" }} alt="" />
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Instrument", data: serif, weight: 400, style: "normal" },
        { name: "Jakarta", data: sans, weight: 600, style: "normal" },
      ],
    },
  );
}
