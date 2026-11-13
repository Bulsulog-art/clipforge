import { approveToken, verifyApproveToken, APPROVE_TTL_DAYS } from "./approve-link";
import { isMissingColumn, postTexts, slotLabel, weekSchedule, type PostTexts } from "./posting";
import { asLocale } from "./locale";
import type { Locale } from "@/content/dentvideo";

/**
 * "Approve & share" for ONE video, straight from the Monday email, no login:
 * dentvideo.com/post?t=<approve token>&v=<item id>.
 *
 * The token is the week's one-tap approve token (approve-link.ts: HMAC with
 * its own purpose tag, clinic + week, expires after APPROVE_TTL_DAYS); `v`
 * picks one video inside that clinic and week and grants nothing beyond it.
 * Compared with the "approve all" link it already sits next to, it adds:
 *
 *   GET   the page shows that video (a signed URL valid for an hour) with
 *         its caption — only while it is a finished, unflagged ("ready")
 *         video of that clinic and week that is pending or approved. It
 *         changes nothing, so a mail scanner opening it approves nothing.
 *   POST  {action:"approve"}  approves that one video, on the person's tap
 *         (the page's "Approve, save video + copy caption" button) — the
 *         same rule as approve-link's POST: ready + pending only, never a
 *         flagged video, never a paused or cancelled clinic.
 *         {action:"posted", on} ticks an approved video as posted (0012).
 *
 * Nothing here publishes anything; the clinic posts the video itself.
 */

