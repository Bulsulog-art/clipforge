import type OpenAI from "openai";
import { z } from "zod";
import { agentJson, REVIEW_MODEL } from "./llm.js";
import { addressRule, type ClinicProfile } from "./profile.js";
import { AVOID_WORDS } from "./compliance.js";
import { exampleFor } from "./examples.js";
import { weekVoiceBrief, type WeekVoice } from "./memory.js";
import { marketRules, speechTarget, variantRule } from "./locale.js";
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
  // Described, not listed: a cue that names a phrase gets that phrase in
  // every script. The old Turkish cue offered "değil mi?" and the Nov 2026
  // live run ended two of three narrations with a bolted-on "…, değil mi?".
  tr: `Konuşma Türkçesi, bir diş hekiminin koltuktaki hastasına anlattığı gibi: kısa ve orta cümleler, gündelik kelimeler, kesin olmayan yerde "-ebilir/-abilir". Yazı dili ve çeviri kokan kalıplar yok: "gerçekleştirilir", "sağlanmaktadır", "mevcuttur", "önem arz eder", "oldukça önemlidir", "-mektedir", "söz konusu", İngilizceden birebir çevrilmiş ifadeler ("bölge sakin görünüyorsa", "yumuşak başlama"). Cümle sonuna "değil mi?" eklemeyin; soru sadece açılışta, gerçek bir soru olarak. Hastanın kelimesini seçin: belirsizse "film" değil "röntgen". "Daha fazla bilgi için" ve "Unutmayın" demeyin.`,
  de: `Gesprochenes Deutsch, wie eine Zahnärztin am Behandlungsstuhl erklärt: kurze und mittlere Sätze, Alltagswörter, Verben statt Substantivketten, ein Fachwort nur mit kurzer Erklärung. Keine angehängten Rückfragen ("…, oder?", "…, nicht wahr?") und kein Einstieg mit "Wissen Sie was?". Kein Behörden-, Prospekt- oder Übersetzungsdeutsch ("erfolgt", "gewährleistet", "im Rahmen von", "Es ist wichtig, dass", "Ihr Lächeln ist uns wichtig", schiefe Bilder wie "Kaffee pausiert").`,
  es: `Español hablado y cercano: frases cortas, alguna muletilla natural ("la verdad", "o sea") como mucho una vez y nunca para abrir. NUNCA empieces con "Pues mira, la verdad es que" ni con "¿Te has preguntado…?". Nada de folleto ("se lleva a cabo", "cabe destacar", "tu salud bucal es clave", "estamos aquí para ayudarte", "un viaje hacia tu nueva sonrisa").`,
  fr: `Français parlé : phrases courtes, un "en fait" ou "du coup" au plus une fois, jamais en ouverture. Pas de style brochure ("il convient de", "s'effectue", "n'hésitez pas").`,
  it: `Italiano parlato e vicino: frasi brevi, un "in pratica" o "quindi" al massimo una volta, mai in apertura. Niente stile da opuscolo ("viene effettuato", "si raccomanda di", "non esiti a").`,
  pt: `Português falado e próximo: frases curtas, um "na verdade" ou "então" no máximo uma vez, nunca a abrir. Nada de estilo de folheto ("é realizado", "recomenda-se", "não hesite em").`,
  en: `Spoken English with contractions and short sentences; a "so" or "honestly" at most once, never as the opener. Never open with "Here's the thing". No brochure phrases ("is carried out", "it is important to note", "your smile deserves", "don't hesitate to").`,
  pl: `Mówiony polski, bliski: krótkie zdania, "tak naprawdę" albo "czyli" najwyżej raz i nigdy na otwarcie (zgodnie z formą zwracania się). Bez języka ulotki i urzędu ("dokonuje się", "przeprowadzany jest", "należy podkreślić", "w celu", "nie wahaj się").`,
  ar: `عربية فصحى مبسّطة كما يتكلّمها طبيب مع مريضه، لا لغة نشرات: جمل قصيرة، وروابط محكية مثل "يعني" أو "والمهم هنا" مرة واحدة على الأكثر ولا تبدأ بها. تجنّبوا "يتم إجراء"، "تجدر الإشارة إلى"، "حيث إن"، "لا تترددوا". لا عامية ثقيلة ولا تشكيل.`,
  ja: `話し言葉の日本語で、患者さんに直接語りかける口調にする：「〜なんです」「〜ですよね」など自然な語尾を使い、「実は」などのつなぎ言葉は一度まで、冒頭には使わない。書き言葉・パンフレット調（「〜を行います」「〜となっております」「〜することが重要です」「〜に関しましては」「お気軽にお問い合わせください」）は避ける。一文は短く、英語の直訳調にしない。`,
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

