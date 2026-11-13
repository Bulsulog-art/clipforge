import { createHmac, timingSafeEqual } from "node:crypto";
import { lifecycleText } from "@/content/dentvideo-lifecycle";
import { COLORS, FONT, esc } from "./email-layout";

/**
 * "Approve all in one tap" from the "your week is ready" email, no login.
 *
 *   Token   "<clinic uuid>.<week YYYY-MM-DD>.<expiry, unix s>.<hmac>": HMAC-
 *           SHA256 under the unsubscribe secret with its own purpose tag
 *           ("dv-approve:v1"), so an unsubscribe token can never approve and
 *           vice versa. Valid for APPROVE_TTL_DAYS — a forwarded or old email
 *           stops working after that.
 *   GET     shows the week's ready videos and one "Approve" button. It
 *           changes nothing, so a mail scanner that opens every link cannot
 *           approve anything (same rule as RFC 8058 unsubscribe).
 *   POST    the button: approves this clinic's videos of that week that are
 *           "ready" and still "pending". Never a flagged video (those need
 *           the dentist's look in the app), never another week, never another
 *           clinic, never a paused or cancelled clinic.
 *
 * Approving only marks videos publishable; nothing is posted anywhere.
 */
export const APPROVE_TTL_DAYS = 10;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const WEEK = /^\d{4}-\d{2}-\d{2}$/;
const SIG_LEN = 32;

const sign = (payload: string, secret: string) => createHmac("sha256", secret).update(`dv-approve:v1:${payload}`).digest("base64url").slice(0, SIG_LEN);

