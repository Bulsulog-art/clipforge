import type { SupabaseClient } from "@supabase/supabase-js";
import { readyEmail, sendEmail } from "./email";
import { recordEvent } from "./events-server";
import { approveUrl } from "./approve-link";
import { EMAIL_IMAGE_TTL_S, isTestEmail, lifecycleConfig } from "./lifecycle";
import { BUCKET } from "./supabase";
import { unsubscribeSecret } from "./unsubscribe-token";
import type { Thumb } from "./email-layout";

/**
 * "Your videos are ready" to a clinic's owner, in the clinic's language. Used
 * by the worker's notice (api/internal/dentvideo/notify) and by the owner's
 * "resend" in the admin panel, so both send exactly the same email and both
 * are logged in dentvid_email_sends.
 *
 * For a week: up to four posters of the week's videos (generated videos only;
 * a recording can show people, so it never gets thumbnails) and a signed
 * one-tap approve link (approve-link.ts) for the videos that are ready.
 * The clinic's logo and colour brand the email. Test accounts (e2e-…) get
 * nothing.
 */
export type ReadyNoticeResult = { sent: boolean; reason?: "no clinic" | "no email" | "test account" | "nothing ready" | "send failed" };

type ItemRow = { id: string; title: string | null; week_of: string; thumb_path: string | null; status: string };

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
  const profile = (clinic.profile ?? {}) as { name?: string; language?: string; brandColor?: string };
  // Funnel: the worker finished a week (or a recording) for this clinic. Not for an owner's resend.
  if (opts.recordFunnel !== false) void recordEvent("week_ready", { db, clinicId, locale: profile.language, props: { kind, ...counts } });
  const base = readyEmailBase();

  let thumbs: Thumb[] = [];
  let approve: string | null = null;
  let logoUrl: string | null = null;
  try {
    const paths: string[] = [];
    let items: ItemRow[] = [];
    let week: string | null = null;
    if (kind === "week") {
      const { data } = await db
        .from("dentvid_items")
        .select("id, title, week_of, thumb_path, status")
        .eq("clinic_id", clinicId)
        .eq("kind", "generated")
        .order("week_of", { ascending: false })
        .limit(24);
      ({ week, items } = latestWeek((data ?? []) as ItemRow[]));
      for (const i of items.slice(0, 4)) if (i.thumb_path) paths.push(i.thumb_path);
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
    brand: { logoUrl, color: profile.brandColor ?? null },
  });
  if (!msg) return { sent: false, reason: "nothing ready" };
  const sent = await (opts.send ?? sendEmail)(email, msg, { log: { clinicId, kind: kind === "week" ? "ready_week" : "ready_recording", language: profile.language ?? null } });
  return sent ? { sent } : { sent, reason: "send failed" };
}
