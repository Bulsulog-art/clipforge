import type { Locale } from "./dentvideo";

/**
 * The sample week on each landing: real output of the DentVideo pipeline
 * (worker/src/dental/cli.ts --render) for a fictional demo clinic that
 * writes in that landing's language, unedited apart from compression.
 * Files live in public/dentvideo/samples/<locale>/<slug>.{mp4,jpg}.
 *
 * `name` is the video's on-screen hook, verbatim; `seconds` its length.
 * The first entry is the hero video.
 */
export type SampleVideo = { slug: string; name: string; seconds: number };

export const SAMPLE_VIDEOS: Record<Locale, readonly [SampleVideo, SampleVideo, SampleVideo]> = {
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
    { slug: "dis-beyazlatma", name: "Beyazlatma sonrası minenizdeki değişiklikleri biliyor musunuz?", seconds: 29 },
  ],
  // Cabinet Dentaire Démo (FR), vous
  fr: [
    { slug: "gencives-qui-saignent", name: "Gencives qui saignent : le signe d'alerte.", seconds: 27 },
    { slug: "blanchiment-email", name: "Blanchiment et l'émail : la vérité.", seconds: 32 },
    { slug: "visites-dentiste", name: "Visites au dentiste : toujours nécessaires ?", seconds: 27 },
  ],
};

export function sampleSrc(locale: Locale, slug: string, ext: "mp4" | "jpg"): string {
  return `/dentvideo/samples/${locale}/${slug}.${ext}`;
}
