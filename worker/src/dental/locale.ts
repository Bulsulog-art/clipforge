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
 * The languages a market's clinics write in. The rules follow the country
 * (marketRules); the deterministic phrase checks follow the language the
 * clinic writes in (compliance.ts HARD_RULES cover every language at once).
 * Austria and Switzerland write German like Germany, but a Swiss clinic in
 * Geneva or Lugano writes French or Italian — the clinic's own language is
 * kept whenever it is one of its market's, so a Romand clinic still gets
 * the Swiss rules and the French checks.
 */
export const MARKET_LANGUAGES: Record<string, readonly string[]> = {
  TR: ["tr"],
  DE: ["de"],
  AT: ["de"],
  CH: ["de", "fr", "it"],
  ES: ["es"],
  MX: ["es"],
  FR: ["fr"],
  IT: ["it"],
  PT: ["pt"],
  BR: ["pt"],
  PL: ["pl"],
  JP: ["ja"],
  SG: ["en"],
  US: ["en"],
  GB: ["en"],
  CA: ["en", "fr"],
  AU: ["en"],
  ...Object.fromEntries(GCC.map((c) => [c, ["ar", "en"]])),
};

export function marketLanguages(country: string | undefined): readonly string[] {
  return MARKET_LANGUAGES[(country ?? "").toUpperCase()] ?? [];
}

/**
 * The language a market's videos are written in: the clinic's own when the
 * market uses it (a French-speaking Swiss clinic stays French), otherwise the
 * market's main language; the clinic's language when the market is unknown.
 */
export function marketLanguage(country: string | undefined, language?: string): string | undefined {
  const langs = marketLanguages(country);
  const own = (language ?? "").toLowerCase().slice(0, 2) || undefined;
  if (!langs.length) return own;
  return own && langs.includes(own) ? own : langs[0];
}

