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

export type VoiceConfig = { model: string; instructions?: string };

export function resolveVoice(language: string | undefined, env: Record<string, string | undefined> = process.env): VoiceConfig {
  const lang = (language ?? "").toLowerCase();
  const perLang = lang ? env[`DENTVID_TTS_MODEL_${lang.toUpperCase()}`]?.trim() : undefined;
  const model = perLang || env.DENTVID_TTS_MODEL?.trim() || DEFAULT_TTS_MODEL;
  // tts-1 / tts-1-hd ignore instructions; the steerable models get one.
  if (model.startsWith("tts-1") || !lang) return { model };
  return { model, instructions: voiceInstructions(lang) };
}
