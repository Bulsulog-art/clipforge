/**
 * What changes per language and per market beyond the words themselves:
 * how speech is measured, how a clinic addresses a viewer, and the market's
 * own advertising rules. Research and sources: docs/MARKETS.md.
 */

/** Han ideographs, kana, Hangul — scripts written without spaces between words (Hangul aside). */
export const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** Languages whose text is not separated into words by spaces. */
const UNSPACED = new Set(["ja", "zh"]);

export function isUnspaced(language: string | undefined): boolean {
  return UNSPACED.has((language ?? "").toLowerCase().slice(0, 2));
}

/**
 * Speech is measured in what the language speaks in. Japanese has no word
 * boundaries, so "2.3 words a second" meant nothing and a 400-character
 * narration counted as one word (narrationProblems rejected every Japanese
 * script). Japanese narration is ~300-350 characters a minute; Arabic and
 * Polish words are long (clitics, inflection), so fewer of them per second.
 */
export type SpeechRate = { unit: "words" | "characters"; perSecond: number };

const RATES: Record<string, SpeechRate> = {
  ja: { unit: "characters", perSecond: 5.5 },
  zh: { unit: "characters", perSecond: 4.2 },
  ar: { unit: "words", perSecond: 2.0 },
  pl: { unit: "words", perSecond: 2.0 },
};

export function speechRate(language: string | undefined): SpeechRate {
  return RATES[(language ?? "").toLowerCase().slice(0, 2)] ?? { unit: "words", perSecond: 2.3 };
}

/** Length of a text in the language's speech unit: words, or (for Japanese) characters without spaces and punctuation. */
export function speechUnits(text: string, language: string | undefined): number {
  if (speechRate(language).unit === "characters") return [...text.replace(/[\s\p{P}\p{S}]/gu, "")].length;
  return text.split(/\s+/).filter(Boolean).length;
}

/** "about 120 words" / "about 330 characters" for a given length in seconds. */
export function speechTarget(seconds: number, language: string | undefined): string {
  const r = speechRate(language);
  return `${Math.round(seconds * r.perSecond)} ${r.unit === "characters" ? "Japanese characters (kana and kanji, spaces and punctuation not counted)" : "words"}`;
}

/** How long a hook may be, in the language's own terms. */
export function hookLimit(language: string | undefined): { text: string; max: number } {
  return isUnspaced(language)
    ? { text: "under 20 characters", max: 28 }
    : { text: "under 9 words", max: 12 };
}

/**
 * How the clinic addresses the viewer. The European languages mark it with a
 * pronoun (Sie/du); Japanese marks it with the verb ending (です・ます), Arabic
 * with gender — a clinic speaks to men and women at once, so it uses the
 * plural, which is also the polite form — and Polish clinics write to
 * "Państwo" or to "ty".
 */
export function addressFor(language: string | undefined, address: "formal" | "informal"): string {
  const lang = (language ?? "").toLowerCase().slice(0, 2);
  if (lang === "ja")
    return address === "informal"
      ? `Use friendly polite Japanese (です・ます with soft endings like 〜ですよね, 〜しましょう) consistently; never plain/casual form (だ・である), never 尊敬語 overload, never "あなた".`
      : `Use polite Japanese (です・ます調) consistently, every line; warm 丁寧語, not stiff 尊敬語, and never "あなた" — address the viewer implicitly or as 「皆さん」.`;
  if (lang === "ar")
    return address === "informal"
      ? `Address the viewer with the plural "you" (أنتم: تستطيعون، راجعوا، أسنانكم) consistently — it includes men and women; never singular masculine or feminine forms.`
      : `Address the viewer politely with the plural "you" (أنتم / حضراتكم: يمكنكم، راجعوا طبيب الأسنان، أسنانكم) consistently — it includes men and women; never singular masculine or feminine forms.`;
  if (lang === "pl")
    return address === "informal"
      ? `Address the viewer informally with "ty" (masz, zapytaj, twoje zęby) consistently, every line.`
      : `Address the viewer formally with "Państwo" (Państwo mogą, prosimy zapytać, Państwa zęby) consistently, every line — never mix with "ty".`;
  return address === "informal"
    ? `Address the viewer informally (e.g. du / tú / tu / sen) and consistently, every line.`
    : `Address the viewer formally (e.g. Sie / usted / vous / siz) and consistently, every line.`;
}

