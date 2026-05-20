import { logger } from "../logger.js";
import { supabase } from "../supabase.js";
import type { PublisherAccount as SocialAccount, PublisherClip as Clip } from "../types/social.js";

const FB_API = "https://graph.facebook.com/v20.0";

/**
 * Publish a clip to Instagram Reels via the Instagram Graph API (creator/business accounts only).
 *
 * Flow:
 *  1. Create a media container with video_url + media_type=REELS
 *  2. Poll container status until FINISHED
 *  3. Publish the container
 *
 * Docs: https://developers.facebook.com/docs/instagram-platform/reels-api
 */
export async function postToInstagram(
  account: SocialAccount,
  clip: Clip,
): Promise<{ externalPostId: string; externalUrl: string }> {
  const { data: signed, error: signErr } = await supabase.storage
    .from("clipforge-videos-rendered")
    .createSignedUrl(clip.storage_path, 3600);
  if (signErr || !signed) throw new Error(signErr?.message ?? "could not sign video url");

  const captionParts = [clip.hook, clip.caption].filter(Boolean) as string[];
  const tags = (clip.hashtags ?? []).map((t) => `#${t.replace(/^#/, "")}`).slice(0, 10);
  const caption = `${captionParts.join("\n\n")}\n\n${tags.join(" ")}`.slice(0, 2200);

  // Move the access token out of the URL — IG Graph API accepts it as a
  // Bearer header, which keeps it out of reverse-proxy access logs, Sentry
  // breadcrumbs (URL gets captured), and worker process listings (ps auxf).
  const authHeaders = {
    "Content-Type": "application/x-www-form-urlencoded",
    Authorization: `Bearer ${account.access_token}`,
  };

  // 1) Create container
  const createRes = await fetch(`${FB_API}/${account.external_user_id}/media`, {
    method: "POST",
    headers: authHeaders,
    body: new URLSearchParams({
      media_type: "REELS",
      video_url: signed.signedUrl,
      caption,
      share_to_feed: "true",
    }),
  });
  const created = (await createRes.json()) as { id?: string; error?: { message: string } };
  if (!createRes.ok || !created.id) {
    throw new Error(`IG container create failed: ${created.error?.message ?? createRes.status}`);
  }
  const containerId = created.id;
  logger.info({ clip: clip.id, containerId }, "ig container created");

  // 2) Poll until container is FINISHED (~30s typical)
  const start = Date.now();
  while (Date.now() - start < 120_000) {
    await new Promise((r) => setTimeout(r, 4000));
    const statusRes = await fetch(`${FB_API}/${containerId}?fields=status_code,status`, {
      headers: { Authorization: `Bearer ${account.access_token}` },
    });
    const sj = (await statusRes.json()) as { status_code?: string; status?: string };
    if (sj.status_code === "FINISHED") break;
    if (sj.status_code === "ERROR" || sj.status_code === "EXPIRED") {
      throw new Error(`IG container ${sj.status_code}: ${sj.status}`);
    }
  }

  // 3) Publish
  const pubRes = await fetch(`${FB_API}/${account.external_user_id}/media_publish`, {
    method: "POST",
    headers: authHeaders,
    body: new URLSearchParams({ creation_id: containerId }),
  });
  const pub = (await pubRes.json()) as { id?: string; error?: { message: string } };
  if (!pubRes.ok || !pub.id) {
    throw new Error(`IG publish failed: ${pub.error?.message ?? pubRes.status}`);
  }

  return {
    externalPostId: pub.id,
    externalUrl: `https://www.instagram.com/reel/${pub.id}/`,
  };
}
