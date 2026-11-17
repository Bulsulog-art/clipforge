// GENERATED from worker/src/remotion/LogoMark.tsx by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import React from "react";
import { Img } from "remotion";
import type { Theme } from "./theme";
import { chipLook, logoBox, signOffTreatment, type LogoStyle } from "./logo-style";

/**
 * A clinic's logo on the chip its analysis asked for (logo-style.ts), sized
 * by area so a wide wordmark and a square emblem carry the same weight, and
 * cropped to its visible part so transparent margins neither shrink it nor
 * push it off-centre.
 *
 * Without a style — an older job, or a logo the analysis could not read —
 * it falls back to the original treatment: a light chip with the logo
 * contained in a fixed box. That is never wrong for a dark logo, which is
 * what most clinics upload.
 */
export const LogoMark: React.FC<{
  src: string;
  theme: Theme;
  style?: LogoStyle;
  size: { area: number; maxWidth: number; maxHeight: number };
  /** Drawn on the sign-off's own background rather than over arbitrary footage. */
  signOff?: boolean;
}> = ({ src, theme, style, size, signOff }) => {
  const base = style?.treatment ?? "light";
  const treatment = signOff ? signOffTreatment(base, theme) : base;
  const box = style ? logoBox(style.aspect, size) : undefined;
  const chip = chipLook(treatment, theme, box?.height ?? Math.round(size.maxHeight * 0.75));
  const crop = style?.crop;
  return (
    <div
      style={{
        display: "inline-flex",
        padding: `${chip.padY}px ${chip.padX}px`,
        borderRadius: chip.radius,
        background: chip.background,
        border: chip.border,
        boxShadow: chip.shadow,
        overflow: "hidden",
        lineHeight: 0,
      }}
    >
      {box ? (
        <div style={{ position: "relative", width: box.width, height: box.height, overflow: "hidden" }}>
          <Img
            src={src}
            style={
              crop
                ? {
                    position: "absolute",
                    width: box.width / crop.w,
                    height: box.height / crop.h,
                    left: -(crop.x / crop.w) * box.width,
                    top: -(crop.y / crop.h) * box.height,
                    maxWidth: "none",
                  }
                : { display: "block", width: box.width, height: box.height, objectFit: "contain" }
            }
          />
        </div>
      ) : (
        <Img
          src={src}
          style={{ display: "block", maxWidth: size.maxWidth * 0.8, maxHeight: size.maxHeight * 0.75, objectFit: "contain" }}
        />
      )}
    </div>
  );
};