const GCC = ["AE", "SA", "QA", "KW", "BH", "OM"];

/**
 * Each market's own advertising rules, in the words a writer and a reviewer
 * can act on. Told to the writers up front and to the compliance reviewer
 * with the text. Sources: docs/MARKETS.md (MHLW 医療広告ガイドライン; DHA
 * Standards for Medical Advertisement Content on Social Media; Saudi MOH;
 * Kodeks Etyki Lekarskiej 2025; Singapore HCS (Advertisement) Regulations
 * 2021 + SDC Ethical Code).
 */
export function marketRules(country: string | undefined): string {
  const c = (country ?? "").toUpperCase();
  if (c === "JP")
    return [
      "Japan — 医療法 and the MHLW 医療広告ガイドライン apply to a clinic's own social posts:",
      "no 比較優良広告 (better than other clinics: 地域一番, 日本一, No.1, 最高, 最先端), no 誇大広告 (絶対, 必ず, 確実, 無痛, 痛くない, 完治, 永久, 安心・安全 as a promise),",
      "no 体験談 (patients' accounts of treatment or results), no ビフォーアフター or 症例写真, no prices, 割引, キャンペーン, モニター募集 or free offers,",
      "never name an aligner, whitening or implant brand (many aligner systems are 未承認医療機器 in Japan and need extra disclosures),",
      "when the video is about a self-pay (自由診療) treatment such as implants, マウスピース矯正, ホワイトニング or セラミック, mention that it is 自由診療 (保険適用外) and that there are risks or side effects to discuss with the dentist (e.g. 痛み・腫れ・知覚過敏などが出ることがあります).",
    ].join(" ");
  if (GCC.includes(c))
    return [
      "Gulf — DHA Standards for Medical Advertisement Content on Social Media, DoH Abu Dhabi, MOHAP and Saudi MOH rules apply:",
      "never say the best (الأفضل), 100%, no side effects (بدون آثار جانبية), immediate or instant results (نتائج فورية), never claim superiority over other doctors or clinics,",
      "no prices, discounts or offers, no patient testimonials or before/after results, no filming or describing an identifiable patient, no promotion of the individual dentist (Saudi Arabia bans practitioners advertising themselves) — speak as the clinic,",
      "and respect local culture: modest, family-friendly wording.",
    ].join(" ");
  if (c === "PL")
    return [
      "Poland — Kodeks Etyki Lekarskiej (2025, art. 71): a dentist may inform about services, ethically; no comparative or misleading claims (najlepszy, nr 1),",
      "no guarantees, no testimonials, no prices framed as inducements, and a dentist must not use professional authority to endorse products or brands (toothpaste, brushes, aligner brands).",
    ].join(" ");
  if (c === "SG")
    return [
      "Singapore — Healthcare Services (Advertisement) Regulations 2021 and the SDC Ethical Code:",
      "no testimonials or endorsements, no before/after or outcome claims, no superlatives or comparisons, no price-led promotion; factual and verifiable only.",
    ].join(" ");
  return "";
}

/**
 * Extra instructions for the caption under a video, per market. Japan's
 * 限定解除 conditions want fees and risks next to any description of a
 * self-pay treatment; DentVideo does not know the clinic's fees, so the
 * caption points to the clinic for them and names the risks.
 */
export function captionRules(country: string | undefined): string {
  if ((country ?? "").toUpperCase() === "JP")
    return "If the video is about a self-pay (自由診療) treatment (implants, マウスピース矯正, ホワイトニング, セラミック etc.), end the caption with a short note: that it is 自由診療（保険適用外）, that the usual course and fees are explained at the clinic, and its main risks/side effects in one phrase. No prices.";
  return "";
}
