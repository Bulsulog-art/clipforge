import { BACKGROUND_LIBRARY, type LibraryImage } from "./library";

/**
 * Background-photo suggestions for a DentVideo video.
 *
 * The customer never generates images: we keep a curated stock library
 * (scripts/dentvideo-backgrounds/), and for each video this ranks 10–20 photos
 * by what the video is about. The clinic taps the ones it likes and they
 * rotate behind the text (remotion/background-layer.tsx).
 *
 * Pure and deterministic: the same plan always gets the same list, at zero API
 * cost. Non-English videos are mapped through per-language keyword stems
 * (tr, de, es, fr, it, pt, en), and the clinic's service name through the same
 * kind of regexes dental/footage.ts uses. Diversity is enforced across
 * categories, and the list is never empty.
 *
 * THIS FILE IS DUPLICATED, byte for byte apart from import extensions, in
 * web/src/lib/dentvid/backgrounds/suggest.ts so the browser preview ranks
 * exactly as the worker does. backgrounds.test.ts in both apps checks the
 * shared fixtures, and the web test checks the two files are identical.
 */

export type SuggestInput = {
  /** A scene plan, or anything shaped like one: every string in its scenes is read. */
  plan?: { title?: string; scenes?: unknown[]; voiceover?: { text?: string } };
  /** The topic title / angle the video was written for. */
  topic?: string;
  /** The clinic service the video promotes ("Implantologie", "Diş beyazlatma"…). */
  service?: string;
  /** ISO language of the video; only decides nothing on its own — stems for all languages are tried. */
  language?: string;
};

export const SUGGEST_MIN = 10;
export const SUGGEST_MAX = 20;
export const BACKGROUNDS_BASE_PATH = "/dentvideo/backgrounds";

/** Where an id's photo is served (web public folder; the worker resolves the same path). */
export function backgroundSrc(id: string): string {
  return `${BACKGROUNDS_BASE_PATH}/${id}.jpg`;
}

/** The library id back out of a src ("/dentvideo/backgrounds/implants-03.jpg" → "implants-03"). */
export function backgroundId(src: string): string | undefined {
  const m = /(?:^|\/)([a-z]+-\d{2})\.jpg$/.exec(src);
  return m && BACKGROUND_LIBRARY.some((i) => i.id === m[1]) ? m[1] : undefined;
}

type Concept = { cats: Partial<Record<string, number>>; tags: string[]; stems: string[] };

/**
 * Concepts with the word stems that signal them, in all seven languages.
 * Stems are matched at the start of a word after folding accents
 * ("diş" → "dis", "Zähne" → "zahne"), so "beyazlat" catches "beyazlatma".
 */
