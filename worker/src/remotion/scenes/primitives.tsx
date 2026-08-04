import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { Theme } from "../theme.js";
import { backgroundCss, fitText } from "../theme.js";
import { entrance, wordsVisible } from "../animation.js";

/**
 * The pieces every scene is built from.
 *
 * Scenes compose these rather than styling their own text, which is what keeps
 * eight different layouts looking like one product. It also means the moment
 * we improve, say, how a long headline wraps, every scene inherits it.
 *
 * Sizes are authored for a 1080-wide frame and multiplied by `useScale()`, so
 * the same component is correct at 1080x1920, 1080x1080 and 1920x1080 without
 * a second set of numbers to keep in sync.
 */

/** Everything is authored against this width. */
const BASE_WIDTH = 1080;

export function useScale(): number {
  const { width } = useVideoConfig();
  return width / BASE_WIDTH;
}

/** Safe margins. Phone UI eats the outer edges of a 9:16 frame. */
export function useSafeArea(): { x: number; y: number } {
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  return {
    x: width * 0.085,
    // Captions, usernames and buttons sit over the top and bottom of a reel.
    y: vertical ? height * 0.14 : height * 0.09,
  };
}

export const Backdrop: React.FC<{ theme: Theme; children: React.ReactNode }> = ({
  theme,
  children,
}) => {
  const scale = useScale();
  const safe = useSafeArea();
  return (
    <AbsoluteFill style={{ background: backgroundCss(theme) }}>
      {/* A soft light source keeps the flat gradient from reading as a solid fill. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${theme.accent}22 0%, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          padding: `${safe.y}px ${safe.x}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 28 * scale,
        }}
      >
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/**
 * Display type. Optionally reveals word by word, which holds attention far
 * better than a whole line fading in at once.
 */
export const DisplayText: React.FC<{
  text: string;
  theme: Theme;
  frame: number;
  size: number;
  /** Words drawn in the accent colour. Matched case-insensitively. */
  emphasis?: string[];
  byWord?: boolean;
  delay?: number;
  align?: "left" | "center";
  weight?: number;
}> = ({ text, theme, frame, size, emphasis, byWord = false, delay = 0, align = "left", weight = 800 }) => {
  const scale = useScale();
  const words = text.split(/\s+/).filter(Boolean);
  const visible = byWord ? wordsVisible(frame, words.length, 3, delay) : words.length;
  const emphasised = new Set((emphasis ?? []).flatMap((e) => e.toLowerCase().split(/\s+/)));
  const fitted = fitText(size, text);

  return (
    <div
      style={{
        fontFamily: theme.displayFont,
        fontSize: fitted * scale,
        fontWeight: weight,
        lineHeight: 1.08,
        letterSpacing: theme.uppercaseDisplay ? "0.01em" : "-0.02em",
        textTransform: theme.uppercaseDisplay ? "uppercase" : "none",
        color: theme.foreground,
        textAlign: align,
        display: "flex",
        flexWrap: "wrap",
        gap: `${0.16 * fitted * scale}px ${0.26 * fitted * scale}px`,
        justifyContent: align === "center" ? "center" : "flex-start",
      }}
    >
      {words.map((word, i) => {
        const shown = i < visible;
        const anim = entrance(frame, {
          delay: byWord ? delay + i * 3 : delay,
          duration: 14,
          distance: 22,
        });
        const isAccent = emphasised.has(word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, ""));
        return (
          <span
            key={`${word}-${i}`}
            style={{
              opacity: shown ? anim.opacity : 0,
              transform: `translateY(${anim.translateY * scale}px)`,
              color: isAccent ? theme.accent : theme.foreground,
              display: "inline-block",
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};

/** Small all-caps label. Section headings, attributions, comparison sides. */
export const Label: React.FC<{
  text: string;
  theme: Theme;
  frame: number;
  delay?: number;
  color?: string;
  size?: number;
}> = ({ text, theme, frame, delay = 0, color, size = 32 }) => {
  const scale = useScale();
  const anim = entrance(frame, { delay, duration: 14, distance: 16 });
  return (
    <div
      style={{
        fontFamily: theme.bodyFont,
        fontSize: size * scale,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: color ?? theme.muted,
        opacity: anim.opacity,
        transform: `translateY(${anim.translateY * scale}px)`,
      }}
    >
      {text}
    </div>
  );
};

/** Body copy. */
export const BodyText: React.FC<{
  text: string;
  theme: Theme;
  frame: number;
  delay?: number;
  size?: number;
  align?: "left" | "center";
  color?: string;
}> = ({ text, theme, frame, delay = 0, size = 48, align = "left", color }) => {
  const scale = useScale();
  const anim = entrance(frame, { delay, duration: 16, distance: 24 });
  return (
    <div
      style={{
        fontFamily: theme.bodyFont,
        fontSize: fitText(size, text, 70) * scale,
        fontWeight: 500,
        lineHeight: 1.35,
        color: color ?? theme.muted,
        textAlign: align,
        opacity: anim.opacity,
        transform: `translateY(${anim.translateY * scale}px)`,
      }}
    >
      {text}
    </div>
  );
};

/** A raised block: list rows, quote bodies, comparison columns. */
export const Surface: React.FC<{
  theme: Theme;
  frame: number;
  delay?: number;
  children: React.ReactNode;
  padding?: number;
  grow?: boolean;
}> = ({ theme, frame, delay = 0, children, padding = 36, grow = false }) => {
  const scale = useScale();
  const anim = entrance(frame, { delay, duration: 18, distance: 34 });
  return (
    <div
      style={{
        background: theme.surface,
        border: `${Math.max(1, 2 * scale)}px solid ${theme.border}`,
        borderRadius: theme.radius * scale,
        padding: padding * scale,
        opacity: anim.opacity,
        transform: `translateY(${anim.translateY * scale}px)`,
        flex: grow ? 1 : undefined,
        display: "flex",
        flexDirection: "column",
        gap: 12 * scale,
      }}
    >
      {children}
    </div>
  );
};

/** A short accent rule. Gives a headline something to sit against. */
export const AccentRule: React.FC<{ theme: Theme; frame: number; delay?: number }> = ({
  theme,
  frame,
  delay = 0,
}) => {
  const scale = useScale();
  const anim = entrance(frame, { delay, duration: 20, distance: 0 });
  return (
    <div
      style={{
        width: 120 * scale * anim.opacity,
        height: 8 * scale,
        borderRadius: 4 * scale,
        background: theme.accent,
      }}
    />
  );
};
