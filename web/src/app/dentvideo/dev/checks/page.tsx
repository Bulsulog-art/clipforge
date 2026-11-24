import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { devPreviewMeta } from "@/lib/dentvid/private-meta";
import type { Locale } from "@/content/dentvideo";
import { asLocale } from "@/lib/dentvid/locale";
import { weekOf } from "@/lib/dentvid/week";
import { dvAvailablePlans } from "@/lib/dentvid/billing";
import { samplePostTexts } from "@/lib/dentvid/posting-samples";
import type { LibraryItem } from "@/components/dentvid/library";
import { AppHomeView } from "@/components/dentvid/app-screens";
import type { ScriptLine } from "@/components/dentvid/video-checks";

export const dynamic = "force-dynamic";
export const generateMetadata = (): Metadata => devPreviewMeta("Checks preview");

/**
 * Dev-only: the library and the review showing their work, from fake data
 * over the real sample videos. 404 unless DENTVIDEO_DEV_PREVIEW=1.
 *
 *   /dentvideo/dev/checks?lang=en&country=DE
 *
 * This week: a video ready to review (all three checks, a timed script), one
 * flagged for a pause (the reviews only), one whose picture and sound
 * measurement could not run (no "checked" line at all), a recorded clip
 * flagged for its wording (the marked sentence), and one approved.
 */
export default async function ChecksPreview({ searchParams }: { searchParams: Promise<{ lang?: string; country?: string }> }) {
  if (process.env.DENTVIDEO_DEV_PREVIEW !== "1") notFound();
  const sp = await searchParams;
  const locale = asLocale(sp.lang) ?? "en";
  const country = sp.country ?? (locale === "en" ? "GB" : locale === "ja" ? "JP" : locale === "ar" ? "AE" : locale.toUpperCase());
  const week = weekOf();
  return (
    <AppHomeView
      locale={locale}
      clinicName={locale === "tr" ? "Demo Diş Kliniği" : "Demo Dental Clinic"}
      country={country}
      plan={{ plan: "active", tier: "practice", renewsAt: new Date(Date.now() + 23 * 86_400_000).toISOString(), canMake: true }}
      items={demoItems(locale, week)}
      firstWeek={false}
      madeThisWeek
      currentWeek={week}
      notice={null}
      plans={dvAvailablePlans()}
      pollMs={3_600_000}
    />
  );
}

const SAMPLE: Partial<Record<Locale, string[]>> = {
  en: ["proper-brushing-technique", "whitening-myths-debunked", "caring-for-clear-aligners"],
  tr: ["dis-tasi-temizligi", "beyazlatma-hassasiyet", "implant-asamalari"],
  de: ["bleaching-zahnschmelz", "aligner-verfaerbung", "kinder-zahnarztangst"],
  ar: ["tafrish-qawi", "nazif-allitha", "qahwa-baad-altabyid"],
};

type Copy = { titles: string[]; caption: string; script: string[]; spoken: string[] };
const COPY: Partial<Record<Locale, Copy>> = {
  en: {
    titles: ["Your toothbrush skips one spot every morning", "Whitening myths, one by one", "Caring for clear aligners", "What a scale and polish does", "Bleeding gums when you floss"],
    caption: "Two minutes, twice a day, and angle the brush toward the gum line. Ask us to show you at your next visit.",
    script: [
      "Your toothbrush skips one spot every morning.",
      "It is the line where your teeth meet your gums.",
      "Tilt the brush about 45 degrees toward the gum and use small, gentle circles.",
      "Give each part of your mouth the same time, about two minutes in all.",
      "A soft brush is enough, and pressing harder does not clean better.",
      "Ask us to show you the angle at your next visit.",
    ],
    spoken: ["Implants are painless for everyone.", "Most people are back to their normal routine within a few days.", "Ask us what suits you."],
  },
  tr: {
    titles: ["Diş eti kanaması bazen diş taşıyla başlar", "Beyazlatmadan sonra gelen o sızı", "İmplant tedavisinin aşamaları", "Diş taşı temizliği ne işe yarar", "Diş ipi kullanırken kanama"],
    caption: "Günde iki kez, iki dakika. Fırçayı diş etine doğru eğin. Bir sonraki randevunuzda size gösterelim.",
    script: [
      "Diş eti kanaması bazen diş taşıyla başlar.",
      "Diş taşı, fırçanın ulaşamadığı yerlerde sertleşen plaktır.",
      "Evde fırçayla çıkmaz, temizliği diş hekimi yapar.",
      "Temizlikten sonra diş etleri çoğu zaman birkaç günde sakinleşir.",
      "Kanama sürerse randevu alın.",
    ],
    spoken: ["İmplant herkes için tamamen ağrısızdır.", "Çoğu kişi birkaç gün içinde günlük düzenine döner.", "Size uygun olanı birlikte konuşalım."],
  },
};

function demoItems(locale: Locale, week: string): LibraryItem[] {
  const c = COPY[locale] ?? COPY.en!;
  const s = SAMPLE[locale] ?? SAMPLE.en!;
  const lang = SAMPLE[locale] ? locale : "en";
  const media = (n: number) => ({ videoUrl: `/dentvideo/samples/${lang}/${s[n % 3]}.mp4`, thumbUrl: `/dentvideo/samples/${lang}/${s[n % 3]}.jpg` });
  const photos = { suggested: ["whitening-03", "whitening-07", "implants-02", "implants-06", "aligners-04"], chosen: [] };
  // Times as the worker's subtitles give them: each sentence where its first cue starts.
  const at = [0, 3.4, 6.8, 11.9, 16.2, 21.5];
  const timed: ScriptLine[] = c.script.map((text, n) => ({ text, at: at[n] ?? n * 4 }));
  const base = (id: string, n: number): LibraryItem => ({
    id,
    kind: "generated",
    status: "ready",
    approval: "pending",
    title: c.titles[n],
    week_of: week,
    caption: c.caption,
    hashtags: ["dentist", "oralhealth"],
    post: samplePostTexts(locale),
    postedAt: null,
    reasons: [],
    ...media(n),
    photos,
    subtitles: true,
    checked: { picture: true },
    script: timed,
  });
  return [
    base("k1", 0),
    { ...base("k2", 1), status: "flagged", reasons: ["pause"], checked: { picture: false } },
    { ...base("k3", 2), status: "flagged", reasons: ["unchecked"], checked: undefined },
    {
      ...base("k4", 3),
      kind: "recording",
      status: "flagged",
      reasons: ["wording"],
      photos: undefined,
      subtitles: false,
      checked: undefined,
      script: c.spoken.map((text, n) => (n === 0 ? { text, marked: true as const } : { text })),
    },
    { ...base("k5", 4), approval: "approved" },
  ];
}
