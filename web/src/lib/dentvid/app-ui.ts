/**
 * Small, pure helpers behind the signed-in app's screens (library, record,
 * settings, header) — kept here so they are tested directly.
 */
import type { Locale } from "@/content/dentvideo";
import type { LibraryItem } from "@/components/dentvid/library";

/** Where clinics write for anything the app cannot do itself (plan changes, cancelling, help). */
export const DV_SUPPORT_EMAIL = "hello@dentvideo.com";

/** A mailto: link with a subject (and optional body), encoded for every mail app. */
export function mailtoHref(subject: string, body?: string, to: string = DV_SUPPORT_EMAIL): string {
  const q = [`subject=${encodeURIComponent(subject)}`, body ? `body=${encodeURIComponent(body)}` : ""].filter(Boolean).join("&");
  return `mailto:${to}?${q}`;
}

/** The app's own screens, by the address bar (dentvideo.com/app or /dentvideo/app; the dev preview too). */
export type AppTab = "videos" | "record" | "settings";
export function appTab(pathname: string): AppTab | null {
  const all = pathname.split("/").filter(Boolean);
  let parts = all[0] === "dentvideo" ? all.slice(1) : all;
  if (parts[0] === "dev" && parts[1] === "app") parts = ["app"];
  if (parts[0] !== "app") return null;
  if (parts[1] === "record") return "record";
  if (parts[1] === "settings") return "settings";
  return "videos";
}

/** The sign-up wizard (/start, and its dev preview): a quiet header, no way off the path but the logo. */
export function isFunnel(pathname: string): boolean {
  const all = pathname.split("/").filter(Boolean);
  const parts = all[0] === "dentvideo" ? all.slice(1) : all;
  return parts[0] === "start" || (parts[0] === "dev" && parts[1] === "funnel");
}

/** Typographic quotes as each language writes them. */
const QUOTES: Record<Locale, [string, string]> = {
  en: ["“", "”"],
  de: ["„", "“"],
  es: ["«", "»"],
  fr: ["« ", " »"],
  tr: ["“", "”"],
  ja: ["「", "」"],
  ar: ["«", "»"],
  pl: ["„", "”"],
};
export function quote(locale: Locale, s: string): string {
  const [a, b] = QUOTES[locale];
  return `${a}${s}${b}`;
}

/* ---------------- Library ---------------- */

export type WeekGroup = { week: string; items: LibraryItem[] };

/**
 * Videos grouped by the week they were made for, newest week first; within a
 * week, what needs the dentist comes first (to look at, to approve, being
 * made, approved, declined). Topics that were not made are left out — the
 * library lists them separately.
 */
export function groupByWeek(items: LibraryItem[]): WeekGroup[] {
  const byWeek = new Map<string, LibraryItem[]>();
  for (const i of items) {
    if (i.status === "rejected") continue;
    const list = byWeek.get(i.week_of) ?? [];
    list.push(i);
    byWeek.set(i.week_of, list);
  }
  return [...byWeek.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([week, list]) => ({ week, items: list.map((item, n) => ({ item, n })).sort((a, b) => rank(a.item) - rank(b.item) || a.n - b.n).map((x) => x.item) }));
}

function rank(i: LibraryItem): number {
  const v = cardState(i);
  return { look: 0, review: 1, updating: 2, making: 3, failed: 4, approved: 5, declined: 6, notMade: 7 }[v];
}

/** What a card shows: one of these, from the item's status, approval and pending photo update. */
export type CardState = "look" | "review" | "making" | "updating" | "failed" | "approved" | "declined" | "notMade";
export function cardState(i: LibraryItem): CardState {
  if (i.status === "rejected") return "notMade";
  if (i.status === "queued" || i.status === "working") return "making";
  if (i.status === "failed") return "failed";
  if (!i.videoUrl) return "making";
  if (i.approval === "rejected") return "declined";
  if (i.photos?.status === "queued") return "updating";
  if (i.approval === "approved") return "approved";
  return i.status === "flagged" ? "look" : "review";
}

/** Counts for the summary at the top of the library (this week only). */
export function weekSummary(items: LibraryItem[]) {
  const s = { look: 0, review: 0, making: 0, updating: 0, approved: 0, failed: 0, declined: 0 };
  for (const i of items) {
    const c = cardState(i);
    if (c !== "notMade") s[c] += 1;
  }
  return s;
}

/**
 * The one thing the library asks of the clinic right now.
 * - locked: no active plan — choose one (the plan panel is on the page)
 * - review: videos are waiting for approval (some may need a look)
 * - making: this week's videos are still being made
 * - start: this week's videos are not made yet and can be started
 * - share: everything this week is approved — post them
 * - idle: nothing to do (e.g. all declined)
 */
