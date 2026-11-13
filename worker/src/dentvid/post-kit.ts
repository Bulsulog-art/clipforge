import { scanHardRules } from "../dental/compliance.js";
import { ctaProblems, BLOCKING_CTA } from "../dental/style.js";
import type { ClinicProfile } from "../dental/profile.js";
import type { ItemRow } from "./rows.js";

/**
 * The "post kit": the text a clinic pastes under a video, ready to post with
 * no editing. Built from the copywriter's caption (already through the
 * compliance and accuracy reviews in dental/week.ts) and deterministic
 * additions only — so it costs no model call, needs no cache, sits outside
 * the spend guard by construction, and adds nothing a reviewer has not seen
 * except the fixed lines below, which are themselves checked here against
 * the same hard rules and CTA rules (tested in every language).
 *
 *   instagram  the caption + a soft, non-promotional invitation to ask +
 *              "📍 Clinic · City" + 5–10 hashtags, local ones first
 *   short      one line for TikTok / YouTube Shorts: the caption's first
 *              sentence, the same invitation, 3 hashtags
 *
 * Stored inside dentvid_items.copy as `post` (jsonb, no migration); the web
 * app shows it and falls back to caption + hashtags for older videos.
 */

export type PostKit = {
  v: 1;
  instagram: string;
  short: string;
  /** Without "#", 5–10, the clinic's own tag first. */
  hashtags: string[];
  /** The closing invitation used in both texts. */
  cta: string;
};

type Lang = "en" | "de" | "es" | "fr" | "tr" | "ja" | "ar" | "pl";
const LANGS: Lang[] = ["en", "de", "es", "fr", "tr", "ja", "ar", "pl"];
const langOf = (l: string | undefined): Lang => (LANGS.includes(l as Lang) ? (l as Lang) : "en");

/**
 * A soft invitation to ask — never "book now", never urgency, never a
 * generic "contact us for more information" (style.ts ctaProblems). In
 * Türkiye a clinic's post may only inform (RG 33075, style.ts TR_STEERING
 * rejects "kliniğimiz", "bize yazın"…), so there it sends the viewer to their
 * own dentist's next check-up, as the videos themselves do.
 */
const CTA: Record<Lang, { formal: string; informal: string }> = {
  en: { formal: "Questions about this? You're welcome to send us a message.", informal: "Questions about this? Feel free to send us a message." },
  de: { formal: "Fragen dazu? Schreiben Sie uns gern eine Nachricht.", informal: "Fragen dazu? Schreib uns gern eine Nachricht." },
  es: { formal: "¿Tiene dudas sobre esto? Puede escribirnos cuando quiera.", informal: "¿Tienes dudas sobre esto? Puedes escribirnos cuando quieras." },
  fr: { formal: "Une question à ce sujet ? Vous pouvez nous écrire.", informal: "Une question à ce sujet ? Tu peux nous écrire." },
  tr: { formal: "Sorularınız için kliniğimize yazabilirsiniz.", informal: "Soruların için kliniğimize yazabilirsin." },
  ja: { formal: "気になることがあれば、メッセージでお気軽にご相談ください。", informal: "気になることがあれば、メッセージで気軽に相談してね。" },
  ar: { formal: "لأي سؤال عن هذا الموضوع، يسعدنا أن تراسلونا.", informal: "لأي سؤال عن هذا الموضوع، يسعدنا أن تراسلنا." },
  pl: { formal: "Mają Państwo pytania? Chętnie odpowiemy w wiadomości.", informal: "Masz pytania? Chętnie odpowiemy w wiadomości." },
};
const CTA_TR_MARKET = {
  formal: "Merak ettiğiniz bir şey varsa bir sonraki kontrolünüzde hekiminize sorabilirsiniz.",
  informal: "Merak ettiğin bir şey varsa bir sonraki kontrolünde hekimine sorabilirsin.",
};