const CONCEPTS: Concept[] = [
  { cats: { whitening: 3 }, tags: ["whitening", "white", "bright"], stems: ["whiten", "bleach", "white teeth", "beyazlat", "beyaz", "bleaching", "aufhell", "weiss", "blanque", "blanco", "blanchi", "blanc", "sbianc", "bianc", "clarea", "branquea", "branco"] },
  { cats: { whitening: 2, food: 1 }, tags: ["stain", "coffee"], stems: ["stain", "discolo", "yellow", "leke", "sarar", "verfarb", "flecken", "gelb", "mancha", "amarill", "tache", "jaun", "macchi", "giall", "amarel"] },
  { cats: { implants: 3 }, tags: ["implant", "titanium", "replacement", "crown"], stems: ["implant", "titan", "titanyum", "impianto", "implante"] },
  { cats: { implants: 2 }, tags: ["replacement", "missing tooth", "fit"], stems: ["missing tooth", "missing teeth", "gap", "eksik dis", "dis kaybi", "zahnluck", "zahnverlust", "fehlende", "diente perdid", "falta de diente", "dent manquant", "perte de dent", "dente mancant", "dente perdid", "bridge", "kopru", "brucke", "puente", "pont", "ponte", "denture", "protez", "prothes", "protesi", "dentadura", "crown", "kron", "krone", "corona", "couronne", "coroa"] },
  { cats: { implants: 1, food: 1 }, tags: ["eating", "bite", "chewing", "apple", "bread"], stems: ["chew", "bite", "cigne", "isir", "kauen", "beiss", "mastic", "morder", "macher", "mordre", "mastica", "morde"] },
  { cats: { implants: 1, calm: 1 }, tags: ["healing", "recovery", "growth", "stable", "foundation"], stems: ["heal", "recover", "bone", "iyiles", "kemik", "heil", "knochen", "cicatri", "hueso", "recupera", "guari", "osso"] },
  { cats: { aligners: 3 }, tags: ["aligner", "clear", "invisible", "case"], stems: ["aligner", "invisalign", "seffaf plak", "plak tedavi", "seffaf", "schiene", "aligneur", "gouttiere", "alineador", "allineator", "alinhador", "invisible", "unsichtbar", "gorunmez", "invisibil"] },
  { cats: { aligners: 2 }, tags: ["straight", "aligned", "braces"], stems: ["brace", "orthodon", "ortodon", "straight", "crooked", "duzgun", "carpik", "tel ", "zahnspange", "kieferorthop", "gerade", "schief", "brackets", "ortodonc", "chueco", "torcid", "appareil", "redress", "apparecchio", "storti", "aparelho", "torto"] },
  { cats: { cleaning: 3 }, tags: ["cleaning", "polish", "scaling", "clean"], stems: ["tartar", "plaque", "scaling", "polish", "professional clean", "dis tasi", "temizl", "detartraj", "zahnstein", "zahnreinig", "reinigung", "belag", "sarro", "limpieza", "placa", "detartr", "nettoyage", "tartre", "pulizia", "tartaro", "ablazione", "limpeza", "polier", "pulido", "polissage"] },
  { cats: { cleaning: 2, clinic: 1 }, tags: ["check-up", "appointment", "clinic"], stems: ["check-up", "checkup", "check up", "control", "kontrol", "routine visit", "vorsorge", "untersuch", "revision", "revisao", "visita", "visite", "bilan", "muayene"] },
  { cats: { cleaning: 1, hygiene: 1 }, tags: ["gum", "rinse"], stems: ["gum", "gingiv", "periodon", "bleed", "dis eti", "diseti", "kanama", "zahnfleisch", "parodont", "blut", "encia", "sangr", "gencive", "saign", "gengiv", "sanguin", "gengiva"] },
  { cats: { rootcanal: 3 }, tags: ["root", "roots", "treatment"], stems: ["root canal", "endodon", "kanal tedavi", "kanal", "wurzel", "conducto", "endodonc", "canal", "devitali", "nerve", "sinir", "nerv", "nervio", "nerf", "nervo", "pulp", "pulpa", "pulpe", "polpa"] },
  { cats: { rootcanal: 3 }, tags: ["pain", "relief", "comfort"], stems: ["pain", "toothache", "ache", "hurt", "agri", "sizla", "schmerz", "zahnweh", "dolor", "duele", "douleur", "mal de dent", "dolore", "mal di dent", "dor de dente", "dores"] },
  { cats: { rootcanal: 2 }, tags: ["swelling", "cold", "relief"], stems: ["swell", "abscess", "infect", "sislik", "apse", "enfeks", "schwell", "abszess", "entzund", "hinchaz", "absceso", "infecc", "gonfle", "abces", "gonfi", "ascess", "inchaco", "abscesso", "infecç"] },
  { cats: { rootcanal: 1, calm: 1 }, tags: ["night", "rest"], stems: ["night", "sleep", "gece", "uyku", "nacht", "schlaf", "noche", "dorm", "nuit", "sommeil", "notte", "sonno", "noite", "sono"] },
  { cats: { kids: 3 }, tags: ["children", "kids", "toy", "first visit"], stems: ["child", "kid", "baby", "toddler", "pediatric", "paediatric", "cocuk", "bebek", "pedodont", "kinder", "kind ", "kindes", "kleinkind", "nino", "nina", "infantil", "odontopediatr", "enfant", "pedodont", "bambin", "bimb", "pediatri", "crianc", "infantil", "milk teeth", "baby teeth", "sut dis", "milchzahn", "dientes de leche", "dents de lait", "denti da latte", "dentes de leite"] },
  { cats: { hygiene: 3 }, tags: ["toothbrush", "brushing", "electric toothbrush"], stems: ["brush", "toothbrush", "fircala", "fırca", "firca", "putz", "zahnburst", "burst", "cepill", "brosse", "spazzol", "escov"] },
  { cats: { hygiene: 3 }, tags: ["floss", "interdental", "water flosser"], stems: ["floss", "interdental", "dis ipi", "arayuz", "zahnseide", "zahnzwischen", "hilo dental", "seda dental", "fil dentaire", "brossette", "filo interdent", "scovolino", "fio dental"] },
  { cats: { hygiene: 2 }, tags: ["toothpaste", "mouthwash", "routine"], stems: ["toothpaste", "fluorid", "fluor", "mouthwash", "macun", "gargara", "zahnpasta", "zahncreme", "mundspul", "pasta de dient", "pasta dental", "enjuague", "dentifric", "bain de bouche", "dentifricio", "collutorio", "pasta de dente", "enxagu", "routine", "rutin", "habit", "aliskanl", "gewohnheit", "rutina", "habito", "abitudin", "hábito"] },
  { cats: { hygiene: 1 }, tags: ["morning", "routine"], stems: ["morning", "sabah", "morgen", "manana", "matin", "mattin", "manha"] },
  { cats: { food: 3, whitening: 1 }, tags: ["coffee", "tea", "wine", "stain"], stems: ["coffee", "tea ", "tea,", "wine", "kahve", "cay ", "cayi", "sarap", "kaffee", "tee ", "tees", "teetrink", "wein", "cafe", "vino", "vin rouge", "caffe", "vinho", "cha "] },
  { cats: { food: 3 }, tags: ["sugar", "sweets", "candy", "chocolate", "soda"], stems: ["sugar", "sweet", "candy", "chocolate", "soda", "cola", "fizzy", "seker", "tatli", "cikolata", "gazli", "zucker", "susses", "sussigkeit", "schokolad", "limonade", "azucar", "dulce", "golosina", "refresco", "sucre", "bonbon", "sucrer", "zucchero", "dolci", "caramell", "bibite", "acucar", "doce", "refrigerante", "cavit", "curuk", "karies", "caries", "carie", "cárie"] },
  { cats: { food: 2, sensitivity: 1 }, tags: ["citrus", "acid", "juice"], stems: ["acid", "citrus", "lemon", "orange juice", "juice", "asit", "limon", "meyve suyu", "saure", "zitron", "saft", "acido", "zumo", "jugo", "acide", "citron", "jus", "succo", "suco"] },
  { cats: { food: 2 }, tags: ["healthy", "calcium", "milk", "cheese", "vegetables", "diet", "food", "snack"], stems: ["food", "diet", "eat", "snack", "milk", "cheese", "calcium", "nutrition", "yiyecek", "beslen", "yemek", "sut", "peynir", "kalsiyum", "ernahr", "essen", "milch", "kase", "kalzium", "aliment", "comida", "leche", "queso", "calcio", "nourrit", "manger", "lait", "fromage", "cibo", "latte", "formaggio", "leite", "queijo"] },
  { cats: { sensitivity: 3 }, tags: ["cold", "ice", "sensitive", "enamel", "gentle"], stems: ["sensitiv", "hassas", "empfindlich", "sensib", "sensível", "enamel", "mine", "dis mine", "zahnschmelz", "schmelz", "esmalte", "email", "smalto", "zing"] },
  { cats: { sensitivity: 2, food: 1 }, tags: ["cold", "ice", "hot", "ice cream", "temperature", "winter"], stems: ["cold", "ice", "hot drink", "freez", "soguk", "buz", "dondurma", "kalt", "eis ", "eiswurf", "heiss", "frio", "hielo", "helado", "froid", "glace", "chaud", "freddo", "ghiaccio", "gelato", "caldo", "gelad", "sorvete", "quente", "winter", "kis ", "invierno", "hiver", "inverno"] },
  { cats: { breath: 3 }, tags: ["breath", "fresh", "mint", "tongue"], stems: ["breath", "halitos", "fresh", "mint", "tongue", "nefes", "agiz kok", "kotu koku", "nane", "dil ", "atem", "mundgeruch", "frisch", "minze", "zunge", "aliento", "halitosis", "fresco", "menta", "lengua", "haleine", "mauvaise odeur", "menthe", "langue", "alito", "alitosi", "lingua", "halito", "hálito", "dry mouth", "agiz kurulug", "mundtrocken", "boca seca", "bouche seche", "bocca secca"] },
  { cats: { clinic: 3 }, tags: ["clinic", "treatment room", "reception", "waiting room", "instruments"], stems: ["clinic", "practice", "dentist", "appointment", "visit", "klinik", "dis hekim", "dishekim", "randevu", "muayenehane", "praxis", "zahnarzt", "termin", "clinica", "dentista", "cita", "consulta", "cabinet", "dentiste", "rendez-vous", "studio dentist", "appuntamento", "consultorio", "x-ray", "rontgen", "radiograf", "panoram"] },
  { cats: { calm: 3, clinic: 1 }, tags: ["calm", "relax", "comfort", "trust", "anxiety"], stems: ["fear", "anxi", "afraid", "nervous", "calm", "relax", "comfort", "korku", "kayg", "endise", "rahat", "sakin", "angst", "nervos", "ruhig", "entspann", "miedo", "ansiedad", "tranquil", "relaj", "comod", "peur", "anxiet", "calme", "detente", "paura", "ansia", "calma", "rilass", "medo", "ansiedade", "conforto"] },
];