export function postLinkUrl(base: string, clinicId: string, week: string, itemId: string, secret: string, now = new Date()): string {
  return `${base.replace(/\/+$/, "")}/post?t=${encodeURIComponent(approveToken(clinicId, week, secret, now))}&v=${encodeURIComponent(itemId)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Signed video and poster URLs on the page: long enough to watch and share, short enough not to matter if forwarded. */
export const POST_PAGE_URL_TTL_S = 60 * 60;

export type PostItem = {
  id: string;
  title: string | null;
  kind: string;
  status: string;
  approval: string;
  week_of: string;
  video_path: string | null;
  thumb_path: string | null;
  copy: unknown;
  /** Absent on a database without 0012. */
  posted_at?: string | null;
};

export interface PostLinkStore {
  clinic(id: string): Promise<{ plan: string; language: string | null } | null>;
  /** The clinic's generated videos of that week, oldest first (for the posting schedule). */
  week(clinicId: string, week: string): Promise<PostItem[]>;
  /** Approves exactly this video if it is still ready + pending in that clinic and week; true when it changed. */
  approve(clinicId: string, week: string, id: string): Promise<boolean>;
  /** Ticks an approved video as posted (or not); "missing" before 0012. */
  posted(clinicId: string, week: string, id: string, on: boolean): Promise<"ok" | "none" | "missing">;
  signed(paths: string[], ttlS: number): Promise<Map<string, string>>;
}

export type PostView =
  | { state: "invalid"; locale: Locale }
  | { state: "nothing"; locale: Locale }
  | {
      state: "ready";
      locale: Locale;
      item: { id: string; title: string; videoUrl: string; thumbUrl?: string; approval: "pending" | "approved"; posted: boolean; texts: PostTexts | null; slot?: string };
    };

/** A video the page may show: finished without findings, generated, still pending or approved. */
function shareable(i: PostItem | undefined): i is PostItem & { video_path: string } {
  return !!i && i.kind === "generated" && i.status === "ready" && (i.approval === "pending" || i.approval === "approved") && !!i.video_path;
}

export async function loadPostView(t: string | null | undefined, v: string | null | undefined, deps: { store: PostLinkStore; secret: string | null; now?: Date; fallbackLocale?: Locale }): Promise<PostView> {
  const fallback = deps.fallbackLocale ?? "en";
  const tok = verifyApproveToken(t, deps.secret, deps.now ?? new Date());
  const id = (v ?? "").toLowerCase();
  if (!tok || !UUID.test(id)) return { state: "invalid", locale: fallback };
  const clinic = await deps.store.clinic(tok.clinicId);
  const locale = asLocale(clinic?.language ?? undefined) ?? fallback;
  if (!clinic || clinic.plan !== "active") return { state: "nothing", locale };
  const items = await deps.store.week(tok.clinicId, tok.week);
  const item = items.find((i) => i.id.toLowerCase() === id);
  if (!shareable(item)) return { state: "nothing", locale };
  const urls = await deps.store.signed([item.video_path, ...(item.thumb_path ? [item.thumb_path] : [])], POST_PAGE_URL_TTL_S);
  const videoUrl = urls.get(item.video_path);
  if (!videoUrl) return { state: "nothing", locale };
  const slot = weekSchedule(items, tok.week, locale).get(item.id);
  return {
    state: "ready",
    locale,
    item: {
      id: item.id,
      title: item.title ?? "",
      videoUrl,
      thumbUrl: item.thumb_path ? urls.get(item.thumb_path) : undefined,
      approval: item.approval as "pending" | "approved",
      posted: !!item.posted_at,
      texts: postTexts(item.copy as never),
      slot: slot ? slotLabel(slot, locale) : undefined,
    },
  };
}

export type PostAction = { t?: unknown; v?: unknown; action?: unknown; on?: unknown };

export async function handlePostAction(body: PostAction, deps: { store: PostLinkStore; secret: string | null; now?: Date; onApproved?: (clinicId: string) => void }): Promise<{ status: number; body: { ok: boolean; stored?: boolean; error?: string } }> {
  const tok = verifyApproveToken(typeof body.t === "string" ? body.t : null, deps.secret, deps.now ?? new Date());
  const id = typeof body.v === "string" ? body.v.toLowerCase() : "";
  if (!tok || !UUID.test(id)) return { status: 400, body: { ok: false, error: "invalid" } };
  if (body.action !== "approve" && body.action !== "posted") return { status: 400, body: { ok: false, error: "action" } };
  const clinic = await deps.store.clinic(tok.clinicId);
  if (!clinic || clinic.plan !== "active") return { status: 409, body: { ok: false, error: "inactive" } };
  if (body.action === "approve") {
    const items = await deps.store.week(tok.clinicId, tok.week);
    const item = items.find((i) => i.id.toLowerCase() === id);
    if (!shareable(item)) return { status: 409, body: { ok: false, error: "not shareable" } };
    if (item.approval === "approved") return { status: 200, body: { ok: true } };
    const changed = await deps.store.approve(tok.clinicId, tok.week, item.id);
    if (changed) deps.onApproved?.(tok.clinicId);
    return changed ? { status: 200, body: { ok: true } } : { status: 409, body: { ok: false, error: "not pending" } };
  }
  const r = await deps.store.posted(tok.clinicId, tok.week, id, body.on !== false);
  if (r === "none") return { status: 409, body: { ok: false, error: "not approved" } };
  return { status: 200, body: { ok: true, stored: r === "ok" } };
}

export { APPROVE_TTL_DAYS };

/* ------------------------------------------------------------------ store */

type Db = import("@supabase/supabase-js").SupabaseClient;

export function supabasePostLinkStore(db: Db, bucket: string): PostLinkStore {
  return {
    async clinic(id) {
      const { data } = await db.from("dentvid_clinics").select("plan, profile").eq("id", id).maybeSingle();
      if (!data) return null;
      return { plan: String(data.plan), language: ((data.profile ?? {}) as { language?: string }).language ?? null };
    },
    async week(clinicId, week) {
      // "*": posted_at (0012) may not exist yet.
      const { data, error } = await db
        .from("dentvid_items")
        .select("*")
        .eq("clinic_id", clinicId)
        .eq("week_of", week)
        .eq("kind", "generated")
        .order("created_at", { ascending: true })
        .limit(30);
      if (error) throw new Error(error.message);
      return (data ?? []) as PostItem[];
    },
    async approve(clinicId, week, id) {
      const { data, error } = await db
        .from("dentvid_items")
        .update({ approval: "approved", updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("clinic_id", clinicId)
        .eq("week_of", week)
        .eq("kind", "generated")
        .eq("status", "ready")
        .eq("approval", "pending")
        .select("id");
      if (error) throw new Error(error.message);
      return (data ?? []).length > 0;
    },
    async posted(clinicId, week, id, on) {
      const { data, error } = await db
        .from("dentvid_items")
        .update({ posted_at: on ? new Date().toISOString() : null })
        .eq("id", id)
        .eq("clinic_id", clinicId)
        .eq("week_of", week)
        .eq("approval", "approved")
        .select("id");
      if (error) {
        if (isMissingColumn(error, "posted_at")) return "missing";
        throw new Error(error.message);
      }
      return (data ?? []).length > 0 ? "ok" : "none";
    },
    async signed(paths, ttlS) {
      const out = new Map<string, string>();
      if (!paths.length) return out;
      const { data } = await db.storage.from(bucket).createSignedUrls(paths, ttlS);
      for (const s of data ?? []) if (s.path && s.signedUrl) out.set(s.path, s.signedUrl);
      return out;
    },
  };
}
