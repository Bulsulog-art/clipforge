import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/content/dentvideo-locales";
import { asLocale } from "./locale";

/**
 * The DentVideo iPhone app's "your week is ready" push (APNs, token auth).
 *
 * Sent by the worker's ready notice (api/internal/dentvideo/notify), the same moment and the same
 * clinic morning hour as the "ready" email, to the owner's devices that keep the push on
 * (dentvid_devices.ready_push, migration 0023). Tokens APNs reports as gone are deleted.
 *
 * Env (owner, never committed): APNS_KEY_ID, APNS_TEAM_ID, APNS_KEY_P8 (the team's APNs auth key,
 * shared with ClipForge's worker) and DENTVID_APNS_BUNDLE_ID (default com.bulsulabs.dentvideo).
 * Without them nothing is sent and the email still goes.
 */

export const DENTVID_BUNDLE_ID = "com.bulsulabs.dentvideo";

export type ReadyKind = "week" | "recording";
export type Counts = { ready: number; flagged: number };

type Text = { weekTitle: string; weekBody: string; weekBodyLook: string; recTitle: string; recBody: string };

/** Calm, factual, in the clinic's language. {n} = videos ready, {f} = videos that need a look. */
const TEXT: Record<Locale, Text> = {
  en: {
    weekTitle: "Your week is ready",
    weekBody: "{n} videos are ready for your review.",
    weekBodyLook: "{n} videos are ready for your review, {f} need a quick look.",
    recTitle: "Your recording is ready",
    recBody: "Your clip is edited and ready for your review.",
  },
  de: {
    weekTitle: "Ihre Woche ist fertig",
    weekBody: "{n} Videos warten auf Ihre Freigabe.",
    weekBodyLook: "{n} Videos warten auf Ihre Freigabe, {f} bitte kurz ansehen.",
    recTitle: "Ihre Aufnahme ist fertig",
    recBody: "Ihr Clip ist geschnitten und wartet auf Ihre Freigabe.",
  },
  es: {
    weekTitle: "Tu semana está lista",
    weekBody: "{n} vídeos esperan tu revisión.",
    weekBodyLook: "{n} vídeos esperan tu revisión; {f} necesitan un vistazo.",
    recTitle: "Tu grabación está lista",
    recBody: "Tu clip está editado y espera tu revisión.",
  },
  tr: {
    weekTitle: "Haftanız hazır",
    weekBody: "{n} video onayınızı bekliyor.",
    weekBodyLook: "{n} video onayınızı bekliyor, {f} tanesine kısaca bakmanız gerekiyor.",
    recTitle: "Kaydınız hazır",
    recBody: "Klibiniz düzenlendi ve onayınızı bekliyor.",
  },
  fr: {
    weekTitle: "Votre semaine est prête",
    weekBody: "{n} vidéos attendent votre validation.",
    weekBodyLook: "{n} vidéos attendent votre validation, {f} à vérifier rapidement.",
    recTitle: "Votre enregistrement est prêt",
    recBody: "Votre clip est monté et attend votre validation.",
  },
  ja: {
    weekTitle: "今週の動画ができました",
    weekBody: "{n}本の動画が確認を待っています。",
    weekBodyLook: "{n}本の動画が確認を待っています。うち{f}本は内容のご確認をお願いします。",
    recTitle: "撮影した動画ができました",
    recBody: "動画の編集が終わり、確認を待っています。",
  },
  ar: {
    weekTitle: "أسبوعك جاهز",
    weekBody: "{n} فيديوهات بانتظار مراجعتك.",
    weekBodyLook: "{n} فيديوهات بانتظار مراجعتك، و{f} منها تحتاج إلى نظرة سريعة.",
    recTitle: "تسجيلك جاهز",
    recBody: "تم تحرير مقطعك وهو بانتظار مراجعتك.",
  },
  pl: {
    weekTitle: "Twój tydzień jest gotowy",
    weekBody: "Filmy gotowe do akceptacji: {n}.",
    weekBodyLook: "Filmy gotowe do akceptacji: {n}, w tym do szybkiego sprawdzenia: {f}.",
    recTitle: "Twoje nagranie jest gotowe",
    recBody: "Klip jest zmontowany i czeka na Twoją akceptację.",
  },
};

export const PUSH_TEXT = TEXT;

/** The alert for a ready notice, in the clinic's language (English for Italian / Portuguese clinics, as the app). */
export function pushText(language: string | null | undefined, kind: ReadyKind, counts: Counts): { title: string; body: string } {
  const t = TEXT[asLocale(language) ?? "en"];
  if (kind === "recording") return { title: t.recTitle, body: t.recBody };
  const n = counts.ready + counts.flagged;
  const body = (counts.flagged > 0 ? t.weekBodyLook : t.weekBody).replace("{n}", String(n)).replace("{f}", String(counts.flagged));
  return { title: t.weekTitle, body };
}

/** The JSON APNs receives. `kind` tells the app which screen to open; no badge (it would go stale). */
export function apnsBody(alert: { title: string; body: string }, kind: ReadyKind): string {
  return JSON.stringify({ aps: { alert, sound: "default", "thread-id": "dentvideo-week" }, kind: kind === "week" ? "week_ready" : "recording_ready" });
}

export type ApnsConfig = { keyId: string; teamId: string; key: string; topic: string };

export function apnsConfig(env: Record<string, string | undefined> = process.env): ApnsConfig | null {
  const keyId = env.APNS_KEY_ID?.trim();
  const teamId = env.APNS_TEAM_ID?.trim();
  const key = env.APNS_KEY_P8?.replace(/\\n/g, "\n").trim();
  if (!keyId || !teamId || !key) return null;
  return { keyId, teamId, key, topic: env.DENTVID_APNS_BUNDLE_ID?.trim() || DENTVID_BUNDLE_ID };
}

