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
    { slug: "whitening-myths-debunked", name: "Whitening your teeth? Not as harsh as you think.", seconds: 25, hero: { start: 0.9, skip: [[6.8, 9.9]] }, topic: "Whitening and enamel" },
    { slug: "caring-for-clear-aligners", name: "Aligners smelling off by evening?", seconds: 22, topic: "Caring for clear aligners" },
    { slug: "proper-brushing-technique", name: "Your toothbrush skips one spot every morning.", seconds: 27, topic: "Brushing technique" },
  ],
  // Demo Zahnarztpraxis (DE), Sie
  de: [
    { slug: "bleaching-zahnschmelz", name: "Bleaching heißt nicht gleich schwacher Zahnschmelz.", seconds: 28, hero: { start: 0.9, skip: [[7.2, 10.8]] }, topic: "Bleaching und Zahnschmelz" },
    { slug: "aligner-verfaerbung", name: "Kaffee macht Aligner schneller gelb als gedacht.", seconds: 27, topic: "Verfärbungen bei Alignern" },
    { slug: "kinder-zahnarztangst", name: "Ihr Kind spürt Ihre Nervosität sofort.", seconds: 30, topic: "Kinder mit Zahnarztangst" },
  ],
  // Clínica Dental Demo (ES), tú
  es: [
    { slug: "limpieza-dental", name: "Ese sarro junto a la encía…", seconds: 24, hero: { start: 0.9, skip: [[4.3, 7.6]] }, topic: "Limpieza dental profesional" },
    { slug: "primer-diente", name: "Asoma el primer diente… ¿ya lo cepillas?", seconds: 24, topic: "El primer diente" },
    { slug: "cuidado-encias", name: "Tus encías tratadas también necesitan cepillo.", seconds: 28, topic: "Cuidado de las encías" },
  ],
  // Demo Diş Kliniği (TR), siz
  tr: [
    { slug: "implant-asamalari", name: "İmplant yapıldı ama diş daha hazır değil.", seconds: 30, hero: { start: 0.9, skip: [] }, topic: "İmplant aşamaları" },
    { slug: "dis-tasi-temizligi", name: "Diş eti kanaması bazen diş taşıyla başlar.", seconds: 26, topic: "Diş taşı temizliği" },
    { slug: "beyazlatma-hassasiyet", name: "Beyazlatmadan sonra gelen o diş sızısı…", seconds: 24, topic: "Beyazlatma ve hassasiyet" },
  ],
  // Cabinet Dentaire Démo (FR), vous
  fr: [
    { slug: "gencives-qui-saignent", name: "Ce saignement quand vous vous brossez les dents…", seconds: 27, hero: { start: 0.9, skip: [[10.4, 14.5]] }, topic: "Gencives qui saignent" },
    { slug: "blanchiment-email", name: "Le blanchiment fragilise vraiment l’émail ?", seconds: 26, topic: "Blanchiment et émail" },
    { slug: "detartrage", name: "Vous brossez bien, mais le tartre reste.", seconds: 21, topic: "Le détartrage" },
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
