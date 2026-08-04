import React from "react";
import type { Theme } from "../theme.js";
import { TYPE, fitText } from "../theme.js";
import { entrance, stagger, countUpText, drift } from "../animation.js";
import { Backdrop, Label, BodyText, Surface, useScale } from "./primitives.js";
import type { Scene } from "../scene-plan.js";

type Props<K extends Scene["kind"]> = {
  scene: Extract<Scene, { kind: K }>;
  theme: Theme;
  frame: number;
  durationInFrames: number;
};

/**
 * The listicle. Items land one at a time rather than all at once — the reader
 * follows the arrival instead of scanning a wall, which is the whole reason
 * this format works on a feed.
 *
 * The stagger is spread across the scene's own duration so a six-item list in
 * four seconds does not finish arriving after the cut.
 */
export const ListScene: React.FC<Props<"list">> = ({ scene, theme, frame, durationInFrames }) => {
  const scale = useScale();
  const headingDelay = 2;
  // Leave the last item at least half a second on screen after it lands.
  const available = Math.max(1, durationInFrames - headingDelay - 15);
  const perItem = Math.min(10, Math.floor(available / Math.max(1, scene.items.length)));

  return (
    <Backdrop theme={theme}>
      <div
        style={{
          fontFamily: theme.displayFont,
          fontSize: fitText(TYPE.heading, scene.heading) * scale,
          fontWeight: 800,
          lineHeight: 1.1,
          letterSpacing: theme.uppercaseDisplay ? "0.01em" : "-0.02em",
          textTransform: theme.uppercaseDisplay ? "uppercase" : "none",
          color: theme.foreground,
          ...transformFrom(entrance(frame, { delay: headingDelay, duration: 16, distance: 26 }), scale),
        }}
      >
        {scene.heading}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 * scale }}>
        {scene.items.map((item, i) => {
          const delay = stagger(i, perItem, headingDelay + 10);
          const anim = entrance(frame, { delay, duration: 16, distance: 30 });
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20 * scale,
                background: theme.surface,
                border: `${Math.max(1, 2 * scale)}px solid ${theme.border}`,
                borderRadius: theme.radius * scale,
                padding: `${30 * scale}px ${30 * scale}px`,
                ...transformFrom(anim, scale),
              }}
            >
              <div
                style={{
                  minWidth: 64 * scale,
                  height: 64 * scale,
                  borderRadius: 999,
                  background: theme.accent,
                  color: theme.onAccent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: theme.bodyFont,
                  fontWeight: 800,
                  fontSize: 34 * scale,
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  fontFamily: theme.bodyFont,
                  fontSize: fitText(TYPE.listItem, item, 40) * scale,
                  fontWeight: 600,
                  lineHeight: 1.25,
                  color: theme.foreground,
                }}
              >
                {item}
              </div>
            </div>
          );
        })}
      </div>
    </Backdrop>
  );
};

/**
 * A number, counted up. The most reliable retention device in short-form:
 * a viewer will wait to see where a number lands.
 *
 * The count runs over the first 60% of the scene so the final value is held,
 * not glimpsed — a number that arrives on the cut may as well not have been
 * animated.
 */
export const StatScene: React.FC<Props<"stat">> = ({ scene, theme, frame, durationInFrames }) => {
  const scale = useScale();
  const countDuration = Math.max(12, Math.floor(durationInFrames * 0.6));
  const value = countUpText(frame, countDuration, scene.value, 4);
  const breathe = drift(frame, 100, 0.01);
  const valueAnim = entrance(frame, { delay: 2, duration: 18, distance: 30 });

  return (
    <Backdrop theme={theme}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 * scale }}>
        <div
          style={{
            fontFamily: theme.displayFont,
            fontSize: fitText(TYPE.statValue, scene.value, 6) * scale,
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: "-0.04em",
            color: theme.accent,
            fontVariantNumeric: "tabular-nums",
            opacity: valueAnim.opacity,
            transform: `translateY(${valueAnim.translateY * scale}px) scale(${breathe})`,
          }}
        >
          {value}
        </div>
        <div
          style={{
            fontFamily: theme.displayFont,
            fontSize: fitText(TYPE.heading, scene.label, 34) * scale,
            fontWeight: 700,
            lineHeight: 1.15,
            color: theme.foreground,
            textAlign: "center",
            ...transformFrom(entrance(frame, { delay: 14, duration: 16, distance: 24 }), scale),
          }}
        >
          {scene.label}
        </div>
        {scene.context ? (
          <BodyText
            text={scene.context}
            theme={theme}
            frame={frame}
            delay={26}
            size={TYPE.caption}
            align="center"
          />
        ) : null}
      </div>
    </Backdrop>
  );
};

/** Shared helper so opacity and offset are always applied the same way. */
function transformFrom(
  anim: { opacity: number; translateY: number },
  scale: number,
): React.CSSProperties {
  return {
    opacity: anim.opacity,
    transform: `translateY(${anim.translateY * scale}px)`,
  };
}

export { Label, Surface };