const b64url = (b: Buffer | string) => (typeof b === "string" ? Buffer.from(b) : b).toString("base64url");

/** The provider token (ES256 JWT). APNs accepts one for up to an hour; a new one per notice is fine. */
export function apnsJwt(cfg: Pick<ApnsConfig, "keyId" | "teamId" | "key">, now = new Date()): string {
  const head = b64url(JSON.stringify({ alg: "ES256", kid: cfg.keyId }));
  const claims = b64url(JSON.stringify({ iss: cfg.teamId, iat: Math.floor(now.getTime() / 1000) }));
  const sig = crypto.createSign("SHA256").update(`${head}.${claims}`).sign({ key: cfg.key, dsaEncoding: "ieee-p1363" });
  return `${head}.${claims}.${b64url(sig)}`;
}

export type ApnsResult = { status: number; reason?: string };
export type ApnsSend = (args: { host: string; token: string; jwt: string; topic: string; body: string }) => Promise<ApnsResult>;

export const APNS_HOSTS = { production: "api.push.apple.com", development: "api.sandbox.push.apple.com" } as const;

/** One notification over HTTP/2 (the only protocol APNs speaks). */
export const http2Send: ApnsSend = async ({ host, token, jwt, topic, body }) => {
  const http2 = await import("node:http2");
  return new Promise<ApnsResult>((resolve, reject) => {
    const client = http2.connect(`https://${host}`);
    client.on("error", (e) => reject(e));
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      "apns-topic": topic,
      "apns-push-type": "alert",
      "apns-priority": "10",
      authorization: `bearer ${jwt}`,
      "content-type": "application/json",
    });
    let status = 0;
    let data = "";
    req.setTimeout(10_000, () => req.close());
    req.on("response", (h) => (status = Number(h[":status"] ?? 0)));
    req.on("data", (c: Buffer) => (data += c.toString()));
    req.on("error", (e) => {
      client.close();
      reject(e);
    });
    req.on("end", () => {
      client.close();
      let reason: string | undefined;
      try {
        reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
      } catch {
        reason = undefined;
      }
      resolve({ status, reason });
    });
    req.end(body);
  });
};

/** APNs says this token will never work again: delete it. */
export function isDeadToken(r: ApnsResult): boolean {
  return r.status === 410 || (r.status === 400 && (r.reason === "BadDeviceToken" || r.reason === "DeviceTokenNotForTopic"));
}

export type PushOutcome = { sent: number; failed: number; removed: number; reason?: "not configured" | "no clinic" | "no devices" | "nothing ready" };

type DeviceRow = { token: string; environment: "production" | "development" };

/** A Postgres / PostgREST error that only means "table not there yet" (0023 not applied). */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  return !!error && (error.code === "42P01" || error.code === "PGRST205" || /dentvid_devices/.test(error.message ?? ""));
}

/**
 * Push the ready notice to the clinic owner's devices. Never throws: a failed push must not undo
 * the email or make the worker retry the notice.
 */
export async function sendReadyPush(
  admin: SupabaseClient,
  clinicId: string,
  kind: ReadyKind,
  counts: Counts,
  deps: { send?: ApnsSend; env?: Record<string, string | undefined>; now?: Date } = {},
): Promise<PushOutcome> {
  const out: PushOutcome = { sent: 0, failed: 0, removed: 0 };
  try {
    const cfg = apnsConfig(deps.env);
    if (!cfg) return { ...out, reason: "not configured" };
    if (counts.ready + counts.flagged <= 0) return { ...out, reason: "nothing ready" };
    const { data: clinic } = await admin.from("dentvid_clinics").select("owner_id, profile").eq("id", clinicId).maybeSingle();
    const ownerId = (clinic as { owner_id?: string } | null)?.owner_id;
    if (!ownerId) return { ...out, reason: "no clinic" };
    const { data: rows, error } = await admin.from("dentvid_devices").select("token, environment").eq("owner_id", ownerId).eq("ready_push", true).limit(20);
    if (error && !isMissingTable(error)) console.warn("[dentvideo push] devices not readable", error.message);
    const devices = (rows ?? []) as DeviceRow[];
    if (!devices.length) return { ...out, reason: "no devices" };

    const language = ((clinic as { profile?: { language?: string } }).profile ?? {}).language;
    const body = apnsBody(pushText(language, kind, counts), kind);
    const jwt = apnsJwt(cfg, deps.now);
    const send = deps.send ?? http2Send;
    const dead: string[] = [];
    for (const d of devices) {
      try {
        const r = await send({ host: APNS_HOSTS[d.environment] ?? APNS_HOSTS.production, token: d.token, jwt, topic: cfg.topic, body });
        if (r.status >= 200 && r.status < 300) out.sent++;
        else {
          out.failed++;
          if (isDeadToken(r)) dead.push(d.token);
          else console.warn("[dentvideo push] apns refused", r.status, r.reason);
        }
      } catch (e) {
        out.failed++;
        console.warn("[dentvideo push] apns unreachable", (e as Error).message);
      }
    }
    if (dead.length) {
      const { error: rmErr } = await admin.from("dentvid_devices").delete().eq("owner_id", ownerId).in("token", dead);
      if (!rmErr) out.removed = dead.length;
    }
    return out;
  } catch (e) {
    console.warn("[dentvideo push] skipped", (e as Error).message);
    return out;
  }
}
