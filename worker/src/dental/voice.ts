/**
 * Which TTS model narrates a DentVideo clip, and how it is told to speak.
 *
 * The default is OpenAI tts-1-hd, by measurement (`voice-eval.ts`, "Model
 * choice" in docs/AUTONOMOUS_PLAN.md): gpt-4o-mini-tts with the briefs below
 * transcribed as accurately but scored the same or lower side by side in
 * tr/de/es/en, and spoke 8-12% slower in tr/de/es. It is about half the price
 * per minute and stays available per language.
 *
 *   DENTVID_TTS_MODEL           model for every language (default tts-1-hd)
 *   DENTVID_TTS_MODEL_<LANG>    per-language override, e.g. DENTVID_TTS_MODEL_TR
 *
 * Whatever is configured, a failure falls back to tts-1-hd without
 * instructions (prepareVoiceover), so a model outage costs tone, not the video.
 */
export const DEFAULT_TTS_MODEL = "tts-1-hd";

const LANGUAGE_NAMES: Record<string, string> = {
  tr: "Turkish",
  de: "German",
  es: "Spanish (Spain)",
  en: "American English",
  fr: "French",
  it: "Italian",
  pt: "European Portuguese",
  pl: "Polish",
  ar: "Modern Standard Arabic",
  ja: "standard Japanese (Tokyo)",
};

/**
 * One brief per language: the same character everywhere, plus the thing that
 * language's narration most often gets wrong when read by a TTS voice.
 */
const LANGUAGE_NOTES: Record<string, string> = {
  tr: "Pronounce Turkish dental terms correctly (diş taşı, kanal tedavisi, implant, diş eti). Keep Turkish vowel harmony and stress natural; do not anglicise.",
  de: "Pronounce German compounds as one word with the stress on the first part (Zahnreinigung, Wurzelbehandlung, Zahnfleisch). Formal 'Sie' sounds friendly, not stiff.",
  es: "Castilian Spanish pronunciation (Madrid). Pronounce dental terms clearly (endodoncia, blanqueamiento, encías). Relaxed, close, informal.",
  en: "Relaxed American English, like talking to one patient in the chair. Pronounce dental terms plainly (gingivitis, aligners, enamel).",
  fr: "Standard French pronunciation. Pronounce dental terms clearly (détartrage, gencives, dévitalisation).",
  it: "Standard Italian pronunciation. Pronounce dental terms clearly (devitalizzazione, gengive, sbiancamento).",
  pt: "European Portuguese from Lisbon, not Brazilian. Pronounce dental terms clearly (gengivas, alinhadores, desvitalização).",
  pl: "Standard Polish pronunciation. Pronounce dental terms clearly (kamień nazębny, leczenie kanałowe, dziąsła, wybielanie); keep the stress on the penultimate syllable.",
  ar: "Clear Modern Standard Arabic as spoken by a Gulf clinician, neutral and easy to follow; not Egyptian or Levantine colloquial. Pronounce dental terms clearly (تسوّس، اللثة، زراعة الأسنان، علاج العصب، تقويم شفاف).",
  ja: "Natural standard Japanese (Tokyo accent) with correct pitch accent; polite です・ます, soft and reassuring. Read dental terms correctly (歯周病, 歯石, 根管治療, 知覚過敏, マウスピース矯正).",
};

export function voiceInstructions(language: string): string {
  const lang = language.toLowerCase();
  const name = LANGUAGE_NAMES[lang] ?? language;
  return [
    `Speak native ${name}.`,
    "You are a warm, calm dentist speaking to one patient. Natural, unhurried pace with small pauses between ideas; reassuring, never salesy or announcer-like.",
    LANGUAGE_NOTES[lang] ?? `Pronounce dental terms correctly in ${name}.`,
  ].join(" ");
}

/**
 * Voices that do not carry a language well, swapped for one that does. The
 * planner picks "nova" (female) or "onyx" (male). Listening test for the new
 * languages (Nov 2026, tts-1-hd, gpt-4o-transcribe round trip + gpt-audio
 * judge, one clinic script each): Japanese and Polish were native-sounding in
 * every voice; in Arabic "onyx" garbled the opening words (13% character
 * error) and "nova" was judged slightly foreign-accented, while "shimmer"
 * (female) and "echo" (male) read it natively with no errors.
 */
const VOICE_SWAP: Record<string, Record<string, "shimmer" | "echo">> = {
  ar: { nova: "shimmer", onyx: "echo" },
};

export function voiceFor<V extends string>(language: string | undefined, voice: V): V | "shimmer" | "echo" {
  return VOICE_SWAP[(language ?? "").toLowerCase().slice(0, 2)]?.[voice] ?? voice;
}

/**
 * Speaking rate per language, applied after synthesis (ffmpeg atempo, pitch
 * unchanged — audio-master.ts) so it costs nothing and works for any voice.
 *
 * Measured rates of tts-1-hd on the clinic scripts (voice-eval, "Voice" in
 * docs/AUTONOMOUS_PLAN.md): en 2.93 and es 2.94 words/s — about 175 words a
 * minute, a presenter's pace, not a dentist's in the chair; de 2.62; tr 2.04
 * (Turkish words are long; that is already unhurried). The factors bring en
 * and es to ~2.7 words/s (~160 a minute) and German to ~2.5. Languages with
 * no measurement stay at 1, and so does gpt-4o-mini-tts, which was measured
 * 8-12% slower than tts-1-hd already and is told its pace in the brief.
 */
const TEMPO: Record<string, number> = { en: 0.93, es: 0.92, de: 0.96 };

export function speakingTempo(language: string | undefined, model: string | undefined = DEFAULT_TTS_MODEL): number {
  if (model && !model.startsWith("tts-1")) return 1;
  return TEMPO[(language ?? "").toLowerCase().slice(0, 2)] ?? 1;
}

export type VoiceConfig = { model: string; instructions?: string };

export function resolveVoice(language: string | undefined, env: Record<string, string | undefined> = process.env): VoiceConfig {
  const lang = (language ?? "").toLowerCase();
  const perLang = lang ? env[`DENTVID_TTS_MODEL_${lang.toUpperCase()}`]?.trim() : undefined;
  const model = perLang || env.DENTVID_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  // tts-1 / tts-1-hd ignore instructions; the steerable models get one.
  if (model.startsWith("tts-1") || !lang) return { model };
  return { model, instructions: voiceInstructions(lang) };
}
