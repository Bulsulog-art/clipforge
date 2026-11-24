import type { OpsStore, OwnerAlert } from "./ops-alert.js";

/**
 * How long a clinic's week really takes, and telling the owner before the
 * box is too small for Monday.
 *
 * Before, "the batch will miss deadlines" was only a log line at the Saturday
 * dispatch (schedule.ts), projected from an estimate of 12 minutes a week
 * that nobody measured: BullMQ forgets completed jobs after 7 days, so no
 * duration history was kept. The first sign that the box was too small would
 * have been a dentist with no Monday videos.
 *
 * Now:
 *   - after every week job that made a full week (five usable videos in that
 *     run), its wall time (finishedOn - processedOn) goes into a capped Redis
 *     list, dv:ops:weekdur (the last WEEK_DURATION_SAMPLES);
 *   - once MIN_DURATION_SAMPLES are there, their median replaces the
 *     configured minutes (DENTVID_WEEK_MINUTES, else WEEK_MINUTES_DEFAULT) in
 *     the dispatch's projection;
 *   - the dispatch emails the owner once per delivery week when the
 *     projection says a clinic would get its videos after its Monday 07:00
 *     (urgent), or when the measured median is more than SLOW_FACTOR times
 *     the configured minutes (warning: the plan in docs/CAPACITY.md is too
 *     optimistic). Adding a render server stays the owner's decision.
 */

export const WEEK_DURATION_KEY = "dv:ops:weekdur";
/** Durations kept (newest last): about ten Saturdays of a small batch, or the last part of one big batch. */
export const WEEK_DURATION_SAMPLES = 50;
export const WEEK_DURATION_TTL_SEC = 60 * 86_400;
/** Full weeks measured before their median replaces the configured minutes. */
export const MIN_DURATION_SAMPLES = 5;
/** A measured median above configured × this raises the "weeks take longer than planned" alert. */
export const SLOW_FACTOR = 1.5;
/** A run longer than this is not a week's work (a job held by a paused worker, a clock jump): not recorded. */
const MAX_SAMPLE_MIN = 6 * 60;

/** What the worker's "completed" event hands over (a BullMQ Job fits). */
export type CompletedWeekJob = { name: string; processedOn?: number | null; finishedOn?: number | null };

/**
 * Minutes worth recording for a completed job, or null: only a "week" that made a full week in
 * this run (`fullWeek` usable videos: a re-run that made the missing two is not a week's work, a
 * run that found the week already made took a second), with sane timestamps.
 */
export function weekDurationSample(job: CompletedWeekJob, result: unknown, fullWeek: number): number | null {
  if (job.name !== "week") return null;
  const r = (result ?? {}) as { ready?: unknown; flagged?: unknown };
  const usable = (typeof r.ready === "number" ? r.ready : 0) + (typeof r.flagged === "number" ? r.flagged : 0);
  if (usable < fullWeek) return null;
  if (typeof job.processedOn !== "number" || typeof job.finishedOn !== "number") return null;
  const minutes = (job.finishedOn - job.processedOn) / 60_000;
  return Number.isFinite(minutes) && minutes > 0 && minutes <= MAX_SAMPLE_MIN ? Math.round(minutes * 100) / 100 : null;
}

/** Record a completed week job's duration (weekDurationSample). Never throws; returns the minutes recorded. */
export async function recordWeekDuration(store: OpsStore | null, job: CompletedWeekJob, result: unknown, fullWeek: number): Promise<number | null> {
  const minutes = weekDurationSample(job, result, fullWeek);
  if (minutes === null || !store) return null;
  try {
    await store.push(WEEK_DURATION_KEY, String(minutes), WEEK_DURATION_TTL_SEC, WEEK_DURATION_SAMPLES);
    return minutes;
  } catch {
    return null;
  }
}

export function median(values: number[]): number {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}

/** The minutes per week the dispatch projects with, and where they come from. */
export type WeekPace = {
  minutes: number;
  source: "measured" | "configured";
  /** Full weeks measured (0 when none could be read). */
  samples: number;
  /** DENTVID_WEEK_MINUTES, else WEEK_MINUTES_DEFAULT (schedule.ts weekMinutes). */
  configured: number;
  /** The measured median, when there are enough samples. */
  measured?: number;
  /** The measured median is more than SLOW_FACTOR × configured. */
  slow: boolean;
};

