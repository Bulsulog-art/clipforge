import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKET } from "./supabase";
import { subscriptionEnded, type DodoSubscription } from "./dodo-account";
import { isDentvideoOnly, withoutDentvideo } from "./membership";

/**
 * Self-serve account control for a DentVideo clinic: export everything we
 * hold about it, and delete it all. Pure orchestration over injected
 * clients so the order of steps and the owner checks are unit-tested
 * (account.test.ts); the routes under /api/dentvideo/account only do the
 * session, rate limits and HTTP.
 *
 * Every query is scoped by owner_id = the signed-in user's id, and every
 * storage path must sit inside "<owner_id>/" — the service-role client used
 * for deletion bypasses RLS, so these checks are the guard.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** How long the download links in an export stay valid. */
export const EXPORT_LINK_TTL_SEC = 24 * 60 * 60;
const LIST_PAGE = 1000;
const MAX_FILES = 20_000;
const MAX_DEPTH = 6;

export function assertOwnerId(userId: string): string {
  if (!UUID.test(userId)) throw new Error("account: bad owner id");
  return userId.toLowerCase();
}

/** Is this storage path inside the owner's own folder (no traversal)? */
export function isOwnPath(path: string, ownerId: string): boolean {
  if (!path.startsWith(`${ownerId.toLowerCase()}/`)) return false;
  return !path.split("/").some((seg) => seg === "" || seg === "." || seg === "..");
}

/** Every object under "<owner>/" in the dentvid bucket, walking sub-folders. */
export type OwnerFile = { path: string; size: number | null; contentType: string | null; createdAt?: string | null };

export async function listOwnerFiles(db: SupabaseClient, ownerId: string): Promise<OwnerFile[]> {
  const root = assertOwnerId(ownerId);
  const out: OwnerFile[] = [];
  const queue: { prefix: string; depth: number }[] = [{ prefix: root, depth: 0 }];
  while (queue.length) {
    const { prefix, depth } = queue.shift()!;
    for (let offset = 0; ; offset += LIST_PAGE) {
      const { data, error } = await db.storage.from(BUCKET).list(prefix, { limit: LIST_PAGE, offset, sortBy: { column: "name", order: "asc" } });
      if (error) throw new Error(`storage list: ${error.message}`);
      const entries = data ?? [];
      for (const e of entries) {
        if (!e.name || e.name.includes("/") || e.name === "." || e.name === "..") continue;
        const path = `${prefix}/${e.name}`;
        if (!isOwnPath(path, root)) continue;
        // Folders come back without an id (and without metadata).
        if (e.id == null) {
          if (depth + 1 <= MAX_DEPTH) queue.push({ prefix: path, depth: depth + 1 });
          continue;
        }
        const meta = (e.metadata ?? {}) as { size?: number; mimetype?: string };
        out.push({ path, size: typeof meta.size === "number" ? meta.size : null, contentType: meta.mimetype ?? null, createdAt: (e as { created_at?: string | null }).created_at ?? null });
        if (out.length >= MAX_FILES) return out;
      }
      if (entries.length < LIST_PAGE) break;
    }
  }
  return out;
}

/* ------------------------------------------------------------------ export */

type Row = Record<string, unknown>;

export type AccountExport = {
  format: "dentvideo-export/1";
  exported_at: string;
  links_expire_at: string;
  account: { id: string; email: string | null; created_at: string | null };
  clinic: Row | null;
  videos: (Row & { links: { video?: string; thumbnail?: string; source?: string } })[];
  files: { path: string; size: number | null; content_type: string | null; url: string | null }[];
  note: string;
};

/**
 * Everything DentVideo holds about the signed-in clinic, as one JSON
 * document: the clinic profile and plan, every video with its script,
 * caption and review, and short-lived download links for every file in the
 * clinic's storage folder (videos, posters, recordings, logo).
 * Reads go through the owner's own client, so RLS is a second guard.
 */
