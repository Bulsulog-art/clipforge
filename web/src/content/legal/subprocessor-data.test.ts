import { describe, expect, it } from "vitest";
import { LEGAL } from "./index";

/**
 * What each AI sub-processor receives must be complete. The worker sends the
 * transcript of a dentist's uploaded recording to the text provider
 * (worker/src/dental/recording.ts: moment scoring, the compliance and
 * accuracy reviews, the post text), so Anthropic's data list names it in
 * every language. Text moves back to OpenAI only by our own switch, never
 * automatically, so OpenAI's entry must not read like an automatic failover.
 */
const TRANSCRIPTS: Record<string, RegExp> = {
  en: /transcripts of uploaded recordings/,
  de: /Transkripte hochgeladener Aufnahmen/,
  es: /transcripciones de las grabaciones subidas/,
  fr: /transcriptions des enregistrements envoyés/,
  tr: /yüklenen kayıtların yazıya dökülmüş metni/,
  ja: /アップロードされた録画の文字起こし/,
  ar: /النصوص المفرّغة من التسجيلات المرفوعة/,
  pl: /transkrypcje przesłanych nagrań/,
};
const AUTOMATIC_FAILOVER: Record<string, RegExp> = {
  en: /if Anthropic is unavailable/i,
  de: /wenn Anthropic nicht verfügbar/,
  es: /si Anthropic no está disponible/,
  fr: /si Anthropic est indisponible/,
  tr: /Anthropic kullanılamadığında/,
  ja: /Anthropicが利用できない場合/,
  ar: /إذا لم تكن Anthropic متاحة/,
  pl: /gdy Anthropic jest niedostępny/,
};

describe("AI sub-processors: complete data and no promised failover", () => {
  for (const [locale, text] of Object.entries(LEGAL)) {
    it(`${locale}: Anthropic receives the transcripts of uploaded recordings, and OpenAI is a switch, not a failover`, () => {
      expect(TRANSCRIPTS[locale], locale).toBeDefined();
      expect(text.subprocessors.anthropic.data).toMatch(TRANSCRIPTS[locale]);
      expect(text.subprocessors.openai.purpose).not.toMatch(AUTOMATIC_FAILOVER[locale]);
      expect(text.subprocessors.openai.purpose).toMatch(/Anthropic/);
    });
  }
});