/** Clinic service names → category, in the style of dental/footage.ts BY_SERVICE. */
const BY_SERVICE: [RegExp, string][] = [
  [/implant/i, "implants"],
  [/whiten|bleach|blanque|beyazlat|blanchi|clare|sbianc|aufhell|branquea/i, "whitening"],
  [/align|alinead|alinhad|plak|aligneur|allinea|ortodon|orthodon|kieferorth|schiene|brace/i, "aligners"],
  [/root|wurzel|endodon|kanal|canal|devital/i, "rootcanal"],
  [/child|kinder|niñ|nin[oa]|odontopedi|çocuk|cocuk|pédodont|pedodon|bambin|crian|pediatr|paediatr/i, "kids"],
  [/clean|reinig|limpieza|temizl|détartr|detartr|igiene|limpeza|hygien|prophyl|zahnstein|sarro|tartar/i, "cleaning"],
  [/sensitiv|hassas|empfindl|sensib/i, "sensitivity"],
  [/breath|halito|nefes|atem|aliento|haleine|alito/i, "breath"],
];

/** When nothing matches, or to round out a list: the general-purpose looks. */
const GENERAL_CATS = ["calm", "clinic", "hygiene", "whitening", "implants", "aligners"];

/** Lowercase and strip accents so stems match across scripts ("Diş" → "dis", "Zähne" → "zahne"). */
export function fold(text: string): string {
  return text
    .replace(/İ/g, "i")
    .replace(/I/g, "i")
    .toLowerCase()
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

function strings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) if (k !== "kind" && k !== "type") strings(v, out);
  }
  return out;
}

