// GENERATED from worker/src/remotion/scenes/primitives.tsx by scripts/sync-remotion.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/remotion/sync.test.ts checks they match.
import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import type { Theme } from "../theme";
import { backgroundCss, fitText, fitsOneLine, leading, readableOn, safeFrame, tracking, type SafeFrame } from "../theme";
import { PHRASE_BREAK, emphasisRuns, layoutUnits, visualLength } from "../script";
import { entrance, highlightStarts, sweep, wordsVisible } from "../animation";
import { usePhotoBackdrop } from "../background-layer";

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

/**
 * Safe margins, in px: clear of the header, the caption block and the action
 * rail that Reels and TikTok draw over a 9:16 frame (theme.ts SAFE_ZONES).
 * `start`/`end` are logical — apply them with safePadding() so an Arabic
 * frame mirrors them.
 */
export function useSafeArea(): SafeFrame {
  const { width, height } = useVideoConfig();
  return safeFrame(width, height);
}

/** The safe frame as CSS padding, with the sides as inline-start/end. */
export function safePadding(f: SafeFrame): React.CSSProperties {
  return { paddingTop: f.top, paddingBottom: f.bottom, paddingInlineStart: f.start, paddingInlineEnd: f.end };
}

export const Backdrop: React.FC<{ theme: Theme; children: React.ReactNode }> = ({
  theme,
  children,
}) => {
  const scale = useScale();
  const safe = useSafeArea();
  // Over background photos the frame stays see-through; the photo layer
  // (background-layer.tsx) brings its own contrast-safe tint.
  const photo = usePhotoBackdrop();
  return (
    <AbsoluteFill style={{ background: photo ? "transparent" : backgroundCss(theme) }}>
      {/* A soft light source keeps the flat gradient from reading as a solid fill. */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${theme.accent}22 0%, transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          ...safePadding(safe),
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
 * Longest last-line pair we will glue together to avoid a widow. Past this the
 * pair is wide enough that forcing it onto one line risks an overflow, which
 * looks far worse than the widow it would have prevented.
 */
const WIDOW_GUARD_CHARS = 14;

/**
 * Groups the words so the last line can never be a single short word.
 *
 * Headlines wrap by width, so where the lines fall is Chromium's decision, not
 * ours — but a trailing "are" on a line of its own is the one break that reads
 * as broken rather than as typesetting. Gluing the last two words into one
 * unbreakable item removes exactly that case and leaves every other break
 * alone.
 *
 * `size` is the font size the line is set at: the glued pair cannot wrap, so
 * it is only glued when it fits the frame's width at that size. Without it a
 * pair under the character limit could still overrun a large hook (Polish
 * "znów krwawią?" at 132 px ran 15 px past the frame).
 */
export function guardWidow(words: string[], size?: number): { text: string; index: number }[] {
  const items = words.map((text, index) => ({ text, index }));
  if (words.length < 3) return items;

  const tail = words.slice(-2).join(" ");
  if (visualLength(tail) > WIDOW_GUARD_CHARS) return items;
  if (size !== undefined && !fitsOneLine(size, tail)) return items;

  return [...items.slice(0, -2), { text: tail, index: words.length - 2 }];
}

/**
 * Display type. Optionally reveals word by word, which holds attention far
 * better than a whole line fading in at once.
 *
 * Lines are balanced (CSS text-wrap: balance, measured on the real glyphs by
 * the browser) so a headline breaks into lines of even length instead of a
 * full line and a stray word. Words in `emphasis` get a highlighter: once a
 * word has landed, a bar in the accent colour sweeps across it from the
 * reading start (right in Arabic) and the word turns to the colour that reads
 * on that bar (readableOn). Consecutive emphasised words sweep as one stroke.
 */
export const DisplayText: React.FC<{
  text: string;
  theme: Theme;
  frame: number;
  size: number;
  /** Words drawn on an accent highlighter. Matched case-insensitively. */
  emphasis?: string[];
  byWord?: boolean;
  delay?: number;
  align?: "left" | "center";
  weight?: number;
}> = ({ text, theme, frame, size, emphasis, byWord = false, delay = 0, align = "left", weight = 800 }) => {
  const scale = useScale();
  // Words, or for Japanese short phrases (script.ts): the units the line may wrap between.
  const { units: words, spaced } = layoutUnits(text);
  const visible = byWord ? wordsVisible(frame, words.length, 3, delay) : words.length;
  const fitted = fitText(size, text);
  const items = spaced ? guardWidow(words, fitted) : words.map((t, index) => ({ text: t, index }));
  // Emphasis is matched per drawn item (a glued widow pair counts as one).
  const runs = emphasisRuns(items.map((it) => it.text), emphasis, spaced);
  const landed = items.map((it) => (byWord ? delay + it.index * 3 : delay) + 12);
  const starts = highlightStarts(runs, landed);
  const ink = readableOn(theme.accent, [theme.onAccent, theme.foreground]);
  const lineHeight = leading(theme, 1.08);
  const rtl = theme.script === "arabic";

  return (
    <div
      style={{
        fontFamily: theme.displayFont,
        fontSize: fitted * scale,
        fontWeight: weight,
        // Line gap comes from line height now that lines wrap as text.
        lineHeight: lineHeight + 0.1,
        letterSpacing: tracking(theme, theme.uppercaseDisplay ? "0.01em" : "-0.02em"),
        textTransform: theme.uppercaseDisplay ? "uppercase" : "none",
        color: theme.foreground,
        // "start", not "left": right-aligned in an Arabic (dir=rtl) frame.
        textAlign: align === "center" ? "center" : "start",
        textWrap: "balance",
        // Japanese phrases are separate inline blocks with no space between;
        // a line may break between any two of them.
        wordBreak: spaced ? "normal" : "keep-all",
      } as React.CSSProperties}
    >
      {items.map(({ text: word, index: i }, k) => {
        const shown = i < visible;
        const anim = entrance(frame, {
          delay: byWord ? delay + i * 3 : delay,
          duration: 14,
          distance: 22,
        });
        const run = runs[k];
        const p = run.on && starts[k] !== undefined ? sweep(frame, starts[k]!, 9) : 0;
        return (
          <React.Fragment key={`${word}-${i}`}>
            {k > 0 && spaced ? " " : null}
            <span
              style={{
                opacity: shown ? anim.opacity : 0,
                transform: `translateY(${anim.translateY * scale}px)`,
                display: "inline-block",
                position: "relative",
                // A glued pair must not be split again by the wrap it exists to prevent.
                whiteSpace: "pre",
              }}
            >
              {run.on ? (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    insetBlock: "0.02em -0.04em",
                    insetInlineStart: "-0.12em",
                    // A run is one stroke: the bar reaches across the space to the next word.
                    insetInlineEnd: run.joinNext && spaced ? "-0.3em" : "-0.12em",
                    borderRadius: Math.min(theme.radius, 18) * scale,
                    background: theme.accent,
                    transform: `scaleX(${p})`,
                    // The sweep starts where reading starts: left, or right in Arabic.
                    transformOrigin: rtl ? "right center" : "left center",
                  }}
                />
              ) : null}
              <span style={{ position: "relative" }}>{word}</span>
              {run.on && p > 0 ? (
                // The word again in the ink colour, uncovered by the same sweep, so
                // the colour changes exactly where the bar has reached.
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    color: ink,
                    clipPath: rtl ? `inset(0 0 0 ${(1 - p) * 100}%)` : `inset(0 ${(1 - p) * 100}% 0 0)`,
                  }}
                >
                  {word}
                </span>
              ) : null}
            </span>
          </React.Fragment>
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
        letterSpacing: tracking(theme, theme.script ? "0.04em" : "0.14em"),
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
        lineHeight: leading(theme, 1.35),
        color: color ?? theme.muted,
        textAlign: align === "center" ? "center" : "start",
        ...PHRASE_BREAK,
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
  /** Marks the block that carries the point (the answer side of a comparison) with an accent edge. */
  accent?: boolean;
}> = ({ theme, frame, delay = 0, children, padding = 36, grow = false, accent = false }) => {
  const scale = useScale();
  const anim = entrance(frame, { delay, duration: 18, distance: 34 });
  return (
    <div
      style={{
        background: theme.surface,
        border: `${Math.max(1, 2 * scale)}px solid ${theme.border}`,
        ...(accent ? { borderInlineStart: `${8 * scale}px solid ${theme.accent}` } : {}),
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
