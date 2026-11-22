import { scanHardRules, scanMarketRules } from "../dental/compliance.js";
import { captionNotice, withoutNotice } from "../dental/mandatory-notice.js";
import { ctaProblems, BLOCKING_CTA } from "../dental/style.js";
import { closingLineFindings } from "../dental/closing-line.js";
import type { ClinicProfile } from "../dental/profile.js";
import type { ItemRow } from "./rows.js";
import { INSTAGRAM_MAX_HASHTAGS } from "../lib/hashtags.js";

/**
 * The "post kit": the text a clinic pastes under a video, ready to post with
 * no editing. Built from the copywriter's caption (already through the
 * compliance and accuracy reviews in dental/week.ts) and deterministic
 * additions only — so it costs no model call, needs no cache, sits outside
 * the spend guard by construction, and adds nothing a reviewer has not seen
 * except the fixed lines below, which are themselves checked here against
 * the same hard rules and CTA rules (tested in every language).
 *
 *   instagram  the caption + the market's required warning, if any
 *              (Türkiye: RG 33075 md. 7/1-k, mandatory-notice.ts) + a soft,
 *              non-promotional invitation to ask + "📍 Clinic · City" +
 *              at most 5 hashtags (Instagram's cap since December 2025,
 *              lib/hashtags.ts), the clinic's own first, then local ones
 *   short      one line for TikTok / YouTube Shorts: the caption's first
 *              sentence, the same invitation, the required warning, 3 hashtags
 *
 * Stored inside dentvid_items.copy as `post` (jsonb, no migration); the web
 * app shows it and falls back to caption + hashtags for older videos.
 */

