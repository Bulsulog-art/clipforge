import type OpenAI from "openai";
import type { z } from "zod";

export const AGENT_MODEL = "gpt-4o-mini";
/** For judgement calls where being wrong is expensive (clinical accuracy). */
export const REVIEW_MODEL = "gpt-4o";

/**
 * One agent turn: system + user prompt in, JSON validated against `schema`
 * out. A response that fails validation gets exactly one repair round with
 * the validator's message — the same policy as planFromPrompt, for the same
 * reason: one round fixes nearly every real failure, more rounds mostly pay
 * to watch the model fail the same way.
 */
export async function agentJson<S extends z.ZodTypeAny>(
  client: OpenAI,
  args: { system: string; user: string; schema: S; temperature?: number; model?: string },
): Promise<z.infer<S>> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: args.system },
    { role: "user", content: args.user },
  ];
  const ask = async () => {
    const res = await client.chat.completions.create({
      model: args.model ?? AGENT_MODEL,
      temperature: args.temperature ?? 0.5,
      response_format: { type: "json_object" },
      messages,
    });
    return res.choices[0]?.message?.content ?? "{}";
  };

  const raw = await ask();
  const first = args.schema.safeParse(safeJson(raw));
  if (first.success) return first.data;

  messages.push({ role: "assistant", content: raw });
  messages.push({
    role: "user",
    content: `That JSON was rejected: ${first.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ")}. Return the corrected JSON only.`,
  });
  return args.schema.parse(safeJson(await ask()));
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
