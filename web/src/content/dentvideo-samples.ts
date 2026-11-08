import type { Locale } from "./dentvideo";

/**
 * The sample week on each landing: real output of the DentVideo pipeline
 * (worker/src/dental/cli.ts --render) for a fictional demo clinic that
 * writes in that landing's language, unedited apart from compression.
 * Files live in public/dentvideo/samples/<locale>/<slug>.{mp4,jpg}.
 *
 * `name` is the video's on-screen hook, verbatim; `seconds` its length.
 * The first entry is the hero video.
 *
 * Japanese, Arabic and Polish have no sample week yet: those landings show a
 * drawn phone card and the live preview instead, never another language's
 * videos. Render a demo clinic's week with the pipeline to add one.
 */
export type SampleVideo = { slug: string; name: string; seconds: number };
export type SampleWeek = readonly [SampleVideo, SampleVideo, SampleVideo];

export const SAMPLE_VIDEOS: Partial<Record<Locale, SampleWeek>> = {
  // Demo Dental Studio (US)
  en: [
    { slug: "whitening-myths-debunked", name: "Whitening thins your enamel? Not quite.", seconds: 27 },
    { slug: "caring-for-clear-aligners", name: "That funky smell from your aligners? Avoid it this way.", seconds: 21 },
    { slug: "proper-brushing-technique", name: "Missing spots when you brush? Here's a clue.", seconds: 20 },
  ],
  // Demo Zahnarztpraxis (DE), Sie
  de: [
    { slug: "bleaching-zahnschmelz", name: "Ihr Zahnschmelz beim Bleaching in Gefahr?", seconds: 38 },
    { slug: "aligner-verfaerbung", name: "Ihre Aligner verfärben sich?", seconds: 27 },
    { slug: "kinder-zahnarztangst", name: "Kinder und Zahnarzt? Kein Grund zur Panik!", seconds: 25 },
  ],
  // Clínica Dental Demo (ES), tú
  es: [
    { slug: "limpieza-dental", name: "Tu cepillo no lo hace todo — esto sí.", seconds: 30 },
    { slug: "primer-diente", name: "Primer diente, ¿y ahora qué?", seconds: 22 },
    { slug: "cuidado-encias", name: "Tras el tratamiento, tus encías necesitan esto.", seconds: 22 },
  ],
  // Demo Diş Kliniği (TR), siz
  tr: [
    { slug: "implant-asamalari", name: "İlk randevuda implant bitmiyor!", seconds: 23 },
    { slug: "dis-tasi-temizligi", name: "Diş taşı diş etlerinizi sessizce nasıl tehdit eder?", seconds: 38 },
    { slug: "beyazlatma-hassasiyet", name: "Beyazlatma sonrası dişler daha hassas mı olur?", seconds: 29 },
  ],
  // Cabinet Dentaire Démo (FR), vous
  fr: [
    { slug: "gencives-qui-saignent", name: "Gencives qui saignent : le signe d'alerte.", seconds: 27 },
    { slug: "blanchiment-email", name: "Blanchiment et l'émail : la vérité.", seconds: 32 },
    { slug: "detartrage", name: "L'ennemi invisible de votre brosse à dents...", seconds: 35 },
  ],
};

/** The sample week for a landing, if that language has one. */
export function samplesFor(locale: Locale): SampleWeek | undefined {
  return SAMPLE_VIDEOS[locale];
}

export function sampleSrc(locale: Locale, slug: string, ext: "mp4" | "jpg"): string {
  return `/dentvideo/samples/${locale}/${slug}.${ext}`;
}
