/**
 * "Zero effort from Monday's video to a posted Reel": the pure parts, tested
 * directly (posting.test.ts).
 *
 *   postTexts       the ready-to-paste Instagram and TikTok / Shorts texts
 *                   for a video — the worker's post kit (worker/src/dentvid/
 *                   post-kit.ts, stored in dentvid_items.copy.post), or for
 *                   older videos the caption + hashtags as before. Nothing
 *                   here calls a model.
 *   weekSchedule    a suggested day and time for each of the week's videos,
 *                   spread Monday–Friday, in the clinic's local clock time
 *   shareMethod     how "Save video + copy caption" works on this device
 *   isMissingColumn whether a write failed only because a migration (0012
 *                   posted_at) is not applied yet
 */
import type { Locale } from "@/content/dentvideo";
import { dateLocale } from "./app-ui";

export type PostTexts = { instagram: string; short: string };

type CopyLike = { caption?: unknown; hashtags?: unknown; post?: unknown } | null | undefined;

const str = (v: unknown, max: number): string | null => (typeof v === "string" && v.trim() && v.length <= max ? v.trim() : null);

/** The first sentence of a caption, at most `max` characters. */
export function leadSentence(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const m = flat.match(/^.+?(?:[.!?](?=\s|$)|[。！？])/u);
  const s = (m ? m[0] : flat).trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > max / 2 ? cut.slice(0, at) : cut).trimEnd()}…`;
}

export function postTexts(copy: CopyLike): PostTexts | null {
  if (!copy || typeof copy !== "object") return null;
  const post = copy.post as { instagram?: unknown; short?: unknown } | undefined;
  const instagram = str(post?.instagram, 2200);
  const short = str(post?.short, 600);
  if (instagram && short) return { instagram, short };
  const caption = str(copy.caption, 2200) ?? "";
  const tags = Array.isArray(copy.hashtags) ? copy.hashtags.filter((h): h is string => typeof h === "string" && /^[\p{L}\p{N}_]{1,60}$/u.test(h.replace(/^#/, ""))).map((h) => `#${h.replace(/^#/, "")}`) : [];
  if (!caption && !tags.length) return null;
  return {
    instagram: [caption, tags.join(" ")].filter(Boolean).join("\n\n"),
    short: [caption ? leadSentence(caption) : "", tags.slice(0, 3).join(" ")].filter(Boolean).join("\n"),
  };
}

/* ------------------------------------------------------------- schedule */

/** When people in each market are on Instagram after work and at lunch (local clock time). */
const TIMES: Record<Locale, { lunch: string; evening: string }> = {
  en: { lunch: "12:30", evening: "19:00" },
  de: { lunch: "12:30", evening: "19:00" },
  es: { lunch: "14:00", evening: "21:00" },
  fr: { lunch: "12:30", evening: "19:30" },
  tr: { lunch: "12:30", evening: "20:00" },
  ja: { lunch: "12:15", evening: "20:00" },
  ar: { lunch: "13:00", evening: "21:00" },
  pl: { lunch: "12:30", evening: "19:00" },
};

export type Slot = { date: string; weekday: number; time: string };

/**
 * Days for n videos, spread over Monday (0) – Friday (4): 5 → every day,
 * 3 → Mon/Wed/Fri, 2 → Tue/Thu, 1 → Tue. Past five, days are reused.
 */
export function spreadDays(n: number): number[] {
  if (n <= 0) return [];
  if (n === 1) return [1];
  if (n === 2) return [1, 3];
  if (n <= 5) return Array.from({ length: n }, (_, i) => Math.round((i * 4) / (n - 1)));
  return Array.from({ length: n }, (_, i) => i % 5);
}

/** Lunch and evening alternate through the week, so two videos on one day never share a time. */
export function slotsFor(week: string, n: number, locale: Locale): Slot[] {
  const t = TIMES[locale] ?? TIMES.en;
  const monday = Date.parse(`${week}T00:00:00Z`);
  if (Number.isNaN(monday)) return [];
  const seen = new Map<number, number>();
  return spreadDays(n).map((d) => {
    const k = seen.get(d) ?? 0;
    seen.set(d, k + 1);
    const evening = (d + k) % 2 === 0;
    return { date: new Date(monday + d * 86_400_000).toISOString().slice(0, 10), weekday: d, time: evening ? t.evening : t.lunch };
  });
}

/**
 * A slot for each postable video of one week (ready or flagged, not
 * declined), in the order they were made — so a slot does not move when the
 * dentist approves another video.
 */
export function weekSchedule<T extends { id: string; status: string; approval: string; week_of: string }>(items: T[], week: string, locale: Locale): Map<string, Slot> {
  const list = items.filter((i) => i.week_of === week && (i.status === "ready" || i.status === "flagged") && i.approval !== "rejected");
  const slots = slotsFor(week, list.length, locale);
  return new Map(list.map((i, n) => [i.id, slots[n]]));
}

/** "Tue 12:30" / "Sal 12:30" / "火 12:15" in the clinic's language. */
export function slotLabel(slot: Slot, locale: Locale): string {
  const day = new Intl.DateTimeFormat(dateLocale(locale), { weekday: "short", timeZone: "UTC" }).format(new Date(`${slot.date}T12:00:00Z`));
  // A 24-hour clock in every market DentVideo serves (UK included); Western digits as dateLocale gives Arabic.
  return `${day} ${slot.time}`;
}

/* ---------------------------------------------------------------- share */

export type ShareMethod = "share-file" | "download";

/**
 * "Save video + copy caption": on a phone that can share a file (iOS Safari
 * 15+, Android Chrome) the MP4 goes to the share sheet — "Save Video",
 * Instagram, TikTok, WhatsApp — with the caption on the clipboard; anywhere
 * else the MP4 downloads and the caption is copied.
 */
export function shareMethod(nav: { canShare?: (d: { files: File[] }) => boolean; share?: unknown } | undefined, probe: () => File | null): ShareMethod {
  if (!nav || typeof nav.share !== "function" || typeof nav.canShare !== "function") return "download";
  try {
    const f = probe();
    return f && nav.canShare({ files: [f] }) ? "share-file" : "download";
  } catch {
    return "download";
  }
}

/**
 * What goes to the share sheet with the file. With the caption already on
 * the clipboard, the file goes alone: on iOS a file shared with text makes
 * "Save Video" save a text note too and some apps drop the video. Only when
 * the clipboard failed does the text ride along, so it is not lost.
 */
export function sharePayload(file: File, text: string, copied: boolean): { files: File[]; text?: string } {
  return copied || !text ? { files: [file] } : { files: [file], text };
}

/* ------------------------------------------------------------ database */

/** A PostgREST / Postgres error that only means "column not there yet" (a migration not applied). */
export function isMissingColumn(error: { code?: string; message?: string } | null | undefined, column: string): boolean {
  if (!error) return false;
  if (error.code === "42703" || error.code === "PGRST204") return true;
  return new RegExp(`\\b${column}\\b`).test(error.message ?? "") && /column|schema cache/i.test(error.message ?? "");
}
