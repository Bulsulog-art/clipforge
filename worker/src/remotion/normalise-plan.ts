/**
 * Straightens out the shapes a language model reaches for when it means the
 * right thing.
 *
 * The renderer's parser is strict on purpose — it is what stops a malformed
 * plan reaching the composition. But strictness at the boundary is only useful
 * if the boundary is where the mistake actually is, and most of what a model
 * gets wrong here is vocabulary, not intent: it writes `type` where we asked
 * for `kind`, or `outro` where we called it `cta`. Rejecting those costs a
 * repair round, and sometimes the whole job.
 *
 * So the model's output is translated before it is judged. Anything this file
 * cannot recognise still fails validation, loudly, as it should.
 *
 * The first production job died here: `scenes.0.kind: Invalid discriminator
 * value`, twice in a row. The prompt described the scene kinds in detail and
 * never once named the field they go in.
 */

const KINDS = [
  "hook",
  "statement",
  "list",
  "stat",
  "quote",
  "compare",
  "footage",
  "cta",
] as const;

type Kind = (typeof KINDS)[number];

const KIND_SET = new Set<string>(KINDS);

/**
 * Words a model reaches for when it means one of ours.
 *
 * Only unambiguous synonyms belong here. A guess that lands on the wrong scene
 * kind produces a video that is wrong in a way nobody will trace back to this
 * table — better to fail validation and let the repair round see the error.
 */
const SYNONYMS: Record<string, Kind> = {
  // hook
  intro: "hook",
  opening: "hook",
  opener: "hook",
  title: "hook",
  headline: "hook",
  // statement
  text: "statement",
  message: "statement",
  paragraph: "statement",
  point: "statement",
  // list
  bullets: "list",
  bulletlist: "list",
  points: "list",
  items: "list",
  steps: "list",
  // stat
  number: "stat",
  metric: "stat",
  statistic: "stat",
  data: "stat",
  // quote
  quotation: "quote",
  testimonial: "quote",
  // compare
  comparison: "compare",
  versus: "compare",
  vs: "compare",
  beforeafter: "compare",
  // footage
  video: "footage",
  clip: "footage",
  broll: "footage",
  broll_shot: "footage",
  shot: "footage",
  stock: "footage",
  // cta
  outro: "cta",
  close: "cta",
  closing: "cta",
  ending: "cta",
  calltoaction: "cta",
};

/** "B-Roll" and "call to action" and "CTA " all reduce to one lookup key. */
function key(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function resolveKind(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const k = key(value);
  if (KIND_SET.has(k)) return k;
  return SYNONYMS[k];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns the plan with its scene kinds spelled the way the parser expects.
 *
 * Never throws and never invents a scene: anything it does not recognise is
 * passed through untouched so the parser can reject it with a message the
 * repair round can act on.
 */
export function normalisePlanShape(raw: unknown): unknown {
  if (!isObject(raw) || !Array.isArray(raw.scenes)) return raw;

  const scenes = raw.scenes.map((scene) => {
    if (!isObject(scene)) return scene;

    // `kind` first, then the discriminator the model reached for instead.
    // `source.type` is a real field on footage scenes and is left alone —
    // only the scene's own top level is touched.
    const resolved = resolveKind(scene.kind) ?? resolveKind(scene.type) ?? resolveKind(scene.scene);
    if (!resolved) return scene;

    const next: Record<string, unknown> = { ...scene, kind: resolved };
    // Drop the alias so a stray `type: "outro"` cannot contradict the kind we
    // just resolved from it.
    if (typeof scene.kind !== "string" || !KIND_SET.has(key(scene.kind))) {
      if (typeof next.type === "string") delete next.type;
      if (typeof next.scene === "string") delete next.scene;
    }
    return next;
  });

  return { ...raw, scenes };
}
