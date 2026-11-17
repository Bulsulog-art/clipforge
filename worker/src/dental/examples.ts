/**
 * The standard, shown rather than described.
 *
 * Hand-written reference scripts for the launch markets (Türkiye, Spain,
 * Mexico, Germany), at the level a dentist reads and thinks "that is how I
 * would explain it, but better": one takeaway, a hook that opens a question
 * in the first two seconds, spoken (not written) register, hedged where
 * outcomes vary, a calm close that fits the market's advertising rules.
 *
 * The writers see ONE example in their language, on a different subject
 * from the video they are writing, and are told never to reuse its subject,
 * hook or sentences — the example is for sound and shape, not content.
 * Every example is graded by the offline rubric in the tests (rubric.ts):
 * it must pass the hard compliance rules and score 5 on every dimension a
 * pattern can check, or it teaches the wrong thing.
 *
 * Clinical content is mainstream guidance (NHS/ADA/national associations):
 * "spit, don't rinse" after brushing; wait after acidic drinks before
 * brushing; temporary filling after a root canal; gingival bleeding usually
 * means inflammation and improves with gentle cleaning; tongue coating and
 * morning breath; bruxism signs and night guards.
 */
import type { Pillar } from "./profile.js";

export type ExampleScene =
  | { kind: "hook"; text: string }
  | { kind: "statement"; text: string }
  | { kind: "list"; heading: string; items: string[] }
  | { kind: "compare"; left: { label: string; text: string }; right: { label: string; text: string } }
  | { kind: "cta"; text: string };

export type ScriptExample = {
  id: string;
  language: string;
  /** The market it was written for (the CTA follows that market's rules). */
  country: string;
  address: "formal" | "informal";
  service: string;
  pillar: Pillar;
  title: string;
  question: string;
  /** The one sentence the viewer should remember. */
  takeaway: string;
  hook: string;
  scenes: ExampleScene[];
  narration: string;
};

