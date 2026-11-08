import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
import { addressRule, type ClinicProfile } from "./profile.js";
import { AVOID_WORDS } from "./compliance.js";
import { marketRules, speechTarget } from "./locale.js";
import type { Topic } from "./strategist.js";
import { totalSeconds, type ScenePlan } from "../remotion/scene-plan.js";

/**
 * The narrator.
 *
 * The scene planner writes the on-screen text well and the voice-over badly:
 * the eval's judge scored narration 2.8/5 — "a list read aloud", "stiff",
 * "repetitive" — in every language. So the narration gets its own agent,
 * on the stronger model, whose only job is to say what is on screen the way
 * a dentist would say it to one patient across the chair.
 *
 * It may not add facts: everything it says must already be on screen, so
 * the two reviewers that follow judge one story, not two.
 */
/**
 * How each language sounds spoken rather than written. The eval's judge kept
 * calling the Turkish narration "formal, a leaflet": written-register verbs
 * ("gerçekleştirilir", "sağlanmaktadır") read aloud. Formal address is the
 * clinic's choice and stays; the register is what changes.
 */
export const SPOKEN_CUES: Record<string, string> = {
  tr: `Konuşma Türkçesi kullanın: "bakın", "aslında", "şöyle düşünün", "merak etmeyin", "-ebilirsiniz". Yazı dili kalıplarından kaçının: "gerçekleştirilir", "sağlanmaktadır", "mevcuttur", "önem arz eder", "-mektedir".`,
  de: `Gesprochenes Deutsch: "Wissen Sie was?", "ehrlich gesagt", "das heißt", kurze Sätze. Kein Behörden- oder Prospektdeutsch ("erfolgt", "gewährleistet", "im Rahmen von").`,
  es: `Español hablado y cercano: "mira", "la verdad es que", "o sea", frases cortas. Nada de folleto ("se lleva a cabo", "cabe destacar").`,
  fr: `Français parlé : "vous savez", "en fait", "du coup", phrases courtes. Pas de style brochure ("il convient de", "s'effectue").`,
  it: `Italiano parlato e vicino: "sa una cosa?", "in pratica", "quindi", frasi brevi. Niente stile da opuscolo ("viene effettuato", "si raccomanda di").`,
  pt: `Português falado e próximo: "sabe que mais?", "na verdade", "então", frases curtas. Nada de estilo de folheto ("é realizado", "recomenda-se").`,
  en: `Spoken English with contractions: "here's the thing", "honestly", "so". No brochure phrases ("is carried out", "it is important to note").`,
  pl: `Mówiony polski, bliski: "wiedzą Państwo co?" albo "wiesz co?" (zgodnie z formą zwracania się), "tak naprawdę", "czyli", "i tu ważna rzecz", krótkie zdania. Bez języka ulotki i urzędu ("dokonuje się", "przeprowadzany jest", "należy podkreślić", "w celu").`,
  ar: `عربية فصحى مبسّطة كما يتكلّمها طبيب مع مريضه، لا لغة نشرات: جمل قصيرة، وروابط محكية مثل "في الحقيقة"، "يعني"، "والمهم هنا"، "لا تقلقوا". تجنّبوا "يتم إجراء"، "تجدر الإشارة إلى"، "حيث إن"، "وبالتالي" المتكرّرة. لا عامية ثقيلة ولا تشكيل.`,
  ja: `話し言葉の日本語で、患者さんに直接語りかける口調にする：「実は」「ちなみに」「ここがポイントで」「〜なんです」「〜ですよね」「ご安心ください」。書き言葉・パンフレット調（「〜を行います」「〜となっております」「〜することが重要です」「〜に関しましては」）は避ける。一文は短く、読点で区切って自然な間をつくる。英語の直訳調にしない。`,
};

const narrationSchema = z.object({ text: z.string().min(20).max(1200) });

/** Every point on screen, in order — the only material the narrator may use. */
function screenPoints(plan: ScenePlan): string[] {
  const out: string[] = [];
  for (const s of plan.scenes) {
    const scene = s as Record<string, unknown>;
    for (const key of ["text", "sub", "heading", "label", "value", "context", "caption", "attribution"]) {
      if (typeof scene[key] === "string" && scene[key]) out.push(`${s.kind}: ${scene[key]}`);
    }
    for (const key of ["items", "left", "right", "rows"]) {
      const v = scene[key];
      if (Array.isArray(v)) out.push(`${s.kind}: ${v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join(" / ")}`);
      else if (v && typeof v === "object") out.push(`${s.kind}: ${JSON.stringify(v)}`);
    }
  }
  return out;
}

export function narrationBrief(profile: ClinicProfile, topic: Topic, plan: ScenePlan, fixes: string[] = [], previous?: string): string {
  const target = speechTarget(totalSeconds(plan), profile.language);
  return [
    `Video: "${topic.title}" — answers the patient question "${topic.question}".`,
    `On screen, in order:\n${screenPoints(plan).map((p) => `- ${p}`).join("\n")}`,
    `Write about ${target} (±15%).`,
    fixes.length ? `A reviewer required: ${fixes.join(" | ")}` : "",
    previous && fixes.length ? `Your previous narration — keep it and change only what the reviewer required:\n${previous}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export async function narrate(
  client: OpenAI,
  profile: ClinicProfile,
  topic: Topic,
  plan: ScenePlan,
  fixes: string[] = [],
  previous?: string,
): Promise<string> {
  const { text } = await agentJson(client, {
    model: REVIEW_MODEL,
    temperature: 0.7,
    system: `You are the dentist at ${profile.name}${profile.city ? ` in ${profile.city}` : ""}, recording the voice-over for a short educational video. You speak native, everyday ${profile.language}.
How it must sound:
- One person talking to one patient across the chair. Tone: ${profile.tone}. ${addressRule(profile)} Formal address can still be warm: everyday words, not brochure language.
- ${SPOKEN_CUES[profile.language] ?? SPOKEN_CUES.en}
- Open by saying the hook in your own spoken words — as a question or a moment the viewer recognises, not as a headline.
- Short and medium sentences mixed. Connect points with spoken links ("and here's the thing", "that's why", "so"), never "firstly/secondly" and never read a list as a list.
- Each sentence adds something new. Do not repeat a word or idea you already said.
- End with a light, friendly nudge to ask at the clinic — no pressure, no urgency.
Content rules (a clinical and a compliance reviewer read this next):
- Say ONLY what is on screen, in your own words. No new facts, numbers, products or claims.
- Hedge where outcomes vary ("usually", "can", "for most people").
- Never use: ${AVOID_WORDS[profile.language] ?? AVOID_WORDS.en}. No prices, discounts or patient stories.${marketRules(profile.country) ? `\n- ${marketRules(profile.country)}` : ""}
Return JSON: { "text": "<the full narration>" }`,
    user: narrationBrief(profile, topic, plan, fixes, previous),
    schema: narrationSchema,
  });
  return text.trim();
}
