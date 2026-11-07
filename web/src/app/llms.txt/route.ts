import { SEO_PAGES } from "@/content/seo-pages";
import { absoluteUrl, PRICING, SITE_NAME } from "@/lib/site";

// llms.txt (https://llmstxt.org): a plain summary of the product for AI
// answer engines, built from the same facts as the pages so it cannot drift.
export const dynamic = "force-static";

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} turns one long video (podcast, interview, webinar, YouTube video) into up to 12 short vertical clips. It transcribes the audio, scores sentence-level moments for hook strength and whether they make sense on their own, cuts the best ones to 9:16 around the speaker's face, burns in word-by-word captions, and writes a hook and a thumbnail for each. Web app and iOS app.`,
    "",
    "## Facts",
    `- Free: first clip set free, no credit card; sources up to ${PRICING.free.sourceMinutes} minutes; watermark on clips.`,
    `- ${PRICING.weekly.label}: ${PRICING.weekly.price}/week, ${PRICING.weekly.credits} credits a week.`,
    `- ${PRICING.yearly.label}: ${PRICING.yearly.price}/year, ${PRICING.yearly.credits} credits a year.`,
    `- Plus: no watermark, sources up to ${PRICING.plus.sourceMinutes} minutes. 1 credit = 1 video processed into clips.`,
    `- Credit top-up for Plus members: ${PRICING.topup.credits} credits for ${PRICING.topup.price}.`,
    "- Clips are 25–70 seconds. Outputs: 9:16, 1:1, 16:9. 5 caption styles. A clip can be translated into 15+ languages.",
    "- Users can describe what to clip in plain words (e.g. \"every time we talk about pricing\").",
    "- Clips are downloaded as MP4 and posted by the user to TikTok, Instagram Reels or YouTube Shorts.",
    "",
    "## Pages",
    `- [Pricing](${absoluteUrl("/pricing")})`,
    `- [Free AI clip maker](${absoluteUrl("/free-clip-maker")})`,
    ...SEO_PAGES.map((p) => `- [${p.h1}](${absoluteUrl(`/${p.section}/${p.slug}`)}): ${p.description}`),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