export async function buildAccountExport(
  db: SupabaseClient,
  user: { id: string; email?: string | null; created_at?: string | null },
  now: Date = new Date(),
): Promise<AccountExport> {
  const owner = assertOwnerId(user.id);
  const [{ data: clinic, error: ce }, { data: items, error: ie }] = await Promise.all([
    db.from("dentvid_clinics").select("*").eq("owner_id", owner).maybeSingle(),
    db.from("dentvid_items").select("*").eq("owner_id", owner).order("created_at", { ascending: true }),
  ]);
  if (ce) throw new Error(`clinic: ${ce.message}`);
  if (ie) throw new Error(`items: ${ie.message}`);
  const clinicRow = clinic && String((clinic as Row).owner_id).toLowerCase() === owner ? (clinic as Row) : null;
  const rows = ((items ?? []) as Row[]).filter((r) => String(r.owner_id).toLowerCase() === owner);

  const files = await listOwnerFiles(db, owner);
  const paths = new Set(files.map((f) => f.path));
  for (const r of rows) for (const k of ["video_path", "thumb_path", "source_path"]) if (typeof r[k] === "string" && isOwnPath(r[k] as string, owner)) paths.add(r[k] as string);
  if (clinicRow && typeof clinicRow.logo_path === "string" && isOwnPath(clinicRow.logo_path, owner)) paths.add(clinicRow.logo_path);

  const urls = new Map<string, string>();
  const list = [...paths];
  for (let i = 0; i < list.length; i += 500) {
    const { data: signed } = await db.storage.from(BUCKET).createSignedUrls(list.slice(i, i + 500), EXPORT_LINK_TTL_SEC);
    for (const s of signed ?? []) if (s.path && s.signedUrl && isOwnPath(s.path, owner)) urls.set(s.path, s.signedUrl);
  }
  const link = (p: unknown) => (typeof p === "string" ? urls.get(p) : undefined);

  return {
    format: "dentvideo-export/1",
    exported_at: now.toISOString(),
    links_expire_at: new Date(now.getTime() + EXPORT_LINK_TTL_SEC * 1000).toISOString(),
    account: { id: owner, email: user.email ?? null, created_at: user.created_at ?? null },
    clinic: clinicRow ? { ...clinicRow, logo_url: link(clinicRow.logo_path) ?? null } : null,
    videos: rows.map((r) => ({
      ...r,
      links: Object.fromEntries(
        [
          ["video", link(r.video_path)],
          ["thumbnail", link(r.thumb_path)],
          ["source", link(r.source_path)],
        ].filter(([, v]) => !!v),
      ) as { video?: string; thumbnail?: string; source?: string },
    })),
    files: list.map((p) => {
      const f = files.find((x) => x.path === p);
      return { path: p, size: f?.size ?? null, content_type: f?.contentType ?? null, url: urls.get(p) ?? null };
    }),
    note: "Download links expire at links_expire_at. Export again from Settings for fresh links.",
  };
}

/* ------------------------------------------------------------------ delete */

/** Same text, ignoring case, surrounding spaces, repeated spaces and Unicode form. */
export function confirmMatches(typed: string | null | undefined, expected: string | null | undefined): boolean {
  const norm = (s: string) => s.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
  if (!typed || !expected) return false;
  const e = norm(expected);
  return e.length > 0 && norm(typed) === e;
}

/** What the clinic must type to delete: its clinic name, else the account email. */
export function confirmPhrase(clinic: Row | null, email: string | null | undefined): string | null {
  const name = (clinic?.profile as { name?: unknown } | undefined)?.name;
  if (typeof name === "string" && name.trim()) return name;
  return email ?? null;
}

/**
 * Is the typed confirmation good enough? The clinic name (or email) while a
 * clinic row exists. With no clinic row left — a retry after an earlier run
 * already removed it, or a sign-up that never got past the first step —
 * only the empty login remains, so any typed text confirms.
 */
export function confirmAccepted(typed: string | null | undefined, clinic: Row | null, email: string | null | undefined): boolean {
  if (!clinic) return !!typed && typed.trim().length > 0;
  return confirmMatches(typed, confirmPhrase(clinic, email)) || confirmMatches(typed, email);
}

export type DodoDeps = {
  getSubscription: (id: string) => Promise<DodoSubscription>;
  cancelSubscription: (id: string) => Promise<void>;
};

export type DeleteStep = "lookup" | "billing" | "storage" | "items" | "clinic" | "auth";

export type DeleteResult =
  | {
      ok: true;
      files: number;
      items: number;
      clinic: boolean;
      cancelledSubscription: boolean;
      /** The Liman auth user itself was deleted (a DentVideo-only account). */
      userDeleted: boolean;
      /** The login belongs to other apps on Liman too: only DentVideo's data and markers were removed. */
      loginKept: boolean;
    }
  | { ok: false; reason: "confirm" | "subscription_active" | "billing_failed" | "failed"; step?: DeleteStep };

const notFound = (e: { status?: number; message?: string; code?: string } | null | undefined) =>
  !!e && (e.status === 404 || e.code === "user_not_found" || /not.?found/i.test(e.message ?? ""));

/**
 * Delete a clinic's account, in this order, each step scoped to the owner:
 *
 *   1. its Dodo subscription — cancelled through the API when a key is
 *      configured, otherwise the clinic is asked to cancel first;
 *   2. every storage object under "<owner>/" (videos, posters, recordings, logo);
 *   3. its dentvid_items rows;
 *   4. its dentvid_clinics row;
 *   5. the login — Liman is shared with other apps, so the auth user is
 *      deleted only when it is DentVideo's alone (lib/dentvid/membership
 *      isDentvideoOnly: app_metadata.product = "dentvideo" and no other app's
 *      marker). Otherwise only DentVideo's app_metadata keys (product,
 *      email_verified_*) are removed and the login stays for the other app.
 *
 * Idempotent: every step is a no-op on what is already gone, so a retry
 * after a partial failure finishes the job. Nothing is removed until the
 * subscription question is settled. `admin` is the service-role client.
 */
