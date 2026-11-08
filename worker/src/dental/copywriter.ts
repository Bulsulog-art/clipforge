import type OpenAI from "openai";
import { z } from "zod";
import { agentJson } from "./llm.js";
import type { ClinicProfile } from "./profile.js";
import type { Topic } from "./strategist.js";

/** The copywriter agent: the post text that goes under the video. */

export const postCopySchema = z.object({
  caption: z.string().min(10).max(1500),
  hashtags: z.array(z.string().min(2).max(40)).min(3).max(12),
});
export type PostCopy = z.infer<typeof postCopySchema>;

export async function writePostCopy(
  client: OpenAI,
  profile: ClinicProfile,
  topic: Topic,
  fixes: string[] = [],
): Promise<PostCopy> {
  const copy = await agentJson(client, {
    system: `You write the Instagram/TikTok caption under an educational dental video.
- Clinic's language, clinic's tone. 2-4 short paragraphs, plain words, at most 2 emoji.
- Answer the question briefly; end with a soft call to book a check-up${profile.bookingUrl ? " using the booking link" : ""}.
- No prices, discounts, guarantees, superlatives, before/after promises, testimonials or cure claims. Hedge medical statements ("can", "usually", "ask your dentist").
- hashtags: lowercase, no '#', topic and local (city) tags. Do NOT make a hashtag of the clinic's name or translate it; the clinic's own tag is added automatically.
Return JSON: { "caption", "hashtags": [] }`,
    user:
      `Clinic: ${profile.name}${profile.city ? `, ${profile.city}` : ""}. Language: ${profile.language}. Tone: ${profile.tone}.\n` +
      `Video: "${topic.title}" — answers: ${topic.question}\n` +
      (profile.bookingUrl ? `Booking link: ${profile.bookingUrl}\n` : "") +
      (fixes.length ? `A reviewer required these changes: ${fixes.join(" | ")}\n` : ""),
    schema: postCopySchema,
    temperature: 0.7,
  });
  return { caption: copy.caption.trim(), hashtags: finalHashtags(copy.hashtags, profile) };
}

/**
 * Clean the model's tags and put the clinic's real tag first. The model was
 * seen inventing a translated brand tag ("#gülüşstudio" for Smile Studio);
 * a clinic that spots a made-up tag for itself stops trusting the tool.
 */
export function finalHashtags(raw: string[], profile: Pick<ClinicProfile, "name" | "handle">): string[] {
  const norm = (h: string) => h.replace(/^#/, "").toLowerCase().replace(/[\s.]+/g, "");
  const own = norm(profile.handle ?? profile.name).replace(/[^\p{L}\p{N}_]/gu, "");
  const nameWords = profile.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
  const cleaned = raw
    .map(norm)
    .filter((h) => h.length >= 2 && /^[\p{L}\p{N}_]+$/u.test(h))
    // Drop the model's own attempts at the clinic's tag.
    .filter((h) => h !== own && !nameWords.some((w) => h.includes(w.replace(/[^\p{L}\p{N}]/gu, ""))));
  return [...new Set([own, ...cleaned])].filter(Boolean).slice(0, 12);
}
