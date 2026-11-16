import type { SupabaseClient, User } from "@supabase/supabase-js";
import { z } from "zod";
import { BUCKET } from "./supabase";
import { loadItems } from "./items";
import { loadClinicPlan, type ClinicPlan } from "./plan";
import { deliveryWeek } from "./week";
import { weekSchedule } from "./posting";
import { asLocale } from "./locale";
import type { Locale } from "@/content/dentvideo-locales";
import type { LibraryItem } from "@/components/dentvid/library";
import type { ShootCard } from "@/components/dentvid/app-screens";

/**
 * What the DentVideo iPhone app reads and writes, built from the same loaders the web app uses
 * (items.ts, plan.ts, posting.ts) so both always agree. Every query is scoped to the session's own
 * user (owner_id = user.id) on top of row-level security. No price ever leaves here: the app shows
 * the plan's name and state only (App Store guideline 3.1.3).
 */

type Profile = Record<string, unknown> & { language?: string; country?: string; name?: string };
export type OwnClinic = { id: string; profile: Profile; logo_path: string | null };

export async function loadOwnClinic(db: SupabaseClient, userId: string): Promise<OwnClinic | null> {
  const { data } = await db.from("dentvid_clinics").select("id, owner_id, profile, logo_path").eq("owner_id", userId).maybeSingle();
  const row = data as { id: string; owner_id: string; profile: Profile | null; logo_path: string | null } | null;
  if (!row || row.owner_id !== userId) return null;
  return { id: row.id, profile: row.profile ?? {}, logo_path: row.logo_path ?? null };
}

/** The plan as the app shows it: state and tier name, never an amount. */
export type MobilePlan = { state: ClinicPlan["plan"]; tier: ClinicPlan["tier"]; canMake: boolean; adminPaused: boolean; recordings: boolean; renewsAt: string | null };

export function mobilePlan(p: ClinicPlan): MobilePlan {
  return {
    state: p.plan,
    tier: p.tier,
    canMake: p.canMake,
    adminPaused: !!p.adminPaused,
    // Own recordings are part of Practice and Group (the recording route refuses Starter).
    recordings: p.canMake && p.tier !== "starter",
    renewsAt: p.renewsAt,
  };
}

export async function mobileMe(db: SupabaseClient, user: Pick<User, "id" | "email">) {
  const clinic = await loadOwnClinic(db, user.id);
  const plan = clinic ? mobilePlan(await loadClinicPlan(db, clinic.id)) : null;
  let logoUrl: string | null = null;
  if (clinic?.logo_path) {
    const { data } = await db.storage.from(BUCKET).createSignedUrl(clinic.logo_path, 60 * 60);
    logoUrl = data?.signedUrl ?? null;
  }
  return {
    user: { id: user.id, email: user.email ?? null },
    clinic: clinic ? { id: clinic.id, profile: clinic.profile, logoUrl } : null,
    plan,
    locale: (asLocale(clinic?.profile.language) ?? "en") as Locale,
    currentWeek: deliveryWeek(),
  };
}

export type MobileItem = LibraryItem & { slot: { date: string; time: string } | null; shootCard: ShootCard | null };

/** The clinic's library (same rows as the web), each with its suggested posting slot and filming card. */
export async function mobileItems(db: SupabaseClient, userId: string, clinic: OwnClinic | null, now = new Date()): Promise<{ currentWeek: string; items: MobileItem[] }> {
  const { items, rows } = await loadItems(db, userId);
  const locale = (asLocale(clinic?.profile.language) ?? "en") as Locale;
  const place = { country: (clinic?.profile.country as string | undefined) ?? null, locale };
  const weeks = [...new Set(items.map((i) => i.week_of))];
  const slots = new Map<string, { date: string; time: string }>();
  for (const w of weeks) for (const [id, s] of weekSchedule(items, w, place)) slots.set(id, { date: s.date, time: s.time });
  const cards = new Map(rows.map((r) => [r.id, cleanShootCard(r.shoot_card)]));
  return {
    currentWeek: deliveryWeek(now),
    items: items.map((i) => ({ ...i, slot: slots.get(i.id) ?? null, shootCard: cards.get(i.id) ?? null })),
  };
}

