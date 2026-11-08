"use client";

import type { LogoColors } from "@/lib/dentvid/logo-colors";

/** Moves a hex colour toward another by `t` (0..1). */
function mix(hex: string, toward: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [p(hex), p(toward)];
  return `#${a.map((c, i) => Math.round(c + (b[i] - c) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Same idea as the renderer's logoBox: equal area, so wide and square logos weigh the same. */
function box(aspect: number, area = 26 * 26, maxW = 72, maxH = 30) {
  const a = Math.min(40, Math.max(0.05, aspect || 1));
  let w = Math.sqrt(area * a);
  let h = w / a;
  if (w > maxW) [w, h] = [maxW, maxW / a];
  if (h > maxH) [w, h] = [maxH * a, maxH];
  return { w, h };
}

/**
 * A phone-sized glimpse of a video frame: the brand colour taken deep, as the
 * renderer does (worker/src/remotion/theme.ts brandTheme), the logo trimmed
 * and on the chip the videos will give it, and the logo's own second colour
 * as the accent when it has one. Close enough to judge a colour by; the
 * render itself is the source of truth.
 */
export function LogoPreview({
  src,
  brandColor,
  colors,
  accent,
  label,
  name,
  handle,
}: {
  src: string;
  brandColor: string;
  colors: Pick<LogoColors, "treatment" | "aspect" | "crop">;
  /** A logo colour to use for emphasis (see accentFor); otherwise a lift of the brand colour. */
  accent?: string;
  label: string;
  name: string;
  handle?: string;
}) {
  const brand = /^#[0-9a-fA-F]{6}$/.test(brandColor) ? brandColor.toLowerCase() : "#0f5c5c";
  const deep = mix(brand, "#05080a", 0.78);
  const lighter = mix(brand, "#05080a", 0.6);
  const emphasis = accent ?? mix(brand, "#ffffff", 0.45);
  const { treatment, crop } = colors;
  const size = box(colors.aspect);
  const chip =
    treatment === "light"
      ? { background: "#ffffff", padding: "6px 9px", border: "1px solid rgba(255,255,255,0.6)" }
      : treatment === "dark"
        ? { background: deep, padding: "6px 9px", border: "1px solid rgba(255,255,255,0.22)" }
        : { background: "transparent", padding: "0", border: "none" };
  return (
    <figure className="sm:col-span-2">
      <figcaption className="text-sm font-medium">{label}</figcaption>
      <div
        className="relative mt-2 flex h-64 w-36 flex-col items-start justify-center overflow-hidden rounded-2xl px-3 shadow-md"
        style={{ background: `linear-gradient(160deg, ${deep} 0%, ${lighter} 100%)` }}
        aria-hidden="true"
      >
        <span className="absolute right-2 top-6 inline-flex overflow-hidden rounded-lg shadow" style={{ ...chip, lineHeight: 0 }}>
          <span className="relative block overflow-hidden" style={{ width: size.w, height: size.h }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset */}
            <img
              src={src}
              alt=""
              className="absolute block max-w-none"
              style={
                crop
                  ? {
                      width: size.w / crop.w,
                      height: size.h / crop.h,
                      left: -(crop.x / crop.w) * size.w,
                      top: -(crop.y / crop.h) * size.h,
                    }
                  : { width: size.w, height: size.h, left: 0, top: 0, objectFit: "contain" }
              }
            />
          </span>
        </span>
        <span className="mb-1.5 block h-0.5 w-6 rounded" style={{ background: emphasis }} />
        <span className="block text-[13px] font-bold leading-tight text-white">{name}</span>
        {handle ? (
          <span className="mt-2 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: emphasis, color: deep }}>
            @{handle.replace(/^@/, "")}
          </span>
        ) : null}
      </div>
    </figure>
  );
}
