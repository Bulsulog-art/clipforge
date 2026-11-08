"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { ClipForgeVideo } from "@/remotion/Video";
import { FPS, totalFrames, type ScenePlan } from "@/remotion/scene-plan";
import { analyseLogoUrl, accentFor, type LogoColors } from "@/lib/dentvid/logo-colors";
import { libraryLanguage, personalisePlan, pickPreviews, type PreviewEntry } from "@/lib/dentvid/preview-library";
import { fmt, type AppText } from "@/content/dentvideo-app";
import { PhoneFrame } from "./phone";
import type { PreviewProfile } from "./live-preview";

/**
 * The player half of LivePreview, loaded on its own (next/dynamic) so the
 * Remotion runtime is only fetched where a preview is shown.
 */

const BASE = "/dentvideo/preview";
const HEX = /^#?[0-9a-fA-F]{6}$/;

// MARK: - Fonts

/**
 * The worker renders in Inter (fonts-inter in its image). Self-hosted here
 * under the same family name the themes ask for, latin + latin-ext so
 * Turkish, German, French and Spanish all set in it — no third-party font
 * request (Google Fonts from a German site is a GDPR problem). The player
 * waits for it so the first frame is not set in a fallback face.
 */
let fontsReady: Promise<void> | undefined;
function loadFonts(): Promise<void> {
  if (fontsReady) return fontsReady;
  const style = document.createElement("style");
  style.dataset.dentvideoPreview = "fonts";
  style.textContent = [
    ["inter-latin-ext-wght-normal", "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF"],
    ["inter-latin-wght-normal", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"],
  ]
    .map(
      ([file, range]) =>
        `@font-face{font-family:"Inter";font-style:normal;font-display:block;font-weight:100 900;src:url(${BASE}/fonts/${file}.woff2) format("woff2");unicode-range:${range}}`,
    )
    .join("\n");
  document.head.appendChild(style);
  const timeout = new Promise<void>((r) => setTimeout(r, 2500));
  fontsReady = Promise.race([
    Promise.all(["500", "600", "700", "800", "900"].map((w) => document.fonts.load(`${w} 64px Inter`, "Aa ğşİçöüéñß"))).then(() => undefined),
    timeout,
  ]).catch(() => undefined);
  return fontsReady;
}

// MARK: - Library

const plans = new Map<string, Promise<ScenePlan>>();
function loadPlan(lang: string, id: string): Promise<ScenePlan> {
  const key = `${lang}/${id}`;
  let p = plans.get(key);
  if (!p) {
    p = fetch(`${BASE}/${key}.json`).then((r) => {
      if (!r.ok) throw new Error(`preview ${key}: ${r.status}`);
      return r.json() as Promise<ScenePlan>;
    });
    p.catch(() => plans.delete(key));
    plans.set(key, p);
  }
  return p;
}

/** Warms the HTTP cache for the next video's narration so the swipe starts at once. */
function prefetchAudio(lang: string, id: string) {
  void fetch(`${BASE}/${lang}/${id}.mp3`).catch(() => {});
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// MARK: - Component

export default function LivePreviewPlayer({
  profile,
  backgrounds,
  text,
  className = "",
}: {
  profile: PreviewProfile;
  backgrounds?: string[];
  text: AppText["preview"];
  className?: string;
}) {
  const lang = libraryLanguage(profile.language);
  const servicesKey = profile.services.join("\u0000");
  const entries: PreviewEntry[] = useMemo(
    () => pickPreviews(servicesKey ? servicesKey.split("\u0000") : [], lang, 3),
    [servicesKey, lang],
  );

  const [index, setIndex] = useState(0);
  const entry = entries[Math.min(index, entries.length - 1)];
  useEffect(() => setIndex(0), [entries]);

  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [raw, setRaw] = useState<ScenePlan | undefined>();
  useEffect(() => {
    if (!entry) return;
    let live = true;
    Promise.all([loadPlan(lang, entry.id), loadFonts()])
      .then(([p]) => {
        if (!live) return;
        setRaw(p);
        setReady(true);
      })
      .catch(() => live && setFailed(true));
    // The next one, so a swipe or the end of this video does not wait.
    const next = entries[(index + 1) % entries.length];
    if (next && next !== entry) {
      void loadPlan(lang, next.id).catch(() => {});
      if (next.narrated !== false) prefetchAudio(lang, next.id);
    }
    return () => {
      live = false;
    };
  }, [entry, entries, index, lang]);

  // The look: colour and logo settle for a moment before the frame repaints,
  // so dragging a colour picker or typing a hex does not thrash the player.
  const brandInput = useDebounced(profile.brandColor && HEX.test(profile.brandColor) ? profile.brandColor : undefined, 180);
  const logoUrl = useDebounced(profile.logoUrl || undefined, 180);
  const [logo, setLogo] = useState<{ url: string; colors?: LogoColors } | undefined>();
  useEffect(() => {
    if (!logoUrl) return setLogo(undefined);
    let live = true;
    // Same reading the clinic form does (and the worker mirrors): chip, crop, colours.
    void analyseLogoUrl(logoUrl).then((colors) => live && setLogo({ url: logoUrl, colors }));
    return () => {
      live = false;
    };
  }, [logoUrl]);

  // As the worker does (dentvid/jobs.ts brandFromLogo): the clinic's colour
  // wins, an empty one is filled from the logo, and the logo's colour most
  // unlike the brand becomes the accent when brandTheme can use it.
  const colors = logo?.url === logoUrl ? logo?.colors : undefined;
  const brand = brandInput ?? colors?.suggested;
  const accent = brand && colors ? accentFor(brand.startsWith("#") ? brand : `#${brand}`, colors) : undefined;

  const name = useDebounced(profile.name, 120);
  const handle = useDebounced(profile.handle, 120);
  const bgKey = backgrounds?.join("\u0000") ?? "";
  const plan = useMemo(() => {
    if (!raw) return undefined;
    const personal = personalisePlan(raw, { name, handle });
    return {
      ...personal,
      ...(brand ? { brandColor: brand.replace(/^#/, "").toUpperCase() } : {}),
      ...(accent ? { brandAccent: accent.replace(/^#/, "").toUpperCase() } : {}),
      ...(bgKey ? { backgrounds: bgKey.split("\u0000") } : {}),
    } as ScenePlan;
  }, [raw, name, handle, brand, accent, bgKey]);

  const inputProps = useMemo(
    () =>
      plan && entry
        ? {
            plan,
            footage: {},
            watermark: false,
            // A public-folder path: the composition's staticFile() makes it /dentvideo/preview/…
            // A silent library video (narrated: false) has no narration file.
            ...(entry.narrated === false ? {} : { voiceoverSrc: `${BASE.slice(1)}/${lang}/${entry.id}.mp3` }),
            logoSrc: logo?.url === logoUrl ? logoUrl : undefined,
            logoStyle: colors ? { treatment: colors.treatment, aspect: colors.aspect, ...(colors.crop ? { crop: colors.crop } : {}) } : undefined,
          }
        : undefined,
    [plan, entry, lang, logo, logoUrl, colors],
  );

  // A soft ring in the new colour when the look changes: the "that's mine" moment.
  const [glow, setGlow] = useState(0);
  const look = `${brand}|${accent}|${logo?.url ?? ""}|${colors?.treatment ?? ""}`;
  const firstLook = useRef(true);
  useEffect(() => {
    if (firstLook.current) {
      firstLook.current = false;
      return;
    }
    setGlow((g) => g + 1);
  }, [look]);

  // MARK: playback
  const playerRef = useRef<PlayerRef>(null);
  const [muted, setMuted] = useState(true);
  // What the next Player starts with. Read once per video: changing a
  // mounted Player's initiallyMuted resets its audio tags (heard live: the
  // narration stopped the moment sound was turned on).
  const startMuted = useRef(true);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [visible, setVisible] = useState(true);
  const wantPlay = useRef(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(rm);
    if (rm) wantPlay.current = false;
  }, []);

  // Off screen, nothing plays: a phone should not burn battery on a video nobody sees.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const durationInFrames = plan ? Math.max(1, totalFrames(plan)) : 1;

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      // Story-style: the next video, round and round.
      startMuted.current = p.isMuted();
      if (entries.length > 1) setIndex((i) => (i + 1) % entries.length);
      else {
        p.seekTo(0);
        p.play();
      }
    };
    const onFrame = (e: { detail: { frame: number } }) => {
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, (e.detail.frame + 1) / durationInFrames)})`;
    };
    const onMute = (e: { detail: { isMuted: boolean } }) => setMuted(e.detail.isMuted);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    p.addEventListener("ended", onEnded);
    p.addEventListener("frameupdate", onFrame);
    p.addEventListener("mutechange", onMute);
    // Autoplay can start before these listeners exist: read the state as it is now.
    setPlaying(p.isPlaying());
    setMuted(p.isMuted());
    return () => {
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
      p.removeEventListener("ended", onEnded);
      p.removeEventListener("frameupdate", onFrame);
      p.removeEventListener("mutechange", onMute);
    };
  }, [entries.length, durationInFrames, entry?.id, ready]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (!visible) p.pause();
    else if (wantPlay.current && !p.isPlaying()) p.play();
  }, [visible, entry?.id, ready]);

  const toggle = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isPlaying()) {
      wantPlay.current = false;
      p.pause();
    } else {
      wantPlay.current = true;
      p.play();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.isMuted()) {
      p.unmute();
      // Sound on is a request to hear it: play from the top of this video.
      if (!p.isPlaying()) {
        wantPlay.current = true;
        p.play();
      }
    } else p.mute();
  }, []);

  const go = useCallback(
    (d: number) => {
      if (entries.length < 2) return;
      wantPlay.current = true;
      startMuted.current = playerRef.current?.isMuted() ?? startMuted.current;
      setIndex((i) => (i + d + entries.length) % entries.length);
    },
    [entries.length],
  );

  // Swipe: a horizontal drag of 40px changes video; anything else is a tap.
  const touch = useRef<{ x: number; y: number } | undefined>(undefined);
  const onPointerDown = (e: React.PointerEvent) => (touch.current = { x: e.clientX, y: e.clientY });
  const onPointerUp = (e: React.PointerEvent) => {
    const t = touch.current;
    touch.current = undefined;
    if (!t) return;
    const dx = e.clientX - t.x;
    const dy = e.clientY - t.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go((dx < 0) !== isRtl() ? 1 : -1);
    else if (Math.abs(dx) < 8 && Math.abs(dy) < 8) toggle();
  };

  const ring = brand ? (brand.startsWith("#") ? brand : `#${brand}`) : "#0f5c5c";
  // The page's direction (Arabic pages are right to left): there the next video lies to the left.
  const isRtl = () => (rootRef.current ? getComputedStyle(rootRef.current).direction === "rtl" : false);
  const silent = entry?.narrated === false;

  return (
    <div ref={rootRef} className={`mx-auto w-full max-w-[300px] ${className}`}>
      <div className="relative">
        {glow > 0 ? (
          <span
            key={glow}
            aria-hidden="true"
            className="dv-preview-glow pointer-events-none absolute -inset-3 rounded-[3.4rem]"
            style={{ boxShadow: `0 0 0 3px ${ring}, 0 0 46px 6px ${ring}` }}
          />
        ) : null}
        <PhoneFrame>
          {failed ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-white/80">{text.failed}</div>
          ) : inputProps && ready ? (
            <div
              // The Player lays out its scaled canvas left to right; on an Arabic page it would sit off
              // screen. The composition sets its own direction from the plan's language.
              dir="ltr"
              className="absolute inset-0 touch-pan-y select-none"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") go(isRtl() ? -1 : 1);
                if (e.key === "ArrowLeft") go(isRtl() ? 1 : -1);
              }}
            >
              <Player
                key={`${lang}/${entry.id}`}
                ref={playerRef}
                component={ClipForgeVideo}
                // Bulsu Labs has two people, so Remotion's free licence applies
                // (remotion.dev/license: companies of up to 3 employees).
                acknowledgeRemotionLicense
                inputProps={inputProps}
                durationInFrames={durationInFrames}
                compositionWidth={1080}
                compositionHeight={1920}
                fps={FPS}
                style={{ width: "100%", height: "100%" }}
                autoPlay={!reducedMotion && wantPlay.current}
                initiallyMuted={startMuted.current}
                controls={false}
                clickToPlay={false}
                doubleClickToFullscreen={false}
                spaceKeyToPlayOrPause={false}
                numberOfSharedAudioTags={0}
              />
            </div>
          ) : (
            <div className="absolute inset-0 flex animate-pulse items-end justify-center bg-gradient-to-b from-[#123b3a] to-[#0b2423] pb-16 text-xs text-white/70">
              {text.loading}
            </div>
          )}

          {/* Story progress: one segment per video, below the island. */}
          {entries.length > 1 ? (
            <div className="pointer-events-none absolute inset-x-5 top-10 z-10 flex gap-1">
              {entries.map((e, i) => (
                <span key={e.id} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
                  {i < index ? <span className="block h-full w-full bg-white" /> : null}
                  {i === index ? (
                    <span ref={barRef} className="block h-full w-full origin-left bg-white rtl:origin-right" style={{ transform: "scaleX(0)" }} />
                  ) : null}
                </span>
              ))}
            </div>
          ) : null}

          <div className="absolute end-4 top-14 z-10 flex gap-2">
            {silent ? null : (
              <button
                type="button"
                onClick={toggleMute}
                aria-label={muted ? text.unmute : text.mute}
                className="dv-btn h-10 w-10 bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md hover:bg-white/25"
              >
                {muted ? <VolumeX className="h-4 w-4" aria-hidden="true" /> : <Volume2 className="h-4 w-4" aria-hidden="true" />}
              </button>
            )}
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? text.pause : text.play}
              className="dv-btn h-10 w-10 bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md hover:bg-white/25"
            >
              {playing ? <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true" />}
            </button>
          </div>
        </PhoneFrame>

        {entries.length > 1 ? (
          // Beside the phone on wider screens; on a phone, a swipe does it.
          <div className="hidden sm:block">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label={text.previous}
              className="dv-btn absolute -start-14 top-1/2 h-10 w-10 -translate-y-1/2 bg-white text-dv-ink shadow-md ring-1 ring-black/5 hover:bg-white/90"
            >
              <ChevronLeft className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label={text.next}
              className="dv-btn absolute -end-14 top-1/2 h-10 w-10 -translate-y-1/2 bg-white text-dv-ink shadow-md ring-1 ring-black/5 hover:bg-white/90"
            >
              <ChevronRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-center text-sm font-semibold text-dv-ink">{text.caption}</p>
      {entry ? (
        <p className="mt-0.5 text-center text-xs text-dv-muted" aria-live="polite">
          {entry.title} · {fmt(text.videoOf, { n: index + 1, total: entries.length })}
        </p>
      ) : null}
      <style>{`@keyframes dvPreviewGlow{0%{opacity:0}25%{opacity:.9}100%{opacity:0}}.dv-preview-glow{animation:dvPreviewGlow 1.1s ease-out forwards}@media (prefers-reduced-motion: reduce){.dv-preview-glow{animation:none;opacity:0}}`}</style>
    </div>
  );
}
