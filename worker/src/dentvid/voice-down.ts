/**
 * A week run stops paying for scripts once its voice is known to be down.
 *
 * Why: a week video's narration (text to speech) is made after every paid
 * model call for that video: the plan, the narration rewrite, the accuracy
 * review, the caption and its review, the shoot card and its review. When the
 * narration fails, the video is not rendered (jobs.ts NarrationFailedError),
 * week.ts tries the topic once more and then moves on to its spare topics.
 * With both voice providers down, that paid for every planned topic twice
 * (7 topics, 2 tries each: 14 full rounds a run, more with the clinic's
 * suggested topics) and the run still ended with nothing usable.
 *
 * Now, once the narration has failed for VOICE_DOWN_TOPICS different topics
 * of one run and has not worked for any, the run's model client refuses every
 * further call with VoiceDownError before it reaches the provider. The topics
 * still to go fail at once without paying, the run ends with nothing usable
 * and is retried later as before (TransientWeekError). Two topics, not one:
 * a narration that fails for one topic's own text must not cost the clinic
 * the rest of its week.
 */

/** Different topics whose narration failed, with none working, before the run's voice counts as down. */
export const VOICE_DOWN_TOPICS = 2;

/** The error text of a topic skipped by the breaker (week.ts records only the message). */
export const VOICE_DOWN_MESSAGE = "skipped with no paid call: the narration could not be made for any video of this run, so the voice is taken to be down";

export class VoiceDownError extends Error {
  constructor() {
    super(VOICE_DOWN_MESSAGE);
    this.name = "VoiceDownError";
  }
}

/** A topic the breaker skipped, from the error or from the message week.ts kept of it. */
export function isVoiceDownSkip(e: unknown): boolean {
  if (e instanceof VoiceDownError) return true;
  const text = typeof e === "string" ? e : (e as { message?: unknown } | null | undefined)?.message;
  return typeof text === "string" && text.includes(VOICE_DOWN_MESSAGE);
}

/** What one run's narrations did. */
export type VoiceTally = {
  /** Narrations made. */
  ok: number;
  /** Titles of the topics whose narration failed (the voice providers, or a step right after them). */
  failedTopics: Set<string>;
};

/** The run's voice is down: narration failed for VOICE_DOWN_TOPICS topics and worked for none. */
export const voiceDown = (t: VoiceTally): boolean => t.ok === 0 && t.failedTopics.size >= VOICE_DOWN_TOPICS;

/**
 * The model client for one run. While `down()` is false every call goes
 * through untouched (the method runs on the real object, so the SDK's own
 * state and private fields work as usual). Once it is true, any method
 * anywhere under the client returns a rejected promise with VoiceDownError,
 * without calling it.
 */
export function gatedClient<T extends object>(client: T, down: () => boolean): T {
  const wrap = <O extends object>(target: O): O =>
    new Proxy(target, {
      get(t, prop) {
        const value: unknown = Reflect.get(t, prop, t);
        if (typeof value === "function") {
          return (...args: unknown[]) => (down() ? Promise.reject(new VoiceDownError()) : Reflect.apply(value as (...a: unknown[]) => unknown, t, args));
        }
        if (value !== null && typeof value === "object") return wrap(value as object);
        return value;
      },
    });
  return wrap(client);
}
