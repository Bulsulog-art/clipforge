import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET, dvAdmin } from "./supabase";
import { isDemoActive, isDemoToken, demoExpiry, newDemoToken, toPublicDemo, type DemoInput, type DemoRow, type PublicDemo } from "./demos";
import type { FetchedImage } from "./safe-image-fetch";
import { logoPathFor } from "./paths";
import type { AdminClinic, AdminEvent } from "./admin-metrics";

/**
 * Demo links in the database (table dentvid_demos, migration
 * supabase/liman/0009_dentvid_demos.sql) and their logo copies in the
 * private bucket (demos/<token>.<ext>). Service role only.
 *
 * Everything fails soft: without the table (migration not applied) or
 * without a configured backend, a demo simply does not exist — the admin
 * page says so, the public link answers 404.
 */

const TABLE = "dentvid_demos";
const COLUMNS = "token, clinic_name, city, country, language, colour, logo_path, note, campaign, created_by, created_at, expires_at, disabled, view_count, last_viewed_at";

type PgError = { code?: string; message?: string } | null | undefined;

export const missingDemosTable = (e: PgError) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || /relation .*dentvid_demos.* does not exist|Could not find the table/i.test(e.message ?? ""));

function admin(db?: SupabaseClient): SupabaseClient | null {
  if (db) return db;
  try {
    return dvAdmin();
  } catch {
    return null;
  }
}

/** The full row of a demo by token, or null (unknown, malformed, no table, no backend). */
export async function loadDemoRow(token: string, db?: SupabaseClient): Promise<DemoRow | null> {
  if (!isDemoToken(token)) return null;
  const c = admin(db);
  if (!c) return null;
  try {
    const { data, error } = await c.from(TABLE).select(COLUMNS).eq("token", token).maybeSingle();
    if (error || !data) return null;
    return data as DemoRow;
  } catch {
    return null;
  }
}

/** A live demo as the public page may see it, or null (unknown, expired, disabled). */
export async function loadActiveDemo(token: string, now = new Date(), db?: SupabaseClient): Promise<PublicDemo | null> {
  const row = await loadDemoRow(token, db);
  return row && isDemoActive(row, now) ? toPublicDemo(row) : null;
}

export type DemoList = { available: boolean; demos: DemoRow[]; error?: string };

/** Every demo, newest first (the owner's list). `available: false` when the table is missing. */
export async function listDemos(db?: SupabaseClient): Promise<DemoList> {
  const c = admin(db);
  if (!c) return { available: false, demos: [], error: "DentVideo backend is not configured." };
  try {
    const { data, error } = await c.from(TABLE).select(COLUMNS).order("created_at", { ascending: false }).limit(500);
    if (error) return missingDemosTable(error) ? { available: false, demos: [] } : { available: true, demos: [], error: error.message };
    return { available: true, demos: (data ?? []) as DemoRow[] };
  } catch (e) {
    return { available: false, demos: [], error: (e as Error).message };
  }
}

/** Is the table there? (The admin page hides the form until it is.) */
export async function demosAvailable(db?: SupabaseClient): Promise<boolean> {
  return (await listDemos(db)).available;
}

/** Store a demo (and its logo copy). Retries a token collision a few times. */
export async function createDemo(
  input: DemoInput,
  logo: FetchedImage | null,
  createdBy: string,
  now = new Date(),
  db?: SupabaseClient,
): Promise<{ ok: true; demo: DemoRow } | { ok: false; error: string; missing?: boolean }> {
  const c = admin(db);
  if (!c) return { ok: false, error: "DentVideo backend is not configured." };
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = newDemoToken();
    let logoPath: string | null = null;
    if (logo) {
      logoPath = `demos/${token}.${logo.ext}`;
      const { error: upErr } = await c.storage.from(BUCKET).upload(logoPath, logo.bytes, { contentType: logo.contentType, upsert: false });
      if (upErr) return { ok: false, error: `Logo could not be stored: ${upErr.message}` };
    }
    const row = {
      token,
      clinic_name: input.clinicName,
      city: input.city ?? null,
      country: input.country ?? null,
      language: input.language,
      colour: input.colour,
      logo_path: logoPath,
      note: input.note ?? null,
      campaign: input.campaign,
      created_by: createdBy,
      created_at: now.toISOString(),
      expires_at: demoExpiry(now),
    };
    const { data, error } = await c.from(TABLE).insert(row).select(COLUMNS).single();
    if (!error && data) return { ok: true, demo: data as DemoRow };
    if (logoPath) await c.storage.from(BUCKET).remove([logoPath]).catch(() => null);
    if (missingDemosTable(error)) return { ok: false, error: "The dentvid_demos table is missing (apply migration 0009).", missing: true };
    if (error?.code !== "23505") return { ok: false, error: error?.message ?? "Could not save the demo." };
  }
  return { ok: false, error: "Could not find a free token; try again." };
}

