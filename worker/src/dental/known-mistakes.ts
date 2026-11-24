/**
 * Known mistakes: wording that reached a rendered DentVideo video at least
 * once, written down so it can never reach a clinic again.
 *
 * Every rule here has a row in docs/KNOWN_MISTAKES.md (the `id`), a verbatim
 * regression test (known-mistakes.test.ts), and runs on every script before
 * any paid reviewer (week.ts scriptProblems, captionProblems). A hit sends
 * the draft back to the writer with the fix; a draft still failing after
 * three attempts is rejected, never published.
 *
 * The rule of the register: every new mistake found in a render gets a row
 * and a check here (or in the check that already owns its class) before the
 * next release.
 *
 * Rules are as general as they can be without rejecting good scripts: each
 * one was run over every published sample and every reference script
 * (fixtures/published-samples.json, examples.ts) and flags only the known-bad
 * ones. Where no general rule is safe, the rule is the bad phrase itself.
 *
 * Pure and dependency-free on purpose: scripts/sync-hard-rules.mjs mirrors it
 * into web/src/lib/dentvid/known-mistakes.ts, where the web tests run it over
 * the live preview library and the examples pages.
 */

export type KnownWhere = "hook" | "screen" | "narration" | "caption";

export type KnownRule = {
  /** Row in docs/KNOWN_MISTAKES.md. */
  id: string;
  code: string;
  /** Two-letter languages the rule applies to; "*" for all. */
  languages: readonly string[] | "*";
  where: readonly KnownWhere[];
  /** Every pattern must match the sentence; the first one's match is reported. */
  all: readonly RegExp[];
  /** No pattern here may match the sentence (negation, a temporary crown…). */
  none?: readonly RegExp[];
  /** Must match somewhere in the whole script for the rule to apply at all. */
  context?: RegExp;
  why: string;
  fix: string;
};

export type KnownHit = { id: string; code: string; where: KnownWhere; line: string; match: string; why: string; fix: string };

// \b only knows ASCII letters; these use explicit Unicode letter boundaries.
const L = "[\\p{L}\\p{N}]";
const w = (s: string) => new RegExp(`(?<!${L})(?:${s})(?!${L})`, "iu");
const ALL: readonly KnownWhere[] = ["hook", "screen", "narration", "caption"];

