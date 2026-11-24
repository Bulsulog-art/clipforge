import type { SupabaseClient } from "@supabase/supabase-js";
import { readyEmail, sendEmail, type SettingsNudge, type ShortReason } from "./email";
import { recordEvent } from "./events-server";
import { approveUrl } from "./approve-link";
import { EMAIL_IMAGE_TTL_S, isTestEmail, lifecycleConfig } from "./lifecycle";
import { BUCKET } from "./supabase";
import { unsubscribeSecret } from "./unsubscribe-token";
import type { Thumb, VideoRow } from "./email-layout";
import { postLinkUrl } from "./post-link";
import { leadSentence, postTexts, slotLabel, weekSchedule } from "./posting";
import { asLocale } from "./locale";
import { postingText } from "@/content/dentvideo-posting";
import { WEEK_VIDEOS } from "./week-job";

/**
 * "Your videos are ready" to a clinic's owner, in the clinic's language. Used
 * by the worker's notice (api/internal/dentvideo/notify) and by the owner's
 * "resend" in the admin panel, so both send exactly the same email and both
 * are logged in dentvid_email_sends.
 *
 * For a week: up to four posters of the week's videos (generated videos only;
 * a recording can show people, so it never gets thumbnails) and a signed
 * one-tap approve link (approve-link.ts) for the videos that are ready.
 * Each of the week's videos is listed with its poster, the start of its
 * ready-to-post caption, its suggested posting day and its own link: "Approve
 * & share" (post-link.ts, the same signed token scoped to one video) for a
 * ready one, "Check it in the app" for one flagged for a look.
 * The clinic's logo and colour brand the email. Test accounts (e2e-…) get
 * nothing.
 *
 * Two weeks read differently:
 *   - the clinic's first delivered week gets the welcome: three steps from
 *     "ready" to "posted", the next delivery date and, if the clinic has not
 *     set them, one line about its Instagram handle and closing line in
 *     Settings. Once per clinic: never again after a "videos ready" email
 *     went out (a top-up of that same week), nor for a clinic whose earlier
 *     library was deleted after a cancelled plan (isFirstWeek);
 *   - a week with fewer than five usable videos says how many were left out
 *     and why, counted from the week's videos in the library (the worker's
 *     counts are one run's, and a re-run only makes the missing ones). It
 *     blames our checks only when they refused every one left out
 *     (shortReason).
 */
export type ReadyNoticeResult = { sent: boolean; reason?: "no clinic" | "no email" | "test account" | "nothing ready" | "send failed" };

type ItemRow = {
  id: string;
  title: string | null;
  week_of: string;
  thumb_path: string | null;
  status: string;
  approval?: string;
  copy?: unknown;
  kind?: string;
  /** A technical failure (worker rows.ts): set on a rejected row the checks never refused. */
  error?: string | null;
};

/** The rows of the email's video list, oldest first (the posting order), from the week's items. */
export function videoRows(
  items: ItemRow[],
  args: { week: string; language: string; country?: string | null; base: string; clinicId: string; secret: string | null; thumbUrl: (path: string) => string | undefined; now?: Date },
): VideoRow[] {
  const locale = asLocale(args.language) ?? "en";
  const p = postingText(locale);
  const schedule = weekSchedule(items.map((i) => ({ ...i, approval: i.approval ?? "pending" })), args.week, { country: args.country, locale });
  return items.slice(0, 6).map((i) => {
    const caption = postTexts(i.copy as never)?.instagram.split(/\n\s*\n/)[0];
    const slot = schedule.get(i.id);
    const shareable = i.status === "ready" && i.approval !== "rejected" && !!args.secret;
    return {
      title: (i.title ?? "").slice(0, 80),
      thumbUrl: i.thumb_path ? args.thumbUrl(i.thumb_path) : undefined,
      caption: caption ? leadSentence(caption, 140) : undefined,
      slot: slot ? p.email.postOn.replace("{slot}", slotLabel(slot, locale, args.country)) : undefined,
      href: shareable ? postLinkUrl(args.base, args.clinicId, args.week, i.id, args.secret!, args.now) : `${args.base}/app`,
      action: !shareable ? p.email.lookInApp : i.approval === "approved" ? p.email.share : p.email.approveShare,
    };
  });
}

