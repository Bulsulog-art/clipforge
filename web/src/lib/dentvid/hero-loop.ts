/**
 * The hero phone's muted loop. The sample videos open with a fade-in and
 * have a scene of a few seconds where the frame is a near-black gradient
 * with a small caption at the bottom (unreadable at the hero's size); on a
 * loop those dark seconds were most of what a visitor saw. The hero starts
 * on the hook (the poster's own frame, so play begins on what was already
 * shown), skips the dark scene, and loops back to the hook before the
 * closing fade. The full videos, with sound, play uncut in the samples
 * section.
 */
export type HeroLoop = {
  /** Seconds: where play starts and every loop restarts (the hook, fully faded in — the poster's frame). */
  start: number;
  /** [from, to) ranges, in seconds, that the loop jumps over. */
  skip: readonly (readonly [number, number])[];
};

/** How close to the end the loop turns back (the closing fade to black). */
export const HERO_TAIL = 0.4;

/**
 * Where the hero video should jump to from `t`, or null to let it play on.
 * Before the start → the start; inside a skipped range → its end (or the
 * start, when that end is already in the closing tail); in the tail → the start.
 */
export function heroSeek(t: number, duration: number, loop: HeroLoop): number | null {
  if (!Number.isFinite(t) || t < 0) return null;
  const end = Number.isFinite(duration) && duration > 0 ? duration - HERO_TAIL : Infinity;
  if (t < loop.start - 0.05) return loop.start;
  if (t >= end) return loop.start;
  for (const [from, to] of loop.skip) {
    if (t >= from && t < to) return to >= end ? loop.start : to;
  }
  return null;
}

/** The video address that starts loading at the loop's start (a media fragment), so nothing before it is shown. */
export function heroSrc(src: string, loop: HeroLoop | undefined): string {
  return loop && loop.start > 0 ? `${src}#t=${loop.start}` : src;
}
