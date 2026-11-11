import type { SupabaseClient } from "@supabase/supabase-js";
import { readyEmail, sendEmail } from "./email";
import { recordEvent } from "./events-server";

/**
 * "Your videos are ready" to a clinic's owner, in the clinic's language. Used
 * by the worker's notice (api/internal/dentvideo/notify) and by the owner's
 * "resend" in the admin panel, so both send exactly the same email and both
 * are logged in dentvid_email_sends.
 */
export type ReadyNoticeResult = { sent: boolean; reason?: "no clinic" | "no email" | "nothing ready" | "send failed" };

export async function sendReadyNotice(
  db: SupabaseClient,
  clinicId: string,
  kind: "week" | "recording",
  counts: { ready: number; flagged: number },
  opts: { recordFunnel?: boolean; send?: typeof sendEmail } = {},
): Promise<ReadyNoticeResult> {
  const { data: clinic } = await db.from("dentvid_clinics").select("owner_id, profile").eq("id", clinicId).maybeSingle();
  if (!clinic) return { sent: false, reason: "no clinic" };
  const { data: owner } = await db.auth.admin.getUserById(clinic.owner_id as string);
  const email = owner?.user?.email;
  if (!email) return { sent: false, reason: "no email" };
  const profile = (clinic.profile ?? {}) as { name?: string; language?: string };
  // Funnel: the worker finished a week (or a recording) for this clinic. Not for an owner's resend.
  if (opts.recordFunnel !== false) void recordEvent("week_ready", { db, clinicId, locale: profile.language, props: { kind, ...counts } });
  const base = (process.env.NEXT_PUBLIC_DENTVIDEO_URL || `${(process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, "")}/dentvideo`).replace(/\/+$/, "");
  const msg = readyEmail({ kind, counts, clinicName: profile.name ?? "", language: profile.language ?? "en", appUrl: `${base}/app` });
  if (!msg) return { sent: false, reason: "nothing ready" };
  const sent = await (opts.send ?? sendEmail)(email, msg, { log: { clinicId, kind: kind === "week" ? "ready_week" : "ready_recording", language: profile.language ?? null } });
  return sent ? { sent } : { sent, reason: "send failed" };
}