/** The measured median once MIN_DURATION_SAMPLES full weeks are recorded, else the configured minutes. Never throws. */
export async function weekPace(store: OpsStore | null, configured: number): Promise<WeekPace> {
  const raw = store ? await store.list(WEEK_DURATION_KEY).catch(() => [] as string[]) : [];
  const values = raw.map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (values.length < MIN_DURATION_SAMPLES) return { minutes: configured, source: "configured", samples: values.length, configured, slow: false };
  const m = Math.round(median(values) * 10) / 10;
  return { minutes: m, source: "measured", samples: values.length, configured, measured: m, slow: m > configured * SLOW_FACTOR };
}

/** The once-per-delivery-week claim for the capacity alert (ops.ts ownerAlertOnce). */
export const capacityAlertKey = (week: string) => `dv:ops:capacity-alert:${week}`;
export const CAPACITY_ALERT_TTL_SEC = 8 * 86_400;

const minutesText = (n: number) => `${Number.isInteger(n) ? n : n.toFixed(1)} minutes`;

function paceText(p: WeekPace): string {
  return p.source === "measured"
    ? `${minutesText(p.minutes)} per week, the median of the last ${p.samples} full weeks this worker made`
    : `${minutesText(p.minutes)} per week, the planning estimate (DENTVID_WEEK_MINUTES); fewer than ${MIN_DURATION_SAMPLES} full weeks have been measured so far`;
}

/**
 * The owner's capacity alert for one dispatch, or null when there is nothing to say:
 *   late > 0   urgent: some clinics are projected to get their videos after their Monday 07:00
 *   slow       warning: weeks take more than SLOW_FACTOR × the planned minutes, nothing late yet
 * One email covers both (deduplicated per delivery week by the caller).
 */
export function capacityAlert(a: { week: string; clinics: number; late: number; lateZones: string[]; pace: WeekPace; workers: number }): OwnerAlert | null {
  const { week, clinics, late, pace, workers } = a;
  if (late <= 0 && !pace.slow) return null;
  const renders = workers === 1 ? "one week at a time" : `${workers} weeks at a time`;
  const slowLine = pace.slow
    ? [`Weeks take longer than planned: ${minutesText(pace.measured ?? pace.minutes)} measured against ${minutesText(pace.configured)} planned (DENTVID_WEEK_MINUTES).`]
    : [];
  const facts: [string, string][] = [
    ["Delivery week", week],
    ["Weeks in the batch", String(clinics)],
    ["Minutes per week", pace.source === "measured" ? `${minutesText(pace.minutes)} (median of ${pace.samples} measured)` : `${minutesText(pace.minutes)} (estimate)`],
    ["Planned minutes", minutesText(pace.configured)],
    ["Renders", renders],
  ];
  if (late > 0) {
    return {
      key: `capacity_late:${week}`,
      severity: "urgent",
      titleTr: "Hafta sonu üretimi bazı pazartesi teslimlerine yetişmeyebilir",
      titleEn: "The weekend batch may miss some Monday deliveries",
      what: [
        `The weekly batch for ${week} has ${clinics} weeks to make. At ${paceText(pace)}, with ${renders}, ${late} of them would be ready only after their clinic's Monday 07:00.`,
        ...slowLine,
      ],
      facts: [...facts, ["Projected late", String(late)], ...(a.lateZones.length ? ([["Time zones affected", a.lateZones.join(", ")]] as [string, string][]) : [])],
      done: [
        "Every week was queued as usual, earliest Monday morning first. Nothing was skipped or changed.",
        "No email went to any clinic. The hourly delivery watchdog checks every week after its clinic's Monday morning, as it always does.",
      ],
      todo: [
        "Decide whether to add a render server now: docs/CAPACITY.md section 6 has the steps (a second worker with WORKER_QUEUES=dentvid).",
        "If you do not, expect the clinics in the time zones above to get their videos later than Monday 07:00 this week.",
      ],
    };
  }
  return {
    key: `capacity_slow:${week}`,
    severity: "warning",
    titleTr: "Haftalık videolar planlanandan yavaş üretiliyor",
    titleEn: "Weeks take longer to make than planned",
    what: [
      `The last ${pace.samples} full weeks took ${minutesText(pace.measured ?? pace.minutes)} each (median), against ${minutesText(pace.configured)} planned.`,
      `With the measured pace, no clinic of the ${clinics} in the batch for ${week} is projected to miss its Monday 07:00.`,
    ],
    facts,
    done: ["The dispatch now projects with the measured minutes. Every week was queued as usual."],
    todo: [
      "Set DENTVID_WEEK_MINUTES to the measured median so the plan matches, and look again at when the render server is needed (docs/CAPACITY.md sections 3 and 6).",
    ],
  };
}
