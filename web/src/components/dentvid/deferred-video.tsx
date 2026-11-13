"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A <video> whose poster is fetched only when it comes near the screen.
 *
 * Browsers fetch every poster as soon as the HTML arrives, even for
 * preload="none" videos far below the fold: on the landing that was two or
 * three ~25 KB JPEGs competing with the first screen. Until then the frame
 * shows its own background; the element and its size are the same either way,
 * so nothing moves when the poster arrives.
 */
export function DeferredVideo({ poster, margin = "800px", ...props }: React.VideoHTMLAttributes<HTMLVideoElement> & { poster: string; margin?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || near) return;
    if (typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setNear(true);
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [near, margin]);
  return <video ref={ref} poster={near ? poster : undefined} {...props} />;
}