export type NextAction = "locked" | "review" | "making" | "start" | "share" | "idle";
export function nextAction(args: { locked: boolean; canStartWeek: boolean; thisWeek: LibraryItem[]; delayed?: boolean }): NextAction {
  if (args.locked) return "locked";
  const s = weekSummary(args.thisWeek);
  if (s.look + s.review > 0) return "review";
  if (s.making + s.updating > 0) return "making";
  // This week's run is being retried (or is delayed and the team is on it): still "being made", not "start".
  if (args.delayed) return "making";
  if (args.canStartWeek) return "start";
  if (s.approved > 0) return "share";
  return "idle";
}

/**
 * The delay note for this week, or null: shown only while nothing of this
 * week is ready to look at — once videos are in, the note has done its job.
 */
export function delayNote(delay: "retrying" | "delayed" | null | undefined, thisWeek: LibraryItem[]): "retrying" | "delayed" | null {
  if (!delay) return null;
  const s = weekSummary(thisWeek);
  return s.look + s.review + s.approved > 0 ? null : delay;
}

/**
 * What a clinic may read about a video: the reviewers' reasons. Technical
 * failures are recorded for the owner only (dentvid_items.error); this also
 * hides the ones older rows still carry in their findings.
 */
const TECHNICAL = [/^could not produce:/i, /^the video file is missing$/i, /^could not store/i];
export function clinicFindings(findings: string[] | null | undefined): string[] {
  return (findings ?? []).filter((f) => typeof f === "string" && !TECHNICAL.some((r) => r.test(f.trim())));
}

/** Ready videos that one tap can approve. Ones marked for a look are left out on purpose — they need the dentist's eyes. */
export function approvableIds(items: LibraryItem[]): string[] {
  return items.filter((i) => cardState(i) === "review").map((i) => i.id);
}

/** "2 Nov" in the clinic's language, from a YYYY-MM-DD Monday (read as UTC so it never shifts a day). */
export function weekLabelDate(week: string, locale: Locale): string {
  const d = new Date(`${week}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return week;
  return new Intl.DateTimeFormat(dateLocale(locale), { day: "numeric", month: "long", timeZone: "UTC" }).format(d);
}

/** How many whole weeks before `current` a week is (0 = this week, 1 = last week). */
export function weeksAgo(week: string, current: string): number {
  const a = Date.parse(`${week}T00:00:00Z`);
  const b = Date.parse(`${current}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return -1;
  return Math.round((b - a) / (7 * 86_400_000));
}

/** A download name a phone's gallery shows sensibly: "dentvideo-dis-tasi-temizligi.mp4". */
export function videoFileName(title: string): string {
  const slug = title
    .replace(/ı/g, "i")
    .replace(/İ/g, "I")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug ? `dentvideo-${slug}.mp4` : "dentvideo.mp4";
}

/* ---------------- Recording upload ---------------- */

export const RECORDING_MAX_MB = 500;
const VIDEO_EXT = /\.(mp4|m4v|mov|webm)$/i;

/** Why a chosen file cannot be uploaded, or null when it can. */
export function checkRecording(file: { name: string; size: number; type: string }): "format" | "size" | "empty" | null {
  const looksVideo = file.type ? file.type.startsWith("video/") : VIDEO_EXT.test(file.name);
  if (!looksVideo && !VIDEO_EXT.test(file.name)) return "format";
  if (file.size === 0) return "empty";
  if (file.size > RECORDING_MAX_MB * 1024 * 1024) return "size";
  return null;
}

/** "84 MB" / "1.2 GB" / "650 KB" in the clinic's number format. */
export function fileSize(bytes: number, locale: Locale): string {
  const nf = (n: number, d: number) => new Intl.NumberFormat(locale, { maximumFractionDigits: d }).format(n);
  if (bytes >= 1024 ** 3) return `${nf(bytes / 1024 ** 3, 1)} GB`;
  if (bytes >= 1024 ** 2) return `${nf(bytes / 1024 ** 2, bytes >= 10 * 1024 ** 2 ? 0 : 1)} MB`;
  return `${nf(Math.max(1, Math.round(bytes / 1024)), 0)} KB`;
}

/** Dates for people: English clinics get "2 November" (UK order), not "November 2". */
export function dateLocale(locale: string): string {
  if (locale === "en") return "en-GB";
  // Gulf clinics write Western digits (0–9); plain "ar" would format in Arabic-Indic ones.
  if (locale === "ar") return "ar-u-nu-latn";
  return locale;
}
