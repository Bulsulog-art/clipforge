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
  /**
   * The topic in a few words, in the landing's language: the sample's label on
   * the landing and the "example week" chips. Not the hook (that is `name`).
   */
  topic: string;
  /**
   * Rendered by the older text-only template (no imagery, quieter narration).
   * Shown after the current-style samples, and never in the hero while the
   * week has a current one. Drop the flag when the file is re-rendered.
   */
  legacy?: true;
};
export type SampleWeek = readonly [SampleVideo, SampleVideo, SampleVideo];

export const SAMPLE_VIDEOS: Partial<Record<Locale, SampleWeek>> = {
  // Demo Dental Studio (US)
  en: [
    { slug: "whitening-myths-debunked", name: "Whitening thins your enamel? Not quite.", seconds: 27, hero: { start: 0.9, skip: [] }, topic: "Whitening and enamel", legacy: true },
    { slug: "caring-for-clear-aligners", name: "That funky smell from your aligners? Avoid it this way.", seconds: 21, topic: "Caring for clear aligners", legacy: true },
    { slug: "proper-brushing-technique", name: "Missing spots when you brush? Here's a clue.", seconds: 20, topic: "Brushing technique", legacy: true },
  ],
  // Demo Zahnarztpraxis (DE), Sie
  de: [
    { slug: "bleaching-zahnschmelz", name: "Bleaching heißt nicht gleich schwacher Zahnschmelz.", seconds: 28, hero: { start: 0.9, skip: [[7.2, 10.8]] }, topic: "Bleaching und Zahnschmelz" },
    { slug: "aligner-verfaerbung", name: "Ihre Aligner verfärben sich?", seconds: 27, topic: "Verfärbungen bei Alignern", legacy: true },
    { slug: "kinder-zahnarztangst", name: "Kinder und Zahnarzt? Kein Grund zur Panik!", seconds: 25, topic: "Kinder mit Zahnarztangst", legacy: true },
  ],
  // Clínica Dental Demo (ES), tú
  es: [
    { slug: "limpieza-dental", name: "Tu cepillo no lo hace todo — esto sí.", seconds: 30, hero: { start: 0.9, skip: [[4.3, 10.8]] }, topic: "Limpieza dental profesional", legacy: true },
    { slug: "primer-diente", name: "Primer diente, ¿y ahora qué?", seconds: 22, topic: "El primer diente", legacy: true },
    { slug: "cuidado-encias", name: "Tras el tratamiento, tus encías necesitan esto.", seconds: 22, topic: "Cuidado de las encías", legacy: true },
  ],
  // Demo Diş Kliniği (TR), siz
  tr: [
    { slug: "implant-asamalari", name: "İmplant günü bitiyor, süreç daha bitmiyor.", seconds: 25, hero: { start: 0.9, skip: [[6.2, 10.0]] }, topic: "İmplant aşamaları" },
    { slug: "dis-tasi-temizligi", name: "Diş taşı sadece görüntü meselesi değil.", seconds: 34, topic: "Diş taşı temizliği" },
    { slug: "beyazlatma-hassasiyet", name: "Beyazlatmadan sonra gelen o diş sızısı…", seconds: 26, topic: "Beyazlatma ve hassasiyet" },
  ],
  // Cabinet Dentaire Démo (FR), vous
  fr: [
    { slug: "gencives-qui-saignent", name: "Gencives qui saignent : le signe d'alerte.", seconds: 27, hero: { start: 0.9, skip: [[2.8, 7.3]] }, topic: "Gencives qui saignent", legacy: true },
    { slug: "blanchiment-email", name: "Blanchiment et l'émail : la vérité.", seconds: 32, topic: "Blanchiment et émail", legacy: true },
    { slug: "detartrage", name: "L'ennemi invisible de votre brosse à dents...", seconds: 35, topic: "Le détartrage", legacy: true },
  ],
  // デモ歯科クリニック (Tokyo), です・ます
  ja: [
    { slug: "tsumetai-mono-de-shimiru", name: "冷たい水だけしみます", seconds: 34, hero: { start: 0.9, skip: [[3.1, 8.0]] }, topic: "冷たいものがしみる" },
    { slug: "mouthpiece-shokuji", name: "おやつのたびに外します？", seconds: 32, topic: "マウスピースと食事" },
    { slug: "ha-ga-nuketa-mama", name: "1本ないまま噛んでいます", seconds: 31, topic: "歯を失ったままにしない" },
  ],
  // عيادة ديمو لطب الأسنان (Dubai), formal plural
  ar: [
    { slug: "qahwa-baad-altabyid", name: "بعد التبييض، القهوة من أول يوم؟", seconds: 37, hero: { start: 0.9, skip: [[3.2, 8.3]] }, topic: "القهوة بعد التبييض" },
    { slug: "nazif-allitha", name: "إذا نزل دم، تكملون أم توقفون؟", seconds: 34, topic: "نزيف اللثة" },
    { slug: "tafrish-qawi", name: "تضغطون بالفرشاة؟ الحساسية قد تبدأ هكذا.", seconds: 37, topic: "التفريش بقوة والحساسية" },
  ],
  // Gabinet Stomatologiczny Demo (Kraków), Państwo
  pl: [
    { slug: "wybielanie-przed-slubem", name: "Biały uśmiech na ślub? Termin ma znaczenie.", seconds: 24, hero: { start: 0.9, skip: [[6.6, 9.3]] }, topic: "Wybielanie przed ważnym dniem" },
    { slug: "bol-po-lodach", name: "Ten ząb kłuje przy lodach?", seconds: 31, topic: "Nadwrażliwość na zimno" },
    { slug: "pierwsza-wizyta-dziecka", name: "Przed wizytą mówią Państwo „nie bój się”?", seconds: 32, topic: "Pierwsza wizyta dziecka" },
  ],
};

/** The sample week for a landing, if that language has one. */
export function samplesFor(locale: Locale): SampleWeek | undefined {
  return SAMPLE_VIDEOS[locale];
}

/**
 * The landing's order: current-style samples first, the older text-only ones
 * after them (stable otherwise). The first one is the hero video.
 */
export function landingSamples(locale: Locale): SampleVideo[] {
  const week = SAMPLE_VIDEOS[locale];
  if (!week) return [];
  return [...week.filter((v) => !v.legacy), ...week.filter((v) => v.legacy)];
}

export function sampleSrc(locale: Locale, slug: string, ext: "mp4" | "jpg"): string {
  return `/dentvideo/samples/${locale}/${slug}.${ext}`;
}