/** How many of the week's five are missing from its usable videos (0 when none, or when there is nothing to count). */
export function missingFromWeek(items: ItemRow[]): number {
  const usable = items.filter((r) => r.status === "ready" || r.status === "flagged").length;
  return usable > 0 && usable < WEEK_VIDEOS ? WEEK_VIDEOS - usable : 0;
}

/**
 * Why a week is short (`missing` of its five left out). "checks" only when
 * our checks refused at least that many of the week's topics and nothing
 * else went wrong: every unusable row is a review rejection, with no
 * technical error (worker rows.ts sets `error` for a render, model or upload
 * failure, and a silent render). A technical failure, a failed placeholder,
 * or a slot never attempted (too few refusals to explain the gap) is
 * "unfinished", which makes no claim about the checks.
 */
export function shortReason(weekRows: ItemRow[], missing: number): ShortReason {
  const unusable = weekRows.filter((r) => r.status !== "ready" && r.status !== "flagged");
  const technical = unusable.some((r) => r.status !== "rejected" || (typeof r.error === "string" && r.error.trim() !== ""));
  return !technical && unusable.length >= missing && missing > 0 ? "checks" : "unfinished";
}

/**
 * Is `week` the clinic's first delivered week? Once per clinic, so all of:
 *   - no usable generated video (ready or flagged) from an earlier week: the
 *     rows already read answer it when they hold one, else a count asks;
 *   - no "videos ready" email ever went out to it (dentvid_email_sends
 *     ready_week, sent): a top-up or re-run of this same first week, or a
 *     clinic that had weeks before, is not welcomed again;
 *   - its library was never deleted (library_deleted_at, retention.ts): a
 *     clinic back after a cancelled plan had weeks, even if no row is left.
 * Any doubt (an error) reads as "not first": a long-time clinic must never
 * be welcomed as new.
 */
export async function isFirstWeek(db: SupabaseClient, clinicId: string, week: string, rows: ItemRow[]): Promise<boolean> {
  if (rows.some((r) => (r.status === "ready" || r.status === "flagged") && r.week_of < week)) return false;
  const [earlier, mailed, clinic] = await Promise.all([
    db.from("dentvid_items").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("kind", "generated").in("status", ["ready", "flagged"]).lt("week_of", week),
    db.from("dentvid_email_sends").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("kind", "ready_week").eq("status", "sent"),
    // "*": library_deleted_at (0025) may not exist yet; a missing column then reads as "never deleted".
    db.from("dentvid_clinics").select("*").eq("id", clinicId).maybeSingle(),
  ]);
  if (earlier.error || mailed.error || clinic.error || !clinic.data) return false;
  if (earlier.count !== 0 || mailed.count !== 0) return false;
  return !(clinic.data as { library_deleted_at?: string | null }).library_deleted_at;
}

/** Which of the clinic's own touches the first-week email may suggest: only ones not set yet. */
export function settingsNudge(profile: { handle?: unknown; closingLine?: unknown }): SettingsNudge | null {
  const set = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const handle = !set(profile.handle);
  const closing = !set(profile.closingLine);
  return handle && closing ? "both" : handle ? "handle" : closing ? "closingLine" : null;
}

/** The Monday after a week's Monday (YYYY-MM-DD). */
export function nextWeekOf(week: string): string | null {
  const t = Date.parse(`${week}T00:00:00Z`);
  return Number.isNaN(t) ? null : new Date(t + 7 * 86_400_000).toISOString().slice(0, 10);
}

/** The newest week with finished generated videos: its date, and its items. */
export function latestWeek(rows: ItemRow[]): { week: string | null; items: ItemRow[] } {
  const done = rows.filter((r) => r.status === "ready" || r.status === "flagged");
  const week = done.map((r) => r.week_of).sort().at(-1) ?? null;
  return { week, items: week ? done.filter((r) => r.week_of === week) : [] };
}

/**
 * The absolute base the email links to — the same as every other DentVideo
 * email (lifecycleConfig: NEXT_PUBLIC_DENTVIDEO_URL, else the app URL's
 * /dentvideo, else https://dentvideo.com). Never a relative "/dentvideo":
 * an email client cannot open that, and the approve link was dropped with it.
 */
export function readyEmailBase(env: Record<string, string | undefined> = process.env): string {
  return lifecycleConfig(env).base;
}

