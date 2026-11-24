import type { ScenePlan } from "../remotion/scene-plan.js";
import { rotationHash } from "../remotion/stock.js";

/**
 * Stock-footage guard for clinic videos.
 *
 * Seen on production: the query "dental implant process" returned a clip of
 * a patient mid-procedure, with another clinic's staff and name badge in
 * shot. A clinic must never post a stranger's treatment (privacy, and it is
 * someone else's practice), and Pexels cannot be told "no people". So queries
 * are kept to dental objects (never food, drinks or rooms on their own, never
 * signs, logos or offices that could carry another practice's name): any query that reaches for people or a clinical setting
 * is replaced by an object shot for the video's service, and a week does not
 * show the same shot twice (two videos got the same toothpaste clip).
 */

const PEOPLE_OR_CLINIC =
  /\b(logos?|brand\w*|signs?|signage|office|store|shop|posters?|dentists?|doctors?|nurses?|hygienists?|clinics?|surgery|surgical|surgeon|treatments?|procedures?|process|patients?|operations?|hospital|chair|exam\w*|appointment|people|person|woman|man|girl|boy|smil\w*|face|mouth open)\b/i;

/**
 * Object shots by service, in several languages' service names: six to eight
 * each, so a clinic whose queries keep being replaced does not get the same
 * three shots every month (stock-clip rotation, Nov 2026). Each is an object
 * on its own, phrased the way stock libraries tag it ("close up", "model",
 * "case"), never a scene with a person in it. The first ones lead, as before.
 */
export const SERVICE_SHOTS: readonly (readonly [RegExp, readonly string[]])[] = [
  [
    /implant|インプラント|زراع/i,
    ["dental implant model", "tooth model close up", "dental model teeth", "dental implant screw", "titanium dental implant", "jaw model teeth", "dental crown close up"],
  ],
  [
    /whiten|bleach|blanque|beyazlat|blanchi|clare|sbianc|ホワイトニング|تبييض|wybiel/i,
    ["teeth whitening tray", "white toothpaste close up", "toothbrush and toothpaste", "teeth whitening kit", "tooth shade guide", "toothpaste tube close up", "dental model white teeth"],
  ],
  [
    /align|alinead|plak|aligneur|allinea|alinhad|ortodon|矯正|マウスピース|تقويم|nakładk/i,
    ["clear aligner close up", "clear aligner case", "orthodontic retainer close up", "aligner tray close up", "retainer case close up", "teeth model with braces", "orthodontic model teeth"],
  ],
  [
    /root|wurzel|endodon|kanal|kanał|canal|devital|根管|عصب/i,
    ["tooth model close up", "dental model teeth", "dental x ray", "molar tooth model", "tooth anatomy model", "dental crown close up", "dental mirror close up"],
  ],
  [
    /child|kinder|niñ|odontopedi|çocuk|pédodont|pedodon|bambin|crian|小児|子ども|子供|أطفال|dziec/i,
    ["child toothbrush", "colorful toothbrushes", "kids toothpaste", "toothbrushes in a cup", "small toothbrush close up", "toy teeth model", "toothpaste on small toothbrush"],
  ],
  [
    /clean|reinig|limpieza|temizl|détartr|igiene|limpeza|hygien|クリーニング|歯石|تنظيف|جير|higienizac|skaling|kamień/i,
    ["toothbrush close up", "dental floss close up", "toothpaste on toothbrush", "interdental brush close up", "mouthwash close up", "electric toothbrush close up", "floss picks close up", "toothbrush bristles close up"],
  ],
];
/** For any service, after its own shots (and for a service none of the above names). */
export const GENERAL_SHOTS: readonly string[] = [
  "toothbrush close up",
  "dental floss close up",
  "toothpaste on toothbrush",
  "dental model teeth",
  "electric toothbrush",
  "toothbrushes in a cup",
  "mouthwash close up",
  "interdental brush close up",
];

/**
 * The service's own shots; [] for a service none of SERVICE_SHOTS names. The
 * name is also tried without its accents: a Turkish "İmplant" lower-cases to
 * "i̇mplant" (a dotted i), which /implant/i does not match, so those clinics
 * got general toothbrush shots in their implant videos.
 */
export function serviceShots(service: string): readonly string[] {
  const plain = service.normalize("NFKD").replace(/\p{M}+/gu, "");
  return SERVICE_SHOTS.find(([re]) => re.test(service) || re.test(plain))?.[1] ?? [];
}

/**
 * Which week of the clinic's rotation a replacement shot is chosen in
 * (week.ts: the same seed and turn as its stock clips, remotion/stock.ts
 * ClipRotation). Absent: the service's shots in their fixed order, as before.
 */
export type ShotRotation = { seed: string; turn?: number };

const rotate = <T>(list: readonly T[], by: number): T[] => {
  if (!list.length) return [];
  const k = ((by % list.length) + list.length) % list.length;
  return [...list.slice(k), ...list.slice(0, k)];
};

function choices(service: string, rotation?: ShotRotation): string[] {
  const own = serviceShots(service);
  if (!rotation) return [...own, ...GENERAL_SHOTS];
  // The clinic starts at its own place in each list and moves one shot along every week.
  const by = rotationHash(`${rotation.seed}|${service.trim().toLowerCase()}`) + Math.trunc(Number.isFinite(rotation.turn) ? rotation.turn! : 0);
  return [...rotate(own, by), ...rotate(GENERAL_SHOTS, by)];
}

/**
 * A query must name something dental. "coffee cup close up", "ice cubes" or
 * "sink" return lifestyle clips a dentist reads as filler (review, Nov 2026:
 * "an ice-cream bowl in the whitening video"), so a query without a dental
 * object is replaced by one for the video's service.
 */
const DENTAL_OBJECT = /\b(tooth|teeth|dental|dentures?|toothbrush\w*|toothpaste|floss\w*|aligners?|retainers?|braces|mouthwash|interdental|enamel|molars?|implants?|crowns?|x ?-?ray|orthodontic\w*|gums?)\b/i;

export function dentalQuery(query: string): boolean {
  return DENTAL_OBJECT.test(query) && !PEOPLE_OR_CLINIC.test(query);
}

/**
 * The plan with every stock query made safe and not yet used this week. A
 * query that has to be replaced takes the service's next shot; with a
 * rotation (produceWeek), where the clinic is in its rotation that week.
 */
export function guardFootage(plan: ScenePlan, service: string, used: Set<string>, rotation?: ShotRotation): ScenePlan {
  const options = choices(service, rotation);
  const scenes = plan.scenes.map((s) => {
    if (s.kind !== "footage" || s.source.type !== "stock") return s;
    let query = s.source.query.trim().toLowerCase();
    if (!dentalQuery(query) || used.has(query)) {
      // Every shot used already: repeat a dental one rather than keep a non-dental query.
      query = options.find((q) => !used.has(q)) ?? (dentalQuery(query) ? query : options[0]);
    }
    used.add(query);
    return { ...s, source: { ...s.source, query } };
  });
  return { ...plan, scenes } as ScenePlan;
}