export const KNOWN_RULES: readonly KnownRule[] = [
  // ---------------------------------------------------------------- clinical
  {
    id: "KM-03",
    code: "crown_before_healing",
    languages: ["tr", "en", "de", "es", "fr"],
    where: ALL,
    // "Asıl parça iyileşmeden gelir." (TR implant hero, discarded render, Nov 2026):
    // the final crown before healing — the opposite of the narration and of
    // the clinical guide (implant healing before full load).
    all: [
      w(
        "(asıl|kalıcı|son|esas) (parça|diş|kron|kuron|protez|üst yapı)\\p{L}*|(final|permanent|real|definitive) (crown|tooth|teeth|restoration)|crowns?|endgültige\\p{L}* (krone|zahn|zähne|versorgung)|feste\\p{L}* (zahn|zähne)|kronen?|corona definitiva|coronas? definitivas?|diente definitivo|prótesis definitiva|couronne définitive|dent définitive|prothèse définitive",
      ),
      w(
        "iyileşmeden|kaynaşmadan|before (the )?(\\p{L}+ )?(heals?|healing|has healed|is healed|osseointegrat\\p{L}*)|vor der (ein)?heilung|bevor [^.]{0,30}(eingeheilt|verheilt|heilt)|antes de (que )?[^.]{0,20}(cicatri\\p{L}*|cure|sane|integr\\p{L}*)|avant (la |que )?[^.]{0,20}(cicatris\\p{L}*|guéri\\p{L}*|intégr\\p{L}*)",
      ),
    ],
    none: [
      w("geçici|temporary|provisional|provisori\\p{L}*|provisoire|\\p{L}+(maz|mez)|değil|asla|not|never|no|isn't|doesn't|won't|only after|nicht|nie|kein\\p{L}*|erst nach|nunca|solo después|pas|jamais|qu['’]après"),
    ],
    why: "says the final crown/tooth comes before the implant has healed — clinically wrong (healing comes before the final load)",
    fix: "say the implant heals first and the final crown comes after healing (or leave the order out)",
  },
  {
    id: "KM-22",
    code: "aligner_vague_wear_time",
    languages: "*",
    where: ALL,
    context: w("aligner\\p{L}*|şeffaf plak\\p{L}*|invisalign|alineador\\p{L}*|gouttière\\p{L}*|schiene\\p{L}*"),
    // TR aligner topic, Nov 2026: "most of the day" against the clinical
    // guide's 20–22 hours, rejected by the reviewer three times.
    all: [
      w(
        "most of the day|majority of the day|günün çoğu\\p{L}*|günün büyük (kısmı|bölümü)\\p{L}*|(den )?(größten teil|großteil) des tages|meiste zeit des tages|la mayor parte del día|casi todo el día|la plupart de la journée|une grande partie de la journée",
      ),
    ],
    why: "a vague aligner wear time; the reviewers reject it against the usual 20–22 hours a day",
    fix: "say aligners are usually worn 20–22 hours a day, as the dentist prescribes, and put that number on screen too — or leave wear time out",
  },
  // ------------------------------------------------------- hooks and framing
  {
    id: "KM-10",
    code: "clickbait",
    languages: "*",
    where: ALL,
    // "Aligner raus beim Kaffee? Der Grund überrascht." (DE aligner, discarded render, Nov 2026).
    all: [
      w(
        [
          "you won['’]?t believe|you will not believe|the reason (will |may |might )?(surprise|shock)s? you|will (surprise|shock) you|dentists hate|nobody tells you|no one tells you|this one trick|what happens next",
          "der grund (wird sie )?überrascht|das wird sie überraschen|sie werden (es )?nicht glauben|das (verrät|sagt) ihnen (keiner|niemand)",
          "bunu bilmiyordunuz|bunu bilmiyorsunuz|inanamayacaksınız|(sebebi|nedeni) (sizi )?şaşırtacak|kimse (size )?söylemiyor|şok olacaksınız",
          "no (te )?vas a creer|no lo vas a creer|no creerás|la razón te sorprenderá|te va a sorprender|nadie te lo (dice|cuenta)",
          "vous n['’]allez pas (le )?croire|la raison va vous surprendre|ça va vous surprendre|personne ne vous le dit",
          "non ci crederai|il motivo ti sorprenderà|você não vai acreditar|o motivo vai te surpreender|nie uwierzysz|powód (was|cię) zaskoczy",
        ].join("|"),
      ),
    ],
    why: "clickbait: it promises a surprise instead of naming the subject, and a practice's feed loses trust with it",
    fix: "name the subject in patient words and open a real question (a moment, a myth, a mistake)",
  },
  {
    id: "KM-20",
    code: "vague_here",
    languages: "*",
    where: ALL,
    // "Çocuk dişlerinde çürük bazen burada başlıyor." (TR children, discarded render, Nov 2026):
    // the video has nothing on screen to point at.
    all: [
      w(
        "burada başl\\p{L}*|(it|this|that|decay|trouble|it all) (all )?(starts|begins) (right )?here|here['’]?s where it (starts|begins)|(genau )?hier (beginnt|fängt) (es|alles|das)|(aquí|acá) (empieza|comienza)|(empieza|comienza) (justo )?aquí|(ça|cela|tout) commence (ici|là)",
      ),
    ],
    why: "points at \"here\", but a text-and-voice video has nothing on screen to point at",
    fix: "name the place (along the gumline, between the back teeth, under the aligner)",
  },
  // ---------------------------------------------------------- German
  {
    id: "KM-18",
    code: "de_english_loanword",
    languages: ["de"],
    where: ALL,
    // "Nur Wasser im Tray", "Im Tray" / "Ohne Tray" (DE aligner sample, Nov 2026).
    all: [w("trays?|tooth|teeth|toothbrush\\p{L}*|toothpaste|brush(es)?|mouthwash|gums?|cleaning|flossing")],
    why: "an English word in a German script",
    fix: "write the German word: Schiene (Tray), Zahn/Zähne (tooth/teeth), Zahnbürste, Zahnpasta, Mundspülung, Zahnfleisch, Reinigung, Zahnseide",
  },
  {
    id: "KM-36",
    code: "de_drinks_taken_out",
    languages: ["de"],
    where: ALL,
    // "Andere Getränke bitte vorher rausnehmen." (DE aligner, reviewer, Nov 2026).
    all: [w("getränke (bitte )?(vorher )?(raus|heraus)(nehmen|genommen)")],
    why: "says to take the drinks out — it is the aligners that come out",
    fix: "\"für andere Getränke die Aligner vorher herausnehmen\"",
  },
  // ---------------------------------------------------------- French
  {
    id: "KM-17",
    code: "fr_bare_noun_after_imperative",
    languages: ["fr"],
    where: ALL,
    // "Évitez vin rouge" (FR whitening sample, Nov 2026). Case-sensitive on
    // purpose: the noun after the verb starts lower-case; "Évitez-le",
    // "Évitez de…", "Buvez beaucoup d'eau" and adverbs in -ment pass.
    all: [
      new RegExp(
        // "quand vous buvez froid" (FR hook bank) is the indicative, not an order.
        `(?<!${L})(?<![Vv]ous\\s+)(?:[ÉéEe]vitez|[Ll]imitez|[Bb]uvez|[Mm]angez|[Rr]éduisez|[Pp]rivilégiez|[Pp]référez|[Aa]rrêtez)\\s+` +
          `(?!(?:le|la|les|l|un|une|des|du|de|d|au|aux|à|votre|vos|ton|ta|tes|ce|cet|cette|ces|son|sa|ses|leur|leurs|tout|toute|tous|toutes|plutôt|surtout|beaucoup|peu|assez|trop|moins|plus|davantage|bien|si|en|y|pas|ensuite|après|avant|pendant|toujours|jamais|cela|ça|quand|dès|lors|immédiatement|froid|chaud|tiède|glacé|sucré|salé|acide|léger|frais)(?!\\p{L}))` +
          `(?!\\p{L}+ment(?!\\p{L}))\\p{Ll}\\p{L}*`,
        "u",
      ),
    ],
    why: "an imperative followed by a bare noun, without its article — telegraphic, not French",
    fix: "add the article: \"Évitez le vin rouge\", \"Limitez le café et le thé\"",
  },
  {
    id: "KM-11",
    code: "fr_meaningless_line",
    languages: ["fr"],
    where: ALL,
    // "La dent, elle, reste en place." (FR whitening, discarded render, Nov 2026).
    all: [w("la dent,? elle,? reste en place")],
    why: "says nothing (nobody thought whitening moves the tooth)",
    fix: "cut it, or say what whitening does not change (\"l'émail n'est généralement pas abîmé\")",
  },
  // ---------------------------------------------------------- Spanish
  {
    id: "KM-15",
    code: "es_we_verb_with_third_person_subject",
    languages: ["es"],
    where: ALL,
    // "Aquí lo retiramos el dentista o el higienista con instrumentos." (ES cleaning, discarded render, Nov 2026).
    all: [w("\\p{L}+(amos|emos|imos) (el|la) (dentista|higienista|odontólog[oa]|doctora?|especialista|ortodoncista|periodoncista)")],
    why: "a \"we\" verb with \"el dentista\" as its subject — ungrammatical",
    fix: "\"el dentista o el higienista lo retira\" (third person), or \"lo retiramos\" with no subject",
  },
  {
    id: "KM-16",
    code: "es_subjectless_card",
    languages: ["es"],
    where: ["hook", "screen"],
    // "Llega al borde de la encía." (ES cleaning sample, Nov 2026): on a card
    // of its own the subject (the cleaning) is lost.
    all: [/^\s*(?:Llega|Llegan|Alcanza|Alcanzan)\s+(?:al|a la|a los|a las|hasta)(?![\p{L}])/iu],
    why: "a card with no subject: on its own the viewer cannot tell what reaches where",
    fix: "name the subject on the card: \"La limpieza llega al borde de la encía.\"",
  },
  // ---------------------------------------------------------- Turkish
  {
    id: "KM-19",
    code: "tr_rengi_donmek",
    languages: ["tr"],
    where: ALL,
    // "Çayı yudumladınız, plağınızın rengi hemen dönmeye başladı mı?" (TR aligner preview, Nov 2026).
    all: [w("rengi (hemen |çabuk |birden )?dön\\p{L}*")],
    why: "\"rengi dönmek\" is said of a face or of food going off, not of a stained aligner — awkward Turkish",
    fix: "\"renk alır\", \"sararır\" or \"lekelenir\"",
  },
  {
    id: "KM-14",
    code: "tr_meaningless_compare",
    languages: ["tr"],
    where: ALL,
    // "Temizlik: Gece sonrası dişi hazırlar." (TR children, discarded render, Nov 2026).
    all: [w("gece sonrası dişi hazırlar")],
    why: "means nothing (cleaning \"prepares the tooth after the night\")",
    fix: "say what cleaning does: it removes the sugar left on the teeth",
  },
  {
    id: "KM-38",
    code: "tr_film_for_xray",
    languages: ["tr"],
    where: ALL,
    // "Filmlerde görülen eksik kemik, herkeste aynı çıkmaz." (TR implant, round 2 bench).
    all: [w("film(lerde|de|inde|lerinde) (görülen|görünen)")],
    why: "\"film\" heard once means a movie; the viewer hears \"bone loss seen in films\"",
    fix: "\"röntgende görülen\"",
  },
  // ---------------------------------------------------------- English
  {
    id: "KM-12",
    code: "en_not_the_goal",
    languages: ["en"],
    where: ALL,
    // Compare "Not the goal: Enamel thinning" (EN whitening, discarded render, Nov 2026).
    all: [w("not the goal")],
    why: "labels a side effect as \"not the goal\" — nobody aims for enamel thinning; the card reads as nonsense",
    fix: "\"Not typical: enamel thinning\" or say the fact plainly",
  },
  {
    id: "KM-13",
    code: "en_strong_colors",
    languages: ["en"],
    where: ALL,
    // "Avoid strong colors briefly" (EN whitening, discarded render, Nov 2026);
    // "Avoid strong colored foods for a day." and "Avoid strongly colored foods
    // and drinks for a day or two." (the old English live preview, Nov 2026),
    // which the first version of this rule missed.
    all: [w("strong(?:ly)?[ -]colou?r(?:s|ed)?")],
    why: "\"strong colors\" is not what stains teeth; the patient cannot act on it",
    fix: "\"skip dark drinks like coffee, tea and red wine for a day or two\"",
  },
  // ---------------------------------------------------------- translationese
  {
    id: "KM-37",
    code: "translationese",
    languages: ["de", "tr"],
    where: ALL,
    // Round 2 bench (Nov 2026): "Kaffee pausiert also kurz", "bölge sakin
    // görünüyorsa", "Yumuşak başlama: kontrollü çiğneme olur".
    all: [w("kaffee pausiert|bölge sakin görünüyor\\p{L}*|kontrollü çiğneme olur")],
    why: "translated, not how a dentist talks",
    fix: "say it the way a dentist would to a patient in the chair",
  },
];

