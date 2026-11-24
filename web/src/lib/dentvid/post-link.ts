import { approveToken, verifyApproveToken, APPROVE_TTL_DAYS } from "./approve-link";
import { storedCues, toSrt } from "./subtitles";
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
 *         {action:"shared", method} counts a share or download the page
 *         just made: the clinic's video_shared event, recorded here on the
 *         server with the token's clinic (the page sends no anonymous
 *         browser event), at most once per video.
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
  /** 0025: the narration's timed cues; absent before it, or on a video made before subtitles existed. */
  subtitles?: unknown;
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
  clinic(id: string): Promise<{ plan: string; language: string | null; country?: string | null } | null>;
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
      item: { id: string; title: string; videoUrl: string; thumbUrl?: string; approval: "pending" | "approved"; posted: boolean; texts: PostTexts | null; slot?: string; /** The narration as an SRT file (stored cues, 0025), for the share kit. */ srt?: string };
    };

/** The share kit's subtitle file for a video, when it has stored cues. */
function subtitlesOf(item: PostItem): { srt?: string } {
  const cues = storedCues(item.subtitles);
  return cues.length ? { srt: toSrt(cues) } : {};
}

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
  const slot = weekSchedule(items, tok.week, { country: clinic.country, locale }).get(item.id);
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
      ...subtitlesOf(item),
      slot: slot ? slotLabel(slot, locale) : undefined,
    },
  };
}

export type PostAction = { t?: unknown; v?: unknown; action?: unknown; on?: unknown; method?: unknown; device?: unknown };

/** How the page handed the video over: the phone's share sheet, or a download (events.ts video_shared). */
export type ShareMethodProp = "share" | "download";
const SHARE_METHODS: readonly string[] = ["share", "download"] satisfies ShareMethodProp[];
const DEVICES: readonly string[] = ["mobile", "tablet", "desktop"];

/** A share from the post page counts once per video, for this long (a week's link lives APPROVE_TTL_DAYS). */
export const SHARE_ONCE_TTL_S = 10 * 86_400;
export const shareOnceKey = (itemId: string) => `dv:shared:${itemId.toLowerCase()}`;

/**
 * Counting a share: `claim` takes the video's once-only key (Redis SET NX,
 * shareOnceKey), `record` stores the clinic's video_shared event and says
 * whether it was stored, `release` frees the key again when it was not, so a
 * later tap can still count.
 */
export type ShareCounter = {
  claim(itemId: string): Promise<boolean>;
  release(itemId: string): Promise<void>;
  record(e: { clinicId: string; method: ShareMethodProp; locale: Locale; device?: string }): Promise<boolean>;
};

export type PostActionResult = { status: number; body: { ok: boolean; stored?: boolean; error?: string } };

export async function handlePostAction(
  body: PostAction,
  deps: { store: PostLinkStore; secret: string | null; now?: Date; onApproved?: (clinicId: string) => void; shares?: ShareCounter },
): Promise<PostActionResult> {
  const tok = verifyApproveToken(typeof body.t === "string" ? body.t : null, deps.secret, deps.now ?? new Date());
  const id = typeof body.v === "string" ? body.v.toLowerCase() : "";
  if (!tok || !UUID.test(id)) return { status: 400, body: { ok: false, error: "invalid" } };
  if (body.action !== "approve" && body.action !== "posted" && body.action !== "shared") return { status: 400, body: { ok: false, error: "action" } };
  if (body.action === "shared" && !(typeof body.method === "string" && SHARE_METHODS.includes(body.method))) return { status: 400, body: { ok: false, error: "method" } };
  const clinic = await deps.store.clinic(tok.clinicId);
  if (!clinic || clinic.plan !== "active") return { status: 409, body: { ok: false, error: "inactive" } };
  if (body.action === "shared") {
    const items = await deps.store.week(tok.clinicId, tok.week);
    const item = items.find((i) => i.id.toLowerCase() === id);
    // The same rule as the page itself: only a video it would show could have been shared from it.
    if (!shareable(item)) return { status: 409, body: { ok: false, error: "not shareable" } };
    const device = typeof body.device === "string" && DEVICES.includes(body.device) ? body.device : undefined;
    const locale = asLocale(clinic.language ?? undefined) ?? "en";
    const stored = await countShare(deps.shares, item.id, { clinicId: tok.clinicId, method: body.method as ShareMethodProp, locale, device });
    return { status: 200, body: { ok: true, stored } };
  }
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

/** The clinic's video_shared event for this video, unless it was counted already. True when this call stored it. */
async function countShare(shares: ShareCounter | undefined, itemId: string, e: Parameters<ShareCounter["record"]>[0]): Promise<boolean> {
  if (!shares) return false;
  if (!(await shares.claim(itemId).catch(() => true))) return false;
  const stored = await shares.record(e).catch(() => false);
  if (!stored) await shares.release(itemId).catch(() => {});
  return stored;
}

export { APPROVE_TTL_DAYS };

/* ------------------------------------------------------------------ store */

type Db = import("@supabase/supabase-js").SupabaseClient;

export function supabasePostLinkStore(db: Db, bucket: string): PostLinkStore {
  return {
    async clinic(id) {
      const { data } = await db.from("dentvid_clinics").select("plan, profile").eq("id", id).maybeSingle();
      if (!data) return null;
      const profile = (data.profile ?? {}) as { language?: string; country?: string };
      return { plan: String(data.plan), language: profile.language ?? null, country: profile.country ?? null };
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
