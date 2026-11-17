import type { SupabaseClient } from "@supabase/supabase-js";
import { DV_PRODUCT, isDentvideoUser } from "./membership";
import { isEmailVerified, normalizeEmail } from "./verify-email";

/**
 * One-off: move the DentVideo marker (and the email-verified flag) from
 * user_metadata — which every user can rewrite — to app_metadata, which only
 * the service role can (audit H2). Run by
 * scripts/dentvideo-backfill-app-metadata.mts, dry run unless --apply.
 *
 *   product   user_metadata.product = "dentvideo" → app_metadata.product.
 *             When app_metadata.product already names another app, it is
 *             left alone and "dentvideo" is added to app_metadata.products.
 *   verified  user_metadata.email_verified_at/for → app_metadata, only when
 *             the address it was proven for is the account's current one,
 *             marked email_verified_via = "legacy_user_metadata" so these can
 *             be told apart. Skip with --no-verified: those owners then get a
 *             new code on the plan step and no lifecycle email until they
 *             confirm it.
 *
 * The sign-up route has set user_metadata.product since DentVideo's first
 * version, so an account that owns a clinic but has no marker did not come
 * through DentVideo's sign-up (e.g. another Liman app's user): it is listed,
 * never marked.
 */

type AuthUser = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown> | null;
  user_metadata?: Record<string, unknown> | null;
};

export type BackfillPatch = { app_metadata: Record<string, unknown> } | null;

export function planBackfill(user: AuthUser, opts: { copyVerified: boolean }): BackfillPatch {
  const meta = user.user_metadata ?? {};
  const app = user.app_metadata ?? {};
  if (meta.product !== DV_PRODUCT) return null;
  const patch: Record<string, unknown> = {};
  if (!isDentvideoUser(user)) {
    if (app.product === undefined || app.product === null || app.product === "") patch.product = DV_PRODUCT;
    else {
      const list = Array.isArray(app.products) ? (app.products as unknown[]).filter((p) => typeof p === "string") : [];
      patch.products = [...new Set([...(list as string[]), String(app.product), DV_PRODUCT])];
    }
  }
  if (opts.copyVerified && !isEmailVerified(user) && user.email) {
    const at = meta.email_verified_at;
    const forEmail = meta.email_verified_for;
    if (typeof at === "string" && at && typeof forEmail === "string" && normalizeEmail(forEmail) === normalizeEmail(user.email)) {
      patch.email_verified_at = at;
      patch.email_verified_for = normalizeEmail(forEmail);
      patch.email_verified_via = "legacy_user_metadata";
    }
  }
  return Object.keys(patch).length ? { app_metadata: patch } : null;
}

export async function runBackfill(args: {
  db: SupabaseClient;
  apply: boolean;
  copyVerified: boolean;
  log?: (line: string) => void;
}): Promise<{ scanned: number; marked: number; verifiedCopied: number; unmarkedClinicOwners: string[] }> {
  const { db, apply } = args;
  const log = args.log ?? ((l: string) => console.log(l));
  let scanned = 0;
  let marked = 0;
  let verifiedCopied = 0;
  const dentvideo = new Set<string>();
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const users = (data?.users ?? []) as AuthUser[];
    for (const u of users) {
      scanned++;
      const patch = planBackfill(u, { copyVerified: args.copyVerified });
      if (isDentvideoUser(u) || patch) dentvideo.add(u.id);
      if (!patch) continue;
      if (patch.app_metadata.product || patch.app_metadata.products) marked++;
      if (patch.app_metadata.email_verified_at) verifiedCopied++;
      log(`${apply ? "update" : "would update"} ${u.id}: ${Object.keys(patch.app_metadata).join(", ")}`);
      if (apply) {
        const { error: ue } = await db.auth.admin.updateUserById(u.id, patch);
        if (ue) throw new Error(`update ${u.id}: ${ue.message}`);
      }
    }
    if (users.length < 1000) break;
  }
  const { data: clinics, error: ce } = await db.from("dentvid_clinics").select("owner_id");
  if (ce) throw new Error(`dentvid_clinics: ${ce.message}`);
  const unmarkedClinicOwners = ((clinics ?? []) as { owner_id: string }[]).map((c) => c.owner_id).filter((id) => !dentvideo.has(id));
  for (const id of unmarkedClinicOwners) log(`NOT marked (clinic owner without a DentVideo sign-up marker — review by hand): ${id}`);
  log(`${apply ? "done" : "dry run"}: ${scanned} users scanned, ${marked} marked, ${verifiedCopied} verified flags copied, ${unmarkedClinicOwners.length} clinic owner(s) to review`);
  return { scanned, marked, verifiedCopied, unmarkedClinicOwners };
}
