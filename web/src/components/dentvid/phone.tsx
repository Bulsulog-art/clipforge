"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { heroSeek, heroSrc, type HeroLoop } from "@/lib/dentvid/hero-loop";

/**
 * A device frame around real DentVideo output. Pure CSS, no image assets:
 * titanium-style rim, side buttons, dynamic island, 9:16 screen.
 */
export function PhoneFrame({
  children,
  className = "",
  compact = false,
  tightShadow = false,
}: {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  /**
   * A short shadow below the sm breakpoint, for phones inside a sideways-scrolling row: a scroll
   * container clips vertically too, and the long default shadow showed as a grey rectangle.
   */
  tightShadow?: boolean;
}) {
  const shadow = tightShadow
    ? "shadow-[0_14px_22px_-14px_rgba(8,46,45,0.55)] sm:shadow-[0_50px_100px_-30px_rgba(8,46,45,0.55),0_30px_60px_-40px_rgba(8,46,45,0.6)]"
    : "shadow-[0_50px_100px_-30px_rgba(8,46,45,0.55),0_30px_60px_-40px_rgba(8,46,45,0.6)]";
  // `compact`: a small phone below the lg breakpoint (the hero's first screen on phones), full size from lg up.
  const r = compact
    ? {
        outer: "rounded-[1.6rem] lg:rounded-[2.9rem]",
        mid: "rounded-[1.5rem] p-[5px] lg:rounded-[2.75rem] lg:p-[9px]",
        screen: "rounded-[1.2rem] lg:rounded-[2.2rem]",
        island: "top-1.5 h-[10px] lg:top-2.5 lg:h-[22px]",
      }
    : { outer: "rounded-[2.9rem]", mid: "rounded-[2.75rem] p-[9px]", screen: "rounded-[2.2rem]", island: "top-2.5 h-[22px]" };
  return (
    <div className={`relative ${className}`}>
      {/* side buttons */}
      <span aria-hidden="true" className="absolute -left-[3px] top-[18%] h-[7%] w-[3px] rounded-l bg-[#2b3634]" />
      <span aria-hidden="true" className="absolute -left-[3px] top-[28%] h-[11%] w-[3px] rounded-l bg-[#2b3634]" />
      <span aria-hidden="true" className="absolute -right-[3px] top-[24%] h-[14%] w-[3px] rounded-r bg-[#2b3634]" />
      <div className={`${r.outer} bg-gradient-to-b from-[#3a4644] via-[#1b2523] to-[#2f3b39] p-[3px] ${shadow}`}>
        <div className={`${r.mid} bg-[#0b1110]`}>
          <div className={`relative aspect-[9/16] overflow-hidden ${r.screen} bg-[#0b3f3e]`}>
            {children}
            <span aria-hidden="true" className={`absolute left-1/2 ${r.island} w-[30%] -translate-x-1/2 rounded-full bg-black`} />
            {/* glass sheen */}
            <span aria-hidden="true" className={`pointer-events-none absolute inset-0 ${r.screen} bg-[linear-gradient(115deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_32%)]`} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Muted, looping sample video for the hero. Autoplays only when the visitor
 * has not asked for reduced motion; always has a visible pause/play control.
 * With a `loop` it starts on the hook (the poster's frame), jumps over the
 * sample's dark scene and turns back before the closing fade
 * (lib/dentvid/hero-loop.ts); the video box never changes size.
 */
export function HeroVideo({
  src,
  poster,
  title,
  labels,
  loop,
}: {
  src: string;
  poster: string;
  title: string;
  labels: { play: string; pause: string };
  loop?: HeroLoop;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v || !loop) return;
    const check = () => {
      const to = heroSeek(v.currentTime, v.duration, loop);
      if (to !== null) v.currentTime = to;
    };
    const ended = () => {
      v.currentTime = loop.start;
      void v.play().catch(() => {});
    };
    v.addEventListener("ended", ended);
    v.addEventListener("timeupdate", check);
    // Every painted frame where the browser can say so (timeupdate alone fires only ~4 times a second).
    type FrameVideo = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number; cancelVideoFrameCallback?: (id: number) => void };
    const fv = v as FrameVideo;
    let frame: number | undefined;
    const tick = () => {
      check();
      frame = fv.requestVideoFrameCallback?.(tick);
    };
    frame = fv.requestVideoFrameCallback?.(tick);
    return () => {
      v.removeEventListener("ended", ended);
      v.removeEventListener("timeupdate", check);
      if (frame !== undefined) fv.cancelVideoFrameCallback?.(frame);
    };
  }, [loop]);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  function toggle() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else {
      v.pause();
      setPlaying(false);
    }
  }

  return (
    <>
      <video
        ref={ref}
        src={heroSrc(src, loop)}
        poster={poster}
        muted
        // With a hero loop the component loops (from the hook, not from the fade-in); otherwise the browser does.
        loop={!loop}
        playsInline
        // Nothing is fetched before play(): the poster is the first paint, and with reduced motion the video never loads unasked.
        preload="none"
        aria-label={title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? labels.pause : labels.play}
        className="dv-btn absolute bottom-2 left-2 z-10 h-9 w-9 lg:bottom-4 lg:left-4 lg:h-10 lg:w-10 bg-white/15 text-white ring-1 ring-white/25 backdrop-blur-md hover:bg-white/25"
      >
        {playing ? <Pause className="h-4 w-4" fill="currentColor" aria-hidden="true" /> : <Play className="ml-0.5 h-4 w-4" fill="currentColor" aria-hidden="true" />}
      </button>
    </>
  );
}

/**
 * Stand-in for the live preview while its player loads: the same phone and the
 * same two caption lines underneath, so nothing below moves when it arrives.
 */
export function PreviewPlaceholder() {
  return (
    <div aria-hidden="true" className="mx-auto w-full max-w-[300px]">
      <PhoneFrame>
        <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-[#123b3a] to-[#0b2423]" />
      </PhoneFrame>
      <p className="mt-4 text-sm">&nbsp;</p>
      {/* Two lines: the title and "Sample 1 of 3 from your week of 5" often wrap. */}
      <p className="mt-0.5 min-h-8 text-xs">&nbsp;</p>
    </div>
  );
}
