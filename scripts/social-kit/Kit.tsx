/**
 * Compositions for DentVideo's own launch posts (scripts/render-social-kit.mts).
 *
 * Wraps the product's video composition READ-ONLY: a sample clinic reel is
 * exactly what worker/src/remotion/Video.tsx draws for a clinic, plus a
 * "sample" badge on top. Everything else here (explainers, covers, highlight
 * icons, the LinkedIn banner) is DentVideo's own brand (docs/BRAND.md):
 * deep teal, warm paper, Instrument Serif + Plus Jakarta Sans.
 */
import React from "react";
import {
  AbsoluteFill,
  Composition,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  registerRoot,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ClipForgeVideo } from "../../worker/src/remotion/Video.js";
import { FPS, totalFrames, type ScenePlan } from "../../worker/src/remotion/scene-plan.js";

// MARK: brand

export const C = {
  teal: "#0f5c5c",
  teal600: "#167269",
  teal900: "#0b3f3e",
  teal950: "#082e2d",
  mint: "#8fd1c6",
  tint: "#dcebe7",
  paper: "#faf7f2",
  sand: "#f5efe6",
  line: "#e8e1d5",
  ink: "#14211f",
  body: "#3d4c49",
  muted: "#5b6a67",
  cream: "#f7f1e7",
};
const SERIF = '"Instrument Serif", "Noto Serif Display", Georgia, serif';
const SANS = '"Plus Jakarta Sans", "Inter", Arial, sans-serif';

// Fonts come from the staged public folder (web/assets/fonts, OFL).
const fontHandle = typeof document !== "undefined" ? delayRender("brand fonts", { timeoutInMilliseconds: 120_000 }) : null;
if (typeof document !== "undefined") {
  Promise.all(
    [
      ["Instrument Serif", "fonts/InstrumentSerif-Regular.ttf", "400"],
      ["Plus Jakarta Sans", "fonts/PlusJakartaSans-SemiBold.ttf", "600"],
    ].map(async ([family, file, weight]) => {
      const face = new FontFace(family, `url(${staticFile(file)})`, { weight });
      await face.load();
      document.fonts.add(face);
    }),
  )
    .catch((e) => console.error("font load failed", e))
    .finally(() => fontHandle !== null && continueRender(fontHandle));
}

const ease = (frame: number, from: number, len = 14) =>
  interpolate(frame, [from, from + len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (t) => 1 - Math.pow(1 - t, 3) });

// MARK: sample clinic reel

export type ClinicReelProps = {
  plan: ScenePlan;
  voiceoverSrc: string;
  logoSrc?: string;
  backgroundSrcs?: string[];
  /** "ÖRNEK VİDEO · DentVideo ile hazırlandı" */
  label: string;
  /** "dentvideo.com/tr", shown under the badge for the last seconds. */
  url: string;
};

export const ClinicReel: React.FC<ClinicReelProps> = ({ plan, voiceoverSrc, logoSrc, backgroundSrcs, label, url }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const urlIn = ease(frame, durationInFrames - 4 * FPS, 12);
  return (
    <AbsoluteFill>
      <ClipForgeVideo plan={plan} footage={{}} voiceoverSrc={voiceoverSrc} watermark={false} logoSrc={logoSrc} backgroundSrcs={backgroundSrcs} />
      {/* Below the Reels header (top ~13%), opposite the clinic's corner logo. */}
      <div style={{ position: "absolute", top: 268, left: 64, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "12px 24px 12px 14px",
            borderRadius: 999,
            background: "rgba(8,46,45,0.82)",
            border: "1.5px solid rgba(143,209,198,0.55)",
            color: C.cream,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: 0.2,
          }}
        >
          <Img src={staticFile("brand/icon.svg")} style={{ width: 40, height: 40 }} />
          {label}
        </div>
        <div
          style={{
            opacity: urlIn,
            transform: `translateY(${(1 - urlIn) * 10}px)`,
            padding: "10px 22px",
            borderRadius: 999,
            background: C.paper,
            color: C.teal,
            fontFamily: SANS,
            fontWeight: 600,
            fontSize: 30,
          }}
        >
          {url}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// MARK: explainer

export type Beat =
  | { type: "type"; seconds: number; kicker?: string; lines: string[]; accent?: number[]; dark?: boolean; small?: string }
  | { type: "screen"; seconds: number; kicker: string; caption: string; src: string; from?: number; rate?: number }
  | { type: "end"; seconds: number; lines: string[]; url: string; small?: string };

export type ExplainerProps = { beats: Beat[] };

export const explainerFrames = (beats: Beat[]) => beats.reduce((n, b) => n + Math.round(b.seconds * FPS), 0);

export const Explainer: React.FC<ExplainerProps> = ({ beats }) => {
  let from = 0;
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {beats.map((b, i) => {
        const len = Math.round(b.seconds * FPS);
        const seq = (
          <Sequence key={i} from={from} durationInFrames={len}>
            <BeatView beat={b} len={len} />
          </Sequence>
        );
        from += len;
        return seq;
      })}
    </AbsoluteFill>
  );
};

const Grid: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <AbsoluteFill
    style={{
      backgroundImage: `linear-gradient(${dark ? "rgba(143,209,198,0.07)" : "rgba(15,92,92,0.06)"} 1.5px, transparent 1.5px), linear-gradient(90deg, ${dark ? "rgba(143,209,198,0.07)" : "rgba(15,92,92,0.06)"} 1.5px, transparent 1.5px)`,
      backgroundSize: "88px 88px",
      maskImage: "radial-gradient(ellipse 70% 55% at 50% 45%, black 30%, transparent 75%)",
      WebkitMaskImage: "radial-gradient(ellipse 70% 55% at 50% 45%, black 30%, transparent 75%)",
    }}
  />
);