export function approveToken(clinicId: string, week: string, secret: string, now = new Date()): string {
  const id = clinicId.toLowerCase();
  if (!UUID.test(id) || !WEEK.test(week)) throw new Error("approve token: bad clinic id or week");
  const exp = Math.floor(now.getTime() / 1000) + APPROVE_TTL_DAYS * 86_400;
  const payload = `${id}.${week}.${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyApproveToken(token: string | null | undefined, secret: string | null, now = new Date()): { clinicId: string; week: string } | null {
  if (!token || !secret) return null;
  const parts = token.trim().split(".");
  if (parts.length !== 4) return null;
  const [id, week, exp, sig] = parts;
  if (!UUID.test(id) || !WEEK.test(week) || !/^\d{9,11}$/.test(exp) || sig.length !== SIG_LEN) return null;
  const want = Buffer.from(sign(`${id}.${week}.${exp}`, secret));
  const got = Buffer.from(sig);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  if (Number(exp) * 1000 < now.getTime()) return null;
  return { clinicId: id, week };
}

export function approveUrl(apiOrigin: string, clinicId: string, week: string, secret: string, now = new Date()): string {
  return `${apiOrigin}/api/dentvideo/approve?t=${encodeURIComponent(approveToken(clinicId, week, secret, now))}`;
}

/* ------------------------------------------------------------------ handler */

export type ApproveItem = { id: string; title: string };

export interface ApproveStore {
  clinic(id: string): Promise<{ plan: string; language: string | null } | null>;
  /** This clinic's videos of `week` with status "ready" and approval "pending". */
  pending(clinicId: string, week: string): Promise<ApproveItem[]>;
  /** Approves exactly those ids (re-checking clinic, week, status and approval); returns how many changed. */
  approve(clinicId: string, week: string, ids: string[]): Promise<number>;
}

export type ApproveState = "confirm" | "done" | "nothing" | "invalid" | "error";
export type ApproveResponse = { status: number; body: string };

export async function handleApprove(
  req: { method: "GET" | "POST"; url: string; language?: string | null },
  deps: { store: () => ApproveStore; secret: string | null; appUrl: string; now?: () => Date; onApproved?: (clinicId: string, n: number) => void },
): Promise<ApproveResponse> {
  const url = new URL(req.url);
  const v = verifyApproveToken(url.searchParams.get("t"), deps.secret, deps.now?.() ?? new Date());
  const page = (status: number, state: ApproveState, language: string | null | undefined, items: ApproveItem[] = [], n = 0) => ({
    status,
    body: approvePage({ language: language ?? "en", state, items, count: n, appUrl: deps.appUrl, action: `${url.pathname}${url.search}` }),
  });
  if (!v) return page(400, "invalid", req.language);
  let language = req.language;
  try {
    const store = deps.store();
    const clinic = await store.clinic(v.clinicId);
    language = clinic?.language ?? language;
    if (!clinic || clinic.plan !== "active") return page(200, "nothing", language);
    const items = await store.pending(v.clinicId, v.week);
    if (!items.length) return page(200, "nothing", language);
    if (req.method === "GET") return page(200, "confirm", language, items, items.length);
    const n = await store.approve(v.clinicId, v.week, items.map((i) => i.id));
    if (n > 0) deps.onApproved?.(v.clinicId, n);
    return page(200, n > 0 ? "done" : "nothing", language, [], n);
  } catch (e) {
    console.error("[dentvideo] approve link failed", (e as Error).message);
    return page(503, "error", language);
  }
}

/** The page the approve link opens, in the clinic's language. */
export function approvePage(args: { language: string; state: ApproveState; items: ApproveItem[]; count: number; appUrl: string; action: string }): string {
  const { lang, copy } = lifecycleText(args.language);
  const p = copy.approvePage;
  const [title, body] =
    args.state === "confirm"
      ? [p.confirmTitle, p.confirmBody]
      : args.state === "done"
        ? [p.doneTitle, p.doneBody]
        : args.state === "nothing"
          ? [p.nothingTitle, p.nothingBody]
          : args.state === "invalid"
            ? [p.invalidTitle, p.invalidBody.replace("{days}", String(APPROVE_TTL_DAYS))]
            : [p.errorTitle, p.errorBody];
  const rtl = lang === "ar";
  const btn = `display:inline-block;padding:14px 26px;border-radius:10px;font-family:${FONT};font-size:16px;font-weight:600;text-decoration:none`;
  const list = args.state === "confirm" ? `<ul style="margin:0 0 20px;padding-${rtl ? "right" : "left"}:20px;font-size:15px;line-height:24px">${args.items.map((i) => `<li>${esc(i.title)}</li>`).join("")}</ul>` : "";
  const actions =
    args.state === "confirm"
      ? `<form method="post" action="${esc(args.action)}" style="margin:0 0 14px"><button type="submit" style="${btn};border:0;cursor:pointer;background:${COLORS.teal};color:#fff">${esc(p.confirmButton)}</button></form><a href="${esc(args.appUrl)}" style="color:${COLORS.teal};font-size:15px">${esc(p.watchFirst)}</a>`
      : `<a href="${esc(args.appUrl)}" style="${btn};background:${COLORS.teal};color:#fff">${esc(p.open)}</a>`;
  return `<!doctype html>
<html lang="${lang}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><meta name="color-scheme" content="light"><title>${esc(title)} · DentVideo</title></head>
<body style="margin:0;background:${COLORS.paper};font-family:${FONT};color:${COLORS.ink}">
<main style="max-width:560px;margin:0 auto;padding:40px 16px">
<p style="margin:0 0 16px;font-size:20px;font-weight:700"><span dir="ltr">Dent<span style="color:${COLORS.teal}">Video</span></span></p>
<div style="background:#fff;border:1px solid ${COLORS.line};border-top:4px solid ${COLORS.teal};border-radius:16px;padding:28px">
<h1 style="margin:0 0 12px;font-size:22px;line-height:30px">${esc(title)}</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:24px;color:${COLORS.body}">${esc(body)}</p>
${list}${actions}
</div></main></body></html>`;
}

/* ------------------------------------------------------------------ store */

type Db = import("@supabase/supabase-js").SupabaseClient;

export function supabaseApproveStore(db: Db): ApproveStore {
  return {
    async clinic(id) {
      const { data } = await db.from("dentvid_clinics").select("plan, profile").eq("id", id).maybeSingle();
      if (!data) return null;
      return { plan: String(data.plan), language: ((data.profile ?? {}) as { language?: string }).language ?? null };
    },
    async pending(clinicId, week) {
      const { data, error } = await db
        .from("dentvid_items")
        .select("id, title")
        .eq("clinic_id", clinicId)
        .eq("week_of", week)
        .eq("kind", "generated")
        .eq("status", "ready")
        .eq("approval", "pending")
        .order("created_at", { ascending: true })
        .limit(30);
      if (error) throw new Error(error.message);
      return ((data ?? []) as { id: string; title: string | null }[]).map((r) => ({ id: r.id, title: r.title ?? "" }));
    },
    async approve(clinicId, week, ids) {
      if (!ids.length) return 0;
      const { data, error } = await db
        .from("dentvid_items")
        .update({ approval: "approved", updated_at: new Date().toISOString() })
        .in("id", ids)
        .eq("clinic_id", clinicId)
        .eq("week_of", week)
        .eq("status", "ready")
        .eq("approval", "pending")
        .select("id");
      if (error) throw new Error(error.message);
      return (data ?? []).length;
    },
  };
}
