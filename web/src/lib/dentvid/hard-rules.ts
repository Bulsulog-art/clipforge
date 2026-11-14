// GENERATED from worker/src/dental/hard-rules.ts by scripts/sync-hard-rules.mjs — do not edit here.
// Edit the worker file and re-run the script; web/src/lib/dentvid/hard-rules.sync.test.ts checks they match.
/**
 * The deterministic hard rules of the compliance agent (compliance.ts):
 * phrases that are risky in health advertising in essentially every market,
 * in every language DentVideo writes.
 *
 * Pure and dependency-free on purpose: scripts/sync-hard-rules.mjs mirrors
 * this file into web/src/lib/dentvid/hard-rules.ts, where the free public
 * checker (dentvideo.com/ad-checker) runs the very same patterns in the
 * visitor's browser. Edit it here, then run `node scripts/sync-hard-rules.mjs`;
 * web/src/lib/dentvid/hard-rules.sync.test.ts fails the web tests on drift,
 * and both sides run the same golden cases (fixtures/hard-rules-golden.json).
 *
 * No imports, no Node or browser APIs.
 */

export type RuleId =
  | "guarantee"
  | "absolute"
  | "superlative"
  | "price"
  | "before_after"
  | "testimonial"
  | "cure"
  | "fear";

export type Rule = { id: RuleId; why: string; patterns: RegExp[] };

// \b only knows ASCII letters, so every pattern uses explicit Unicode
// letter boundaries — the same helper works for English, Turkish, German,
// Spanish, French, Portuguese, Italian, Polish and Arabic.
const L = "[\\p{L}\\p{N}]";
const w = (s: string) => new RegExp(`(?<!${L})(?:${s})(?!${L})`, "iu");
// Japanese has no spaces, so there are no word boundaries to look for: a
// pattern matches wherever it occurs, and is written narrowly enough for that
// ("永久(?!歯)" — 永久歯 are adult teeth, not a promise).
const j = (s: string) => new RegExp(s, "u");
// Arabic attaches "and/with/for/the" to the front of a word (والأفضل, بالمجان).
const AR_PREFIX = "(?:[وفبلك]|ال|وال|بال|لل|فال|كال)?";
const a = (s: string) => w(`${AR_PREFIX}(?:${s})`);

// "Permanent teeth" (adult teeth) is a dental term, not a promise. Every
// language's version of it is excluded from the "permanent" rule, or every
// children's-dentistry video would be rejected.
// Likewise the permanent filling/crown/restoration that replaces a temporary
// one after a root canal (seen live: "kalıcı dolgu" rejected three times).
const NOT_TEETH = "(?!\\s+(teeth|tooth|dişler\\p{L}*|diş(?!\\p{L})|zähne|zahn|dientes|dents|dentes|denti|molar\\p{L}*|filling\\p{L}*|crown\\p{L}*|restoration\\p{L}*|dolgu\\p{L}*|kron\\p{L}*|restorasyon\\p{L}*|füllung\\p{L}*|krone\\p{L}*|versorgung\\p{L}*))";

// …and in Spanish, French, Portuguese and Italian the adjective follows the
// noun ("dientes permanentes"), so the exclusion has to look behind as well.
const AFTER_TEETH = "(?<!(dientes|dents|dentes|denti|molares|molaires|empaste|obturación|obturation|restauración|restauração|restauro|otturazione|corona|couronne|coroa)\\s+)";