export function softCta(profile: Pick<ClinicProfile, "language" | "country" | "address">): string {
  const form = profile.address === "informal" ? "informal" : "formal";
  if ((profile.country ?? "").toUpperCase() === "TR") return CTA_TR_MARKET[form];
  return CTA[langOf(profile.language)][form];
}

/** Topic tags that fit any dental education video, used to top a short list up to five. */
const GENERIC_TAGS: Record<Lang, string[]> = {
  en: ["dentist", "oralhealth", "dentaltips", "healthyteeth"],
  de: ["zahnarzt", "zahngesundheit", "zahnpflege", "mundgesundheit"],
  es: ["dentista", "saludbucal", "saluddental", "higienedental"],
  fr: ["dentiste", "santebuccodentaire", "hygienedentaire", "soinsdentaires"],
  tr: ["dishekimi", "agizvedissagligi", "disbakimi", "agizsagligi"],
  ja: ["歯医者", "歯科", "歯の健康", "オーラルケア"],
  ar: ["طبيب_أسنان", "صحة_الفم", "العناية_بالأسنان", "صحة_الأسنان"],
  pl: ["dentysta", "stomatologia", "zdrowiezebow", "higienajamyustnej"],
};

/** "İzmir" → "izmir", "Kraków" → "krakow" (Turkish and Polish tags are usually written without diacritics). */
export function tagWord(s: string, language?: string): string {
  let t = s.trim();
  const l = langOf(language);
  if (l === "tr") t = t.replace(/İ/g, "i").replace(/I/g, "ı").replace(/ı/g, "i");
  t = t.toLocaleLowerCase(l === "tr" ? "tr" : l);
  if (l === "tr" || l === "pl") t = t.replace(/ł/g, "l").normalize("NFD").replace(/\p{M}/gu, "");
  // Arabic tags join words with "_"; elsewhere words run together.
  return l === "ar" ? t.replace(/[\s-]+/g, "_").replace(/[^\p{L}\p{N}_]/gu, "") : t.replace(/[^\p{L}\p{N}]/gu, "");
}

/** The city as a tag, and "dentist in <city>" the way people search it in that language. */
export function localTags(profile: Pick<ClinicProfile, "city" | "language">): string[] {
  const l = langOf(profile.language);
  const city = profile.city ? tagWord(profile.city, l) : "";
  if (city.length < 2) return [];
  const combo: Record<Lang, string> = {
    en: `dentist${city}`,
    de: `zahnarzt${city}`,
    es: `dentista${city}`,
    fr: `dentiste${city}`,
    tr: `${city}dishekimi`,
    ja: `${city}歯医者`,
    ar: `طبيب_أسنان_${city}`,
    pl: `stomatolog${city}`,
  };
  return [city, combo[l]];
}

