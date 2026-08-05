"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Three real outputs, playing.
 *
 * Every one was rendered by the production renderer from a four-line plan —
 * no mockups, no After Effects. That is the entire argument this component
 * makes, so it has to actually move: a still grid of the same frames reads as
 * a design comp and proves nothing.
 *
 * They stay paused until they scroll into view. Three autoplaying videos above
 * the fold is a megabyte someone on cellular did not ask for.
 */

const SHOWS = [
  {
    id: "midnight",
    look: "Midnight",
    prompt: "Why your morning routine decides your day",
  },
  {
    id: "candy",
    look: "Candy",
    prompt: "Three hooks that stop a scroll",
  },
  {
    id: "editorial",
    look: "Editorial",
    prompt: "You are not busy, you are interrupted",
  },
];

export function ShowcaseStrip({ heading, sub }: { heading?: string; sub?: string }) {
  return (
    <section className="mx-auto w-full max-w-4xl">
      {heading && (
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-foreground">{heading}</h2>
          {sub && <p className="mt-1.5 text-sm text-muted-foreground">{sub}</p>}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 sm:gap-5">
        {SHOWS.map((s) => (
          <figure key={s.id} className="m-0">
            <LazyLoop id={s.id} look={s.look} />
            <figcaption className="mt-2.5 text-center">
              <span className="block text-xs font-medium leading-snug text-foreground">
                &ldquo;{s.prompt}&rdquo;
              </span>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">{s.look}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function LazyLoop({ id, look }: { id: string; look: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No IntersectionObserver (very old browser, or a test environment): show
    // the video rather than a permanently blank frame.
    if (typeof IntersectionObserver === "undefined") return setNear(true);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    // Autoplay can still be refused (Low Power Mode, a data-saver setting).
    // The poster stays up, which is a perfectly good still.
    void ref.current?.play().catch(() => {});
  }, [near]);

  return (
    <video
      ref={ref}
      className="w-full rounded-xl border border-border bg-muted shadow-lg shadow-black/10"
      style={{ aspectRatio: "9 / 16" }}
      src={near ? `/showcase/${id}.mp4` : undefined}
      poster={`/showcase/${id}.jpg`}
      preload="none"
      muted
      loop
      playsInline
      aria-label={`A video made from one sentence, in the ${look} look`}
    />
  );
}