// What a superlative has to be about to count as an advertising claim.
const CLINIC_NOUNS = {
  en: "dentists?|dental (clinic|practice|office|care|team)|clinic|practice|team|doctors?|prices?|deals?|smiles?|treatments?|care|service",
  tr: "klini\\p{L}*|diş klini\\p{L}*|diş hekim\\p{L}*|diş merkez\\p{L}*|ağız ve diş\\p{L}*|merkez\\p{L}*|doktor\\p{L}*|hekim\\p{L}*|uzman\\p{L}*|fiyat\\p{L}*|tedavi\\p{L}*|hizmet\\p{L}*|ekip\\p{L}*|implant\\p{L}*",
  de: "zahnarzt\\p{L}*|zahnärzt\\p{L}*|praxis|klinik|zahnklinik\\p{L}*|zahnzentrum|team|preis\\p{L}*|behandlung\\p{L}*|implantat\\p{L}*|lächeln",
  es: "dentistas?|odontólog[oa]s?|clínicas?|consultas?|equipos?|precios?|tratamientos?|implantes?|especialistas?|sonrisas?",
  fr: "dentistes?|cliniques?|cabinets?|équipes?|prix|traitements?|sourires?",
  pt: "dentistas?|clínicas?|consultórios?|equipes?|preços?|tratamentos?|sorrisos?",
  it: "dentist[ia]|clinic[ah]e?|studi?o?|team|prezz[oi]|trattament[oi]|sorris[oi]",
  pl: "dentyst\\p{L}*|stomatolog\\p{L}*|gabinet\\p{L}*|klinik\\p{L}*|lekarz\\p{L}*|zesp[oó]\\p{L}*|cen\\p{L}*|leczeni\\p{L}*|zabieg\\p{L}*|uśmiech\\p{L}*|opiek\\p{L}*",
  ar: "(?:ال)?(?:عياد\\p{L}*|طبيب\\p{L}*|أطباء|دكتور\\p{L}*|مركز|مجمع|علاج\\p{L}*|أسعار|سعر|خدم\\p{L}*|فريق|ابتسام\\p{L}*)",
  ja: "歯科|歯医者|クリニック|医院|治療|技術|医師|ドクター|先生|設備|結果|サービス|価格",
};
const CITYISH = "\\p{Lu}\\p{L}+";

// "Does not guarantee whiter teeth" is the honest version of a claim, not a
// guarantee. Hard rules cannot read sentences, but they can see a negation
// right before the word.
const NEGATED = "(?<!(no|not|n't|never|cannot|can't|nicht|kein\\p{L}*|ne|n'|não|non|nunca|jamais|mai|nie|لا|لن|ليس|ليست|غير)\\s+)";

/**
 * The words a writer must not reach for, by language — told to the writers
 * up front so a rewrite is not spent learning them from the reviewer.
 * (Baseline eval: most script rewrites were "prevents"/"önler"/"dauerhaft".)
 */
