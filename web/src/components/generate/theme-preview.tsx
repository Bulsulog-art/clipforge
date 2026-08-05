"use client";

import { useEffect, useMemo, useState } from "react";
import { backgroundCss, type AspectId, type ThemePreset } from "./themes";

/**
 * A live sketch of the video being described.
 *
 * Not a render — the real one takes a minute and costs a credit. This exists
 * so the choice of look and shape is made with eyes rather than with labels,
 * and so an empty form still shows something worth filling in. It cycles
 * through the three shot types nearly every plan opens with, in the exact
 * palette the renderer will use.
 */

/** Milliseconds a shot holds before the next one fades in. */
const SHOT_MS = 2600;

/** How long the crossfade takes. Short enough to feel cut, not dissolved. */
const FADE_MS = 420;

type Shot = "hook" | "stat" | "cta";
const SHOTS: Shot[] = ["hook", "stat", "cta"];

/** The headline of the video: the first sentence of what they typed. */
function headline(prompt: string): string {
  const trimmed = prompt.trim();
  if (!trimmed) return "Your first line lands here";
  const firstSentence = trimmed.split(/(?<=[.!?])\s+/)[0] ?? trimmed;
  return firstSentence.length > 90 ? `${firstSentence.slice(0, 88).trimEnd()}…` : firstSentence;
}

export function ThemePreview({
  theme,
  aspect,
  prompt,
  hasClips,
}: {
  theme: ThemePreset;
  aspect: AspectId;
  prompt: string;
  hasClips: boolean;
}) {
  const [shot, setShot] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const swap = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setShot((s) => (s + 1) % SHOTS.length);
        setVisible(true);
      }, FADE_MS);
    }, SHOT_MS);
    return () => clearInterval(swap);
  }, []);

  const text = useMemo(() => headline(prompt), [prompt]);
  const current = SHOTS[shot];

  // Type sizes are a fraction of the frame's own width, the same way the
  // renderer scales them, so the preview keeps its proportions at any size.
  const box: React.CSSProperties = {
    background: backgroundCss(theme),
    color: theme.foreground,
    fontFamily: theme.displayFont,
    aspectRatio: aspect.replace(":", " / "),
    // Makes the cqw type sizes below resolve against this frame rather than
    // the viewport, so the preview holds its proportions at any width.
    containerType: "inline-size",
  };

  return (
    <div
      className="relative w-full overflow-hidden rounded-[1.75rem] border border-black/10 shadow-2xl shadow-black/20"
      style={box}
      aria-label={`Preview of the ${theme.name} look in ${aspect}`}
      role="img"
    >
      {/* A single soft light source. Flat gradients read as flat. */}
      <div
        className="pointer-events-none absolute -left-1/4 -top-1/4 h-[70%] w-[90%] rounded-full opacity-40 blur-3xl"
        style={{ background: theme.accent }}
      />

      <div
        className="absolute inset-0 flex flex-col justify-between p-[7%] transition-opacity"
        style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
      >
        <span
          className="self-start rounded-full px-[3%] py-[1.2%] text-[3.1cqw] font-semibold uppercase tracking-[0.18em]"
          style={{ background: theme.surface, color: theme.muted, border: `1px solid ${theme.border}` }}
        >
          {current === "hook" ? "Hook" : current === "stat" ? "The point" : "What now"}
        </span>

        {current === "hook" && (
          <p
            className="text-[9.5cqw] font-extrabold leading-[1.05]"
            style={{ textTransform: theme.uppercaseDisplay ? "uppercase" : "none" }}
          >
            {text}
          </p>
        )}

        {current === "stat" && (
          <div>
            <p className="text-[22cqw] font-extrabold leading-none" style={{ color: theme.accent }}>
              3×
            </p>
            <p className="mt-[2%] text-[4.6cqw] font-medium" style={{ color: theme.muted }}>
              {hasClips ? "your clips, cut to the beat" : "more watch time than a static post"}
            </p>
          </div>
        )}

        {current === "cta" && (
          <div
            className="w-full px-[6%] py-[5%] text-center text-[5.4cqw] font-bold"
            style={{ background: theme.accent, color: theme.onAccent, borderRadius: theme.radius / 2 }}
          >
            Follow for more
          </div>
        )}

        <div className="flex items-center gap-[2%]">
          <span className="h-[0.9cqw] w-[16%] rounded-full" style={{ background: theme.accent }} />
          <span className="text-[3.1cqw]" style={{ color: theme.muted }}>
            {hasClips ? "your footage + motion type" : "stock footage + motion type"}
          </span>
        </div>
      </div>
    </div>
  );
}
