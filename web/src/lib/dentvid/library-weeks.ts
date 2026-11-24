/**
 * The library's weeks, as pure helpers (tested in app-ui.test.ts and
 * items.test.ts): how many weeks it shows and the "Show earlier weeks" link,
 * which skipped topics are still worth listing, and the Monday the next five
 * videos arrive. Kept out of app-ui.ts, which every public page ships with
 * the header, so none of this reaches the landing page's bundle.
 */
import type { LibraryItem } from "@/components/dentvid/library";
import type { PostedMarks } from "./app-ui";
import { USABLE_STATUSES, WEEK_VIDEOS } from "./week-job";

/** A YYYY-MM-DD date moved by whole days (UTC); the input back unchanged when it is not a date. */
export function addDays(day: string, days: number): string {
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isNaN(t) ? day : new Date(t + days * 86_400_000).toISOString().slice(0, 10);
}

/** Weeks the library shows at first; "Show earlier weeks" adds as many again each time. */
export const LIBRARY_WEEKS = 12;
/** The most a link can ask for (ten years): the address bar cannot ask the server for more. */
export const LIBRARY_WEEKS_MAX = 520;

/** `?weeks=` as the page receives it (a string, repeated strings, or nothing), held to LIBRARY_WEEKS..LIBRARY_WEEKS_MAX. */
export function clampWeeks(raw: unknown): number {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const n = typeof v === "number" ? v : typeof v === "string" && /^\s*\d{1,6}\s*$/.test(v) ? Number(v) : NaN;
  if (!Number.isFinite(n)) return LIBRARY_WEEKS;
  return Math.min(LIBRARY_WEEKS_MAX, Math.max(LIBRARY_WEEKS, Math.floor(n)));
}

/**
 * The "Show earlier weeks" link for a library showing `weeks` weeks, or null
 * when it already shows the most it can. It asks for twelve more, or for
 * `reach` when that is more: the window the server worked out to reach the
 * clinic's next older videos (items.ts earlierWeeks), so a tap after a long
 * pause lands on videos, not on empty weeks.
 */
export function earlierWeeksHref(weeks: number, reach?: number | null): string | null {
  const now = clampWeeks(weeks);
  if (now >= LIBRARY_WEEKS_MAX) return null;
  const far = typeof reach === "number" && Number.isFinite(reach) ? Math.floor(reach) : 0;
  return `?weeks=${Math.min(LIBRARY_WEEKS_MAX, Math.max(now + LIBRARY_WEEKS, far))}`;
}

/**
 * The posted ticks with the weeks posted before the loaded ones added (one
 * mark per week, items.ts postedWeeks), so the posting streak does not stop
 * where the library's twelve weeks end. Ticks of the loaded videos win: they
 * follow what the dentist taps on this page.
 */
export function withEarlierPosts(marks: PostedMarks, weeks: readonly string[] | null | undefined): PostedMarks {
  if (!weeks?.length) return marks;
  return { ...Object.fromEntries(weeks.map((w) => [`week:${w}`, w])), ...marks };
}

/**
 * The day (YYYY-MM-DD, UTC) a cancelled plan ends, when that is before the
 * Monday the next five would arrive; null when the plan renews, or runs past
 * that Monday. The card then says when the plan ends instead of naming a
 * Monday that brings nothing.
 */
export function planEndsBefore(endsAt: string | null | undefined, nextWeek: string): string | null {
  const day = typeof endsAt === "string" && /^\d{4}-\d{2}-\d{2}/.test(endsAt) ? endsAt.slice(0, 10) : null;
  return day && day < nextWeek ? day : null;
}

/** Generated videos of one week the clinic can use: made (ready, or flagged for a look) and with a video to watch. */
export function usableVideos(items: LibraryItem[], week: string): number {
  return items.filter((i) => i.kind === "generated" && i.week_of === week && (USABLE_STATUSES as readonly string[]).includes(i.status) && !!i.videoUrl).length;
}

/**
 * "Topics we did not make": this week's only, and only while the week is
 * short of its five videos. Once the week was topped up to five (or for any
 * earlier week) the skipped topics have nothing left to explain, so the list
 * is empty.
 */
export function notMadeTopics(items: LibraryItem[], currentWeek: string): LibraryItem[] {
  if (usableVideos(items, currentWeek) >= WEEK_VIDEOS) return [];
  return items.filter((i) => i.week_of === currentWeek && i.status === "rejected");
}

/**
 * The Monday the next five videos arrive (YYYY-MM-DD): the Monday after the
 * latest week that delivered videos. Never this week or earlier: a clinic
 * that paid on Sunday got the coming Monday's week already, so its next
 * videos come the Monday after that.
 */
export function nextDeliveryWeek(items: Pick<LibraryItem, "kind" | "status" | "week_of">[], currentWeek: string): string {
  let latest = currentWeek;
  for (const i of items) {
    if (i.kind === "generated" && (USABLE_STATUSES as readonly string[]).includes(i.status) && /^\d{4}-\d{2}-\d{2}$/.test(i.week_of) && i.week_of > latest) latest = i.week_of;
  }
  return addDays(latest, 7);
}