function countStem(haystack: string, stem: string): number {
  const s = fold(stem);
  let n = 0;
  let from = 0;
  for (;;) {
    const i = haystack.indexOf(s, from);
    if (i < 0) return n;
    // Start of a word only: "tea" must not fire inside "steak".
    if (i === 0 || !/[a-z0-9]/.test(haystack[i - 1])) n++;
    from = i + s.length;
  }
}

/** Concept hit counts for a text, capped so one repeated word cannot dominate. */
function conceptHits(text: string): number[] {
  const hay = ` ${fold(text)} `;
  return CONCEPTS.map((c) => Math.min(3, c.stems.reduce((sum, st) => sum + countStem(hay, st), 0)));
}

/**
 * Ranked library ids for a video, best first: between SUGGEST_MIN and
 * SUGGEST_MAX (default 16), or the whole library when it is smaller.
 */
type Scores = { catScore: Record<string, number>; tagScore: Record<string, number> };

/** How strongly the video's own words point at each category and tag (no floor). */
function topicScores(input: SuggestInput): Scores {
  // The topic and the title say what the video is about; the scenes say it at length.
  const head = [input.topic ?? "", input.plan?.title ?? ""].join(" . ");
  const body = [...strings(input.plan?.scenes ?? []), input.plan?.voiceover?.text ?? ""].join(" . ");
  const headHits = conceptHits(head);
  const bodyHits = conceptHits(body);

  const catScore: Record<string, number> = {};
  const tagScore: Record<string, number> = {};
  CONCEPTS.forEach((c, i) => {
    const w = headHits[i] * 2 + bodyHits[i];
    if (!w) return;
    for (const [cat, cw] of Object.entries(c.cats)) catScore[cat] = (catScore[cat] ?? 0) + w * (cw ?? 0);
    for (const t of c.tags) tagScore[t] = (tagScore[t] ?? 0) + w;
  });
  const service = BY_SERVICE.find(([re]) => re.test(input.service ?? ""))?.[1];
  if (service) catScore[service] = (catScore[service] ?? 0) + 12;
  return { catScore, tagScore };
}

