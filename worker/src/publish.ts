import { logger } from "./logger.js";
import { supabase } from "./supabase.js";
import { postToTikTok } from "./publishers/tiktok.js";
import { postToInstagram } from "./publishers/instagram.js";
import { postToYouTubeShorts } from "./publishers/youtube.js";
import { postToX } from "./publishers/x.js";
import { decryptToken } from "./lib/encryption.js";
import type { PublisherAccount, PublisherClip } from "./types/social.js";

type Payload = { publishId: string; userId: string; clipId: string; platform: string };

export async function runPublish(p: Payload) {
  logger.info({ p }, "publishing");
  await supabase.from("publishes").update({ status: "publishing" }).eq("id", p.publishId);

  try {
    const [{ data: clipRow }, { data: accountRow }] = await Promise.all([
      supabase.from("clips").select("*").eq("id", p.clipId).single(),
      supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", p.userId)
        .eq("platform", p.platform)
        .single(),
    ]);
    if (!clipRow || !accountRow) throw new Error("missing clip or social account");

    const clip = clipRow as PublisherClip;
    // OAuth tokens were encrypted at rest by the TikTok/IG/YT callback; decrypt
    // them just before use. decryptToken is a no-op for legacy plaintext rows
    // so we don't have to flush the table when this rolls out.
    const account: PublisherAccount = {
      ...(accountRow as PublisherAccount),
      access_token: decryptToken((accountRow as PublisherAccount).access_token),
      refresh_token: (accountRow as PublisherAccount).refresh_token
        ? decryptToken((accountRow as PublisherAccount).refresh_token as string)
        : null,
    };

    let result: { externalPostId: string; externalUrl: string };
    switch (p.platform) {
      case "tiktok":
        result = await postToTikTok(account, clip);
        break;
      case "instagram":
        result = await postToInstagram(account, clip);
        break;
      case "youtube":
        result = await postToYouTubeShorts(account, clip);
        break;
      case "x":
        result = await postToX(account, clip);
        break;
      default:
        throw new Error(`platform ${p.platform} not implemented`);
    }

    await supabase
      .from("publishes")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        external_post_id: result.externalPostId,
        external_url: result.externalUrl,
      })
      .eq("id", p.publishId);

    logger.info({ publishId: p.publishId, externalUrl: result.externalUrl }, "publish ok");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    logger.error({ publishId: p.publishId, error: msg }, "publish failed");
    await supabase
      .from("publishes")
      .update({ status: "failed", error_message: msg })
      .eq("id", p.publishId);
    throw e;
  }
}