export const EXAMPLES: ScriptExample[] = [
  {
    id: "tr-spit-dont-rinse",
    language: "tr",
    country: "TR",
    address: "formal",
    service: "Diş taşı temizliği",
    pillar: "prevention",
    title: "Fırçaladıktan sonra çalkalamak",
    question: "Diş fırçaladıktan sonra ağzımı suyla çalkalamalı mıyım?",
    takeaway: "Fırçaladıktan sonra köpüğü tükürün, suyla çalkalamayın.",
    hook: "Fırçaladıktan sonra ağzınızı suyla çalkalıyor musunuz?",
    scenes: [
      { kind: "hook", text: "Fırçaladıktan sonra ağzınızı suyla çalkalıyor musunuz?" },
      { kind: "statement", text: "Macundaki florür, dişin üstünde biraz kalırsa daha çok işe yarayabilir." },
      { kind: "compare", left: { label: "Suyla çalkalamak", text: "Florürün çoğu akıp gider." }, right: { label: "Sadece tükürmek", text: "Florür dişte biraz daha kalır." } },
      { kind: "statement", text: "Köpüğü tükürün, suyla çalkalamayın. Hafif macun tadı normal." },
      { kind: "cta", text: "Size uygun macunu bir sonraki kontrolünüzde hekiminize sorabilirsiniz." },
    ],
    narration:
      "Dişlerinizi fırçaladınız, sonra hemen ağzınızı suyla çalkaladınız. Çoğumuz böyle yapıyoruz. Ama küçük bir ayrıntı var. " +
      "Macundaki florür, dişin üstünde biraz kalırsa daha çok işe yarayabilir; suyla çalkalayınca da büyük kısmı akıp gidiyor. " +
      "O yüzden köpüğü tükürmeniz yeterli. Ağzınızda hafif bir macun tadı kalırsa, bu gayet normal. " +
      "Hangi macunun size uygun olduğunu bir sonraki kontrolünüzde hekiminize sorabilirsiniz.",
  },
  {
    id: "tr-root-canal-temporary",
    language: "tr",
    country: "TR",
    address: "formal",
    service: "Kanal tedavisi",
    pillar: "aftercare",
    title: "Kanal tedavisinden sonraki ilk günler",
    question: "Kanal tedavisinden sonra o dişle hemen yemek yiyebilir miyim?",
    takeaway: "Kalıcı dolgu yapılana kadar o taraftan sert şey çiğnemeyin.",
    hook: "Kanal bitti ama diş daha hazır değil.",
    scenes: [
      { kind: "hook", text: "Kanal bitti ama diş daha hazır değil." },
      { kind: "list", heading: "Kalıcı dolguya kadar", items: ["O taraftan sert şey çiğnemeyin.", "Birkaç gün hafif hassasiyet olabilir.", "Şişlik ya da artan ağrıda hekiminizi arayın."] },
      { kind: "statement", text: "Geçici dolgu uzun süre dayanmak için yapılmaz; sonraki randevuyu ertelemeyin." },
      { kind: "cta", text: "Size özel talimatları tedavinizi yapan hekiminize sorun." },
    ],
    narration:
      "Kanal tedavisi bitti, uyuşukluk geçti, her şey yolunda görünüyor. Ama diş çoğu zaman henüz tam hazır değil. " +
      "Üstünde genellikle geçici bir dolgu oluyor ve kalıcı dolgu yapılana kadar o taraftan sert şeyler çiğnememek daha güvenli. " +
      "Birkaç gün hafif bir hassasiyet olabilir; bu sık görülen bir durum. Şişlik olursa ya da ağrı giderek artıyorsa hekiminizi arayın. " +
      "Bir de şu var: geçici dolgu uzun süre dayanmak için yapılmaz, o yüzden sonraki randevuyu ertelememek gerekiyor. " +
      "Size özel talimatları tedavinizi yapan hekiminize sorun.",
  },
  {
    id: "es-acid-then-brush",
    language: "es",
    country: "ES",
    address: "informal",
    service: "Limpieza dental",
    pillar: "prevention",
    title: "Cepillarte justo después de algo ácido",
    question: "¿Me cepillo los dientes justo después de tomar zumo de naranja?",
    takeaway: "Después de algo ácido, espera entre media hora y una hora antes de cepillarte.",
    hook: "¿Zumo de naranja y directo al cepillo?",
    scenes: [
      { kind: "hook", text: "¿Zumo de naranja y directo al cepillo?" },
      { kind: "statement", text: "Tras algo ácido, el esmalte queda más blando durante un rato." },
      { kind: "compare", left: { label: "Cepillarte al momento", text: "Puede desgastar más el esmalte." }, right: { label: "Esperar 30–60 minutos", text: "La saliva ayuda a que se recupere." } },
      { kind: "statement", text: "Mientras tanto, un trago de agua ya ayuda." },
      { kind: "cta", text: "¿Notas sensibilidad con lo ácido? Coméntalo en tu próxima revisión." },
    ],
    narration:
      "Te tomas un zumo de naranja y vas directo a lavarte los dientes. Parece lo más lógico, ¿no? Pues tiene truco. " +
      "Después de algo ácido, el esmalte se queda un poco más blando durante un rato, y si lo cepillas justo entonces puedes desgastarlo más. " +
      "Lo que se suele aconsejar es esperar entre 30 y 60 minutos; la saliva hace su trabajo y el esmalte se recupera. " +
      "Mientras tanto, un trago de agua ya ayuda. Es un gesto pequeño, pero con los años se nota. " +
      "Y si notas sensibilidad con lo ácido, coméntalo en tu próxima revisión.",
  },
  {
    id: "mx-bruxism-guard",
    language: "es",
    country: "MX",
    address: "formal",
    service: "Guardas oclusales",
    pillar: "education",
    title: "Rechinar los dientes dormido",
    question: "¿Por qué amanezco con la mandíbula cansada?",
    takeaway: "Si amanece con la mandíbula cansada, coménteselo a su dentista: puede ser bruxismo.",
    hook: "¿Amanece con la mandíbula cansada?",
    scenes: [
      { kind: "hook", text: "¿Amanece con la mandíbula cansada?" },
      { kind: "statement", text: "Apretar o rechinar los dientes dormido es más común de lo que parece." },
      { kind: "list", heading: "Señales frecuentes", items: ["Mandíbula cansada al despertar", "Dolor de cabeza por la mañana", "Dientes desgastados o sensibles"] },
      { kind: "statement", text: "Una guarda nocturna hecha a su medida puede ayudar a cuidar sus dientes." },
      { kind: "cta", text: "¿Le suena? Coménteselo a su dentista en su próxima consulta." },
    ],
    narration:
      "¿Se despierta con la mandíbula cansada, o con dolor de cabeza desde temprano? Puede que esté apretando o rechinando los dientes mientras duerme. " +
      "Es más común de lo que parece, y muchas personas ni se dan cuenta; a veces es la pareja quien lo escucha. " +
      "Con el tiempo, los dientes se pueden desgastar o ponerse sensibles. " +
      "Su dentista puede revisar si hay desgaste y, si hace falta, proponerle una guarda nocturna hecha a su medida, que ayuda a cuidarlos. " +
      "¿Le suena? Coménteselo en su próxima consulta.",
  },
  {
    id: "de-bleeding-gums",
    language: "de",
    country: "DE",
    address: "formal",
    service: "Professionelle Zahnreinigung",
    pillar: "myth",
    title: "Zahnfleischbluten beim Putzen",
    question: "Soll ich weniger putzen, wenn mein Zahnfleisch blutet?",
    takeaway: "Blutet das Zahnfleisch, sanft weiterputzen statt die Stelle auszulassen.",
    hook: "Zahnfleischbluten? Bloß nicht die Stelle auslassen.",
    scenes: [
      { kind: "hook", text: "Zahnfleischbluten? Bloß nicht die Stelle auslassen." },
      { kind: "statement", text: "Oft steckt eine Entzündung durch Beläge dahinter." },
      { kind: "compare", left: { label: "Stelle auslassen", text: "Beläge bleiben länger liegen." }, right: { label: "Sanft weiterputzen", text: "Das Zahnfleisch kann sich beruhigen." } },
      { kind: "list", heading: "So geht's", items: ["Weiche Zahnbürste", "Zahnzwischenräume mitreinigen", "Nach 1–2 Wochen noch Blut? Zur Kontrolle"] },
      { kind: "cta", text: "Fragen Sie uns gern bei Ihrer nächsten Kontrolle." },
    ],
    narration:
      "Es blutet beim Putzen. Und der erste Reflex? Da lieber nicht mehr so fest ran. Verständlich, aber meistens genau verkehrt. " +
      "Oft steckt eine Zahnfleischentzündung dahinter, und die kommt häufig von Belägen, die genau an dieser Stelle sitzen. " +
      "Wer die Stelle auslässt, lässt die Beläge länger liegen. Also lieber sanft weiterputzen, mit einer weichen Bürste, und die Zwischenräume nicht vergessen. " +
      "Meist beruhigt sich das Zahnfleisch dann innerhalb von ein, zwei Wochen. Blutet es danach immer noch, schauen wir uns das bei der nächsten Kontrolle gern an.",
  },
  {
    id: "de-tongue-morning-breath",
    language: "de",
    country: "DE",
    address: "informal",
    service: "Professionelle Zahnreinigung",
    pillar: "prevention",
    title: "Mundgeruch am Morgen",
    question: "Warum habe ich morgens Mundgeruch, obwohl ich gründlich putze?",
    takeaway: "Bei Mundgeruch die Zunge mitreinigen – sanft, von hinten nach vorn.",
    hook: "Morgens Mundgeruch, obwohl du gründlich putzt?",
    scenes: [
      { kind: "hook", text: "Morgens Mundgeruch, obwohl du gründlich putzt?" },
      { kind: "statement", text: "Nachts bildet sich weniger Speichel – Bakterien haben leichtes Spiel." },
      { kind: "list", heading: "Oft vergessen: die Zunge", items: ["Beläge sitzen vor allem hinten", "Sanft von hinten nach vorn reinigen", "Zungenschaber oder Zahnbürste"] },
      { kind: "statement", text: "Bleibt der Geruch, kann auch etwas anderes dahinterstecken." },
      { kind: "cta", text: "Sprich es bei deiner nächsten Kontrolle einfach an." },
    ],
    narration:
      "Du putzt gründlich, und trotzdem riecht's morgens nicht ganz frisch? Das ist erst mal ziemlich normal. " +
      "Nachts bildet sich weniger Speichel, und Bakterien haben leichtes Spiel. Ein Ort wird dabei oft vergessen: die Zunge. " +
      "Vor allem hinten sammeln sich Beläge, die gern für den Geruch sorgen. Ein Zungenschaber oder deine Zahnbürste, sanft von hinten nach vorn, macht da oft schon einen Unterschied. " +
      "Bleibt der Geruch trotzdem, kann auch etwas anderes dahinterstecken. Sprich es bei deiner nächsten Kontrolle einfach an.",
  },
];

