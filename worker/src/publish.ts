import { logger } from "./logger.js";
import { supabase } from "./supabase.js";

type Payload = { publishId: string; userId: string; clipId: string; platform: string };

export async function runPublish(p: Payload) {
  logger.info({ p }, "publishing");
  await supabase.from("publishes").update({ status: "publishing" }).eq("id", p.publishId);

  // platform-specific dispatchers
  try {
    const { data: clip } = await supabase.from("clips").select("*").eq("id", p.clipId).single();
    const { data: account } = await supabase
      .from("social_accounts")
      .select("*")
      .eq("user_id", p.userId)
      .eq("platform", p.platform)
      .single();
    if (!clip || !account) throw new Error("missing clip or social account");

    switch (p.platform) {
      case "tiktok":
        await postToTikTok(account, clip);
        break;
      case "instagram":
        await postToInstagram(account, clip);
        break;
      case "youtube":
        await postToYouTubeShorts(account, clip);
        break;
      default:
        throw new Error(`platform ${p.platform} not implemented`);
    }

    await supabase
      .from("publishes")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", p.publishId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase.from("publishes").update({ status: "failed", error_message: msg }).eq("id", p.publishId);
    throw e;
  }
}

async function postToTikTok(_account: any, _clip: any) {
  // TODO: implement TikTok Content Posting API (initiated upload)
  logger.warn("TikTok publisher stub");
}
async function postToInstagram(_account: any, _clip: any) {
  // TODO: Instagram Graph API (Reels publish flow)
  logger.warn("Instagram publisher stub");
}
async function postToYouTubeShorts(_account: any, _clip: any) {
  // TODO: YouTube Data API resumable upload
  logger.warn("YouTube publisher stub");
}
