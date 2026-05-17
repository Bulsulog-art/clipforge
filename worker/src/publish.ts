import { logger } from "./logger.js";
import { supabase } from "./supabase.js";
import { postToTikTok } from "./publishers/tiktok.js";
import { postToInstagram } from "./publishers/instagram.js";
import { postToYouTubeShorts } from "./publishers/youtube.js";

type Payload = { publishId: string; userId: string; clipId: string; platform: string };

export async function runPublish(p: Payload) {
  logger.info({ p }, "publishing");
  await supabase.from("publishes").update({ status: "publishing" }).eq("id", p.publishId);

  try {
    const [{ data: clip }, { data: account }] = await Promise.all([
      supabase.from("clips").select("*").eq("id", p.clipId).single(),
      supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", p.userId)
        .eq("platform", p.platform)
        .single(),
    ]);
    if (!clip || !account) throw new Error("missing clip or social account");

    let result: { externalPostId: string; externalUrl: string };
    switch (p.platform) {
      case "tiktok":
        result = await postToTikTok(account as any, clip as any);
        break;
      case "instagram":
        result = await postToInstagram(account as any, clip as any);
        break;
      case "youtube":
        result = await postToYouTubeShorts(account as any, clip as any);
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