/**
 * Hooks that show the shapes in every language — a moment, a myth with
 * "not quite", a mistake, a surprising fact. For the strategist and the hook
 * editor, so a Polish or Japanese clinic gets native shapes too.
 */
export const HOOK_BANK: Record<string, string[]> = {
  tr: ["Fırçaladıktan sonra ağzınızı suyla çalkalıyor musunuz?", "Kanal bitti ama diş daha hazır değil.", "Soğuk bir şey içince gelen o sızı…", "Diş fırçanız sandığınızdan önce yoruluyor."],
  de: ["Zahnfleischbluten? Bloß nicht die Stelle auslassen.", "Morgens Mundgeruch, obwohl Sie gründlich putzen?", "Dieses Ziehen beim ersten Schluck Eiswasser…", "Härter putzen heißt nicht sauberer."],
  es: ["¿Zumo de naranja y directo al cepillo?", "¿Amanece con la mandíbula cansada?", "Ese pinchazo al morder un helado…", "Cepillar más fuerte no limpia más."],
  en: ["Rinsing after you brush? Not so fast.", "That zing when you sip something cold…", "Brushing harder doesn't clean better.", "Your floss isn't the problem. The angle is."],
  fr: ["Vous rincez après le brossage ? Pas si vite.", "Ce petit pincement quand vous buvez froid…", "Brosser plus fort ne nettoie pas mieux."],
  it: ["Si sciacqua la bocca dopo lo spazzolino? Aspetti un attimo.", "Quella fitta quando beve qualcosa di freddo…", "Spazzolare più forte non pulisce di più."],
  pt: ["Bochechas depois de escovar? Espera aí.", "Aquela pontada quando bebes algo gelado…", "Escovar com mais força não limpa mais."],
  pl: ["Płuczą Państwo usta po myciu zębów? Chwileczkę.", "To ukłucie przy pierwszym łyku zimnej wody…", "Mocniejsze szczotkowanie nie znaczy czystsze."],
  ar: ["هل تشطفون أفواهكم مباشرة بعد التفريش؟ لحظة.", "تلك الوخزة عند شرب شيء بارد…", "التفريش بقوة لا يعني تنظيفاً أفضل."],
  ja: ["歯みがきの後、すぐうがいしていませんか？", "冷たい物で、歯がキーンとしませんか？", "強くみがくほど、きれいとは限りません。"],
};

