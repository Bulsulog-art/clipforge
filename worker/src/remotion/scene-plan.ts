import { z } from "zod";

/**
 * The contract between the language model and the renderer.
 *
 * A prompt ("make me a video about morning routines") is turned into a scene
 * plan by GPT, and the scene plan is the ONLY thing the renderer sees. That
 * separation is the whole design:
 *
 *   • The model never emits layout, colours, timing curves or React. It emits
 *     content and intent. Everything that decides whether the video looks good
 *     lives in our compositions, where we can improve it for every user at
 *     once instead of hoping the model phrased it well today.
 *   • A plan is data, so it can be validated, repaired, cached, replayed,
 *     shown to the user for editing, and diffed when something looks wrong.
 *   • Render cost is bounded before a single frame is drawn, because the plan
 *     carries its own duration.
 *
 * The scene kinds below are not arbitrary: they are the formats that actually
 * travel on short-form feeds. A model given a free-form canvas produces
 * mush; given seven strong shapes it produces something watchable.
 */

export const FPS = 30;

/** Hard limits. A plan outside these is rejected, not clamped silently. */
export const LIMITS = {
  /** Under ~1.2s nothing is readable; over 10s a single card is dead air. */
  sceneSeconds: { min: 1.2, max: 10 },
  /** Short-form dies after a minute and a half, and so does our render budget. */
  totalSeconds: { min: 4, max: 90 },
  scenes: { min: 1, max: 20 },
  /** Beyond this a line stops fitting on a phone at a readable size. */
  hookChars: 90,
  bodyChars: 220,
  listItems: { min: 2, max: 6 },
} as const;

const seconds = z
  .number()
  .min(LIMITS.sceneSeconds.min)
  .max(LIMITS.sceneSeconds.max);

/**
 * Where a footage scene gets its pixels. `stock` is a search query we resolve
 * against a stock provider; `user` is a clip the person already uploaded.
 * The model may only ask for one of these two — it cannot point at arbitrary
 * URLs, which keeps us out of other people's copyright.
 */
export const footageSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("stock"),
    /** Two to four plain words. "sunrise over city", not a sentence. */
    query: z.string().min(2).max(60),
  }),
  z.object({
    type: z.literal("user"),
    /** Index into the clips the user attached to this job. */
    assetIndex: z.number().int().min(0).max(50),
  }),
]);

export type FootageSource = z.infer<typeof footageSourceSchema>;

export const sceneSchema = z.discriminatedUnion("kind", [
  /** The first three seconds. Everything else is wasted if this fails. */
  z.object({
    kind: z.literal("hook"),
    text: z.string().min(3).max(LIMITS.hookChars),
    sub: z.string().max(LIMITS.bodyChars).optional(),
    seconds,
  }),
  /** One idea, large type, nothing else competing for attention. */
  z.object({
    kind: z.literal("statement"),
    text: z.string().min(3).max(LIMITS.bodyChars),
    /** Words to lift out of the line — drawn in the accent colour. */
    emphasis: z.array(z.string().min(1).max(40)).max(4).optional(),
    seconds,
  }),
  /** The listicle. Items land one at a time. */
  z.object({
    kind: z.literal("list"),
    heading: z.string().min(2).max(70),
    items: z
      .array(z.string().min(1).max(90))
      .min(LIMITS.listItems.min)
      .max(LIMITS.listItems.max),
    seconds,
  }),
  /** A number, counted up. The single most reliable retention device. */
  z.object({
    kind: z.literal("stat"),
    value: z.string().min(1).max(16),
    label: z.string().min(2).max(80),
    context: z.string().max(LIMITS.bodyChars).optional(),
    seconds,
  }),
  z.object({
    kind: z.literal("quote"),
    text: z.string().min(3).max(LIMITS.bodyChars),
    attribution: z.string().max(60).optional(),
    seconds,
  }),
  /** Side by side. Reads instantly, which is why it travels. */
  z.object({
    kind: z.literal("compare"),
    left: z.object({ label: z.string().max(24), text: z.string().min(1).max(120) }),
    right: z.object({ label: z.string().max(24), text: z.string().min(1).max(120) }),
    seconds,
  }),
  /** Real footage, with an optional caption burned over it. */
  z.object({
    kind: z.literal("footage"),
    source: footageSourceSchema,
    caption: z.string().max(LIMITS.bodyChars).optional(),
    seconds,
  }),
  z.object({
    kind: z.literal("cta"),
    text: z.string().min(2).max(90),
    handle: z.string().max(40).optional(),
    seconds,
  }),
]);

