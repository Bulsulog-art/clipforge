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
- hashtags: lowercase, no '#', mix topic and local (city) tags.
Return JSON: { "caption", "hashtags": [] }`,
    user:
      `Clinic: ${profile.name}${profile.city ? `, ${profile.city}` : ""}. Language: ${profile.language}. Tone: ${profile.tone}.\n` +
      `Video: "${topic.title}" — answers: ${topic.question}\n` +
      (profile.bookingUrl ? `Booking link: ${profile.bookingUrl}\n` : "") +
      (fixes.length ? `A reviewer required these changes: ${fixes.join(" | ")}\n` : ""),
    schema: postCopySchema,
    temperature: 0.7,
  });
  return {
    caption: copy.caption.trim(),
    hashtags: [...new Set(copy.hashtags.map((h) => h.replace(/^#/, "").toLowerCase().replace(/\s+/g, "")))],
  };
}
