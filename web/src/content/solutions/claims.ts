import type { Locale } from "../dentvideo";

/**
 * Statements about other products and services, as the comparison pages
 * quote them. Each one restates what the other company publishes on its own
 * page, names that page and the date it was read, and is rendered with both
 * ("… (canva.com, as of 2026-11-16)"), so a reader and an answer engine can
 * check it and see how old it is.
 *
 * This is the only place an editorial page may carry another company's price
 * or a figure in currency (compliance-words MONEY): solutions.test.ts removes
 * rendered claims before it looks for money, requires every paragraph, list
 * item, table cell and FAQ answer that names a company below to carry one of
 * its claims, and fails once a claim is older than CLAIM_MAX_AGE_DAYS, so a
 * stale price cannot stay on the site unnoticed.
 *
 * Rules: say only what the page says, in neutral words; no judgement inside a
 * claim (judgements belong in the surrounding text and must be fair); if the
 * other company's page changes, change or remove the claim and its date.
 */

/** A company or product the comparison pages discuss. */
export type ClaimSubject = {
  /** How the company is named in running text (matched case-sensitively, as a word). */
  name: string;
  /** Other spellings that count as naming it. */
  aliases?: string[];
  /** Its own domains: a claim's source must be on one of them. */
  domains: string[];
};

export const CLAIM_SUBJECTS: Record<string, ClaimSubject> = {
  canva: { name: "Canva", domains: ["canva.com"] },
  webfx: { name: "WebFX", domains: ["webfx.com"] },
  optio: { name: "Optio Dentistry", aliases: ["Optio"], domains: ["optiopublishing.com"] },
  toothflix: { name: "Toothflix", domains: ["ada.org"] },
};

export type CompetitorClaim = {
  id: string;
  subject: keyof typeof CLAIM_SUBJECTS;
  /** The company's own page the statement restates (https). */
  url: string;
  /** The day the statement was read on that page (YYYY-MM-DD). */
  checked: string;
  /** The statement, one sentence without a final full stop, per page language. */
  text: Partial<Record<Locale, string>>;
};

/** A claim older than this fails the tests: re-read the page, then update or remove it. */
export const CLAIM_MAX_AGE_DAYS = 365;

const CHECKED = "2026-11-16";

export const CLAIMS: CompetitorClaim[] = [
  {
    id: "canva-dental-templates",
    subject: "canva",
    url: "https://www.canva.com/video-editor/templates/dental/",
    checked: CHECKED,
    text: {
      en: "Canva publishes dental video templates (clinic promotions, care tips, children's dental care) that you open and edit yourself in its video editor; some are marked Pro, the rest are free",
      de: "Canva bietet Video-Vorlagen zum Thema Zahnmedizin an (Praxiswerbung, Pflegetipps, Zahnpflege für Kinder), die man selbst im Video-Editor öffnet und bearbeitet; einige sind als Pro gekennzeichnet, die übrigen kostenlos",
      tr: "Canva, kendi video düzenleyicisinde açıp sizin düzenlediğiniz diş hekimliği video şablonları sunar (klinik tanıtımı, bakım ipuçları, çocuk diş sağlığı); bir kısmı Pro olarak işaretlidir, diğerleri ücretsizdir",
    },
  },
  {
    id: "canva-ai-voice",
    subject: "canva",
    url: "https://www.canva.com/features/ai-voice-generator/",
    checked: CHECKED,
    text: {
      en: "Canva's AI voice generator turns text you type into narration; a selection of voices is free and more come with a paid plan",
      de: "Der KI-Sprachgenerator von Canva macht aus eingetipptem Text eine Sprecherstimme; einige Stimmen sind kostenlos, weitere gibt es mit einem kostenpflichtigen Tarif",
      tr: "Canva'nın yapay zekâ ses oluşturucusu yazdığınız metni seslendirmeye çevirir; bir kısım ses ücretsizdir, daha fazlası ücretli planla gelir",
    },
  },
  {
    id: "canva-auto-captions",
    subject: "canva",
    url: "https://www.canva.com/features/auto-caption/",
    checked: CHECKED,
    text: {
      en: "Canva can generate captions from the speech in a video and lets you edit them",
      de: "Canva kann aus dem Gesprochenen eines Videos Untertitel erzeugen, die man bearbeiten kann",
      tr: "Canva, videodaki konuşmadan altyazı oluşturabilir ve bunları düzenlemenize izin verir",
    },
  },
  {
    id: "canva-plans",
    subject: "canva",
    url: "https://www.canva.com/pricing/",
    checked: CHECKED,
    text: {
      en: "Canva has a free plan and paid Pro, Business and Enterprise plans, with the current price for your country on its pricing page",
      de: "Canva hat einen kostenlosen Tarif und die kostenpflichtigen Tarife Pro, Business und Enterprise; den aktuellen Preis für Ihr Land nennt die Preisseite",
      tr: "Canva'nın ücretsiz bir planı ve ücretli Pro, Business ve Enterprise planları vardır; ülkenize göre güncel fiyat fiyatlandırma sayfasında yer alır",
    },
  },
  {
    id: "webfx-agency-range",
    subject: "webfx",
    url: "https://www.webfx.com/industries/health/dentist/social-media/",
    checked: CHECKED,
    text: {
      en: "WebFX, a US agency, puts the average agency-provided social media plan for dentists at $800 to $4,000 a month, depending on the number of platforms and posts",
      de: "WebFX, eine US-Agentur, beziffert ein durchschnittliches Social-Media-Paket einer Agentur für Zahnarztpraxen auf $800 bis $4,000 im Monat, je nach Zahl der Plattformen und Beiträge",
      tr: "ABD'li bir ajans olan WebFX, diş hekimleri için ajans tarafından yürütülen ortalama bir sosyal medya planını, platform ve paylaşım sayısına göre ayda $800 ile $4,000 arasında gösterir",
    },
  },
  {
    id: "optio-library",
    subject: "optio",
    url: "https://www.optiopublishing.com/dental-videos",
    checked: CHECKED,
    text: {
      en: "Optio Dentistry is a library of patient-education videos on treatments such as implants and oral hygiene, made to be played chairside on a tablet or computer and embedded on a practice website, with French and Spanish subtitles",
      de: "Optio Dentistry ist eine Bibliothek von Aufklärungsvideos zu Behandlungen wie Implantaten und Mundhygiene, gedacht für das Abspielen am Behandlungsstuhl auf Tablet oder Computer und für die Praxis-Website, mit französischen und spanischen Untertiteln",
      tr: "Optio Dentistry, implant ve ağız hijyeni gibi tedavileri anlatan bir hasta bilgilendirme videosu kütüphanesidir; koltuk başında tablet ya da bilgisayarda oynatılmak ve klinik web sitesine eklenmek için hazırlanmıştır, Fransızca ve İspanyolca altyazılıdır",
    },
  },
  {
    id: "optio-price",
    subject: "optio",
    url: "https://optiopublishing.com/order",
    checked: CHECKED,
    text: {
      en: "Optio's order page lists the Optio Dentistry subscription at $49 a month",
      de: "Die Bestellseite von Optio nennt für das Abonnement von Optio Dentistry $49 im Monat",
      tr: "Optio'nun sipariş sayfası, Optio Dentistry aboneliği için aylık $49 gösterir",
    },
  },
  {
    id: "toothflix-series",
    subject: "toothflix",
    url: "https://www.ada.org/publications/ada-store-products/toothflix",
    checked: CHECKED,
    text: {
      en: "The American Dental Association sells Toothflix, 2- to 4-minute patient-education videos in English (some with Spanish voice-over), as a one-time purchase that lets a practice play them chairside, embed them on its website or email them; the complete English series is listed at $699 for ADA members and $1,049 retail",
      de: "Die American Dental Association verkauft Toothflix, 2 bis 4 Minuten lange Aufklärungsvideos auf Englisch (teils mit spanischer Tonspur), als Einmalkauf, mit dem eine Praxis sie am Behandlungsstuhl zeigen, auf der Website einbinden oder per E-Mail senden darf; die vollständige englische Serie kostet laut Liste $699 für ADA-Mitglieder und $1,049 regulär",
      tr: "Amerikan Diş Hekimleri Birliği (ADA), 2–4 dakikalık İngilizce (bir kısmı İspanyolca seslendirmeli) hasta bilgilendirme videoları olan Toothflix'i tek seferlik satın alma ile satar; klinik bunları koltuk başında gösterebilir, web sitesine ekleyebilir ya da e-postayla gönderebilir; İngilizce tam seri ADA üyelerine $699, diğer alıcılara $1,049 olarak listelenir",
    },
  },
];