export async function deleteDentvideoAccount(args: {
  admin: SupabaseClient;
  user: { id: string; email?: string | null };
  confirm: string;
  dodo: DodoDeps | null;
  log?: (line: Record<string, unknown>) => void;
}): Promise<DeleteResult> {
  const { admin, dodo } = args;
  const owner = assertOwnerId(args.user.id);

  const { data: clinicData, error: ce } = await admin.from("dentvid_clinics").select("*").eq("owner_id", owner).maybeSingle();
  if (ce) return { ok: false, reason: "failed", step: "lookup" };
  const clinic = (clinicData as Row | null) ?? null;
  if (clinic && String(clinic.owner_id).toLowerCase() !== owner) return { ok: false, reason: "failed", step: "lookup" };

  if (!confirmAccepted(args.confirm, clinic, args.user.email)) return { ok: false, reason: "confirm" };

  // 1. Billing first: never leave a paying subscription behind a deleted account.
  let cancelledSubscription = false;
  const subId = typeof clinic?.dodo_subscription_id === "string" ? clinic.dodo_subscription_id : null;
  const paying = !!subId && (clinic?.plan === "active" || clinic?.plan === "paused");
  if (paying) {
    if (!dodo) return { ok: false, reason: "subscription_active" };
    try {
      const sub = await dodo.getSubscription(subId!);
      if (!subscriptionEnded(sub.status)) {
        await dodo.cancelSubscription(subId!);
        cancelledSubscription = true;
      }
    } catch {
      return { ok: false, reason: "billing_failed", step: "billing" };
    }
  }

  // 2. Storage.
  let files = 0;
  try {
    const all = (await listOwnerFiles(admin, owner)).map((f) => f.path).filter((p) => isOwnPath(p, owner));
    for (let i = 0; i < all.length; i += 100) {
      const chunk = all.slice(i, i + 100);
      const { error } = await admin.storage.from(BUCKET).remove(chunk);
      if (error) throw new Error(error.message);
      files += chunk.length;
    }
  } catch {
    return { ok: false, reason: "failed", step: "storage" };
  }

  // 3. Videos.
  const { error: ie, count: items } = await admin.from("dentvid_items").delete({ count: "exact" }).eq("owner_id", owner);
  if (ie) return { ok: false, reason: "failed", step: "items" };

  // 4. Clinic.
  const { error: de, count: clinics } = await admin.from("dentvid_clinics").delete({ count: "exact" }).eq("owner_id", owner);
  if (de) return { ok: false, reason: "failed", step: "clinic" };

  // 5. Login: deleted only if no other app on Liman uses it.
  let userDeleted = false;
  let loginKept = false;
  const { data: got, error: ge } = await admin.auth.admin.getUserById(owner);
  if (ge && !notFound(ge as { status?: number; message?: string; code?: string })) return { ok: false, reason: "failed", step: "auth" };
  const authUser = ge ? null : (got?.user ?? null);
  if (authUser && isDentvideoOnly(authUser)) {
    const { error: ae } = await admin.auth.admin.deleteUser(owner);
    if (ae && !notFound(ae as { status?: number; message?: string; code?: string })) return { ok: false, reason: "failed", step: "auth" };
    userDeleted = !ae;
  } else if (authUser) {
    loginKept = true;
    const app_metadata = withoutDentvideo(authUser.app_metadata);
    const legacy = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const user_metadata =
      legacy.product === "dentvideo" ? { product: null, email_verified_at: null, email_verified_for: null, email_verified_via: null } : undefined;
    if (Object.keys(app_metadata).length || user_metadata) {
      const { error: ue } = await admin.auth.admin.updateUserById(owner, { app_metadata, ...(user_metadata ? { user_metadata } : {}) });
      if (ue) return { ok: false, reason: "failed", step: "auth" };
    }
  }

  const result = { ok: true as const, files, items: items ?? 0, clinic: (clinics ?? 0) > 0 || !!clinic, cancelledSubscription, userDeleted, loginKept };
  (args.log ?? defaultLog)({
    evt: "dentvideo.account_deleted",
    // A one-way reference (not the id, no name or email) to match support questions.
    ref: auditRef(owner),
    files: result.files,
    items: result.items,
    clinic: result.clinic,
    subscription_cancelled: cancelledSubscription,
    login: userDeleted ? "deleted" : loginKept ? "kept_shared" : "gone",
    at: new Date().toISOString(),
  });
  return result;
}

export function auditRef(ownerId: string): string {
  return createHash("sha256").update(`dentvideo:${ownerId.toLowerCase()}`).digest("hex").slice(0, 12);
}

function defaultLog(line: Record<string, unknown>) {
  console.info("[dentvideo:account]", JSON.stringify(line));
}
