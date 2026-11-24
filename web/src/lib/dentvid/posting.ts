/**
 * "Zero effort from Monday's video to a posted Reel": the pure parts, tested
 * directly (posting.test.ts).
 *
 *   postTexts       the ready-to-paste Instagram and TikTok / Shorts texts
 *                   for a video — the worker's post kit (worker/src/dentvid/
 *                   post-kit.ts, stored in dentvid_items.copy.post), or for
 *                   older videos the caption + hashtags as before. At most
 *                   INSTAGRAM_MAX_HASHTAGS (5) hashtags either way. Nothing
 *                   here calls a model.
 *   weekSchedule    a suggested day and time for each of the week's videos,
 *                   spread Monday–Friday, in the clinic's local clock time —
 *                   from the clinic's country (not the UI language) and the
 *                   week's videos themselves (not their approvals)
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

/**
 * Instagram allows at most five hashtags on a post or Reel (announced
 * December 2025). The worker holds its post kit to the same number
 * (worker/src/lib/hashtags.ts), and so does the iOS app (PostKit.swift).
 */
export const INSTAGRAM_MAX_HASHTAGS = 5;

/** The first `max` distinct tags in the order given (most relevant first); case and a leading "#" do not make a tag new. */
export function capHashtags(tags: readonly string[], max = INSTAGRAM_MAX_HASHTAGS): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const tag of tags) {
    const key = tag.trim().replace(/^#/, "").toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag.trim());
    if (out.length >= max) break;
  }
  return out;
}

/**
 * A kit written before the cap ends on a line of up to ten hashtags. Pasted
 * as it is, Instagram would refuse it, so a closing line made only of
 * hashtags keeps its first five (the clinic's own and the local ones lead).
 */
export function capTagLine(text: string, max = INSTAGRAM_MAX_HASHTAGS): string {
  const at = text.lastIndexOf("\n");
  const last = text.slice(at + 1).trim();
  const tags = last.split(/\s+/);
  if (tags.length <= max || !tags.every((t) => /^#[\p{L}\p{N}_]+$/u.test(t))) return text;
  return `${text.slice(0, at + 1)}${capHashtags(tags, max).join(" ")}`;
}

export function postTexts(copy: CopyLike): PostTexts | null {
  if (!copy || typeof copy !== "object") return null;
  const post = copy.post as { instagram?: unknown; short?: unknown } | undefined;
  const instagram = str(post?.instagram, 2200);
  const short = str(post?.short, 600);
  if (instagram && short) return { instagram: capTagLine(instagram), short };
  const caption = str(copy.caption, 2200) ?? "";
  const tags = Array.isArray(copy.hashtags)
    ? capHashtags(copy.hashtags.filter((h): h is string => typeof h === "string" && /^[\p{L}\p{N}_]{1,60}$/u.test(h.replace(/^#/, ""))).map((h) => `#${h.replace(/^#/, "")}`))
    : [];
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

/**
 * The same by the clinic's country, which decides when its patients scroll —
 * a Spanish-speaking clinic in the US posts on US time, an English UI in
 * Germany does not move a German clinic's slots. Unlisted countries fall back
 * to the language's times.
 */
const COUNTRY_TIMES: Record<string, Locale> = {
  GB: "en", IE: "en", US: "en", CA: "en", AU: "en", NZ: "en", ZA: "en",
  DE: "de", AT: "de", CH: "de", LU: "de",
  ES: "es", MX: "es", AR: "es", CO: "es", CL: "es", PE: "es",
  FR: "fr", BE: "fr", MC: "fr",
  TR: "tr",
  JP: "ja",
  SA: "ar", AE: "ar", QA: "ar", KW: "ar", BH: "ar", OM: "ar", JO: "ar", EG: "ar", MA: "ar",
  PL: "pl",
};

/** Where the clinic is: its country (profile.country) first, its language as the fallback. */
export type Place = Locale | { country?: string | null; locale: Locale };

export function postingTimes(place: Place): { lunch: string; evening: string } {
  const { country, locale } = typeof place === "string" ? { country: null, locale: place } : place;
  const byCountry = country ? COUNTRY_TIMES[country.trim().toUpperCase()] : undefined;
  return TIMES[byCountry ?? locale] ?? TIMES.en;
}

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
export function slotsFor(week: string, n: number, place: Place): Slot[] {
  const t = postingTimes(place);
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
 * A slot for each postable video of one week (ready or flagged; a declined
 * one gets none). Deterministic: the slots are spread over every made video
 * of the week, declined ones included, in a fixed order (the video id), so
 * approving or declining a video — or the order a screen lists them in —
 * never moves another video's slot; the times follow the clinic's country.
 */
export function weekSchedule<T extends { id: string; status: string; approval: string; week_of: string }>(items: T[], week: string, place: Place): Map<string, Slot> {
  const made = items
    .filter((i) => i.week_of === week && (i.status === "ready" || i.status === "flagged"))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const slots = slotsFor(week, made.length, place);
  return new Map(made.flatMap((i, n) => (i.approval === "rejected" ? [] : [[i.id, slots[n]] as [string, Slot]])));
}

/** Does this clinic read a 12-hour clock ("7:00 PM")? English clinics in the US, Canada, Australia and New Zealand do; everyone else reads 24 hours. */
export function twelveHourClock(locale: string, country?: string | null): boolean {
  return locale === "en" && dateLocale(locale, country) !== "en-GB";
}

/**
 * "Tue 12:30" / "Sal 12:30" / "火 12:15" in the clinic's language; with the
 * clinic's country, "Mon 7:00 PM" for an English clinic in the US, Canada,
 * Australia or New Zealand, which read a 12-hour clock.
 */
export function slotLabel(slot: Slot, locale: Locale, country?: string | null): string {
  const loc = dateLocale(locale, country);
  const day = new Intl.DateTimeFormat(loc, { weekday: "short", timeZone: "UTC" }).format(new Date(`${slot.date}T12:00:00Z`));
  // A 24-hour clock everywhere else (UK included); Western digits as dateLocale gives Arabic.
  const m = /^(\d{1,2}):(\d{2})$/.exec(slot.time);
  if (!m || !twelveHourClock(locale, country)) return `${day} ${slot.time}`;
  const time = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "UTC" }).format(new Date(Date.UTC(2026, 0, 5, Number(m[1]), Number(m[2]))));
  // ICU writes a narrow no-break space before "PM" in some versions and a plain one in others: the server and
  // the browser must print the same label, and "7:00" never ends a line without its "PM".
  return `${day} ${time.replace(/\s+/g, "\u00a0")}`;
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
