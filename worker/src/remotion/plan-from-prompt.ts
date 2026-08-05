import OpenAI from "openai";
import { parseScenePlan, ScenePlanError, LIMITS, THEMES } from "./scene-plan.js";
import type { ScenePlan } from "./scene-plan.js";

/**
 * Turns "make me a video about morning routines" into a scene plan.
 *
 * The model is given the format catalogue and a hard schema, then its output
 * is validated by the same parser the renderer trusts. When validation fails
 * the error is handed back once and only once: a single repair round fixes
 * almost every real failure (a missing field, a scene one second too long),
 * and looping further mostly burns money watching a model fail the same way
 * repeatedly.
 *
 * If the second attempt also fails we surface the plain-language message from
 * the validator rather than retrying forever. A person waiting on a video
 * would rather be told to rephrase after ten seconds than watch a spinner for
 * a minute and get the same answer.
 */

export const PLAN_MODEL = "gpt-4o-mini";

/** Roughly what a scene plan costs to produce, for the cost model. */
export const PLAN_COST_USD = 0.005;

const SYSTEM_PROMPT = `You write scene plans for short vertical videos. You return JSON only — no prose, no markdown fences.

You do NOT control layout, colour, fonts, animation or timing curves. Those are handled by the renderer. You control what is said, in what order, and for how long.

SCENE KINDS

hook       — the opening line. Must earn the next three seconds. { text, sub?, seconds }
statement  — one idea, large. { text, emphasis?: string[], seconds }
list       — a heading and 2-6 items. { heading, items[], seconds }
stat       — one number and what it means. { value, label, context?, seconds }
quote      — a quotation. { text, attribution?, seconds }
compare    — two sides read at a glance. { left:{label,text}, right:{label,text}, seconds }
footage    — real video. { source, caption?, seconds }
             source is either { type:"stock", query } with a 2-4 word visual search,
             or { type:"user", assetIndex } referring to a clip the user uploaded.
cta        — the close. { text, handle?, seconds }

RULES

- Open with a hook. Always.
- 4 to 8 scenes is the range that works. Fewer feels thin, more feels like a slideshow.
- Every scene needs "seconds": ${LIMITS.sceneSeconds.min}-${LIMITS.sceneSeconds.max}. Total must land between ${LIMITS.totalSeconds.min} and ${LIMITS.totalSeconds.max}.
- Budget by reading speed: about 0.4s per word, never under 1.5s for anything with text.
- Vary the kinds. Three statements in a row is a wall.
- Write for the ear and the thumb: short sentences, concrete nouns, no throat-clearing.
- Never invent statistics. Use a stat scene only when the user supplied the number or it is common knowledge.
- theme: one of ${THEMES.join(", ")}. Pick for subject, not novelty — midnight for most, editorial for considered or literary subjects, mono for blunt statements, candy for playful, sunrise for warm and personal.
- aspect: "9:16" unless the user asks otherwise.
- voiceover is optional. Include it only if narration adds something the type does not already say.

Return exactly: { title, aspect, theme, music, scenes: [...], voiceover? }`;

export type PlanRequest = {
  /** What the person typed. */
  prompt: string;
  /** How many clips they attached. Zero means no user footage may be referenced. */
  userAssetCount?: number;
  /** Short descriptions of those clips, so the model can place them sensibly. */
  userAssetDescriptions?: string[];
  /** Overrides the model's choice when the user picked one in the UI. */
  aspect?: ScenePlan["aspect"];
  theme?: ScenePlan["theme"];
};

export type PlanResult = {
  plan: ScenePlan;
  /** True when the first attempt failed validation and the repair round saved it. */
  repaired: boolean;
};

function userMessage(req: PlanRequest): string {
  const parts = [`Make a video about: ${req.prompt}`];

  const count = req.userAssetCount ?? 0;
  if (count > 0) {
    const described = (req.userAssetDescriptions ?? [])
      .slice(0, count)
      .map((d, i) => `  assetIndex ${i}: ${d}`)
      .join("\n");
    parts.push(
      `The user attached ${count} clip${count === 1 ? "" : "s"}. Use them with footage scenes ` +
        `({ type:"user", assetIndex }). Valid indexes are 0 to ${count - 1}.` +
        (described ? `\n${described}` : ""),
    );
  } else {
    parts.push(
      `The user attached no clips, so you may NOT use { type:"user" }. Build the video from ` +
        `text scenes, and stock footage only where a real shot genuinely helps.`,
    );
  }

  if (req.aspect) parts.push(`aspect must be "${req.aspect}".`);
  if (req.theme) parts.push(`theme must be "${req.theme}".`);
  return parts.join("\n\n");
}

export async function planFromPrompt(
  req: PlanRequest,
  client: OpenAI = new OpenAI(),
): Promise<PlanResult> {
  const assets = req.userAssetCount ?? 0;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userMessage(req) },
  ];

  const first = await complete(client, messages);
  try {
    return { plan: parseScenePlan(first.parsed, assets), repaired: false };
  } catch (firstError) {
    if (!(firstError instanceof ScenePlanError)) throw firstError;

    // One repair round. The validator's message names the exact path and rule
    // that failed, which is far more actionable than "try again".
    messages.push({ role: "assistant", content: first.raw });
    messages.push({
      role: "user",
      content:
        `That was rejected: ${firstError.message}\n\n` +
        `Return the corrected JSON. Change only what is needed to satisfy the rule.`,
    });

    const second = await complete(client, messages);
    // A second failure is surfaced as-is; the caller shows userMessage.
    return { plan: parseScenePlan(second.parsed, assets), repaired: true };
  }
}

async function complete(
  client: OpenAI,
  messages: OpenAI.Chat.ChatCompletionMessageParam[],
): Promise<{ raw: string; parsed: unknown }> {
  const response = await client.chat.completions.create({
    model: PLAN_MODEL,
    // Warm enough for the writing to have a pulse, cool enough that the
    // structure stays put. Above ~0.9 the model starts inventing scene kinds.
    temperature: 0.7,
    response_format: { type: "json_object" },
    max_tokens: 1600,
    messages,
  });

  const raw = response.choices[0]?.message?.content ?? "";
  if (!raw.trim()) {
    throw new ScenePlanError(
      "model returned an empty completion",
      "We couldn't come up with anything for that. Try describing it differently.",
    );
  }

  try {
    return { raw, parsed: JSON.parse(raw) };
  } catch {
    throw new ScenePlanError(
      `model returned unparseable json: ${raw.slice(0, 200)}`,
      "We couldn't come up with anything for that. Try describing it differently.",
    );
  }
}