export function narrationBrief(profile: ClinicProfile, topic: Topic, plan: ScenePlan, fixes: string[] = [], previous?: string, week?: WeekVoice): string {
  const target = speechTarget(totalSeconds(plan), profile.language);
  return [
    `Video: "${topic.title}" — answers the patient question "${topic.question}".` + (topic.takeaway ? ` The one thing the viewer should remember: "${topic.takeaway}"` : ""),
    `On screen, in order:\n${screenPoints(plan).map((p) => `- ${p}`).join("\n")}`,
    // The narrator ran 21-33% long on every German and English script of the
    // Nov 2026 live run; the render then stretches the video to the voice, so
    // a long narration is a slow video. A ceiling, not just a target.
    `Write about ${target} — never more than ${speechTarget(totalSeconds(plan) * 1.1, profile.language)}.`,
    weekVoiceBrief(week),
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
  week?: WeekVoice,
): Promise<string> {
  const example = exampleFor(profile, topic);
  const { text } = await agentJson(client, {
    model: REVIEW_MODEL,
    temperature: 0.7,
    system: `You are the dentist at ${profile.name}${profile.city ? ` in ${profile.city}` : ""}, recording the voice-over for a short educational video. You speak native, everyday ${profile.language}.
How it must sound:
- One person talking to one patient across the chair. Tone: ${profile.tone}. ${addressRule(profile)} Formal address can still be warm: everyday words, not brochure language.
- ${SPOKEN_CUES[profile.language] ?? SPOKEN_CUES.en}
- Open by saying the hook in your own spoken words, in the first sentence (it must land in the first two seconds) — as a question or a moment the viewer recognises, not as a headline. Never open with a stock filler phrase.
- Short and medium sentences mixed, none longer than about ${profile.language === "tr" || profile.language === "de" ? 12 : 15} words — a voice reads this, and long sentences lose the listener. Connect points with spoken links, never "firstly/secondly" and never read a list as a list.
- Each sentence adds something new. Do not repeat a word or idea you already said, and do not restate the takeaway at the end.
- No tag questions bolted onto statements ("…, right?", "…, değil mi?", "…, oder?") and never a bare "No." — say "not quite" / "usually not" and why.
- Never say the clinic's name; say "we" / "us" if you need to.${variantRule(profile) ? `\n- ${variantRule(profile)}` : ""}
- Do not read the screen out: say each point differently from how it is written on screen.
- End with the closing line's idea in your own words — a light, friendly nudge, no pressure, no urgency, no exclamation mark.${profile.country.toUpperCase() === "TR" ? " In Türkiye, only point to asking their own dentist at a check-up; never tell viewers to contact or book with this clinic." : ""}
Content rules (a clinical and a compliance reviewer read this next):
- Say ONLY what is on screen, in your own words. No new facts, numbers, products or claims.
- Hedge where outcomes vary ("usually", "can", "for most people").
- Never use: ${AVOID_WORDS[profile.language] ?? AVOID_WORDS.en}. No prices, discounts or patient stories.${marketRules(profile.country) ? `\n- ${marketRules(profile.country)}` : ""}
${example ? `How it should sound — a reference narration in this language on a different subject (never reuse its subject or sentences):\n${example.narration}\n` : ""}Return JSON: { "text": "<the full narration>" }`,
    user: narrationBrief(profile, topic, plan, fixes, previous, week),
    schema: narrationSchema,
  });
  return text.trim();
}
