"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";

/** Fired on window when a sample starts; the other samples pause, so two narrations never overlap. */
const PLAY_EVENT = "dv-sample-play";

/**
 * One video of the sample week: the poster with a single play button (no
 * browser control bar over the poster), the native controls once it plays.
 * Nothing is downloaded before the visitor asks for it (preload="none").
 */
export function SampleVideo({ src, poster, title, playLabel }: { src: string; poster: string; title: string; playLabel: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== src) ref.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [src]);

  function start() {
    setStarted(true);
    ref.current?.play().catch(() => {});
  }

  return (
    <>
      <video
        ref={ref}
        src={src}
        poster={poster}
        controls={started}
        playsInline
        preload="none"
        aria-label={title}
        onPlay={() => window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: src }))}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {!started && (
        <button
          type="button"
          onClick={start}
          aria-label={`${playLabel}: ${title}`}
          className="group absolute inset-0 z-10 flex items-end justify-center bg-gradient-to-t from-black/35 via-transparent to-transparent pb-8"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-dv-teal-900 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.5)] ring-1 ring-white/60 backdrop-blur transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
            <Play className="ms-0.5 h-5 w-5" fill="currentColor" aria-hidden="true" />
          </span>
        </button>
      )}
    </>
  );
}
