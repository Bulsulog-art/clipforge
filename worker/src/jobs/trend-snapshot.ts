import OpenAI from "openai";
import { supabase } from "../supabase.js";
import { logger } from "../logger.js";
import { sendPush } from "../push.js";

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
  // After snapshots are stored, fan out trend-match push notifications to
  // users whose recent history matches each niche. Errors here don't fail
  // the cron — snapshots are the primary artefact, pushes are best-effort.
  try {
    await pushTrendMatches();
  } catch (e) {
    logger.error({ err: (e as Error).message }, "trend push fanout failed");
  }
}

/**
 * Fan out trend-match push notifications.
 *
 * For each niche:
 *   1. Read today's top hook from the newest trend_snapshots row.
 *   2. Find users whose video_jobs.niche matched in the last 30 days.
 *   3. Skip users we've already pushed about this hook (dedupe by
 *      (user_id, niche, last_hook)) or who got any niche push in the
 *      last 7 days (anti-spam).
 *   4. Send push, upsert the dedupe row.
 *
 * Costs nothing extra — sendPush already exists, and the dedupe table
 * is one tiny row per user per niche.
 */
async function pushTrendMatches() {
  for (const niche of NICHES) {
    const { data: latest } = await supabase
      .from("trend_snapshots")
      .select("items, created_at")
      .eq("niche", niche)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) continue;
    const items = (latest.items as Array<{ hook?: string }> | null) ?? [];
    const topHook = items[0]?.hook?.trim();
    if (!topHook) continue;

    // Eligible users — anyone who created a job in this niche in the last
    // 30 days. We use a distinct-on under the hood; supabase-js doesn't
    // expose that directly, so we pull the (potentially redundant) set and
    // dedupe in memory. The list is small (10s–100s of rows max).
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: jobs } = await supabase
      .from("video_jobs")
      .select("user_id")
      .eq("niche", niche)
      .gte("created_at", since);
    const userIds = Array.from(new Set((jobs ?? []).map((j) => j.user_id as string)));
    if (userIds.length === 0) continue;

    for (const userId of userIds) {
      const { data: dedupe } = await supabase
        .from("trend_push_dedupe")
        .select("last_hook, sent_at")
        .eq("user_id", userId)
        .eq("niche", niche)
        .maybeSingle();
      if (dedupe) {
        if (dedupe.last_hook === topHook) continue;            // already pushed this exact hook
        const ageMs = Date.now() - new Date(dedupe.sent_at as string).getTime();
        if (ageMs < 7 * 24 * 60 * 60 * 1000) continue;          // 7-day spam guard
      }

      try {
        await sendPush(userId, {
          title: `🔥 New ${niche} hook trending`,
          body: topHook.length > 120 ? topHook.slice(0, 117) + "…" : topHook,
          data: { kind: "trend_match", niche },
        });
        await supabase.from("trend_push_dedupe").upsert(
          {
            user_id: userId,
            niche,
            last_hook: topHook,
            sent_at: new Date().toISOString(),
          },
          { onConflict: "user_id,niche" },
        );
      } catch (e) {
        logger.warn(
          { userId, niche, err: (e as Error).message },
          "trend push failed for user",
        );
      }
    }
  }
}