export async function sendReadyNotice(
  db: SupabaseClient,
  clinicId: string,
  kind: "week" | "recording",
  counts: { ready: number; flagged: number },
  opts: { recordFunnel?: boolean; send?: typeof sendEmail; now?: Date } = {},
): Promise<ReadyNoticeResult> {
  const { data: clinic } = await db.from("dentvid_clinics").select("owner_id, profile, logo_path").eq("id", clinicId).maybeSingle();
  if (!clinic) return { sent: false, reason: "no clinic" };
  const { data: owner } = await db.auth.admin.getUserById(clinic.owner_id as string);
  const email = owner?.user?.email;
  if (!email) return { sent: false, reason: "no email" };
  if (isTestEmail(email)) return { sent: false, reason: "test account" };
  const profile = (clinic.profile ?? {}) as { name?: string; language?: string; brandColor?: string; handle?: string; closingLine?: string };
  // Funnel: the worker finished a week (or a recording) for this clinic. Not for an owner's resend.
  if (opts.recordFunnel !== false) void recordEvent("week_ready", { db, clinicId, locale: profile.language, props: { kind, ...counts } });
  const base = readyEmailBase();

  let thumbs: Thumb[] = [];
  let approve: string | null = null;
  let videos: VideoRow[] = [];
  let logoUrl: string | null = null;
  let first = false;
  let missing = 0;
  let missingReason: ShortReason = "unfinished";
  let nextDate: string | null = null;
  try {
    const paths: string[] = [];
    let items: ItemRow[] = [];
    let week: string | null = null;
    if (kind === "week") {
      const { data } = await db
        .from("dentvid_items")
        .select("id, title, week_of, thumb_path, status, approval, copy, created_at, error")
        .eq("clinic_id", clinicId)
        .eq("kind", "generated")
        .order("week_of", { ascending: false })
        .order("created_at", { ascending: true })
        .limit(24);
      const rows = (data ?? []) as ItemRow[];
      ({ week, items } = latestWeek(rows));
      for (const i of items.slice(0, 6)) if (i.thumb_path) paths.push(i.thumb_path);
      if (week) {
        missing = missingFromWeek(items);
        missingReason = shortReason(
          rows.filter((r) => r.week_of === week),
          missing,
        );
        first = await isFirstWeek(db, clinicId, week, rows).catch(() => false);
        nextDate = first ? nextWeekOf(week) : null;
      }
    }
    if (typeof clinic.logo_path === "string") paths.push(clinic.logo_path);
    const urls = new Map<string, string>();
    if (paths.length) {
      const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(paths, EMAIL_IMAGE_TTL_S);
      for (const s of signed ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
    }
    thumbs = items
      .slice(0, 4)
      .filter((i) => i.thumb_path && urls.has(i.thumb_path))
      .map((i) => ({ url: urls.get(i.thumb_path!)!, title: (i.title ?? "").slice(0, 60), href: `${base}/app` }));
    logoUrl = typeof clinic.logo_path === "string" ? (urls.get(clinic.logo_path) ?? null) : null;
    const secret = unsubscribeSecret();
    if (week && secret && counts.ready > 0) approve = approveUrl(new URL(base).origin, clinicId, week, secret, opts.now);
    if (week) videos = videoRows(items, { week, language: profile.language ?? "en", country: (profile as { country?: string }).country ?? null, base, clinicId, secret, thumbUrl: (path) => urls.get(path), now: opts.now });
  } catch (e) {
    // Images and the approve link are extras: the email goes without them.
    console.warn("[dentvideo] ready email extras unavailable", (e as Error).message);
  }

  const msg = readyEmail({
    kind,
    counts,
    clinicName: profile.name ?? "",
    language: profile.language ?? "en",
    appUrl: `${base}/app`,
    thumbs,
    approveUrl: approve,
    videos,
    brand: { logoUrl, color: profile.brandColor ?? null },
    first,
    nextDate,
    country: (profile as { country?: string }).country ?? null,
    nudge: first ? settingsNudge(profile) : null,
    missing,
    missingReason,
  });
  if (!msg) return { sent: false, reason: "nothing ready" };
  const sent = await (opts.send ?? sendEmail)(email, msg, { log: { clinicId, kind: kind === "week" ? "ready_week" : "ready_recording", language: profile.language ?? null } });
  return sent ? { sent } : { sent, reason: "send failed" };
}
