/**
 * The motion vocabulary.
 *
 * Every scene draws from the same small set of moves, for the same reason the
 * palette is narrow: a generated video where each card animates differently
 * looks like a template gallery, not a piece. Shared primitives also mean one
 * fix improves every scene at once.
 *
 * These are pure functions of the frame number — no hooks, no Remotion imports
 * — so the timing can be unit-tested without rendering anything. Getting
 * motion wrong is expensive to notice by eye and cheap to catch here.
 */

/** Clamp to 0..1. */
function unit(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/**
 * Ease-out cubic. The workhorse: fast at the start, settles gently. Anything
 * that enters the frame uses this unless it has a reason not to.
 */
export function easeOut(t: number): number {
  const x = unit(t);
  return 1 - (1 - x) ** 3;
}

/** Symmetric ease for things that move and stop, like a cross-fade. */
export function easeInOut(t: number): number {
  const x = unit(t);
  return x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2;
}

/**
 * A settle with a small overshoot — the thing that separates "appeared" from
 * "arrived". Deliberately mild: past about 8% overshoot it reads as bouncy,
 * which ages badly and fights the type.
 */
export function overshoot(t: number, amount = 0.06): number {
  const x = unit(t);
  if (x === 1) return 1;
  const decay = Math.exp(-6 * x);
  return 1 - decay * Math.cos(7 * x) + amount * decay * Math.sin(7 * x);
}

/**
 * Progress of an element that enters at `delay` and takes `duration` frames.
 * Returns 0 before it starts and 1 once it has landed.
 */
export function enterProgress(frame: number, delay = 0, duration = 18): number {
  if (duration <= 0) return 1;
  return unit((frame - delay) / duration);
}

/** Frames of delay for item `index` in a staggered group. */
export function stagger(index: number, perItem = 6, initial = 0): number {
  return initial + index * perItem;
}

/**
 * Opacity and vertical offset for an entering element, in one call because
 * they are always used together. `distance` is in px at a 1080-wide frame.
 */
export function entrance(
  frame: number,
  { delay = 0, duration = 18, distance = 48 } = {},
): { opacity: number; translateY: number } {
  const raw = enterProgress(frame, delay, duration);
  const eased = overshoot(raw);
  return {
    // Opacity finishes ahead of the movement so text is readable while it
    // is still settling, rather than fading in for the whole travel.
    opacity: easeOut(Math.min(1, raw * 1.6)),
    translateY: (1 - eased) * distance,
  };
}

/**
 * Fade at both ends of a scene so cuts never hard-snap. Returns 1 through the
 * middle. `hold` frames are left untouched at full opacity.
 */
/**
 * Where each scene sits on the timeline, drawn as a real cross-dissolve.
 *
 * Scenes used to fade out to the background and the next one fade in after
 * it, with the next scene's text still waiting on its entrance delay: about
 * 0.4 s of empty frame at every cut — a contact sheet caught one and it read
 * as a blank video. Then every scene after the first started CROSSFADE frames
 * early and faded in on top of the one before, which stayed fully drawn
 * underneath: no empty frame, but for those frames two blocks of type sat on
 * top of each other at full strength (a frame grab of an Arabic sample shows
 * a list heading fading in straight through the paragraph before it).
 *
 * Now the cut is a true dissolve: while the incoming scene fades in, the
 * outgoing one fades out over the same frames on the mirrored curve, so the
 * two opacities always add up to 1 — never an empty frame, never two
 * full-strength texts. Two ends are special:
 *  - the first scene does not fade in. Frame 0 is what a feed shows before
 *    playback starts and what "cover from the first frame" picks, so it has
 *    to carry the hook, not an empty background (every sample opened on 4-5
 *    blank frames);
 *  - the last scene does not fade out. Reels and TikTok loop: the loop should
 *    hold the sign-off to the end and cut straight back to the hook, not
 *    flash an empty frame in between.
 * Scene lengths and the total running time are unchanged.
 */
export const CROSSFADE = 8;

export type SceneWindow = { from: number; durationInFrames: number; fadeIn: boolean; fadeOut: boolean };

export function sceneWindows(offsets: number[], frames: number[]): SceneWindow[] {
  return offsets.map((offset, i) => {
    const lead = i > 0 ? Math.min(CROSSFADE, offset) : 0;
    return { from: offset - lead, durationInFrames: frames[i] + lead, fadeIn: lead > 0, fadeOut: i < offsets.length - 1 };
  });
}

/** Opacity of a scene inside its window (sceneWindows). */
export function windowOpacity(frame: number, w: Pick<SceneWindow, "durationInFrames" | "fadeIn" | "fadeOut">, fade = CROSSFADE): number {
  if (w.durationInFrames <= fade * 2) return 1;
  const inP = w.fadeIn ? easeInOut(frame / fade) : 1;
  // The mirror of the next scene's fade-in (easeInOut(1 - x) = 1 - easeInOut(x)): the two always sum to 1.
  const outP = w.fadeOut ? easeInOut((w.durationInFrames - frame) / fade) : 1;
  return Math.min(1, inP, outP);
}

/**
 * Frames of head start the opening scene gets: its own clock runs this far
 * ahead of the video's, so at frame 0 the hook's first words are already up
 * and the opening frame reads as a headline, and a hook of up to 12 words
 * has fully landed by about 1.2 s — inside the second or so a viewer gives a
 * Reel before swiping. The samples' hooks opened on 4-5 empty frames and took
 * 1.3-2 s to complete.
 */
export const OPENING_HEAD_START = 10;

/** The frame a scene's own animation sees: the opening scene starts already in motion. */
export function sceneClock(sceneIndex: number, frame: number): number {
  return sceneIndex === 0 ? frame + OPENING_HEAD_START : frame;
}

export function sceneOpacity(
  frame: number,
  durationInFrames: number,
  fade = 8,
): number {
  if (durationInFrames <= fade * 2) return 1;
  const inProgress = easeInOut(frame / fade);
  const outProgress = easeInOut((durationInFrames - frame) / fade);
  return Math.min(1, inProgress, outProgress);
}

/**
 * How many words of a line are visible. Text that appears word by word holds
 * attention far better than text that fades in whole — it is the single
 * cheapest retention device available to a caption.
 */
export function wordsVisible(frame: number, total: number, perWord = 3, delay = 0): number {
  if (total <= 0) return 0;
  const elapsed = frame - delay;
  if (elapsed < 0) return 0;
  return Math.min(total, Math.floor(elapsed / perWord) + 1);
}

/**
 * Progress (0–1) of a highlighter sweeping across a word: eased in and out,
 * so the bar accelerates off the start and settles at the end like a pen
 * stroke, rather than sliding at constant speed.
 */
export function sweep(frame: number, start: number, duration = 9): number {
  return easeInOut(enterProgress(frame, start, duration));
}

/** Frames one highlighted word waits for the one before it in the same run. */
export const SWEEP_STEP = 6;

/**
 * When each emphasised word's highlighter starts. A word is swept once it
 * has landed (`landed[i]`); consecutive emphasised words (a run, see
 * script.ts emphasisRuns) sweep one after another as a single stroke, each
 * starting SWEEP_STEP frames after the previous one at the earliest.
 * undefined for words without emphasis.
 */
export function highlightStarts(runs: { on: boolean; joinNext: boolean }[], landed: number[]): (number | undefined)[] {
  const out: (number | undefined)[] = [];
  runs.forEach((r, i) => {
    if (!r.on) return void out.push(undefined);
    const prev = i > 0 && runs[i - 1].joinNext ? out[i - 1] : undefined;
    out.push(prev === undefined ? landed[i] : Math.max(landed[i], prev + SWEEP_STEP));
  });
  return out;
}

/**
 * A number counting up to its target. Eases out, so it decelerates into the
 * final value instead of stopping dead.
 */
export function countUp(frame: number, duration: number, target: number, delay = 0): number {
  if (duration <= 0) return target;
  const progress = easeOut(enterProgress(frame, delay, duration));
  return target * progress;
}

/**
 * Formats a counted value the way the target is written, so "1.2M" counts up
 * through "0.4M" rather than "400000". Anything the parser does not recognise
 * is passed through untouched at the end of the count.
 */
export function countUpText(frame: number, duration: number, target: string, delay = 0): string {
  const match = /^([^0-9-]*)(-?[\d.,]+)(.*)$/.exec(target.trim());
  if (!match) return target;

  const [, prefix, digits, suffix] = match;
  const decimals = (digits.split(".")[1] ?? "").length;
  const numeric = Number(digits.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return target;

  const value = countUp(frame, duration, numeric, delay);
  const grouped = digits.includes(",");
  const shown = value.toFixed(decimals);
  const withGrouping = grouped
    ? Number(shown).toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })
    : shown;
  return `${prefix}${withGrouping}${suffix}`;
}

/**
 * A slow push on footage. Still frames look dead next to motion graphics, and
 * a 6% drift over the shot is enough to fix that without drawing attention.
 */
export function kenBurns(
  frame: number,
  durationInFrames: number,
  { from = 1.0, to = 1.06 } = {},
): number {
  if (durationInFrames <= 1) return from;
  return from + (to - from) * unit(frame / durationInFrames);
}

/**
 * A gentle breathing scale for hero elements that would otherwise sit
 * perfectly still for four seconds.
 */
export function drift(frame: number, period = 90, amount = 0.008): number {
  return 1 + Math.sin((frame / period) * Math.PI * 2) * amount;
}
