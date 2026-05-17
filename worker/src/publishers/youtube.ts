import { logger } from "../logger.js";
import { supabase } from "../supabase.js";

type SocialAccount = {
  id: string;
  user_id: string;
  external_user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
};

type Clip = {
  id: string;
  user_id: string;
  storage_path: string;
  hook: string | null;
  caption: string | null;
  hashtags: string[] | null;
};

/**
 * Publish a clip to YouTube Shorts via the YouTube Data API v3 (resumable upload).
 *
 * Prerequisites:
 *  - Google Cloud project with YouTube Data API v3 enabled
 *  - OAuth client with scope `https://www.googleapis.com/auth/youtube.upload`
 *
 * Docs: https://developers.google.com/youtube/v3/docs/videos/insert
 */
export async function postToYouTubeShorts(
  account: SocialAccount,
  clip: Clip,
): Promise<{ externalPostId: string; externalUrl: string }> {
  await ensureFreshToken(account);

  const { data: signed, error: signErr } = await supabase.storage
    .from("clipforge-videos-rendered")
    .createSignedUrl(clip.storage_path, 3600);
  if (signErr || !signed) throw new Error(signErr?.message ?? "could not sign video url");

  const tagList = (clip.hashtags ?? []).slice(0, 5);
  const description = [
    clip.caption ?? "",
    "",
    tagList.map((t) => `#${t.replace(/^#/, "")}`).join(" "),
    "#Shorts",
  ]
    .join("\n")
    .trim();

  const meta = {
    snippet: {
      title: (clip.hook ?? clip.caption ?? "ClipForge clip").slice(0, 100),
      description,
      tags: tagList,
      categoryId: "22", // People & Blogs
    },
    status: { privacyStatus: "private", selfDeclaredMadeForKids: false },
  };

  // 1) Init resumable session
  const initRes = await fetch(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(meta),
    },
  );
  const uploadUrl = initRes.headers.get("location");
  if (!initRes.ok || !uploadUrl) {
    const body = await initRes.text();
    throw new Error(`YouTube init failed: ${initRes.status} ${body}`);
  }

  // 2) Download from Supabase, stream to YouTube
  const videoRes = await fetch(signed.signedUrl);
  if (!videoRes.ok || !videoRes.body) throw new Error("Failed to fetch rendered clip");
  const buffer = Buffer.from(await videoRes.arrayBuffer());

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": "video/mp4",
      "Content-Length": String(buffer.length),
    },
    body: buffer,
  });
  const uploadJson = (await uploadRes.json()) as { id?: string; error?: { message: string } };
  if (!uploadRes.ok || !uploadJson.id) {
    throw new Error(`YouTube upload failed: ${uploadJson.error?.message ?? uploadRes.status}`);
  }

  logger.info({ clip: clip.id, videoId: uploadJson.id }, "youtube shorts published");

  return {
    externalPostId: uploadJson.id,
    externalUrl: `https://www.youtube.com/shorts/${uploadJson.id}`,
  };
}

async function ensureFreshToken(account: SocialAccount) {
  if (!account.expires_at) return;
  const expiresIn = new Date(account.expires_at).getTime() - Date.now();
  if (expiresIn > 5 * 60_000) return;
  if (!account.refresh_token) throw new Error("YouTube token expired and no refresh_token");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.YOUTUBE_CLIENT_ID!,
      client_secret: process.env.YOUTUBE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  const j = (await res.json()) as { access_token: string; expires_in: number; error?: string };
  if (!res.ok) throw new Error(`YouTube token refresh failed: ${j.error}`);

  account.access_token = j.access_token;
  account.expires_at = new Date(Date.now() + j.expires_in * 1000).toISOString();

  await supabase
    .from("social_accounts")
    .update({ access_token: account.access_token, expires_at: account.expires_at })
    .eq("id", account.id);
}