export const AVOID_WORDS: Record<string, string> = {
  en: "prevents, stops (say \"can help prevent\"), permanent, painless, pain-free, guaranteed, risk-free, forever, lifetime, best, #1, before-and-after results, cures, 100%",
  // Tanıtım Yönetmeliği, RG 12.11.2025 no. 33075 — see locale.ts marketRules("TR").
  tr: "önler, engeller (\"önlemeye yardımcı olabilir\" deyin), kalıcı, acısız, ağrısız, garanti, garantili, ömür boyu, yan etkisiz, en iyi, ilk ve tek, lider, bir numara, en uygun fiyat, diğer kliniklerden farklı, kesin sonuç, öncesi-sonrası sonuçları, hasta yorumları, teşekkür mesajları, tamamen iyileştirir, indirim, kampanya, taksit, hediye, ücretsiz, %100",
  // HWG §§ 3, 7, 11; ZÄG § 35 (AT); Art. 40 MedBG (CH) — see locale.ts.
  de: "verhindert (\"kann helfen vorzubeugen\"), dauerhaft, schmerzfrei, schmerzlos, garantiert, Erfolgsgarantie, risikofrei, ohne Risiko, ohne Nebenwirkungen, für immer, lebenslang, beste, führend, Nr. 1, Vorher-Nachher, Patientenstimmen, Erfahrungsberichte, heilt, Rabatt, Gutschein, Gewinnspiel, kostenlos, 100 %",
  // RD 1907/1996 (ES); Reglamento LGS en Materia de Publicidad (MX) — see locale.ts.
  es: "previene (\"puede ayudar a prevenir\"), permanente, sin dolor, garantizado, resultados asegurados, sin riesgo, sin efectos secundarios, resultados inmediatos, resultado definitivo, para siempre, de por vida, el mejor, número uno, líderes, resultados de antes y después, testimonios, famosos, cura, descuento, promoción, 2x1, meses sin intereses, gratis, 100 %",
  fr: "prévient (\"peut aider à prévenir\"), permanent, sans douleur, garanti, sans risque, pour toujours, à vie, le meilleur, avant/après, guérit, 100 %",
  pt: "previne (\"pode ajudar a prevenir\"), permanente, sem dor, garantido, sem risco, para sempre, vitalício, o melhor, antes e depois, cura, 100%",
  it: "previene (\"può aiutare a prevenire\"), permanente, senza dolore, garantito, senza rischi, per sempre, a vita, il migliore, prima e dopo, guarisce, 100%",
  // Kodeks Etyki Lekarskiej 2025 art. 71 — see docs/MARKETS.md.
  pl: "zapobiega (\"może pomóc zapobiegać\"), trwale, na zawsze, dożywotnio, bezbolesny, bez bólu, gwarancja, gwarantowany, bez ryzyka, najlepszy, nr 1, przed i po (efekty), wyleczy całkowicie, rabat, promocja, za darmo, 100%",
  // DHA Standards for Medical Advertisement Content on Social Media name
  // "the best", "100%", "no side effects" and "immediate results" outright.
  ar: "يمنع/يقي من (قولوا \"قد يساعد على الوقاية من\")، دائم، مدى الحياة، بدون ألم، مضمون، ضمان، بدون مخاطر، بدون آثار جانبية، نتائج فورية، الأفضل، رقم 1، قبل وبعد (النتائج)، يشفي، علاج نهائي، خصم، عرض، مجاناً، 100%",
  // MHLW 医療広告ガイドライン: 比較優良・誇大広告, 体験談, ビフォーアフター.
  ja: "防ぎます（「防ぐのに役立ちます」と言う）、絶対、必ず、確実に、無痛、痛くない治療、永久（永久歯は可）、一生もの、保証、リスクなし、副作用なし、最高、日本一、No.1、地域一番、最先端、ビフォーアフター、症例写真、体験談、患者様の声、口コミ、完治、割引、キャンペーン、モニター募集、無料、100％",
};

