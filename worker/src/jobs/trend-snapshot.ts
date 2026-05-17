import OpenAI from "openai";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const NICHES = [
  "motivation", "business", "finance", "health", "tech",
  "education", "comedy", "fitness", "spirituality", "lifestyle",
];

/**
 * Build a daily trend snapshot per niche using GPT-4o-mini.
 *
 * NOTE: production version would feed this from TikTok Creative Center scrape
 * + Reddit r/popular + YouTube trending. For MVP we use GPT-4o-mini to
 * generate 10 plausible "trending hook formats" with examples — costs ~$0.003
 * per niche per day → $0.30/mo for 10 niches.
 *
 * Trigger: BullMQ cron (every 24h) or Supabase pg_cron http_request.
 */
export async function buildTrendSnapshot(niche: string) {
  logger.info({ niche }, "trend snapshot start");

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content:
          `You curate short-form video trend reports for the "${niche}" niche on TikTok/Reels/Shorts.\n` +
          `Return JSON: { "items": [{ "title": string, "hook": string, "format": "talking_head|listicle|story|stitch|duet|tutorial|reaction|skit", "platform": "tiktok|instagram|youtube", "evidence": string, "why_it_works": string }] }\n` +
          `Generate 10 fresh, currently-trending hook formats. Make them specific, not generic. ` +
          `'evidence' must reference a real viral example (channel handle or video pattern). ` +
          `'hook' < 12 words.`,
      },
      {
        role: "user",
        content: `Today: ${new Date().toISOString().slice(0, 10)}. Niche: ${niche}.`,
      },
    ],
  });

  const raw = completion.choices[0].message.content ?? "{}";
  const parsed = JSON.parse(raw) as { items?: unknown[] };
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  if (items.length === 0) {
    throw new Error("empty items from gpt");
  }

  await supabase.from("trend_snapshots").insert({
    niche,
    source: "gpt",
    items,
    meta: { model: "gpt-4o-mini" },
  });

  logger.info({ niche, count: items.length }, "trend snapshot ready");
}

export async function buildAllSnapshots() {
  for (const niche of NICHES) {
    try {
      await buildTrendSnapshot(niche);
    } catch (e) {
      logger.error({ niche, err: (e as Error).message }, "trend snapshot failed");
    }
  }
}