const lang2 = (l: string | undefined) => (l ?? "").toLowerCase().slice(0, 2);

function sentencesOf(text: string): string[] {
  return text
    .split(/(?<=[.!?。？！؟…])\s+|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function applies(rule: KnownRule, l: string): boolean {
  return rule.languages === "*" || rule.languages.includes(l);
}

/**
 * Every known mistake in a script: the hook, the on-screen lines (without the
 * hook), the narration and the caption, each checked sentence by sentence
 * (on-screen lines line by line). Empty means none of the known mistakes —
 * not that the script is good; the reviewers still judge that.
 */
export function scanKnownMistakes(
  parts: { hook?: string; screen?: readonly string[]; narration?: string; caption?: string },
  language: string | undefined,
): KnownHit[] {
  const l = lang2(language);
  const whole = [parts.hook ?? "", ...(parts.screen ?? []), parts.narration ?? "", parts.caption ?? ""].join("\n");
  const units: [KnownWhere, string][] = [
    ...(parts.hook?.trim() ? ([["hook", parts.hook.trim()]] as [KnownWhere, string][]) : []),
    ...(parts.screen ?? []).filter((s) => s.trim()).map((s) => ["screen", s.trim()] as [KnownWhere, string]),
    ...sentencesOf(parts.narration ?? "").map((s) => ["narration", s] as [KnownWhere, string]),
    ...sentencesOf(parts.caption ?? "").map((s) => ["caption", s] as [KnownWhere, string]),
  ];
  const out: KnownHit[] = [];
  for (const rule of KNOWN_RULES) {
    if (!applies(rule, l)) continue;
    if (rule.context && !rule.context.test(whole)) continue;
    for (const [where, line] of units) {
      if (!rule.where.includes(where)) continue;
      const m = line.match(rule.all[0]);
      if (!m || !rule.all.slice(1).every((re) => re.test(line))) continue;
      if (rule.none?.some((re) => re.test(line))) continue;
      out.push({ id: rule.id, code: rule.code, where, line, match: m[0], why: rule.why, fix: rule.fix });
    }
  }
  return out;
}

/** The clickbait pattern alone, for the hook editor (style.ts hookProblems). */
export function isClickbait(text: string): boolean {
  return KNOWN_RULES.find((r) => r.code === "clickbait")!.all[0].test(text);
}

/** One line per hit, phrased as a fix for the writer. */
export function knownMistakeFix(h: KnownHit): string {
  return `${h.where}: "${h.line}" — ${h.why}; ${h.fix} (known mistake ${h.id})`;
}
