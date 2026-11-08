import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LANDING, dirOf, type Locale } from "@/content/dentvideo";
import { sampleSrc, samplesFor } from "@/content/dentvideo-samples";
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

/**
 * Japanese and Arabic need their own faces: Google Fonts serves exactly the
 * glyphs of the card's text (the `text=` subset) at build time, as TrueType.
 * Without the network the card is drawn without its words rather than in tofu.
 */
const SCRIPT_FONT: Partial<Record<Locale, string>> = { ja: "Noto Sans JP" };
/**
 * Satori (next/og) cannot shape Arabic: its font parser rejects the contextual
 * substitutions Arabic faces rely on, and it has no right-to-left layout. The
 * Arabic card is drawn without words — logo, dentvideo.com and the phone — and
 * the shared link's title and description carry the Arabic text.
 */
const WORDLESS: readonly Locale[] = ["ar"];

async function googleFontSubset(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (
      await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`)
    ).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** The social card for a DentVideo landing: logo, the localized promise, a real sample on a phone (or a drawn one). */
export async function dentvideoOgImage(locale: Locale) {
  const c = LANDING[locale];
  const root = process.cwd();
  const sample = samplesFor(locale)?.[0];
  const family = SCRIPT_FONT[locale];
  const [serif, sans, poster, script] = await Promise.all([
    readFile(join(root, "assets/fonts/InstrumentSerif-Regular.ttf")),
    readFile(join(root, "assets/fonts/PlusJakartaSans-SemiBold.ttf")),
    sample ? readFile(join(root, "public", sampleSrc(locale, sample.slug, "jpg"))) : Promise.resolve(null),
    family ? googleFontSubset(family, 700, `${c.hero.h1}${c.meta.ogDescription}${c.mock.caption}`) : Promise.resolve(null),
  ]);
  const posterUri = poster ? `data:image/jpeg;base64,${poster.toString("base64")}` : null;
  const L = LOGO_COLORS.light;
  // A right-to-left card once a script can be drawn right to left (not yet: see WORDLESS).
  const rtl = dirOf(locale) === "rtl" && !WORDLESS.includes(locale);
  // Words only when they can be drawn: Latin always, Japanese/Arabic when their font arrived.
  const words = !WORDLESS.includes(locale) && (!family || script !== null);
  const headFont = family ? "Script" : "Instrument";
  const bodyFont = family ? "Script" : "Jakarta";
  const align = rtl ? "flex-end" : "flex-start";

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

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: align, padding: rtl ? "64px 72px 64px 0" : "64px 0 64px 72px", width: 780 }}>
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
            <div
              style={{
                display: "flex",
                fontFamily: headFont,
                fontSize: family ? (c.hero.h1.length > 24 ? 56 : 64) : c.hero.h1.length > 60 ? 64 : 72,
                lineHeight: family ? 1.3 : 1.02,
                letterSpacing: family ? 0 : "-0.01em",
                textAlign: rtl ? "right" : "left",
              }}
            >
              {c.hero.h1}
            </div>
          ) : (
            <div style={{ display: "flex" }} />
          )}
          {words ? (
            <div style={{ display: "flex", fontFamily: bodyFont, fontSize: 26, lineHeight: 1.5, color: "#3d4c49", maxWidth: 640, textAlign: rtl ? "right" : "left" }}>
              {c.meta.ogDescription}
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 30, color: "#3d4c49" }}>dentvideo.com</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
          <div
            style={{
              display: "flex",
              padding: 10,
              borderRadius: 52,
              background: "#0b1110",
              boxShadow: "0 40px 80px -20px rgba(8,46,45,0.55)",
              transform: rtl ? "rotate(-4deg)" : "rotate(4deg)",
            }}
          >
            {posterUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={posterUri} width={252} height={448} style={{ borderRadius: 42, objectFit: "cover" }} alt="" />
            ) : (
              // No sample week in this language: the drawn frame the landing shows.
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: rtl ? "flex-end" : "flex-start",
                  width: 252,
                  height: 448,
                  borderRadius: 42,
                  padding: 28,
                  background: "linear-gradient(180deg, #16706a 0%, #0f5c5c 55%, #0b3f3e 100%)",
                  color: "#ffffff",
                }}
              >
                {words ? (
                  <div style={{ display: "flex", fontFamily: bodyFont, fontSize: 26, lineHeight: 1.45, textAlign: rtl ? "right" : "left" }}>{c.mock.caption}</div>
                ) : null}
                <div style={{ display: "flex", marginTop: 18, width: 56, height: 5, borderRadius: 3, background: "#8fd1c6" }} />
              </div>
            )}
          </div>
        </div>
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