const Glow: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <AbsoluteFill
    style={{
      background: dark
        ? `radial-gradient(900px 700px at 80% 15%, rgba(22,114,105,0.55), transparent 70%), radial-gradient(700px 600px at 10% 90%, rgba(143,209,198,0.12), transparent 70%)`
        : `radial-gradient(900px 700px at 85% 10%, rgba(143,209,198,0.35), transparent 70%), radial-gradient(800px 700px at 5% 95%, rgba(182,119,79,0.12), transparent 70%)`,
    }}
  />
);

const Kicker: React.FC<{ text: string; dark?: boolean; opacity?: number }> = ({ text, dark, opacity = 1 }) => (
  <div
    style={{
      alignSelf: "flex-start",
      opacity,
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 26px",
      borderRadius: 999,
      background: dark ? "rgba(143,209,198,0.12)" : "#ffffff",
      border: `1.5px solid ${dark ? "rgba(143,209,198,0.45)" : C.line}`,
      color: dark ? C.mint : C.teal,
      fontFamily: SANS,
      fontWeight: 600,
      fontSize: 30,
      letterSpacing: 0.3,
    }}
  >
    <span style={{ width: 12, height: 12, borderRadius: 99, background: dark ? C.mint : C.teal }} />
    {text}
  </div>
);

