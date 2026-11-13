import { ImageResponse } from "next/og";
import { dirOf, type Guide, type Locale } from "@/content/dentvideo";
import { GUIDE_UI } from "@/content/guides/ui";
import { ENTITY } from "@/content/guides/entity";
import { LEGAL, LEGAL_NAV, type LegalKind } from "@/content/legal";
import { SOLUTION_UI } from "@/content/solutions/ui";
import { CHECKER } from "@/content/dentvideo-checker";
import type { SolutionPage } from "@/content/solutions";
import { CardLogo, CardText, cardFonts, fitFontSize } from "./og-text";
import { OG_SIZE } from "./og";

/**
 * The share card for every page that is not a landing: logo, a label saying
 * what kind of page it is (Guides, About, Legal …) and the page's own title,
 * in the page's language and brand type. Arabic cards read right to left;
 * Japanese is drawn in Noto Sans JP. Rendered at build time.
 */
export type PageCard = { locale: Locale; label: string; title: string };

export async function pageOgImage({ locale, label, title }: PageCard) {
  const f = await cardFonts(locale, [label, title]);
  const rtl = dirOf(locale) === "rtl";
  const script = f.head === "Script";
  const TITLE_W = 1040;
  // Script faces are set heavier and wider than Instrument Serif: size them by their own measure.
  const size = script ? fitFontSize(title, TITLE_W, 3, [80, 72, 66, 60, 54, 48], 0.55) : fitFontSize(title, TITLE_W, 3, [84, 76, 68, 60, 54], 0.42);
  const row = rtl ? "row-reverse" : "row";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: rtl ? "flex-end" : "flex-start",
          padding: "64px 72px",
          background: "linear-gradient(135deg, #faf7f2 0%, #f5efe6 60%, #e3efeb 100%)",
          fontFamily: "Jakarta",
          color: "#14211f",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            ...(rtl ? { left: -180 } : { right: -180 }),
            bottom: -220,
            width: 640,
            height: 640,
            borderRadius: 9999,
            background: "rgba(143,209,198,0.35)",
            filter: "blur(80px)",
            display: "flex",
          }}
        />
        <div style={{ display: "flex", flexDirection: row, alignItems: "center", justifyContent: "space-between", width: 1056 }}>
          <CardLogo />
          {f.words ? (
            <div style={{ display: "flex", padding: "10px 22px", borderRadius: 9999, background: "#0f5c5c", color: "#ffffff", fontSize: 24 }}>
              <CardText text={label} locale={locale} style={{ fontFamily: f.body, fontSize: 24 }} />
            </div>
          ) : null}
        </div>
        {f.words ? (
          <CardText
            text={title}
            locale={locale}
            style={{ fontFamily: f.head, fontSize: size, lineHeight: script ? 1.3 : 1.04, letterSpacing: script ? 0 : "-0.01em", width: TITLE_W }}
          />
        ) : (
          <div style={{ display: "flex" }} />
        )}
        <div style={{ display: "flex", flexDirection: row, alignItems: "center", width: 1056 }}>
          <div style={{ display: "flex", width: 56, height: 5, borderRadius: 3, background: "#16706a" }} />
          <div style={{ display: "flex", fontSize: 24, color: "#3d4c49", margin: "0 18px" }}>dentvideo.com</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts: f.fonts },
  );
}

/* The cards of each kind of page, from the same content the page renders. */

export const guideCard = (g: Guide): PageCard => ({ locale: g.locale, label: GUIDE_UI[g.locale].guides, title: g.h1 });
export const guidesIndexCard = (locale: Locale): PageCard => ({ locale, label: GUIDE_UI[locale].guides, title: GUIDE_UI[locale].index.h1 });
export const aboutCard = (locale: Locale): PageCard => ({ locale, label: GUIDE_UI[locale].about, title: ENTITY[locale].h1 });
export const legalCard = (kind: LegalKind, locale: Locale): PageCard => ({ locale, label: LEGAL_NAV[locale].legal, title: LEGAL[locale].docs[kind].title });
export const solutionCard = (p: SolutionPage): PageCard => ({ locale: p.locale, label: SOLUTION_UI[p.locale].forClinics, title: p.h1 });
export const checkerCard = (locale: Locale): PageCard => ({ locale, label: CHECKER[locale].nav, title: CHECKER[locale].h1 });

export function guideOgImage(g: Guide) {
  return pageOgImage(guideCard(g));
}
