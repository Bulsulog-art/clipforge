import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase";
import { isOwnPath, listOwnerFiles, type OwnerFile } from "./account";

/**
 * Removes storage left behind by accounts that never paid, so sign-ups
 * cannot park files on the VPS for free (audit H4). Run by
 * scripts/dentvideo-storage-cleanup.mts — dry run unless --apply.
 *
 * For every "<uuid>/" folder in the "dentvid" bucket:
 *   - no clinic row and no auth user (deleted elsewhere): every object
 *     older than the minimum age goes;
 *   - an unpaid account (no clinic row, or plan = "trial"): every object
 *     older than the minimum age goes, except the clinic's current logo
 *     (the preview and the sign-up wizard still show it);
 *   - a clinic that is or was paying (active, paused, cancelled): nothing —
 *     retention of paid content is the owner's decision (docs/SECURITY.md).
 * An object without a creation time is kept.
 *
 * Pure planning (planOwnerCleanup) is unit-tested; runStorageCleanup only
 * wires it to the service-role client.
 */

export const CLEANUP_MIN_AGE_DAYS = 30;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OwnerState = {
  ownerId: string;
  clinic: { plan: string | null; logo_path: string | null } | null;
  userExists: boolean;
  files: OwnerFile[];
};

export type CleanupPlan = { ownerId: string; reason: "no account" | "unpaid" | "paying"; remove: string[]; keep: number; bytes: number };

export function planOwnerCleanup(state: OwnerState, now: Date, minAgeDays = CLEANUP_MIN_AGE_DAYS): CleanupPlan {
  const owner = state.ownerId.toLowerCase();
  const paying = !!state.clinic && state.clinic.plan !== "trial" && state.clinic.plan !== null;
  const reason = paying ? "paying" : !state.clinic && !state.userExists ? "no account" : "unpaid";
  if (paying) return { ownerId: owner, reason, remove: [], keep: state.files.length, bytes: 0 };
  const cutoff = now.getTime() - minAgeDays * 86_400_000;
  const remove: string[] = [];
  let bytes = 0;
  for (const f of state.files) {
    if (!isOwnPath(f.path, owner)) continue;
    if (state.clinic?.logo_path && f.path === state.clinic.logo_path) continue;
    const t = f.createdAt ? Date.parse(f.createdAt) : NaN;
    if (!Number.isFinite(t) || t > cutoff) continue;
    remove.push(f.path);
    bytes += f.size ?? 0;
  }
  return { ownerId: owner, reason, remove, keep: state.files.length - remove.length, bytes };
}

/** Top-level "<uuid>" folders in the bucket. */
export async function listOwnerFolders(db: SupabaseClient): Promise<string[]> {
  const out: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.storage.from(BUCKET).list("", { limit: 1000, offset, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`storage list: ${error.message}`);
    for (const e of data ?? []) if (e.id == null && UUID.test(e.name)) out.push(e.name.toLowerCase());
    if ((data ?? []).length < 1000) break;
  }
  return out;
}

export async function runStorageCleanup(args: {
  db: SupabaseClient;
  apply: boolean;
  now?: Date;
  minAgeDays?: number;
  log?: (line: string) => void;
}): Promise<{ owners: number; files: number; bytes: number; plans: CleanupPlan[] }> {
  const { db, apply } = args;
  const log = args.log ?? ((l: string) => console.log(l));
  const now = args.now ?? new Date();
  const plans: CleanupPlan[] = [];
  for (const ownerId of await listOwnerFolders(db)) {
    const { data: clinic, error: ce } = await db.from("dentvid_clinics").select("plan, logo_path").eq("owner_id", ownerId).maybeSingle();
    if (ce) throw new Error(`clinic ${ownerId}: ${ce.message}`);
    let userExists = true;
    if (!clinic) {
      const { data, error } = await db.auth.admin.getUserById(ownerId);
      userExists = !error && !!data?.user;
    }
    // Paying clinics are never touched: skip listing their (large) folders.
    const plan = (clinic as { plan?: string } | null)?.plan ?? null;
    if (clinic && plan !== "trial") continue;
    const files = await listOwnerFiles(db, ownerId);
    const p = planOwnerCleanup({ ownerId, clinic: (clinic as OwnerState["clinic"]) ?? null, userExists, files }, now, args.minAgeDays);
    if (!p.remove.length) continue;
    plans.push(p);
    log(`${apply ? "delete" : "would delete"} ${p.remove.length} file(s), ${(p.bytes / 1048576).toFixed(1)} MB — owner ${ownerId} (${p.reason})`);
    if (apply) {
      for (let i = 0; i < p.remove.length; i += 100) {
        const { error } = await db.storage.from(BUCKET).remove(p.remove.slice(i, i + 100));
        if (error) throw new Error(`remove ${ownerId}: ${error.message}`);
      }
    }
  }
  const files = plans.reduce((n, p) => n + p.remove.length, 0);
  const bytes = plans.reduce((n, p) => n + p.bytes, 0);
  log(`${apply ? "deleted" : "dry run: would delete"} ${files} file(s), ${(bytes / 1048576).toFixed(1)} MB across ${plans.length} account(s)`);
  return { owners: plans.length, files, bytes, plans };
}