const TAG_OK = /^[\p{L}\p{N}_]{2,40}$/u;
const cleanTag = (h: string) => h.replace(/^#/, "").trim().toLowerCase();
/** A tag the hard rules would reject ("#painless", "#garanti") never goes out, whatever produced it. */
const tagCompliant = (h: string) => scanHardRules(h.replace(/_/g, " ")).length === 0;

/**
 * 5–10 tags: the clinic's own (first, as finalHashtags put it), the local
 * ones, the copywriter's topic tags, then generic dental tags if still short.
 */
export function postHashtags(raw: string[], profile: Pick<ClinicProfile, "city" | "language">): string[] {
  const own = raw.slice(0, 1).map(cleanTag);
  const rest = raw.slice(1).map(cleanTag);
  const all = [...own, ...localTags(profile), ...rest, ...GENERIC_TAGS[langOf(profile.language)]];
  const out: string[] = [];
  for (const h of all) {
    if (!TAG_OK.test(h) || !tagCompliant(h) || out.includes(h)) continue;
    out.push(h);
    if (out.length >= 10) break;
  }
  return out;
}

/** Everything up to the end of the first sentence, at most `max` characters (cut at a word). */
export function firstSentence(text: string, max = 120): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const m = flat.match(/^.+?(?:[.!?](?=\s|$)|[。！？])/u);
  const s = (m ? m[0] : flat).trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > max / 2 ? cut.slice(0, at) : cut).replace(/[\s,;:–—-]+$/u, "")}…`;
}

/**
 * The copywriter is asked to end on "a soft call to book a check-up". The
 * kit has its own closing line, so a last paragraph that only does that is
 * dropped rather than doubled — unless it carries a link (the clinic's
 * booking URL), or the caption is Japanese (where the last paragraph is the
 * 自由診療 note the rules require).
 */
const BOOKING = /\b(book|appointment|check-?up|randevu|kontrol|termin|cita|revisión|rendez-vous|rdv|wizyt|umów)|موعد|زيارت|زيارة/iu;
export function trimClosing(caption: string, language?: string): string {
  const paras = caption.trim().split(/\n\s*\n/);
  if (langOf(language) === "ja" || paras.length < 2) return caption.trim();
  const last = paras[paras.length - 1];
  if (/https?:\/\//i.test(last) || !BOOKING.test(last) || last.length > 220) return caption.trim();
  return paras.slice(0, -1).join("\n\n").trim();
}

export function buildPostKit(
  copy: { caption: string; hashtags: string[] },
  profile: Pick<ClinicProfile, "name" | "city" | "language" | "country" | "address">,
): PostKit {
  const cta = softCta(profile);
  const hashtags = postHashtags(copy.hashtags, profile);
  const body = trimClosing(copy.caption, profile.language);
  const place = [profile.name, profile.city].map((s) => s?.replace(/\s+/g, " ").trim()).filter(Boolean).join(" · ");
  const tags = (list: string[]) => list.map((h) => `#${h}`).join(" ");
  // Instagram allows 2,200 characters; the body gives way, never the closing lines.
  const tail = [cta, place ? `📍 ${place}` : "", tags(hashtags)].filter(Boolean).join("\n\n");
  const room = 2200 - tail.length - 2;
  const instagram = `${body.length > room ? `${body.slice(0, room - 1).trimEnd()}…` : body}\n\n${tail}`;
  // Short: the opening sentence, the invitation and three tags (local first, then the topic).
  const shortTags = [...localTags(profile).filter((h) => hashtags.includes(h)), ...hashtags.slice(1)].filter((h, i, a) => a.indexOf(h) === i).slice(0, 3);
  const short = `${firstSentence(body)} ${cta}\n${tags(shortTags)}`.trim();
  return { v: 1, instagram, short, hashtags, cta };
}

/** What the fixed parts of a kit would get wrong: hard-rule hits and blocking CTA findings (tests run this for every market). */
export function postKitProblems(kit: PostKit, country: string | undefined): string[] {
  const out = scanHardRules(`${kit.cta}\n${kit.hashtags.join(" ")}`).map((h) => `${h.rule}: "${h.match}"`);
  for (const p of ctaProblems(kit.cta, country)) if (BLOCKING_CTA.has(p.code) || p.code === "generic" || p.code === "exclamation") out.push(`cta ${p.code}: ${p.detail}`);
  return out;
}

/**
 * A stored row with its post kit added under copy.post. Rows without a
 * caption (rejected topics) are returned as they are; a kit that cannot be
 * built never costs the clinic the video.
 */
export function withPostKit(row: ItemRow, profile: Pick<ClinicProfile, "name" | "city" | "language" | "country" | "address">): ItemRow {
  const copy = row.copy as { caption?: unknown; hashtags?: unknown } | undefined;
  if (!copy || typeof copy.caption !== "string" || !copy.caption.trim()) return row;
  try {
    const hashtags = Array.isArray(copy.hashtags) ? copy.hashtags.filter((h): h is string => typeof h === "string") : [];
    return { ...row, copy: { ...copy, post: buildPostKit({ caption: copy.caption, hashtags }, profile) } };
  } catch {
    return row;
  }
}