export type PostKit = {
  v: 1;
  instagram: string;
  short: string;
  /** Without "#", at most INSTAGRAM_MAX_HASHTAGS (5), the clinic's own tag first. */
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

/**
 * More ways to say the same soft invitation. A dentist reviewing a sample
 * week noticed that every post ended on the identical line; the kit now
 * rotates by video (the first variant is the one above, so a kit built
 * without a seed reads as before). Each variant is held to the same rules in
 * the tests: hard rules, CTA rules, no steering in Türkiye.
 */
const CTA_MORE: Partial<Record<Lang, { formal: string; informal: string }[]>> = {
  en: [
    { formal: "If this raised a question for you, send us a message and we'll answer it.", informal: "If this raised a question for you, send us a message and we'll answer it." },
    { formal: "Wondering how this applies to you? Ask us at your next visit.", informal: "Wondering how this applies to you? Ask us at your next visit." },
  ],
  de: [
    { formal: "Wenn Sie dazu eine Frage haben, schreiben Sie uns gern.", informal: "Wenn du dazu eine Frage hast, schreib uns gern." },
    { formal: "Wie das bei Ihnen aussieht, besprechen wir gern beim nächsten Termin.", informal: "Wie das bei dir aussieht, besprechen wir gern beim nächsten Termin." },
  ],
  es: [
    { formal: "Si le ha surgido alguna duda, puede preguntarnos en su próxima visita.", informal: "Si te ha surgido alguna duda, puedes preguntarnos en tu próxima visita." },
    { formal: "¿Quiere saber cómo aplica a su caso? Escríbanos y se lo explicamos.", informal: "¿Quieres saber cómo aplica a tu caso? Escríbenos y te lo explicamos." },
  ],
  fr: [{ formal: "Si cela vous pose une question, parlons-en lors de votre prochain rendez-vous.", informal: "Si ça te pose une question, parlons-en lors de ton prochain rendez-vous." }],
  pl: [{ formal: "Jeśli to rodzi pytania, porozmawiajmy o tym przy następnej wizycie.", informal: "Jeśli to rodzi pytania, porozmawiajmy o tym przy następnej wizycie." }],
};
const CTA_TR_MORE = [
  { formal: "Sizin için ne geçerli olduğunu en iyi kendi diş hekiminiz söyleyebilir.", informal: "Senin için ne geçerli olduğunu en iyi kendi diş hekimin söyleyebilir." },
  { formal: "Bu konuda aklınıza takılanı bir sonraki muayenenizde hekiminize danışabilirsiniz.", informal: "Bu konuda aklına takılanı bir sonraki muayenende hekimine danışabilirsin." },
];

/** A stable index for a text: the same video always gets the same variant. */
function pick(seed: string, n: number): number {
  if (!seed || n <= 1) return 0;
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return (h >>> 0) % n;
}

export function ctaVariants(profile: Pick<ClinicProfile, "language" | "country" | "address">): string[] {
  const form = profile.address === "informal" ? "informal" : "formal";
  if ((profile.country ?? "").toUpperCase() === "TR") return [CTA_TR_MARKET, ...CTA_TR_MORE].map((c) => c[form]);
  const l = langOf(profile.language);
  return [CTA[l], ...(CTA_MORE[l] ?? [])].map((c) => c[form]);
}

/**
 * The kit's closing invitation. A clinic's own closing line
 * (profile.closingLine) is used when it passes the same rules as ours (hard
 * rules, market rules, the CTA rules; in Türkiye nothing that steers to the
 * clinic); otherwise one of ours, chosen by `seed` (the video's caption).
 */
export function softCta(profile: Pick<ClinicProfile, "language" | "country" | "address"> & { closingLine?: string }, seed = ""): string {
  const own = profile.closingLine?.trim();
  if (own && closingLineProblems(own, profile.country).length === 0) return own;
  const all = ctaVariants(profile);
  return all[pick(seed, all.length)];
}

/** Why a clinic's own closing line cannot go out as written (empty: it can). */
export function closingLineProblems(line: string, country: string | undefined): string[] {
  return closingLineFindings(line, country).map((f) => f.detail);
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
 * At most five tags (Instagram's cap, INSTAGRAM_MAX_HASHTAGS), most relevant
 * first: the clinic's own (first, as finalHashtags put it), the local ones,
 * the copywriter's topic tags, then generic dental tags if still short.
 * Duplicates are dropped and the order is kept.
 */
export function postHashtags(raw: string[], profile: Pick<ClinicProfile, "city" | "language">): string[] {
  // Turkish and Polish tags are written without diacritics, like the local
  // and generic ones ("#izmirdishekimi"): one spelling per post, not
  // "#sütdişi" next to "#dishekimi".
  const l = langOf(profile.language);
  const spell = (h: string) => (l === "tr" || l === "pl" ? tagWord(cleanTag(h), l) : cleanTag(h));
  const own = raw.slice(0, 1).map(cleanTag);
  const rest = raw.slice(1).map(spell);
  const all = [...own, ...localTags(profile), ...rest, ...GENERIC_TAGS[langOf(profile.language)]];
  const out: string[] = [];
  for (const h of all) {
    if (!TAG_OK.test(h) || !tagCompliant(h) || out.includes(h)) continue;
    out.push(h);
    if (out.length >= INSTAGRAM_MAX_HASHTAGS) break;
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
  profile: Pick<ClinicProfile, "name" | "city" | "language" | "country" | "address"> & { closingLine?: string; bookingUrl?: string },
): PostKit {
  const cta = softCta(profile, copy.caption);
  const hashtags = postHashtags(copy.hashtags, profile);
  // A required warning is a fixed line of the kit, never cut with the body.
  const notice = captionNotice(profile.country);
  const body = trimClosing(notice ? withoutNotice(copy.caption, notice) : copy.caption, profile.language);
  const place = [profile.name, profile.city].map((s) => s?.replace(/\s+/g, " ").trim()).filter(Boolean).join(" · ");
  const tags = (list: string[]) => list.map((h) => `#${h}`).join(" ");
  // Instagram allows 2,200 characters; the body gives way, never the closing lines.
  // Where a viewer books, outside Türkiye (RG 33075: information only), when
  // the clinic gave a link and the caption does not already carry it.
  const booking =
    profile.bookingUrl && (profile.country ?? "").toUpperCase() !== "TR" && !body.includes(profile.bookingUrl) ? `🔗 ${profile.bookingUrl}` : "";
  const tail = [notice ?? "", cta, booking, place ? `📍 ${place}` : "", tags(hashtags)].filter(Boolean).join("\n\n");
  const room = 2200 - tail.length - 2;
  const instagram = `${body.length > room ? `${body.slice(0, room - 1).trimEnd()}…` : body}\n\n${tail}`;
  // Short: the opening sentence, the invitation and three tags (local first, then the topic).
  const shortTags = [...localTags(profile).filter((h) => hashtags.includes(h)), ...hashtags.slice(1)].filter((h, i, a) => a.indexOf(h) === i).slice(0, 3);
  const short = `${firstSentence(body)} ${cta}${notice ? `\n${notice}` : ""}\n${tags(shortTags)}`.trim();
  return { v: 1, instagram, short, hashtags, cta };
}

/** What the fixed parts of a kit would get wrong: hard-rule hits and blocking CTA findings (tests run this for every market). */
export function postKitProblems(kit: PostKit, country: string | undefined): string[] {
  const fixed = `${kit.cta}\n${kit.hashtags.join(" ")}`;
  const out = [...scanHardRules(fixed), ...scanMarketRules(fixed, country)].map((h) => `${h.rule}: "${h.match}"`);
  // The market's required warning must be in both texts, word for word.
  const notice = captionNotice(country);
  if (notice && !(kit.instagram.includes(notice) && kit.short.includes(notice))) out.push(`notice missing: "${notice}"`);
  for (const p of ctaProblems(kit.cta, country)) if (BLOCKING_CTA.has(p.code) || p.code === "generic" || p.code === "exclamation") out.push(`cta ${p.code}: ${p.detail}`);
  return out;
}

/**
 * A stored row with its post kit added under copy.post. Rows without a
 * caption (rejected topics) are returned as they are; a kit that cannot be
 * built never costs the clinic the video.
 */
export function withPostKit(
  row: ItemRow,
  profile: Pick<ClinicProfile, "name" | "city" | "language" | "country" | "address"> & { closingLine?: string; bookingUrl?: string },
): ItemRow {
  const copy = row.copy as { caption?: unknown; hashtags?: unknown } | undefined;
  if (!copy || typeof copy.caption !== "string" || !copy.caption.trim()) return row;
  try {
    const hashtags = Array.isArray(copy.hashtags) ? copy.hashtags.filter((h): h is string => typeof h === "string") : [];
    return { ...row, copy: { ...copy, post: buildPostKit({ caption: copy.caption, hashtags }, profile) } };
  } catch {
    return row;
  }
}