const str = (v: unknown, max = 600): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => str(x)).filter((x): x is string => !!x).slice(0, 12) : []);

/** The filming card as stored by the worker, with only the fields the app shows (anything malformed is dropped). */
export function cleanShootCard(raw: unknown): ShootCard | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  const opening = str(c.opening);
  const closing = str(c.closing);
  const points = strs(c.points);
  if (!opening || !closing || !points.length) return null;
  const minutes = typeof c.minutes === "number" && c.minutes > 0 && c.minutes < 60 ? c.minutes : undefined;
  const avoid = strs(c.avoid);
  const setup = strs(c.setup);
  return { opening, points, closing, ...(avoid.length ? { avoid } : {}), ...(setup.length ? { setup } : {}), ...(minutes ? { minutes } : {}) };
}

/* -------------------------------------------------------------- approve week */

export const ApproveWeek = z.object({ week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).strict();

/**
 * "Approve all ready": the week's finished, undecided videos of this owner. Flagged ones need a
 * look first (the web shows them separately), so they are left for the dentist.
 */
export async function approveWeek(db: SupabaseClient, userId: string, week: string): Promise<{ ok: true; approved: string[]; clinicId: string | null } | { ok: false }> {
  const { data, error } = await db
    .from("dentvid_items")
    .update({ approval: "approved", approval_note: null, updated_at: new Date().toISOString() })
    .eq("owner_id", userId)
    .eq("week_of", week)
    .eq("status", "ready")
    .eq("approval", "pending")
    .select("id, clinic_id");
  if (error) {
    console.error("dentvideo approve week failed", error.message);
    return { ok: false };
  }
  const rows = (data ?? []) as { id: string; clinic_id: string }[];
  return { ok: true, approved: rows.map((r) => r.id), clinicId: rows[0]?.clinic_id ?? null };
}

/* -------------------------------------------------------------- devices */

/** An APNs device token as iOS hands it over (hex). */
export const DeviceBody = z
  .object({
    token: z.string().trim().toLowerCase().regex(/^[0-9a-f]{64,200}$/),
    environment: z.enum(["production", "development"]).default("production"),
    locale: z.string().trim().toLowerCase().regex(/^[a-z]{2}$/).optional(),
    readyPush: z.boolean().default(true),
  })
  .strict();
export const DeviceDelete = z.object({ token: z.string().trim().toLowerCase().regex(/^[0-9a-f]{64,200}$/) }).strict();

const missingTable = (e: { code?: string; message?: string } | null) => !!e && (e.code === "42P01" || e.code === "PGRST205" || /dentvid_devices/.test(e.message ?? ""));

/**
 * Store (or move) a device token for this owner, with the service role. A token is one phone: when
 * a phone signs in to another clinic's account, the row moves to that owner, so the previous
 * clinic's pushes stop reaching it. `stored: false` before migration 0023.
 */
export async function upsertDevice(admin: SupabaseClient, ownerId: string, body: z.infer<typeof DeviceBody>): Promise<{ ok: boolean; stored: boolean }> {
  const { error } = await admin
    .from("dentvid_devices")
    .upsert(
      { owner_id: ownerId, token: body.token, environment: body.environment, locale: body.locale ?? null, ready_push: body.readyPush, updated_at: new Date().toISOString() },
      { onConflict: "token" },
    );
  if (error) {
    if (missingTable(error)) return { ok: true, stored: false };
    console.error("dentvideo device save failed", error.message);
    return { ok: false, stored: false };
  }
  return { ok: true, stored: true };
}

/** Forget a device token — only the caller's own row. */
export async function deleteDevice(admin: SupabaseClient, ownerId: string, token: string): Promise<{ ok: boolean }> {
  const { error } = await admin.from("dentvid_devices").delete().eq("owner_id", ownerId).eq("token", token);
  if (error && !missingTable(error)) {
    console.error("dentvideo device delete failed", error.message);
    return { ok: false };
  }
  return { ok: true };
}