export type Scene = z.infer<typeof sceneSchema>;
export type SceneKind = Scene["kind"];

export const THEMES = ["midnight", "sunrise", "mono", "candy", "editorial"] as const;
export type ThemeId = (typeof THEMES)[number];

export const ASPECTS = { "9:16": [1080, 1920], "1:1": [1080, 1080], "16:9": [1920, 1080] } as const;
export type AspectId = keyof typeof ASPECTS;

export const scenePlanSchema = z.object({
  /** Shown in the library. Not drawn on screen. */
  title: z.string().min(1).max(80),
  aspect: z.enum(["9:16", "1:1", "16:9"]),
  theme: z.enum(THEMES),
  scenes: z.array(sceneSchema).min(LIMITS.scenes.min).max(LIMITS.scenes.max),
  /** Narration. Omitted means the video carries itself on type and music. */
  voiceover: z
    .object({
      text: z.string().min(1).max(1200),
      voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).default("nova"),
    })
    .optional(),
  music: z.enum(["none", "calm", "uplifting", "tense", "playful"]).default("none"),
});

export type ScenePlan = z.infer<typeof scenePlanSchema>;

// MARK: - Derived values

export function sceneFrames(scene: Scene): number {
  return Math.round(scene.seconds * FPS);
}

export function totalFrames(plan: ScenePlan): number {
  return plan.scenes.reduce((sum, s) => sum + sceneFrames(s), 0);
}

export function totalSeconds(plan: ScenePlan): number {
  return totalFrames(plan) / FPS;
}

/** Frame at which each scene starts, parallel to `plan.scenes`. */
export function sceneOffsets(plan: ScenePlan): number[] {
  const offsets: number[] = [];
  let acc = 0;
  for (const scene of plan.scenes) {
    offsets.push(acc);
    acc += sceneFrames(scene);
  }
  return offsets;
}

export function dimensions(plan: ScenePlan): { width: number; height: number } {
  const [width, height] = ASPECTS[plan.aspect];
  return { width, height };
}

/** Stock queries the plan needs resolved before it can render. */
export function stockQueries(plan: ScenePlan): string[] {
  const queries = plan.scenes.flatMap((s) =>
    s.kind === "footage" && s.source.type === "stock" ? [s.source.query] : [],
  );
  return [...new Set(queries)];
}

/** Highest user asset index the plan refers to, or -1 if it uses none. */
export function maxUserAssetIndex(plan: ScenePlan): number {
  return plan.scenes.reduce(
    (max, s) =>
      s.kind === "footage" && s.source.type === "user"
        ? Math.max(max, s.source.assetIndex)
        : max,
    -1,
  );
}

// MARK: - Validation

export class ScenePlanError extends Error {
  readonly userMessage: string;
  constructor(message: string, userMessage: string) {
    super(message);
    this.name = "ScenePlanError";
    this.userMessage = userMessage;
  }
}

/**
 * Parses and sanity-checks a plan. Schema validation alone is not enough:
 * a plan can be individually valid scene by scene and still be a 4-minute
 * video, or reference a clip the user never uploaded.
 *
 * @param userAssetCount how many clips the user attached to this job
 */
export function parseScenePlan(input: unknown, userAssetCount = 0): ScenePlan {
  const parsed = scenePlanSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    throw new ScenePlanError(
      `scene plan invalid at ${first.path.join(".") || "root"}: ${first.message}`,
      "We couldn't turn that into a video. Try describing it in a sentence or two.",
    );
  }

  const plan = parsed.data;
  const total = totalSeconds(plan);
  if (total < LIMITS.totalSeconds.min || total > LIMITS.totalSeconds.max) {
    throw new ScenePlanError(
      `scene plan runs ${total.toFixed(1)}s, outside ${LIMITS.totalSeconds.min}-${LIMITS.totalSeconds.max}s`,
      "That came out too long to post. Ask for something shorter and we'll try again.",
    );
  }

  const needed = maxUserAssetIndex(plan);
  if (needed >= userAssetCount) {
    throw new ScenePlanError(
      `plan references user asset ${needed} but only ${userAssetCount} were provided`,
      "The plan asked for a clip that wasn't uploaded. Try again with your clips attached.",
    );
  }

  return plan;
}