/**
 * Each market's own advertising rules, in the words a writer and a reviewer
 * can act on. Told to the writers up front and to the compliance reviewer
 * with the text. Sources: docs/MARKETS.md (MHLW 医療広告ガイドライン; DHA
 * Standards for Medical Advertisement Content on Social Media; Saudi MOH;
 * Kodeks Etyki Lekarskiej 2025; Singapore HCS (Advertisement) Regulations
 * 2021 + SDC Ethical Code), and for the launch markets (TR, DE, AT, CH, ES,
 * MX) the rules guides in web/src/content/guides/{tr,de,es,en}.ts — primary
 * sources are cited next to each market below.
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
  // Türkiye — Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri
  // Hakkında Yönetmelik, RG 12.11.2025 no. 33075
  // https://www.resmigazete.gov.tr/eskiler/2025/11/20251112.htm
  // (replaced the regulation of RG 29.07.2023 no. 32263,
  // https://www.resmigazete.gov.tr/eskiler/2023/07/20230729-29.htm).
  // Open or covert advertising of health services is banned; only informative
  // promotion is allowed. Price/discount/campaign information, patient
  // thank-you or satisfaction posts, sponsored promotion and before/after
  // visuals that compare results and create demand are named outright.
  if (c === "TR")
    return [
      "Türkiye — Sağlık Hizmetlerinde Tanıtım ve Bilgilendirme Faaliyetleri Hakkında Yönetmelik (Resmî Gazete 12.11.2025, no. 33075): health services may not be advertised, only explained;",
      "the video must be purely informative (bilgilendirme) and must not create demand or steer the viewer to this clinic or a treatment (no \"hemen randevu alın\", \"kaçırmayın\", no urgency),",
      "no price, ücret, indirim, kampanya, taksit, hediye or free offers, no superiority or firsts (en iyi, ilk ve tek, lider, bir numara) and no comparison with other clinics or doctors,",
      "no öncesi-sonrası (before/after) results, no patient thank-you, satisfaction or review content (hasta yorumları, teşekkür mesajları), no guarantee or certain result (garantili, kesin sonuç, ömür boyu, acısız),",
      "and nothing fear-inducing: never frighten the viewer into treatment; explain risks calmly and hedged.",
    ].join(" ");
  // Germany — Heilmittelwerbegesetz: § 3 (irreführende Werbung, e.g. success
  // presented as certain) https://www.gesetze-im-internet.de/heilmwerbg/__3.html,
  // § 7 (Werbegaben, Rabatte) https://www.gesetze-im-internet.de/heilmwerbg/__7.html,
  // § 11 (Publikumswerbung; Abs. 1 S. 3 Nr. 1: no before/after comparisons
  // for operative plastic-surgical procedures without medical need)
  // https://www.gesetze-im-internet.de/heilmwerbg/__11.html — BGH 31.07.2025,
  // I ZR 170/24 (press release 147/2025): reshaping nose or chin with
  // hyaluron injections is such a procedure
  // https://www.bundesgerichtshof.de/SharedDocs/Pressemitteilungen/DE/2025/2025147.html;
  // § 12 + Anlage (public advertising must not relate to the listed diseases)
  // https://www.gesetze-im-internet.de/heilmwerbg/__12.html;
  // Musterberufsordnung Zahnärzte § 21 (sachliche Information allowed;
  // berufswidrige — anpreisende, irreführende, vergleichende — Werbung not)
  // https://www.bzaek.de/recht/musterberufsordnung/berufliche-kommunikation.html
  if (c === "DE")
    return [
      "Germany — Heilmittelwerbegesetz (HWG) and the dental Berufsordnung of the Landeszahnärztekammer: factual information is allowed; sachlich unangemessene, anpreisende, irreführende or vergleichende Werbung is not;",
      "§ 3 HWG: never suggest that success is certain or that a treatment has no risks or side effects (no garantiert, schmerzfrei, risikofrei, dauerhaft as a promise);",
      "§ 7 HWG: no Rabatte, Gutscheine, Gewinnspiele, Werbegaben or free offers; § 11 HWG: no Vorher-Nachher comparisons of aesthetic procedures without medical need (the BGH, I ZR 170/24, counts hyaluron injections that reshape nose or chin as such procedures), no patient testimonials or third-party statements used to advertise, nothing that frightens the viewer;",
      "§ 12 HWG: do not advertise treating the diseases listed in the HWG annex (e.g. cancer, notifiable infections, addiction) — explaining a check-up is fine, promising to treat them is not;",
      "no superlatives or comparisons with other practices (beste Praxis, Nr. 1, führend), and never call the dentist a Spezialist unless it is a recognised title (Fachzahnarzt).",
    ].join(" ");
  // Austria — Zahnärztegesetz § 35 (no unwahre, unsachliche, diskriminierende
  // or standesschädigende Anpreisung oder Werbung)
  // https://www.ris.bka.gv.at/NormDokument.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20004372&Paragraf=35
  // and the Werberichtlinie of the Österreichische Zahnärztekammer
  // https://www.zahnaerztekammer.at/
  if (c === "AT")
    return [
      "Austria — § 35 Zahnärztegesetz (ZÄG) and the Werberichtlinie of the Österreichische Zahnärztekammer: dentists must refrain from any unwahre, unsachliche, diskriminierende or standesschädigende Anpreisung or Werbung;",
      "keep it factual and educational: no guarantees or promised results, no superlatives or comparisons with other dentists, no prices framed as inducements, discounts, vouchers or competitions, no patient testimonials or before/after results, nothing that frightens the viewer.",
    ].join(" ");
  // Switzerland — Medizinalberufegesetz (MedBG, SR 811.11) Art. 40 lit. d:
  // only advertising that is objective, meets a public need and is neither
  // misleading nor intrusive https://www.fedlex.admin.ch/eli/cc/2007/537/de;
  // cantonal health laws and the SSO Standesordnung (https://www.sso.ch/)
  // add to it. The same rules apply in German, French and Italian.
  if (c === "CH")
    return [
      "Switzerland — Art. 40 Medizinalberufegesetz (MedBG / LPMéd / LPMed), the cantonal health laws and, for members, the SSO Standesordnung: advertising must be objective, meet a public need, and be neither misleading nor intrusive;",
      "this applies whatever language the clinic writes in (German, French or Italian): no guarantees or promised results, no superlatives or comparisons with other practices, no discounts, vouchers or competitions, no patient testimonials or before/after results, no pressure or urgency.",
    ].join(" ");
  // Spain — Real Decreto 1907/1996 (publicidad con pretendida finalidad
  // sanitaria; art. 4: no guaranteed absence of adverse effects, no claims of
  // definitive cure, no testimonials of health professionals or famous
  // people) https://www.boe.es/eli/es/rd/1996/08/02/1907/con; Ley 14/1986
  // General de Sanidad https://www.boe.es/eli/es/l/1986/04/25/14/con; the
  // Tribunal Supremo upheld the ban on dental-clinic ads with famous people
  // (the Dentix campaign)
  // https://www.poderjudicial.es/cgpj/es/Poder-Judicial/Noticias-Judiciales/El-Tribunal-Supremo-avala-la-prohibicion-de-difundir-publicidad-de-clinicas-de-odontologia-utilizando-a-personas-famosas;
  // Consejo General de Dentistas, Código Español de Ética y Deontología Dental,
  // and the regional colegios https://consejodentistas.es/
  if (c === "ES")
    return [
      "Spain — Real Decreto 1907/1996, Ley General de Sanidad, the comunidad autónoma's health-advertising rules and the Código de Ética y Deontología Dental (Consejo General and colegios):",
      "information must be truthful, objective and prudent; never guarantee a result, a definitive cure or the absence of side effects (garantizado, sin dolor, definitivo, para toda la vida, sin riesgos),",
      "no celebrities, famous people or influencers endorsing the clinic (the Tribunal Supremo upheld this ban for dental clinics), no patient testimonials or antes y después results,",
      "no superlatives or comparisons with other clinics (el mejor, número uno, líderes), no discounts, promotions, financing hooks or sorteos, and nothing that induces unnecessary treatment.",
    ].join(" ");
  // Mexico — Ley General de Salud, Título Decimotercero (Publicidad, art.
  // 300 ff.; art. 301: health-service advertising needs authorisation)
  // https://www.diputados.gob.mx/LeyesBiblio/pdf/LGS.pdf, and the Reglamento
  // de la LGS en Materia de Publicidad (art. 6: advertising must match what
  // the service is; art. 79 fr. I: advertising the provision of health
  // services needs a permit, except services an individual professional
  // provides, who files an aviso de publicidad — trámite COFEPRIS-02-002-A)
  // (last reform DOF 08.09.2022; consolidated text at
  // https://www.diputados.gob.mx/LeyesBiblio/regla.htm, art. 79 also at
  // https://mley.mx/Reg_LGS_MP/articulo/79/), https://www.gob.mx/cofepris. DentVideo cannot know whether a clinic holds
  // a permit, so it never writes or invents a permit number.
  if (c === "MX")
    return [
      "Mexico — Ley General de Salud (Título Decimotercero, publicidad) and its Reglamento en materia de publicidad, enforced by COFEPRIS: what is said must be truthful and match what the treatment actually does;",
      "never promise guaranteed, definitive or immediate results or the absence of risks (garantizado, resultados inmediatos, sin dolor, sin riesgos), never exaggerate a treatment's qualities,",
      "no antes y después or patient testimonials presented as typical results, no celebrities, no superlatives or comparisons with other clinics (el mejor, número uno),",
      "no prices framed as inducements (descuentos, promociones, 2x1, meses sin intereses), and never write, invent or imply a COFEPRIS permit or aviso number (\"autorizado por COFEPRIS\") — health-service advertising may need one, and only the clinic can add it.",
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
  const c = (country ?? "").toUpperCase();
  // Reglamento LGS en Materia de Publicidad art. 79 — see marketRules("MX").
  if (c === "MX")
    return "Do not write any COFEPRIS permit or aviso number, \"autorizado por COFEPRIS\" or similar legend — if the clinic's advertising needs one, the clinic adds its own. No prices or promotions.";
  if (c === "JP")
    return "If the video is about a self-pay (自由診療) treatment (implants, マウスピース矯正, ホワイトニング, セラミック etc.), end the caption with a short note: that it is 自由診療（保険適用外）, that the usual course and fees are explained at the clinic, and its main risks/side effects in one phrase. No prices.";
  return "";
}
