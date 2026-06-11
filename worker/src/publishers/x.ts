import { logger } from "../logger.js";
import { supabase } from "../supabase.js";
import type { PublisherAccount as SocialAccount, PublisherClip as Clip } from "../types/social.js";

/**
 * Publish a clip to X (Twitter): v1.1 chunked media upload + v2 tweet create.
 *
 * ⚠️ NEEDS LIVE VERIFICATION. Requires an X developer app with OAuth 2.0
 *    user-context tokens carrying `tweet.write` + `media.write`. Video is still
 *    backed by the v1.1 media/upload endpoint; the tweet itself is v2. NOTE:
 *    the free API tier may not allow video uploads — confirm the plan before
 *    relying on this in production. Token refresh is not handled here yet, so
 *    the stored access_token must be valid at publish time.
 *
 * Docs: https://developer.x.com/en/docs/x-api/v1/media/upload-media
 *       https://developer.x.com/en/docs/x-api/tweets/manage-tweets/api-reference/post-tweets
 */
const UPLOAD = "https://upload.twitter.com/1.1/media/upload.json";
const CHUNK = 4 * 1024 * 1024; // 4 MB segments
const MAX_PROCESS_WAIT_SEC = 180;

export async function postToX(
  account: SocialAccount,
  clip: Clip,
): Promise<{ externalPostId: string; externalUrl: string }> {
  const token = account.access_token;
  if (!token) throw new Error("x: missing access token");
  const auth = { Authorization: `Bearer ${token}` };

  // 1) Fetch the rendered MP4 bytes (X wants the bytes, not a URL).
  const { data: signed, error: signErr } = await supabase.storage
    .from("clipforge-videos-rendered")
    .createSignedUrl(clip.storage_path, 3600);
  if (signErr || !signed) throw new Error(signErr?.message ?? "x: could not sign video url");
  const vidRes = await fetch(signed.signedUrl);
  if (!vidRes.ok) throw new Error(`x: video fetch ${vidRes.status}`);
  const bytes = new Uint8Array(await vidRes.arrayBuffer());

  // 2) INIT
  const initRes = await fetch(
    `${UPLOAD}?command=INIT&media_type=video%2Fmp4&media_category=tweet_video&total_bytes=${bytes.length}`,
    { method: "POST", headers: auth },
  );
  if (!initRes.ok) throw new Error(`x: media INIT ${initRes.status}`);
  const mediaId = ((await initRes.json()) as { media_id_string: string }).media_id_string;

  // 3) APPEND in chunks
  let seg = 0;
  for (let off = 0; off < bytes.length; off += CHUNK) {
    const chunk = bytes.subarray(off, Math.min(off + CHUNK, bytes.length));
    const form = new FormData();
    form.append("command", "APPEND");
    form.append("media_id", mediaId);
    form.append("segment_index", String(seg));
    form.append("media", new Blob([chunk]));
    const apRes = await fetch(UPLOAD, { method: "POST", headers: auth, body: form });
    if (!apRes.ok) throw new Error(`x: media APPEND seg ${seg} ${apRes.status}`);
    seg++;
  }

  // 4) FINALIZE
  const finRes = await fetch(`${UPLOAD}?command=FINALIZE&media_id=${mediaId}`, { method: "POST", headers: auth });
  if (!finRes.ok) throw new Error(`x: media FINALIZE ${finRes.status}`);
  let info = (await finRes.json()) as { processing_info?: { state: string; check_after_secs?: number } };

  // 5) Poll STATUS until the video finishes transcoding.
  let waited = 0;
  while (info.processing_info && info.processing_info.state !== "succeeded") {
    if (info.processing_info.state === "failed") throw new Error("x: media processing failed");
    const wait = Math.min(info.processing_info.check_after_secs ?? 3, 10);
    await new Promise((r) => setTimeout(r, wait * 1000));
    waited += wait;
    if (waited > MAX_PROCESS_WAIT_SEC) throw new Error("x: media processing timeout");
    const stRes = await fetch(`${UPLOAD}?command=STATUS&media_id=${mediaId}`, { headers: auth });
    if (!stRes.ok) throw new Error(`x: media STATUS ${stRes.status}`);
    info = (await stRes.json()) as typeof info;
  }

  // 6) Create the tweet (v2)
  const tweetRes = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { ...auth, "Content-Type": "application/json" },
    body: JSON.stringify({ text: buildText(clip), media: { media_ids: [mediaId] } }),
  });
  if (!tweetRes.ok) throw new Error(`x: tweet create ${tweetRes.status} ${(await tweetRes.text()).slice(0, 200)}`);
  const tweet = ((await tweetRes.json()) as { data: { id: string } }).data;

  logger.info({ tweetId: tweet.id }, "x publish ok");
  // /i/web/status works without knowing the @handle.
  return { externalPostId: tweet.id, externalUrl: `https://x.com/i/web/status/${tweet.id}` };
}

function buildText(clip: Clip): string {
  const tags = (clip.hashtags ?? [])
    .slice(0, 3)
    .map((t) => `#${t.replace(/^#/, "")}`)
    .join(" ");
  return [clip.hook ?? clip.caption ?? "", tags].filter(Boolean).join("\n\n").slice(0, 280);
}
