import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { LANDING, dirOf, type Locale } from "@/content/dentvideo";
import { sampleSrc, samplesFor } from "@/content/dentvideo-samples";
import { CardLogo, CardText, cardFonts, fitFontSize } from "./og-text";

export { SCRIPT_FONT, googleFontSubset } from "./og-text";

export const OG_SIZE = { width: 1200, height: 630 };

/** The social card for a DentVideo landing: logo, the localized promise, a real sample on a phone (or a drawn one). */
export async function dentvideoOgImage(locale: Locale) {
  const c = LANDING[locale];
  const sample = samplesFor(locale)?.[0];
  const [f, poster] = await Promise.all([
    cardFonts(locale, [c.hero.h1, c.meta.ogDescription, c.mock.caption]),
    sample ? readFile(join(process.cwd(), "public", sampleSrc(locale, sample.slug, "jpg"))) : Promise.resolve(null),
  ]);
  const posterUri = poster ? `data:image/jpeg;base64,${poster.toString("base64")}` : null;
  // Arabic reads right to left: text column on the right, phone on the left.
  const rtl = dirOf(locale) === "rtl";
  const script = f.head === "Script";
  const align = rtl ? "flex-end" : "flex-start";
  const TEXT_W = 660;
  const headSize = script ? fitFontSize(c.hero.h1, TEXT_W, 3, [64, 60, 56, 52, 48]) : c.hero.h1.length > 60 ? 64 : 72;
  const bodySize = script ? fitFontSize(c.meta.ogDescription, TEXT_W - 20, 3, [26, 25, 24, 23, 22], 0.52) : 26;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: rtl ? "row-reverse" : "row",
          background: "linear-gradient(135deg, #faf7f2 0%, #f5efe6 55%, #e3efeb 100%)",
          fontFamily: "Jakarta",
          color: "#14211f",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            ...(rtl ? { left: -160 } : { right: -160 }),
            top: -120,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: "rgba(143,209,198,0.35)",
            filter: "blur(80px)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: align, padding: rtl ? "64px 72px 64px 0" : "64px 0 64px 72px", width: 780 }}>
          <CardLogo />
          {f.words ? (
            <CardText
              text={c.hero.h1}
              locale={locale}
              style={{ fontFamily: f.head, fontSize: headSize, lineHeight: script ? 1.3 : 1.02, letterSpacing: script ? 0 : "-0.01em", width: TEXT_W }}
            />
          ) : (
            <div style={{ display: "flex" }} />
          )}
          {f.words ? (
            <CardText
              text={c.meta.ogDescription}
              locale={locale}
              style={{ fontFamily: f.body, fontSize: bodySize, lineHeight: 1.5, color: "#3d4c49", width: TEXT_W - 20 }}
            />
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
                  alignItems: align,
                  width: 252,
                  height: 448,
                  borderRadius: 42,
                  padding: 28,
                  background: "linear-gradient(180deg, #16706a 0%, #0f5c5c 55%, #0b3f3e 100%)",
                  color: "#ffffff",
                }}
              >
                {f.words ? <CardText text={c.mock.caption} locale={locale} style={{ fontFamily: f.body, fontSize: 26, lineHeight: 1.45, width: 196 }} /> : null}
                <div style={{ display: "flex", marginTop: 18, width: 56, height: 5, borderRadius: 3, background: "#8fd1c6" }} />
              </div>
            )}
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: f.fonts },
  );
}
