import type { Locale } from "./dentvideo";
import type { HeroLoop } from "@/lib/dentvid/hero-loop";

/**
 * The sample week on each landing: real output of the DentVideo pipeline
 * (worker/src/dental/cli.ts --render) for a fictional demo clinic that
 * writes in that landing's language, unedited apart from compression.
 * Files live in public/dentvideo/samples/<locale>/<slug>.{mp4,jpg}.
 *
 * `name` is the video's on-screen hook, verbatim; `seconds` its length.
 * The first entry is the hero video.
 *
 * Every landing shows its own language's videos, never another language's.
 */
export type SampleVideo = {
  slug: string;
  name: string;
  seconds: number;
  /**
   * The first entry only: how the hero phone loops it, muted — from the hook
   * (the poster's frame), over the dark gradient scene (measured: mean luma
   * of the frame well under the video's own), back before the closing fade
   * (lib/dentvid/hero-loop.ts).
   */
  hero?: HeroLoop;
};
export type SampleWeek = readonly [SampleVideo, SampleVideo, SampleVideo];

export const SAMPLE_VIDEOS: Partial<Record<Locale, SampleWeek>> = {
  // Demo Dental Studio (US)
  en: [
    { slug: "whitening-myths-debunked", name: "Whitening thins your enamel? Not quite.", seconds: 27, hero: { start: 0.9, skip: [] } },
    { slug: "caring-for-clear-aligners", name: "That funky smell from your aligners? Avoid it this way.", seconds: 21 },
    { slug: "proper-brushing-technique", name: "Missing spots when you brush? Here's a clue.", seconds: 20 },
  ],
  // Demo Zahnarztpraxis (DE), Sie
  de: [
    { slug: "bleaching-zahnschmelz", name: "Ihr Zahnschmelz beim Bleaching in Gefahr?", seconds: 38, hero: { start: 0.9, skip: [[3.3, 8.4]] } },
    { slug: "aligner-verfaerbung", name: "Ihre Aligner verfärben sich?", seconds: 27 },
    { slug: "kinder-zahnarztangst", name: "Kinder und Zahnarzt? Kein Grund zur Panik!", seconds: 25 },
  ],
  // Clínica Dental Demo (ES), tú
  es: [
    { slug: "limpieza-dental", name: "Tu cepillo no lo hace todo — esto sí.", seconds: 30, hero: { start: 0.9, skip: [[4.3, 10.8]] } },
    { slug: "primer-diente", name: "Primer diente, ¿y ahora qué?", seconds: 22 },
    { slug: "cuidado-encias", name: "Tras el tratamiento, tus encías necesitan esto.", seconds: 22 },
  ],
  // Demo Diş Kliniği (TR), siz
  tr: [
    { slug: "implant-asamalari", name: "İlk randevuda implant bitmiyor!", seconds: 23, hero: { start: 0.9, skip: [[3.0, 7.6]] } },
    { slug: "dis-tasi-temizligi", name: "Diş taşı diş etlerinizi sessizce nasıl tehdit eder?", seconds: 38 },
    { slug: "beyazlatma-hassasiyet", name: "Beyazlatma sonrası dişler daha hassas mı olur?", seconds: 29 },
  ],
  // Cabinet Dentaire Démo (FR), vous
  fr: [
    { slug: "gencives-qui-saignent", name: "Gencives qui saignent : le signe d'alerte.", seconds: 27, hero: { start: 0.9, skip: [[2.8, 7.3]] } },
    { slug: "blanchiment-email", name: "Blanchiment et l'émail : la vérité.", seconds: 32 },
    { slug: "detartrage", name: "L'ennemi invisible de votre brosse à dents...", seconds: 35 },
  ],
  // デモ歯科クリニック (Tokyo), です・ます
  ja: [
    { slug: "tsumetai-mono-de-shimiru", name: "冷たい水だけしみます", seconds: 34, hero: { start: 0.9, skip: [[3.1, 8.0]] } },
    { slug: "mouthpiece-shokuji", name: "おやつのたびに外します？", seconds: 32 },
    { slug: "ha-ga-nuketa-mama", name: "1本ないまま噛んでいます", seconds: 31 },
  ],
  // عيادة ديمو لطب الأسنان (Dubai), formal plural
  ar: [
    { slug: "qahwa-baad-altabyid", name: "بعد التبييض، القهوة من أول يوم؟", seconds: 37, hero: { start: 0.9, skip: [[3.2, 8.3]] } },
    { slug: "nazif-allitha", name: "إذا نزل دم، تكملون أم توقفون؟", seconds: 34 },
    { slug: "tafrish-qawi", name: "تضغطون بالفرشاة؟ الحساسية قد تبدأ هكذا.", seconds: 37 },
  ],
  // Gabinet Stomatologiczny Demo (Kraków), Państwo
  pl: [
    { slug: "wybielanie-przed-slubem", name: "Ślub za tydzień, a wybielanie teraz?", seconds: 33, hero: { start: 0.9, skip: [[2.5, 6.6]] } },
    { slug: "bol-po-lodach", name: "Ten ząb kłuje przy lodach?", seconds: 31 },
    { slug: "pierwsza-wizyta-dziecka", name: "Przed wizytą mówią Państwo „nie bój się”?", seconds: 32 },
  ],
};

/** The sample week for a landing, if that language has one. */
export function samplesFor(locale: Locale): SampleWeek | undefined {
  return SAMPLE_VIDEOS[locale];
}

export function sampleSrc(locale: Locale, slug: string, ext: "mp4" | "jpg"): string {
  return `/dentvideo/samples/${locale}/${slug}.${ext}`;
}
