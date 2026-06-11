export type JumpWord = { word: string; start: number; end: number };
export type KeepSegment = { start: number; end: number };

// Silence longer than this (between two spoken words) gets cut. Keeps a little
// pad around speech so cuts don't clip the first/last phoneme.
const GAP_THRESHOLD = 0.6;
const LEAD_PAD = 0.08;
const TAIL_PAD = 0.12;
const MIN_REMOVED = 0.5; // not worth re-encoding for < half a second saved

export type JumpCutPlan = {
  /** Clip-relative segments (seconds) to KEEP, in order. */
  segments: KeepSegment[];
  keptDuration: number;
  removedSec: number;
  /** The clip's words, timestamps remapped onto the compressed timeline. */
  words: JumpWord[];
};

/**
 * Plan internal silence removal ("jump cuts") for one clip. Pure + deterministic
 * so it's fully unit-testable without rendering. Detects long gaps between
 * spoken words, builds the keep-segments, and remaps every word onto the new
 * compressed timeline so captions stay perfectly in sync after the cuts.
 *
 * Returns null when there's nothing worth cutting (too few words, no real
 * silence) — callers then render the clip unchanged.
 *
 * @param words      transcript words with ABSOLUTE timestamps
 * @param clipStart  absolute clip start (seconds)
 * @param clipEnd    absolute clip end (seconds)
 */
export function planJumpCut(words: JumpWord[], clipStart: number, clipEnd: number): JumpCutPlan | null {
  const clipDur = clipEnd - clipStart;
  if (clipDur <= 0) return null;

  const inside = words
    .filter((w) => w.end > clipStart && w.start < clipEnd)
    .map((w) => ({
      word: w.word,
      start: Math.max(0, w.start - clipStart),
      end: Math.min(clipDur, w.end - clipStart),
    }))
    .filter((w) => w.end > w.start);
  if (inside.length < 2) return null;

  const segments: KeepSegment[] = [];
  let segStart = Math.max(0, inside[0].start - LEAD_PAD);
  let prevEnd = inside[0].end;
  for (let i = 1; i < inside.length; i++) {
    const gap = inside[i].start - prevEnd;
    if (gap > GAP_THRESHOLD) {
      segments.push({ start: segStart, end: Math.min(clipDur, prevEnd + TAIL_PAD) });
      segStart = Math.max(0, inside[i].start - LEAD_PAD);
    }
    prevEnd = inside[i].end;
  }
  segments.push({ start: segStart, end: Math.min(clipDur, prevEnd + TAIL_PAD) });

  const keptDuration = segments.reduce((s, seg) => s + (seg.end - seg.start), 0);
  const removedSec = clipDur - keptDuration;
  if (removedSec < MIN_REMOVED || segments.length < 2) return null;

  const remap = (t: number): number => {
    let acc = 0;
    for (const seg of segments) {
      if (t < seg.start) return acc; // inside a removed gap → snap to the cut point
      if (t <= seg.end) return acc + (t - seg.start);
      acc += seg.end - seg.start;
    }
    return acc;
  };

  const remappedWords = inside.map((w) => {
    const start = remap(w.start);
    return { word: w.word, start, end: Math.max(start + 0.05, remap(w.end)) };
  });

  return { segments, keptDuration, removedSec, words: remappedWords };
}

/**
 * ffmpeg select/aselect boolean expression keeping only the planned segments,
 * e.g. "between(t,0.000,3.200)+between(t,4.100,7.800)".
 */
export function selectExpr(segments: KeepSegment[]): string {
  return segments.map((s) => `between(t,${s.start.toFixed(3)},${s.end.toFixed(3)})`).join("+");
}