export const HARD_RULES: Rule[] = [
  {
    id: "guarantee",
    why: "Results cannot be guaranteed in healthcare.",
    patterns: [
      w(`${NEGATED}(guarantee[ds]?|risk[- ]free)`),
      // tr de fr pt it es; Turkish negates after the verb ("garanti etmez").
      w(`${NEGATED}(garanti\\p{L}*|garantía|garanzia|garantia)(?!\\s+(etmez|edilemez|vermez))|risksiz`),
      w("sin riesgos?|sans risque|sem risco|senza rischi|risikofrei"),
      // Launch markets (locale.ts marketRules TR/DE/AT/CH/ES/MX): § 3 HWG
      // (success presented as certain), RD 1907/1996 and the Mexican
      // Reglamento de Publicidad (no guaranteed results).
      w(`${NEGATED}(\\p{L}+garantie\\p{L}*|ohne (jedes |jegliches )?risiko|risikolos\\p{L}*)`),
      w(`${NEGATED}(?<!no (hay|existen?)\\s+)(resultados? asegurados?|éxito asegurado|éxito garantizado)`),
      w(`${NEGATED}(gwarant\\p{L}*|gwarancj\\p{L}*)|bez (żadnego )?ryzyka`),
      a(`${NEGATED}(مضمون\\p{L}*|ضمان\\p{L}*|نضمن|يضمن|تضمن)|(بدون|بلا|دون) (أي )?مخاطر|خال\\p{M}*\\s+من المخاطر`),
      // 保証できません (cannot guarantee) is the honest version.
      j("保証(?!(は|が|を)?(でき|いたしかね|しかね|致しかね|されません|しません))|リスク(なし|ゼロ|がない|はない|はありません)|副作用(なし|ゼロ|がない|はない|はありません|の心配(は|が)?(ない|ありません))"),
    ],
  },
  {
    id: "absolute",
    why: "Absolute claims (painless, 100%, permanent, forever) overpromise outcomes.",
    patterns: [
      /(100|１００|١٠٠)\s?[%％٪]/,
      w("painless|pain[- ]free|acısız|ağrısız|schmerzfrei\\p{L}*|schmerzlos\\p{L}*|sin dolor|indoloro|sans douleur|indolore|sem dor|indolor|senza dolore"),
      // "Nicht dauerhaft empfindlich" (not permanently sensitive) is the honest hedge.
      w(`${NEGATED}${AFTER_TEETH}(permanent(ly)?|kalıcı|dauerhaft\\p{L}*|bleibend\\p{L}*|permanente[s]?)${NOT_TEETH}`),
      w("forever|lifetime|ömür boyu|für immer|lebenslang|para siempre|de por vida|pour toujours|à vie|para sempre|vitalíci\\p{L}*|per sempre|a vita"),
      w("kesin(likle)? sonuç"),
      // "No side effects" / "instant results" / "definitive result" in the
      // launch markets' languages. "Empaste definitivo" / "corona definitiva"
      // (the permanent filling or crown) are dental terms and do not match.
      w(`${NEGATED}(yan etkisiz|yan etkisi (yok|olmayan|bulunmayan)|ohne nebenwirkungen|keine nebenwirkungen|sin efectos (secundarios|adversos)|sofortige\\p{L}* ergebnis\\p{L}*|resultados? inmediatos?|resultados? definitivos?|solución definitiva|para toda la vida|anında sonuç\\p{L}*)`),
      w("bezbolesn\\p{L}*|bez (żadnego )?bólu|na zawsze|dożywotn\\p{L}*|na całe życie|na stałe"),
      w(`${NEGATED}(?<!(wypełnienie|uzupełnienie|odbudowa|korona|plomba)\\s+)(trwał[aey]|trwale)(?!\\s+(wypełnieni|uzupełnieni|odbudow|koron|plomb)\\p{L}*)`),
      a("(بدون|بلا|دون) (أي )?ألم|غير مؤلم\\p{L}*|مدى الحياة|مدى العمر|طوال العمر|(إلى|الى) الأبد|للأبد|نتائج فورية|نتيجة فورية|(بدون|بلا|دون) (أي )?آثار جانبية|لا (توجد|يوجد) (أي )?آثار جانبية"),
      // "Permanent" (دائم) follows its noun in Arabic; the permanent teeth,
      // filling, crown or restoration are dental terms, not promises. The
      // adverb دائماً ("always") is a different word and never matches.
      w(`(?<!(أسنان|الأسنان|حشوة|الحشوة|حشوات|الحشوات|تاج|التاج|تركيبة|التركيبة|ضرس|الضرس|أضراس|الأضراس|ترميم|الترميم)\\s+)${AR_PREFIX}(دائم|دائمة)`),
      j("無痛|痛くない(治療|です(?!か)|ので|から)|痛みのない治療|痛みゼロ|永久(?!歯)|一生(もの|モノ|使え|持ち|持つ)|絶対(に)?(安全|治|痛|大丈夫|効果|成功|白く|きれい|綺麗|安心)|必ず(治|白く|効果|改善|成功|きれい|綺麗)|確実(に|な)(治|効果|白く|改善|結果)|防ぎます|防止します"),
      // The bare verb promises the outcome; the hedged form ("helps prevent",
      // "önlemeye yardımcı olur", "ayuda a prevenir") uses another form of the
      // word and passes. Seen live: "diş eti hastalıklarını önler".
      w("prevents|önler|verhindert|previene|prévient|previne|zapobiega|zapobiegają"),
      a("(يقي|تقي) من|(يمنع|تمنع) (\\p{L}+ )?(التسوس|تسوس|أمراض|مرض|التهاب|النزيف|نزيف|الجير|البلاك|الرائحة|رائحة)"),
    ],
  },
  {
    id: "superlative",
    why: "Unverifiable superlatives and comparisons with other clinics are restricted.",
    // Only superlatives ABOUT the clinic, its people, its prices or its
    // results. "Ask your dentist for the best approach" / "en iyi şekilde"
    // are ordinary language and were rejecting good videos.
    patterns: [
      w(`(the )?best (${CLINIC_NOUNS.en})|best in (town|the city|${CITYISH})|#\\s?1|number one|top[- ]rated|cheapest`),
      w(`en iyi (${CLINIC_NOUNS.tr})|bir numara|en ucuz`),
      // Tanıtım Yönetmeliği (RG 33075): superiority, firsts, comparison with
      // other clinics.
      w(`ilk ve tek|tek adres\\p{L}*|lider (klini\\p{L}*|diş\\p{L}*|kurum\\p{L}*|merkez\\p{L}*|marka\\p{L}*)|(türkiye|bölge|şehr|ilç)(\\p{L}|['’])*\\s+(lider\\p{L}*|bir numara\\p{L}*|en iyi\\p{L}*)|en uygun fiyat\\p{L}*|en kaliteli|diğer klinikler(den|e göre)|rakipsiz`),
      w(`beste\\p{L}* (${CLINIC_NOUNS.de})|nr\\.?\\s?1|günstigste\\p{L}*`),
      // Berufsordnung / § 21 MBO-Z: anpreisende or vergleichende Werbung.
      w(`marktführ\\p{L}*|führende\\p{L}* (${CLINIC_NOUNS.de})|nummer (eins|1)|besser als (andere|jede|alle)\\p{L}*|günstiger als (andere|jede|alle)\\p{L}*`),
      w(`(el|la|los|las) mejor(es)? (${CLINIC_NOUNS.es})|más barat\\p{L}*`),
      // RD 1907/1996, Código de Ética y Deontología Dental, Reglamento LGS (MX).
      w(`número uno|n[º°]\\s?1|líder(es)? en (${CLINIC_NOUNS.es}|implant\\p{L}*|ortodoncia|estética\\p{L}*|odontolog\\p{L}*|el sector|el país|españa|méxico)|mejor(es)? que (otr[oa]s|cualquier)\\p{L}*|(la|el) únic[oa] (clínica|dentista|consulta)`),
      w(`(le|la|les) meilleur\\p{L}* (${CLINIC_NOUNS.fr})|moins cher`),
      w(`(o|a|os|as) melhor(es)? (${CLINIC_NOUNS.pt})|mais barat\\p{L}*`),
      w(`(il|la|i|le) miglior\\p{L}* (${CLINIC_NOUNS.it})|più economic\\p{L}*`),
      w(`najlepsz\\p{L}* (${CLINIC_NOUNS.pl})|najlepsz\\p{L}* w (mieście|${CITYISH})|numer jeden|najtańsz\\p{L}*|najniższ\\p{L}* cen\\p{L}*`),
      a(`(أفضل|أحسن|أمهر|أشهر) ${CLINIC_NOUNS.ar}|${CLINIC_NOUNS.ar} (الأفضل|الأحسن|الأمهر|الأرخص|الأول(ى)?)|رقم\\s?(1|١|واحد)|الأرخص|أرخص`),
      j(`日本一|県内一|市内一|府内一|都内一|区内一|地域一|業界一|No\\.?\\s?1|NO\\.?\\s?1|ナンバーワン|最高の(${CLINIC_NOUNS.ja})|最先端の(${CLINIC_NOUNS.ja})|最新鋭|一番(人気|安い|の(${CLINIC_NOUNS.ja}))|最安|格安|どこよりも`),
    ],
  },
  {
    id: "price",
    why: "Prices, discounts and promotions in health advertising are banned or restricted in many markets.",
    patterns: [
      w("discount(s|ed)?|\\d+\\s?% off|free (consultation|check-?up|whitening)|special offer|limited time"),
      /[$€£₺¥￥]\s?\d/,
      /\d\s?(usd|eur|gbp|tl|try|€|zł|pln|aed|sar|jpy)(?![\p{L}])/iu,
      /[\d٠-٩]\s?(درهم|ريال|دينار|ر\.س|د\.إ)|(درهم|ريال) ?[\d٠-٩]/u,
      /\d[\d,，]*\s?円/u,
      w("indirim\\p{L}*|kampanya\\p{L}*|ücretsiz muayene|fırsat\\p{L}*"),
      // RG 33075: no ücret, indirim, kampanya, taksit or gifts.
      w("taksit\\p{L}*|hediye\\p{L}*|promosyon\\p{L}*|ücretsiz (kontrol|danışma|konsültasyon|beyazlatma|diş taşı)\\p{L}*|bedava|sınırlı süre\\p{L}*"),
      w("rabatt\\p{L}*|sonderangebot\\p{L}*|aktionspreis\\p{L}*|kostenlose (beratung|untersuchung|zahnreinigung)"),
      // § 7 HWG: Werbegaben, Gutscheine, Preisnachlässe; Gewinnspiele.
      w("gutschein\\p{L}*|gewinnspiel\\p{L}*|verlosung\\p{L}*|preisnachlass\\p{L}*|nur (noch )?(diesen|diese|im) (monat|woche)|kostenlos\\p{L}* (erstberatung|kontrolle|prophylaxe|bleaching|aufhellung)|\\d+\\s?%\\s?(günstiger|rabatt)"),
      w("descuento\\p{L}*|oferta especial|promoci[oó]n\\p{L}*|gratis"),
      // Spain and Mexico: draws, coupons and financing hooks ("meses sin intereses", "2x1").
      w("sorteo\\p{L}*|cup[oó]n\\p{L}*|meses sin intereses|2\\s?x\\s?1|precio especial|financiación (al )?0\\s?%|por tiempo limitado|(solo|sólo) (este|por este|durante este) mes"),
      /\d\s?(mxn|pesos)(?![\p{L}])/iu,
      w("réduction\\p{L}*|promo\\p{L}*|offre spéciale|gratuit\\p{L}*"),
      w("desconto\\p{L}*|promoção|oferta especial|grátis"),
      w("scont\\p{L}*|offerta speciale|promozion\\p{L}*"),
      w("rabat\\p{L}*|zniżk\\p{L}*|promocj\\p{L}*|promocyjn\\p{L}*|gratis|za darmo|bezpłatn\\p{L}* (konsultacj|wizyt|przegląd|badani|wybielani)\\p{L}*|oferta specjalna"),
      a("خصم\\p{L}*|خصومات|تخفيض\\p{L}*|عرض خاص|عروض\\p{L}*|مجان\\p{L}*|لفترة محدودة|سعر خاص"),
      j("割引|値引|半額|キャンペーン|モニター募集|ポイント還元|無料(カウンセリング|相談|検診|診断|体験|ホワイトニング)|初回無料|特別価格|お得"),
    ],
  },
  {
    id: "before_after",
    why: "Before/after results imply an outcome every patient will get.",
    patterns: [
      // Only results ("before and after photos", "el antes y después"), not
      // time: "brush before and after meals" / "antes y después de comer"
      // was rejecting good aftercare advice.
      w("before (and|&) after(?!\\s+(meals?|eating|food|each|every|you|your|brushing|bed|sleep))|before/after"),
      w("(?<!(yemek|yemekler|yemeklerden|fırçalama)\\s)öncesi (ve )?sonrası"),
      // "Vorher-Nachher", "Vorher/Nachher-Bilder", "vorher & nachher" (§ 11 HWG);
      // "putzen Sie vorher und nachher gründlich" is an instruction, not a result.
      w("vorher\\s?[-/&]?\\s?nachher|vorher und nachher(?!\\s+(gründlich|sorgfältig|gut|putzen|reinigen|spülen|essen|trinken|jede\\p{L}*|de[mnr]|die|das|ihre|ihr|zähne|mund))"),
      w("antes y después(?!\\s+de (comer|cada comida|las comidas|cepillar\\p{L}*|usar\\p{L}*|lavar\\p{L}*|dormir|beber))"),
      w("antes e depois(?!\\s+(de comer|das refeições|de cada refeição|de escovar|de dormir|de beber))"),
      w("avant[- /]?(et )?après(?!\\s+(les repas|chaque repas|le repas|de manger|le brossage|de dormir|de boire))"),
      w("prima e dopo(?!\\s+(i pasti|ogni pasto|il pasto|di mangiare|aver mangiato|di dormire|di bere))"),
      // "Przed i po zabiegu" / "قبل وبعد الأكل" are instructions, not results.
      w("przed i po(?!\\s+(jedzeniu|posiłku|posiłkach|myciu|szczotkowaniu|zabiegu|śnie|piciu|każdym))"),
      a("قبل\\s+و\\s*بعد(?!\\s+(الأكل|الطعام|الوجبات|الوجبة|وجبة|تناول|تنظيف|التنظيف|النوم|الشرب|استخدام|كل|العلاج|الإجراء))"),
      // 治療前後の注意 (care before and after treatment) is aftercare; only photos/comparisons are results.
      j("ビフォー.?アフター|術前術後(の)?(写真|比較|画像|変化)?|(治療|施術)前後の(写真|比較|画像|変化)|症例写真"),
    ],
  },
  {
    id: "testimonial",
    why: "Patient testimonials, reviews and celebrity endorsements are restricted in health advertising in several markets.",
    patterns: [
      w("our patients? (say|said|love)|5[- ]star|testimonials?"),
      w("hastalarımız (diyor|anlatıyor)"),
      // RG 33075: patients' thank-you and satisfaction statements.
      w("hasta yorum\\p{L}*|hastalarımızın (yorum|teşekkür|deneyim)\\p{L}*|teşekkür mesaj\\p{L}*|memnun hasta\\p{L}*|hasta memnuniyet\\p{L}*"),
      w("unsere patienten sagen|patientenbewertung\\p{L}*"),
      // § 11 HWG: statements by third parties used to advertise.
      w("patientenstimme\\p{L}*|erfahrungsbericht\\p{L}*|bewertungen (unserer|von) patient\\p{L}*|zufriedene\\p{L}* patient\\p{L}*|dankschreiben"),
      w("nuestros pacientes dicen|testimonios?"),
      // RD 1907/1996 and the Tribunal Supremo's ban on famous people in dental-clinic ads.
      w("opiniones de (nuestros )?pacientes|reseñas|pacientes satisfechos|famosos|celebridades|(recomendad|avalad|elegid)[oa]s? por (famos\\p{L}*|celebridades|estrellas)"),
      w("nos patients disent|témoignages?"),
      w("nossos pacientes dizem|depoimentos?"),
      w("i nostri pazienti dicono|testimonianz\\p{L}*"),
      w("nasi pacjenci (mówią|polecają)|opini\\p{L}* (naszych )?pacjentów|referencj\\p{L}*"),
      a("آراء المرضى|تجارب المرضى|تجربة (أحد )?المرضى|شهادات المرضى|مرضانا يقولون|قصص نجاح|(خمس|5|٥) نجوم"),
      j("体験談|患者様の声|患者さんの声|お客様の声|口コミ|クチコミ|星5|★5|レビュー"),
    ],
  },
  {
    id: "cure",
    why: "Claiming to cure or eliminate a condition overstates what treatment can promise.",
    patterns: [
      w("cures?|eliminates? (all )?pain"),
      w("kesin tedavi|tamamen (yok eder|geçer|iyileştirir)"),
      w("heilt|heilung garantiert"),
      w("cura definitiva|guérit|guérison définitive|guarisce"),
      w("wyleczy|całkowicie wylecz\\p{L}*|leczy na zawsze"),
      a("(يشفي|تشفي)|شفاء (تام|نهائي)|علاج نهائي|(يقضي|تقضي) (تماما\\p{M}*|نهائيا\\p{M}*) على"),
      j("完治|根治します|必ず治|確実に治|完全に治"),
    ],
  },
];

