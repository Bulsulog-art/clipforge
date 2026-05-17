import { logger } from "../logger.js";
import { supabase } from "../supabase.js";

type SocialAccount = {
  id: string;
  user_id: string;
  external_user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  meta: { open_id?: string } | null;
};

type Clip = {
  id: string;
  user_id: string;
  storage_path: string;
  hook: string | null;
  caption: string | null;
  hashtags: string[] | null;
};

const TIKTOK_API = "https://open.tiktokapis.com/v2";

/**
 * Publish a clip to TikTok using the Content Posting API (PULL_FROM_URL flow).
 *
 * Prerequisites:
 *  - TikTok Developer app with `video.publish` scope
 *  - User has OAuth-connected their TikTok account (handled by /auth/tiktok routes)
 *  - The rendered MP4 is publicly downloadable via a signed Supabase URL
 *
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post-v2
 */
export async function postToTikTok(
  account: SocialAccount,
  clip: Clip,
): Promise<{ externalPostId: string; externalUrl: string }> {
  await ensureFreshToken(account);

  // 1) Get signed download URL for the rendered video
  const { data: signed, error: signErr } = await supabase.storage
    .from("clipforge-videos-rendered")
    .createSignedUrl(clip.storage_path, 3600);
  if (signErr || !signed) throw new Error(signErr?.message ?? "could not sign video url");

  // 2) Caption: hook + caption + hashtags
  const titleParts = [clip.hook, clip.caption].filter(Boolean) as string[];
  const tags = (clip.hashtags ?? []).map((t) => `#${t.replace(/^#/, "")}`).slice(0, 5);
  const title = `${titleParts.join(" — ")} ${tags.join(" ")}`.slice(0, 2200);

  // 3) Init upload (PULL_FROM_URL means TikTok fetches the MP4 from our signed URL)
  const initRes = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${account.access_token}`,
      "Content-Type": "application/json; charset=UTF-8",
    },
    body: JSON.stringify({
      post_info: {
        title,
        privacy_level: "MUTUAL_FOLLOW_FRIENDS", // start safe; user can toggle PUBLIC_TO_EVERYONE in profile
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1500,
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: signed.signedUrl,
      },
    }),
  });
  const initJson = (await initRes.json()) as TikTokInitResponse;
  if (!initRes.ok || initJson.error?.code !== "ok") {
    throw new Error(`TikTok init failed: ${initJson.error?.code} ${initJson.error?.message}`);
  }
  const publishId = initJson.data.publish_id;
  logger.info({ clip: clip.id, publishId }, "tiktok upload initiated");

  // 4) Poll publish status (max 90s)
  const start = Date.now();
  while (Date.now() - start < 90_000) {
    await new Promise((r) => setTimeout(r, 3000));
    const statusRes = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({ publish_id: publishId }),
    });
    const statusJson = (await statusRes.json()) as TikTokStatusResponse;
    const s = statusJson.data?.status;
    logger.debug({ clip: clip.id, publishId, status: s }, "tiktok status");

    if (s === "PUBLISH_COMPLETE") {
      const externalId = statusJson.data?.publicly_available_post_id?.[0] ?? publishId;
      const username = account.meta?.open_id ?? "tiktok";
      return {
        externalPostId: externalId,
        externalUrl: `https://www.tiktok.com/@${username}/video/${externalId}`,
      };
    }
    if (s === "FAILED" || s === "EXPIRED") {
      throw new Error(`TikTok publish failed: ${statusJson.data?.fail_reason ?? s}`);
    }
  }
  throw new Error("TikTok publish timed out after 90s");
}

async function ensureFreshToken(account: SocialAccount) {
  if (!account.expires_at) return;
  const expiresIn = new Date(account.expires_at).getTime() - Date.now();
  if (expiresIn > 5 * 60_000) return; // > 5 min, fine

  if (!account.refresh_token) throw new Error("TikTok token expired and no refresh_token");

  const refreshRes = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  const refreshed = (await refreshRes.json()) as TikTokTokenResponse;
  if (!refreshRes.ok || !refreshed.access_token) {
    throw new Error(`TikTok token refresh failed: ${refreshed.error}`);
  }

  account.access_token = refreshed.access_token;
  account.refresh_token = refreshed.refresh_token ?? account.refresh_token;
  account.expires_at = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await supabase
    .from("social_accounts")
    .update({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
      expires_at: account.expires_at,
    })
    .eq("id", account.id);
}

type TikTokInitResponse = {
  data: { publish_id: string };
  error: { code: string; message: string };
};
type TikTokStatusResponse = {
  data?: {
    status: "PROCESSING" | "PROCESSING_UPLOAD" | "PUBLISH_COMPLETE" | "FAILED" | "EXPIRED";
    publicly_available_post_id?: string[];
    fail_reason?: string;
  };
  error?: { code: string; message: string };
};
type TikTokTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  error?: string;
};