/** Switch a demo off (or back on). */
export async function setDemoDisabled(token: string, disabled: boolean, db?: SupabaseClient): Promise<boolean> {
  if (!isDemoToken(token)) return false;
  const c = admin(db);
  if (!c) return false;
  const { error } = await c.from(TABLE).update({ disabled }).eq("token", token);
  return !error;
}

/** Count one view of a live demo (the caller rate-limits). Read-then-write: a lost race costs one view. */
export async function countDemoView(token: string, now = new Date(), db?: SupabaseClient): Promise<DemoRow | null> {
  const row = await loadDemoRow(token, db);
  if (!row || !isDemoActive(row, now)) return null;
  const c = admin(db)!;
  await c
    .from(TABLE)
    .update({ view_count: (row.view_count ?? 0) + 1, last_viewed_at: now.toISOString() })
    .eq("token", token)
    .then(
      () => null,
      () => null,
    );
  return row;
}

/** The demo's logo bytes (live demos only), or null. */
export async function demoLogo(token: string, now = new Date(), db?: SupabaseClient): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const row = await loadDemoRow(token, db);
  if (!row || !isDemoActive(row, now) || !row.logo_path) return null;
  const c = admin(db)!;
  const { data, error } = await c.storage.from(BUCKET).download(row.logo_path);
  if (error || !data) return null;
  const ext = row.logo_path.split(".").pop();
  return { bytes: await data.arrayBuffer(), contentType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg" };
}

/**
 * Copy a live demo's logo into a clinic owner's own folder (the sign-up
 * keeps the logo the clinic saw). Returns the new path, or null.
 */
export async function copyDemoLogoTo(token: string, userId: string, now = new Date(), db?: SupabaseClient): Promise<string | null> {
  const row = await loadDemoRow(token, db);
  if (!row || !isDemoActive(row, now) || !row.logo_path) return null;
  const c = admin(db)!;
  const ext = row.logo_path.split(".").pop() ?? "png";
  const dest = logoPathFor(userId, ext, now.getTime());
  const { error } = await c.storage.from(BUCKET).copy(row.logo_path, dest);
  return error ? null : dest;
}

/**
 * Delete demos past their expiry and their logos (privacy policy §7: kept
 * up to 60 days). Run when the owner opens /admin/demos. Returns how many went.
 */
export async function purgeExpiredDemos(now = new Date(), db?: SupabaseClient): Promise<number> {
  const c = admin(db);
  if (!c) return 0;
  try {
    const { data, error } = await c.from(TABLE).select("token, logo_path").lt("expires_at", now.toISOString()).limit(500);
    if (error || !data?.length) return 0;
    const logos = data.map((d) => d.logo_path as string | null).filter((p): p is string => !!p);
    if (logos.length) await c.storage.from(BUCKET).remove(logos).catch(() => null);
    const { error: delErr } = await c
      .from(TABLE)
      .delete()
      .in(
        "token",
        data.map((d) => d.token as string),
      );
    return delErr ? 0 : data.length;
  } catch {
    return 0;
  }
}

/** The events and clinics the per-demo numbers need (since the oldest demo). */
export async function loadDemoActivity(
  demos: DemoRow[],
  db?: SupabaseClient,
): Promise<{ events: AdminEvent[]; clinics: Pick<AdminClinic, "id" | "plan" | "dodo_subscription_id">[] }> {
  const c = admin(db);
  if (!c || !demos.length) return { events: [], clinics: [] };
  const since = demos.reduce((min, d) => (d.created_at < min ? d.created_at : min), demos[0].created_at);
  try {
    const { data: events } = await c
      .from("dentvid_events")
      .select("name, locale, props, clinic_id, created_at")
      .in("name", ["demo_preview_played", "demo_cta_clicked", "clinic_saved"])
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(20_000);
    const evs = (events ?? []) as AdminEvent[];
    const ids = [...new Set(evs.map((e) => e.clinic_id).filter((x): x is string => !!x))];
    if (!ids.length) return { events: evs, clinics: [] };
    const { data: clinics } = await c.from("dentvid_clinics").select("id, plan, dodo_subscription_id").in("id", ids.slice(0, 1000));
    return { events: evs, clinics: (clinics ?? []) as Pick<AdminClinic, "id" | "plan" | "dodo_subscription_id">[] };
  } catch {
    return { events: [], clinics: [] };
  }
}