export type HardHit = { rule: RuleId; match: string; why: string };

/** Deterministic scan. Pure, so it is tested directly. */
export function scanHardRules(text: string): HardHit[] {
  const hits: HardHit[] = [];
  for (const rule of HARD_RULES) {
    for (const re of rule.patterns) {
      const m = text.match(re);
      if (m) {
        hits.push({ rule: rule.id, match: m[0], why: rule.why });
        break; // one hit per rule is enough to report it
      }
    }
  }
  return hits;
}

/** Where a hit sits in the text: [start, end) in UTF-16 code units, as String.slice takes them. */
export type HardSpan = { rule: RuleId; start: number; end: number; match: string };

/**
 * Every place in `text` a rule matches, for highlighting (the public checker).
 * scanHardRules reports one hit per rule; this lists them all, in reading
 * order. Where two matches overlap, the one that starts first (then the
 * longer one) is kept, so no character is highlighted twice.
 */
export function findHardSpans(text: string, rules: readonly Rule[] = HARD_RULES): HardSpan[] {
  const all: HardSpan[] = [];
  for (const rule of rules) {
    for (const re of rule.patterns) {
      const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
      for (const m of text.matchAll(g)) {
        if (!m[0]) continue;
        const start = m.index ?? 0;
        all.push({ rule: rule.id, start, end: start + m[0].length, match: m[0] });
      }
    }
  }
  all.sort((x, y) => x.start - y.start || y.end - x.end);
  const out: HardSpan[] = [];
  for (const s of all) {
    const last = out[out.length - 1];
    if (last && s.start < last.end) continue;
    out.push(s);
  }
  return out;
}

