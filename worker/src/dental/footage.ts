import type { ScenePlan } from "../remotion/scene-plan.js";

/**
 * Stock-footage guard for clinic videos.
 *
 * Seen on production: the query "dental implant process" returned a clip of
 * a patient mid-procedure, with another clinic's staff and name badge in
 * shot. A clinic must never post a stranger's treatment (privacy, and it is
 * someone else's practice), and Pexels cannot be told "no people". So queries
 * are kept to objects: any query that reaches for people or a clinical setting
 * is replaced by an object shot for the video's service, and a week does not
 * show the same shot twice (two videos got the same toothpaste clip).
 */

const PEOPLE_OR_CLINIC =
  /\b(dentists?|doctors?|nurses?|hygienists?|clinics?|surgery|surgical|surgeon|treatments?|procedures?|process|patients?|operations?|hospital|chair|exam\w*|appointment|people|person|woman|man|girl|boy|smil\w*|face|mouth open)\b/i;

/** Object shots by service, in several languages' service names. */
const BY_SERVICE: [RegExp, string[]][] = [
  [/implant|インプラント|زراع/i, ["dental implant model", "tooth model close up", "dental model teeth"]],
  [/whiten|bleach|blanque|beyazlat|blanchi|clare|sbianc|ホワイトニング|تبييض|wybiel/i, ["teeth whitening tray", "white toothpaste close up", "coffee cup close up"]],
  [/align|alinead|plak|aligneur|allinea|alinhad|ortodon|矯正|マウスピース|تقويم|nakładk/i, ["clear aligner close up", "clear aligner case", "glass of water close up"]],
  [/root|wurzel|endodon|kanal|kanał|canal|devital|根管|عصب/i, ["tooth model close up", "ice cubes close up", "dental model teeth"]],
  [/child|kinder|niñ|odontopedi|çocuk|pédodont|pedodon|bambin|crian|小児|子ども|子供|أطفال|dziec/i, ["child toothbrush", "colorful toothbrushes", "kids toothpaste"]],
  [/clean|reinig|limpieza|temizl|détartr|igiene|limpeza|hygien|クリーニング|歯石|تنظيف|جير|higienizac|skaling|kamień/i, ["toothbrush close up", "dental floss close up", "toothpaste on toothbrush"]],
];
const GENERAL = ["toothbrush close up", "dental floss close up", "toothpaste on toothbrush", "glass of water close up", "electric toothbrush"];

function choices(service: string): string[] {
  const hit = BY_SERVICE.find(([re]) => re.test(service));
  return [...(hit ? hit[1] : []), ...GENERAL];
}

/** The plan with every stock query made safe and not yet used this week. */
export function guardFootage(plan: ScenePlan, service: string, used: Set<string>): ScenePlan {
  const scenes = plan.scenes.map((s) => {
    if (s.kind !== "footage" || s.source.type !== "stock") return s;
    let query = s.source.query.trim().toLowerCase();
    if (PEOPLE_OR_CLINIC.test(query) || used.has(query)) {
      query = choices(service).find((q) => !used.has(q)) ?? query;
    }
    used.add(query);
    return { ...s, source: { ...s.source, query } };
  });
  return { ...plan, scenes } as ScenePlan;
}