const lang2 = (l: string | undefined) => (l ?? "").toLowerCase().slice(0, 2);

/**
 * The reference script for a video: same language, preferably the same
 * market and form of address, on a different service from the video's
 * (so its content cannot leak in). Undefined for languages without one.
 */
export function exampleFor(
  profile: { language: string; country?: string; address?: "formal" | "informal" },
  topic?: { service?: string },
): ScriptExample | undefined {
  const pool = EXAMPLES.filter((e) => e.language === lang2(profile.language));
  if (!pool.length) return undefined;
  const service = (topic?.service ?? "").toLowerCase();
  const score = (e: ScriptExample) =>
    (e.country === (profile.country ?? "").toUpperCase() ? 2 : 0) +
    (e.address === profile.address ? 1 : 0) +
    (service && (e.service.toLowerCase().includes(service) || service.includes(e.service.toLowerCase())) ? -5 : 0);
  return [...pool].sort((a, b) => score(b) - score(a))[0];
}

/** The example as the writers see it: shape and sound, with the instruction not to copy it. */
export function exampleBlock(e: ScriptExample): string {
  const screen = e.scenes
    .map((s) => {
      switch (s.kind) {
        case "hook":
        case "statement":
        case "cta":
          return `  ${s.kind}: ${s.text}`;
        case "list":
          return `  list: ${s.heading} — ${s.items.join(" / ")}`;
        case "compare":
          return `  compare: ${s.left.label}: ${s.left.text} | ${s.right.label}: ${s.right.text}`;
      }
    })
    .join("\n");
  return [
    `REFERENCE — the standard to match (a different subject: never reuse its subject, hook, sentences or closing line; copy only how it sounds and how it is built):`,
    `One takeaway: ${e.takeaway}`,
    `Screen:\n${screen}`,
    `Narration: ${e.narration}`,
  ].join("\n");
}

export function hookExamples(language: string | undefined): string[] {
  return HOOK_BANK[lang2(language)] ?? HOOK_BANK.en;
}