/**
 * Fear and pressure: frightening the reader into booking. Not part of
 * HARD_RULES (the compliance agent's model judges tone in context, and
 * scanHardRules must not change); the public checker adds it, with phrases
 * narrow enough to mean only that.
 */
export const FEAR_RULE: Rule = {
  id: "fear",
  why: "Frightening the reader or pressing them to book now is restricted in health advertising.",
  patterns: [
    w("before it'?s too late|(you )?could lose (all )?your teeth|(could|will) cost you your teeth|don'?t wait (any longer|until it'?s too late)|book (now|today)( before)?"),
    w("(çok )?geç olmadan|dişlerinizi kaybedebilirsiniz|dişlerinizi kaybetmeden|hemen randevu al\\p{L}*|kaçırmayın|daha fazla beklemeyin"),
    w("bevor es zu spät ist|warten sie nicht (länger|zu lange)|jetzt sofort (einen )?termin\\p{L}*|jetzt (einen )?termin (buchen|vereinbaren|sichern)|jetzt buchen|ihre zähne verlieren"),
    w("antes de que sea (demasiado )?tarde|no esperes? más|(podrías|puedes|podría|puede) perder (tus|sus) dientes"),
    w("avant qu'il (ne )?soit trop tard|n'attendez plus|(pourriez|risquez de) perdre vos dents"),
    w("zanim będzie za późno|nie czekaj(cie)? dłużej|(możesz|możecie) stracić zęby"),
    a("قبل فوات الأوان|لا تنتظر(وا)? أكثر|(قد )?تفقد(ون)? أسنان\\p{L}*|احجز(وا)? الآن"),
    j("手遅れ|今すぐ(ご)?予約|歯を失う(前|こと|危険)|放置すると(大変|危険|取り返し)"),
  ],
};

/** The rules the public checker runs: the hard rules plus fear and pressure. */
export const CHECKER_RULES: readonly Rule[] = [...HARD_RULES, FEAR_RULE];