const BeatView: React.FC<{ beat: Beat; len: number }> = ({ beat, len }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [len - 8, len], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  if (beat.type === "screen") {
    const rise = spring({ frame, fps, config: { damping: 18, mass: 0.9 } });
    const capIn = ease(frame, 4, 14);
    return (
      <AbsoluteFill style={{ background: C.paper, opacity: out }}>
        <Glow />
        <Grid />
        <div style={{ position: "absolute", top: 250, left: 72, right: 72, display: "flex", flexDirection: "column", gap: 26 }}>
          <Kicker text={beat.kicker} opacity={capIn} />
          <div
            style={{
              fontFamily: SERIF,
              fontSize: 84,
              lineHeight: 1.0,
              letterSpacing: -1,
              color: C.ink,
              opacity: capIn,
              transform: `translateY(${(1 - capIn) * 24}px)`,
              textWrap: "balance",
            }}
          >
            {beat.caption}
          </div>
        </div>
        {/* A phone rising from the bottom edge, the recording inside it (390 css px wide). */}
        <div
          style={{
            position: "absolute",
            left: (1080 - 660) / 2,
            top: 640 + (1 - rise) * 500,
            width: 660,
            height: 1428,
            borderRadius: 96,
            background: "#121c1b",
            padding: 18,
            boxShadow: "0 0 0 2px rgba(0,0,0,0.25), 0 40px 90px rgba(11,63,62,0.35), 0 10px 24px rgba(11,63,62,0.25)",
          }}
        >
          <div style={{ width: "100%", height: "100%", borderRadius: 80, overflow: "hidden", background: "#fff", position: "relative" }}>
            <OffthreadVideo src={staticFile(beat.src)} muted startFrom={Math.round((beat.from ?? 0) * fps)} playbackRate={beat.rate ?? 1} style={{ width: "100%", display: "block" }} />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (beat.type === "end") {
    const a = ease(frame, 2, 14);
    const b = ease(frame, 10, 14);
    return (
      <AbsoluteFill style={{ background: C.teal900, opacity: out }}>
        <Glow dark />
        <Grid dark />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 48, padding: "0 90px" }}>
          <Img src={staticFile("brand/logo-dark.svg")} style={{ width: 620, opacity: a, transform: `scale(${0.94 + a * 0.06})` }} />
          <div style={{ fontFamily: SERIF, fontSize: 92, lineHeight: 1.02, color: C.cream, textAlign: "center", opacity: b, letterSpacing: -1, textWrap: "balance" }}>
            {beat.lines.map((l, i) => (
              <div key={i} style={{ color: i === beat.lines.length - 1 ? C.mint : C.cream }}>
                {l}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, padding: "20px 44px", borderRadius: 999, background: C.paper, color: C.teal, fontFamily: SANS, fontWeight: 600, fontSize: 44, opacity: b }}>
            {beat.url}
          </div>
          {beat.small ? (
            <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: "rgba(247,241,231,0.72)", textAlign: "center", opacity: b, lineHeight: 1.4 }}>{beat.small}</div>
          ) : null}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // Kinetic type: each line rises in turn; accented lines in brand teal / mint.
  const dark = !!beat.dark;
  // Instrument Serif runs ~0.43 em per character: the longest line fits 912 px.
  const size = Math.min(122, Math.floor(900 / (Math.max(...beat.lines.map((l) => l.length)) * 0.43)));
  return (
    <AbsoluteFill style={{ background: dark ? C.teal900 : C.paper, opacity: out }}>
      <Glow dark={dark} />
      <Grid dark={dark} />
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 84px", flexDirection: "column", gap: 40 }}>
        {beat.kicker ? <Kicker text={beat.kicker} dark={dark} opacity={ease(frame, 0, 10)} /> : null}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {beat.lines.map((line, i) => {
            const t = spring({ frame: frame - 4 - i * 7, fps, config: { damping: 16, mass: 0.7 } });
            const accent = beat.accent?.includes(i);
            return (
              <div key={i} style={{ overflow: "hidden", paddingBottom: 8 }}>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontSize: size,
                    lineHeight: 1.0,
                    letterSpacing: -1.5,
                    color: accent ? (dark ? C.mint : C.teal) : dark ? C.cream : C.ink,
                    transform: `translateY(${(1 - t) * 110}%)`,
                    fontStyle: accent ? "italic" : "normal",
                  }}
                >
                  {line}
                </div>
              </div>
            );
          })}
        </div>
        {beat.small ? (
          <div
            style={{
              fontFamily: SANS,
              fontWeight: 600,
              fontSize: 38,
              lineHeight: 1.4,
              color: dark ? "rgba(247,241,231,0.78)" : C.body,
              opacity: ease(frame, 8 + beat.lines.length * 7, 14),
              maxWidth: 860,
            }}
          >
            {beat.small}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// MARK: cover (1080×1920; everything inside the central 1080×1350 grid crop)

export type CoverProps = { dark: boolean; kicker: string; title: string; screenSrc: string; num: string };

export const Cover: React.FC<CoverProps> = ({ dark, kicker, title, screenSrc, num }) => (
  <AbsoluteFill style={{ background: dark ? C.teal900 : C.paper }}>
    <Glow dark={dark} />
    <Grid dark={dark} />
    {/* The 4:5 grid crop is y 285–1635. */}
    <div style={{ position: "absolute", top: 330, left: 80, right: 80, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <Kicker text={kicker} dark={dark} />
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 30, color: dark ? "rgba(247,241,231,0.6)" : C.muted }}>{num}</div>
    </div>
    <div
      style={{
        position: "absolute",
        top: 430,
        left: 80,
        right: 80,
        height: 230,
        display: "flex",
        alignItems: "center",
        fontFamily: SERIF,
        fontSize: 100,
        lineHeight: 0.98,
        letterSpacing: -1.5,
        color: dark ? C.cream : C.ink,
        textWrap: "balance",
      }}
    >
      {title}
    </div>
    <div
      style={{
        position: "absolute",
        top: 690,
        // A reel frame is 9:16, a screen recording 390:844: the phone takes the screen's shape.
        left: (1080 - (dark ? 455 : 378)) / 2,
        width: dark ? 455 : 378,
        height: 790,
        borderRadius: 64,
        background: "#121c1b",
        padding: 12,
        boxShadow: dark ? "0 30px 80px rgba(0,0,0,0.45)" : "0 30px 70px rgba(11,63,62,0.28), 0 0 0 1.5px rgba(0,0,0,0.2)",
        transform: "rotate(-3deg)",
      }}
    >
      <div style={{ width: "100%", height: "100%", borderRadius: 53, overflow: "hidden", background: "#fff" }}>
        <Img src={staticFile(screenSrc)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
      </div>
    </div>
    <Img src={staticFile(dark ? "brand/logo-dark.svg" : "brand/logo.svg")} style={{ position: "absolute", left: 80, top: 1535, width: 280 }} />
  </AbsoluteFill>
);

// MARK: highlight cover, avatar, LinkedIn banner

export type HighlightProps = { icon: keyof typeof ICONS };

// 24-unit line icons (drawn for this kit; stroke only, round caps).
export const ICONS = {
  play: "M8 5.5v13l10.5-6.5z",
  steps: "M4 7h10M4 12h16M4 17h7M17 4l3 3-3 3",
  shield: "M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6zM8.5 12l2.5 2.5 4.5-5",
  tag: "M3.5 12.5V4.5a1 1 0 0 1 1-1h8l8 8-9 9zM8.5 8.5h.01",
  question: "M9.2 9.2a2.9 2.9 0 1 1 4.1 2.6c-.8.4-1.3 1.1-1.3 2v.7M12 17.6h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3.5 9h17M3.5 15h17M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3z",
};

export const Highlight: React.FC<HighlightProps> = ({ icon }) => (
  <AbsoluteFill style={{ background: `linear-gradient(135deg, ${C.teal600}, ${C.teal900})`, alignItems: "center", justifyContent: "center" }}>
    <div style={{ width: 560, height: 560, borderRadius: 999, background: "rgba(143,209,198,0.10)", border: "3px solid rgba(143,209,198,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg viewBox="0 0 24 24" width={300} height={300} fill="none" stroke={C.cream} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path d={ICONS[icon]} />
      </svg>
    </div>
  </AbsoluteFill>
);

export const Avatar: React.FC = () => (
  <AbsoluteFill style={{ background: C.paper, alignItems: "center", justifyContent: "center" }}>
    <Img src={staticFile("brand/icon.svg")} style={{ width: 700, height: 700 }} />
  </AbsoluteFill>
);

export type BannerProps = { line: string; sub: string; shots: string[] };

export const Banner: React.FC<BannerProps> = ({ line, sub, shots }) => (
  <AbsoluteFill style={{ background: C.teal900, overflow: "hidden" }}>
    <Glow dark />
    <Grid dark />
    {/* LinkedIn puts the page logo over the bottom-left; text starts right of it. */}
    <div style={{ position: "absolute", left: 470, top: 0, bottom: 0, width: 640, display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
      <div style={{ fontFamily: SERIF, fontSize: 54, lineHeight: 1.02, color: C.cream, letterSpacing: -0.6 }}>{line}</div>
      <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 21, lineHeight: 1.45, color: "rgba(247,241,231,0.75)" }}>{sub}</div>
    </div>
    {shots.map((s, i) => (
      <div
        key={s}
        style={{
          position: "absolute",
          left: 1150 + i * 150,
          top: 44 + (i % 2) * 34,
          width: 150,
          height: 325,
          borderRadius: 26,
          background: "#121c1b",
          padding: 5,
          boxShadow: "0 18px 40px rgba(0,0,0,0.4)",
          transform: `rotate(${(i - 1) * 4}deg)`,
        }}
      >
        <Img src={staticFile(s)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 21 }} />
      </div>
    ))}
  </AbsoluteFill>
);

// MARK: root

const EMPTY_PLAN: ScenePlan = { title: "x", aspect: "9:16", theme: "sunrise", music: "none", scenes: [{ kind: "hook", text: "x", seconds: 3 }] } as ScenePlan;

const Root: React.FC = () => (
  <>
    <Composition
      id="ClinicReel"
      component={ClinicReel}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={90}
      defaultProps={{ plan: EMPTY_PLAN, voiceoverSrc: "", label: "", url: "" } as ClinicReelProps}
      calculateMetadata={({ props }) => ({ durationInFrames: totalFrames(props.plan) })}
    />
    <Composition
      id="Explainer"
      component={Explainer}
      fps={FPS}
      width={1080}
      height={1920}
      durationInFrames={90}
      defaultProps={{ beats: [] } as ExplainerProps}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, explainerFrames(props.beats)) })}
    />
    <Composition id="Cover" component={Cover} fps={FPS} width={1080} height={1920} durationInFrames={1} defaultProps={{ dark: true, kicker: "", title: "", screenSrc: "", num: "" } as CoverProps} />
    <Composition id="Highlight" component={Highlight} fps={FPS} width={1080} height={1920} durationInFrames={1} defaultProps={{ icon: "play" } as HighlightProps} />
    <Composition id="Avatar" component={Avatar} fps={FPS} width={1080} height={1080} durationInFrames={1} />
    <Composition id="Banner" component={Banner} fps={FPS} width={1584} height={396} durationInFrames={1} defaultProps={{ line: "", sub: "", shots: [] } as BannerProps} />
  </>
);

registerRoot(Root);