const AS_OF: Partial<Record<Locale, (date: string) => string>> = {
  en: (d) => `as of ${d}`,
  de: (d) => `Stand ${d.split("-").reverse().join(".")}`,
  tr: (d) => `${d.split("-").reverse().join(".")} itibarıyla`,
  es: (d) => `a ${d.split("-").reverse().join("/")}`,
  fr: (d) => `au ${d.split("-").reverse().join("/")}`,
};

/** The host shown as the link label ("canva.com"). */
export function claimHost(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}

export function findClaim(id: string): CompetitorClaim {
  const c = CLAIMS.find((x) => x.id === id);
  if (!c) throw new Error(`Unknown competitor claim: ${id}`);
  return c;
}

/** "… ([canva.com, as of 2026-11-16](https://www.canva.com/…))": the claim with its source and date, in the page's language. */
export function claimText(c: CompetitorClaim, locale: Locale): string {
  const text = c.text[locale];
  const asOf = AS_OF[locale];
  if (!text || !asOf) throw new Error(`Claim ${c.id} has no ${locale} text`);
  return `${text} ([${claimHost(c.url)}, ${asOf(c.checked)}](${c.url}))`;
}

/** Shorthand for page files: claim("canva-plans", "en"). */
export function claim(id: string, locale: Locale): string {
  return claimText(findClaim(id), locale);
}

/** Every claim that appears (rendered) in a piece of text. */
export function claimsIn(text: string, locale: Locale): CompetitorClaim[] {
  return CLAIMS.filter((c) => c.text[locale] && text.includes(claimText(c, locale)));
}

/** Whether a piece of text names a subject (as a word). */
export function namesSubject(text: string, subject: ClaimSubject): boolean {
  return [subject.name, ...(subject.aliases ?? [])].some((n) => new RegExp(`(^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=$|[^\\p{L}])`, "u").test(text));
}

/**
 * The page as JSON with every rendered claim taken out: what remains must not
 * carry money (the price tests run on this).
 */
export function withoutClaims(json: string, locale: Locale): string {
  let out = json;
  for (const c of CLAIMS) {
    if (!c.text[locale]) continue;
    out = out.split(JSON.stringify(claimText(c, locale)).slice(1, -1)).join(" ");
  }
  return out;
}