/**
 * The photos that are actually about this video: their category is named by
 * its topic, service or script. Only these go in by default — a root
 * canal video gets no photos rather than whitening ones; the clinic can still
 * pick any suggestion by hand.
 */
export function matchingBackgrounds(input: SuggestInput, library: LibraryImage[] = BACKGROUND_LIBRARY): Set<string> {
  const { catScore } = topicScores(input);
  return new Set(library.filter((img) => (catScore[img.category] ?? 0) > 0).map((img) => img.id));
}

export function suggestBackgrounds(input: SuggestInput, count = 16, library: LibraryImage[] = BACKGROUND_LIBRARY): string[] {
  const want = Math.min(library.length, Math.max(SUGGEST_MIN, Math.min(SUGGEST_MAX, Math.round(count))));
  if (!want) return [];

  const { catScore, tagScore } = topicScores(input);

  // A small, fixed floor for the general looks so a plan that matches nothing
  // still gets a sensible, stable list.
  GENERAL_CATS.forEach((cat, i) => (catScore[cat] = (catScore[cat] ?? 0) + 0.6 - i * 0.05));

  const scored = library.map((img) => {
    const tags = img.tags.reduce((s, t) => s + Math.min(2, tagScore[t] ?? 0), 0);
    return { img, score: (catScore[img.category] ?? 0) + tags * 0.35 };
  });

  // Greedy pick with a per-category penalty: the best photos lead, but a list
  // of sixteen is not sixteen variations of one idea.
  const picked: string[] = [];
  const perCat: Record<string, number> = {};
  const pool = [...scored];
  while (picked.length < want && pool.length) {
    let best = -1;
    let bestValue = -Infinity;
    pool.forEach((s, i) => {
      const value = s.score * Math.pow(0.82, perCat[s.img.category] ?? 0);
      if (value > bestValue + 1e-9 || (Math.abs(value - bestValue) <= 1e-9 && s.img.id < pool[best].img.id)) {
        best = i;
        bestValue = value;
      }
    });
    const [s] = pool.splice(best, 1);
    picked.push(s.img.id);
    perCat[s.img.category] = (perCat[s.img.category] ?? 0) + 1;
  }
  return picked;
}

/**
 * The photos a new video starts with: the top few suggestions, from more
 * than one category when the list allows. Three for a short video, four
 * from 45 seconds, so each photo holds for roughly ten to fifteen seconds.
 */
export function defaultBackgrounds(suggested: string[], totalSeconds = 30): string[] {
  const n = totalSeconds >= 45 ? 4 : 3;
  return suggested.slice(0, n);
}
