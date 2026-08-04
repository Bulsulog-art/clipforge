import React from "react";
import { useVideoConfig } from "remotion";
import type { Theme } from "../theme.js";
import { TYPE } from "../theme.js";
import { entrance, drift } from "../animation.js";
import { Backdrop, DisplayText, BodyText, Label, Surface, AccentRule, useScale } from "./primitives.js";
import type { Scene } from "../scene-plan.js";

type Props<K extends Scene["kind"]> = {
  scene: Extract<Scene, { kind: K }>;
  theme: Theme;
  frame: number;
};

/**
 * The hook. Everything downstream is wasted if this frame does not stop a
 * thumb, so it is the only scene that gets the largest type, the word-by-word
 * reveal and the full height of the frame to itself.
 */
export const HookScene: React.FC<Props<"hook">> = ({ scene, theme, frame }) => (
  <Backdrop theme={theme}>
    <AccentRule theme={theme} frame={frame} delay={2} />
    <DisplayText
      text={scene.text}
      theme={theme}
      frame={frame}
      size={TYPE.hook}
      byWord
      delay={4}
    />
    {scene.sub ? (
      <BodyText text={scene.sub} theme={theme} frame={frame} delay={18} size={TYPE.body} />
    ) : null}
  </Backdrop>
);

/** One idea, nothing competing with it. */
export const StatementScene: React.FC<Props<"statement">> = ({ scene, theme, frame }) => (
  <Backdrop theme={theme}>
    <DisplayText
      text={scene.text}
      theme={theme}
      frame={frame}
      size={TYPE.display}
      emphasis={scene.emphasis}
      byWord
      delay={2}
    />
  </Backdrop>
);

/**
 * A quote. The oversized mark does the work of saying "someone said this"
 * without a line of explanation.
 */
export const QuoteScene: React.FC<Props<"quote">> = ({ scene, theme, frame }) => {
  const scale = useScale();
  const mark = entrance(frame, { delay: 0, duration: 22, distance: 30 });
  return (
    <Backdrop theme={theme}>
      <div
        style={{
          fontFamily: theme.displayFont,
          fontSize: 220 * scale,
          lineHeight: 0.7,
          fontWeight: 800,
          color: theme.accent,
          opacity: mark.opacity * 0.35,
          transform: `translateY(${mark.translateY * scale}px)`,
          height: 110 * scale,
        }}
      >
        &ldquo;
      </div>
      <DisplayText
        text={scene.text}
        theme={theme}
        frame={frame}
        size={TYPE.heading}
        byWord
        delay={8}
        weight={600}
      />
      {scene.attribution ? (
        <Label text={`— ${scene.attribution}`} theme={theme} frame={frame} delay={26} />
      ) : null}
    </Backdrop>
  );
};

/**
 * The close. Kept quiet on purpose: a call to action that shouts reads as an
 * advert and gets scrolled, and the ask is a single line either way.
 */
export const CtaScene: React.FC<Props<"cta">> = ({ scene, theme, frame }) => {
  const scale = useScale();
  const pulse = drift(frame, 70, 0.012);
  const chip = entrance(frame, { delay: 12, duration: 20, distance: 26 });
  return (
    <Backdrop theme={theme}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30 * scale }}>
        <DisplayText
          text={scene.text}
          theme={theme}
          frame={frame}
          size={TYPE.display}
          byWord
          delay={2}
          align="center"
        />
        {scene.handle ? (
          <div
            style={{
              fontFamily: theme.bodyFont,
              fontSize: TYPE.label * scale,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: theme.onAccent,
              background: theme.accent,
              padding: `${16 * scale}px ${34 * scale}px`,
              borderRadius: 999,
              opacity: chip.opacity,
              transform: `translateY(${chip.translateY * scale}px) scale(${pulse})`,
            }}
          >
            {scene.handle}
          </div>
        ) : null}
      </div>
    </Backdrop>
  );
};

/**
 * Two things side by side. The most legible shape there is: the reader gets
 * the point before they have finished reading either column.
 */
export const CompareScene: React.FC<Props<"compare">> = ({ scene, theme, frame }) => {
  const scale = useScale();
  const { width, height } = useVideoConfig();
  // Side by side needs width. In a 9:16 frame two columns come out at about
  // 450px each, which breaks short phrases across three lines and undoes the
  // one advantage this layout has — being read at a glance. Portrait stacks.
  const stacked = height > width;
  const sides = [
    { ...scene.left, accent: theme.muted, delay: 4 },
    { ...scene.right, accent: theme.accent, delay: 12 },
  ];
  return (
    <Backdrop theme={theme}>
      <div
        style={{
          display: "flex",
          flexDirection: stacked ? "column" : "row",
          gap: 22 * scale,
          alignItems: "stretch",
        }}
      >
        {sides.map((side, i) => (
          <Surface key={i} theme={theme} frame={frame} delay={side.delay} grow>
            <Label
              text={side.label}
              theme={theme}
              frame={frame}
              delay={side.delay + 4}
              color={side.accent}
              size={38}
            />
            <div
              style={{
                fontFamily: theme.displayFont,
                fontSize: 62 * scale,
                fontWeight: 700,
                lineHeight: 1.22,
                color: theme.foreground,
              }}
            >
              {side.text}
            </div>
          </Surface>
        ))}
      </div>
    </Backdrop>
  );
};
