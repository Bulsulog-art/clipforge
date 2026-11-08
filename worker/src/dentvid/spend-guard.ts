import type IORedis from "ioredis";
import { logger } from "../logger.js";
import { ownerAlert } from "./ops.js";
import { alerts } from "./ops-alert.js";

/**
 * Hard spend guards for DentVideo's metered work (OpenAI text, TTS, Whisper).
 *
 * Every dentvid job that can call a paid API reserves its estimated cost
 * here BEFORE the first call. A reservation is all-or-nothing across:
 *
 *   global   $ today, $ this month — the larger of the env ceiling
 *            (DENTVID_DAILY_USD_CAP / DENTVID_MONTHLY_USD_CAP) and the number
 *            of paying clinics × a per-clinic allowance, so growth never
 *            parks paying clinics; the global cap only catches runaway bugs
 *   clinic   $ today                                   (DENTVID_CLINIC_DAILY_USD_CAP)
 *            weeks this ISO week, restyles today,
 *            recordings this ISO week                  (DENTVID_MAX_*)
 *
 * and is refused when any of them would go over, or when the kill switch
 * DENTVID_PAUSE_GENERATION=1 is set. Fail-closed: if the counter store
 * (Redis) cannot be reached, nothing is spent.
 *
 * Costs are estimates per operation, deliberately on the high side (see
 * COST_DEFAULTS and docs/SECURITY.md): the guard caps the bill, it is not
 * the bill. Reservations are not given back when a job fails half-way —
 * by then the money is usually spent.
 *
 * What a refusal does is up to the job (jobs.ts): the Monday week and a
 * dentist's recording are parked (kept, retried automatically once there is
 * room again — see resumeParked) and the owner gets one alert email per
 * reason per day; a restyle is simply refused (the card says it failed).
 */

/**
 * topup: extra topics for a week that ended thin (jobs.ts MIN_USABLE_VIDEOS) —
 * money only, no count of its own (it belongs to a week already counted).
 */
export type SpendOp = "week" | "restyle" | "recording" | "topup";

export type GuardConfig = {
  paused: boolean;
  dailyUsd: number;
  monthlyUsd: number;
  clinicDailyUsd: number;
  maxWeeksPerClinicWeek: number;
  maxRestylesPerClinicDay: number;
  maxRecordingsPerClinicWeek: number;
  costUsd: Record<SpendOp, number>;
  /** Global daily ceiling grows by this per active clinic (Monday: every week runs on the same day). */
  dailyUsdPerActiveClinic: number;
  /** Global monthly ceiling grows by this per active clinic. */
  monthlyUsdPerActiveClinic: number;
};

/**
 * Per-operation cost estimates (USD), each about 2× what was measured:
 *  - week: 5 videos. Text ≈ $0.034 per ready video with gpt-5.4-mini/gpt-5.4
 *    (docs/AUTONOMOUS_PLAN.md, eval with metered tokens) incl. rewrites;
 *    TTS tts-1-hd at $30/1M chars × ~600 chars ≈ $0.02 per video. ≈ $0.25
 *    a week → $0.50 budgeted.
 *  - restyle: one TTS re-synthesis of a stored narration ≈ $0.01–0.02 → $0.03.
 *  - recording: Whisper API fallback $0.006/min × 30 min max = $0.18 (local
 *    faster-whisper is $0), moment scoring + reviews for up to 6 clips
 *    ≈ $0.15 → $0.50.
 * Override with DENTVID_COST_WEEK_USD / _RESTYLE_USD / _RECORDING_USD when
 * models or prices change.
 */
export const COST_DEFAULTS: Record<SpendOp, number> = { week: 0.5, restyle: 0.03, recording: 0.5, topup: 0.3 };

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
}

export function guardConfig(env: Record<string, string | undefined> = process.env): GuardConfig {
  const costUsd: Record<SpendOp, number> = {
    week: num(env.DENTVID_COST_WEEK_USD, COST_DEFAULTS.week),
    restyle: num(env.DENTVID_COST_RESTYLE_USD, COST_DEFAULTS.restyle),
    recording: num(env.DENTVID_COST_RECORDING_USD, COST_DEFAULTS.recording),
    topup: num(env.DENTVID_COST_TOPUP_USD, COST_DEFAULTS.topup),
  };
  return {
    paused: env.DENTVID_PAUSE_GENERATION === "1" || env.DENTVID_PAUSE_GENERATION === "true",
    // ~40 paying clinics' Monday runs at the estimate above, with room for retries.
    dailyUsd: num(env.DENTVID_DAILY_USD_CAP, 20),
    monthlyUsd: num(env.DENTVID_MONTHLY_USD_CAP, 300),
    // A Monday whose week needed all 4 attempts (retry.ts) and a top-up each
    // time: 4 × 0.50 + 4 × 0.30 = $3.20, plus a recording or a few restyles.
    clinicDailyUsd: num(env.DENTVID_CLINIC_DAILY_USD_CAP, 5),
    // Monday's 4 automatic attempts (retry.ts WEEK_ATTEMPTS) + a manual re-run or a first week.
    maxWeeksPerClinicWeek: num(env.DENTVID_MAX_WEEKS_PER_CLINIC_WEEK, 6),
    maxRestylesPerClinicDay: num(env.DENTVID_MAX_RESTYLES_PER_CLINIC_DAY, 10),
    maxRecordingsPerClinicWeek: num(env.DENTVID_MAX_RECORDINGS_PER_CLINIC_WEEK, 5),
    costUsd,
    // A clinic's Monday: its week (5 videos), one recording and a few restyles.
    // Defaults: 0.50 + 0.50 + 5 × 0.03 = $1.15.
    dailyUsdPerActiveClinic: num(env.DENTVID_DAILY_USD_PER_ACTIVE_CLINIC, costUsd.week + costUsd.recording + 5 * costUsd.restyle),
    // A clinic's month: ≈ 4.5 weeks + 4 recordings + 30 restyles. Defaults: 2.25 + 2.00 + 0.90 = $5.15.
    monthlyUsdPerActiveClinic: num(env.DENTVID_MONTHLY_USD_PER_ACTIVE_CLINIC, 4.5 * costUsd.week + 4 * costUsd.recording + 30 * costUsd.restyle),
  };
}

/**
 * The global ceilings in force: never below the env caps, and growing with
 * the number of paying clinics. `active` null (count unknown) → env caps.
 */
export function scaledCaps(cfg: GuardConfig, active: number | null): { dailyUsd: number; monthlyUsd: number } {
  const n = active ?? 0;
  return {
    dailyUsd: Math.max(cfg.dailyUsd, n * cfg.dailyUsdPerActiveClinic),
    monthlyUsd: Math.max(cfg.monthlyUsd, n * cfg.monthlyUsdPerActiveClinic),
  };
}

export type Counter = { key: string; by: number; cap: number; ttlSec: number; reason: RefusalReason };

export interface GuardStore {
  /**
   * Atomically: if every counter + by <= cap, add all and return -1; else add
   * nothing and return the index of the first counter that would overflow.
   * `dryRun` only checks.
   */
  reserve(counters: Counter[], dryRun?: boolean): Promise<number>;
  /** SET key NX EX ttl — true when created (alert de-duplication). */
  once(key: string, ttlSec: number): Promise<boolean>;
}

export type RefusalReason =
  | "paused"
  | "store_unavailable"
  | "global_daily_usd"
  | "global_monthly_usd"
  | "clinic_daily_usd"
  | "clinic_weekly_weeks"
  | "clinic_daily_restyles"
  | "clinic_weekly_recordings";

export type GuardDecision = { ok: true; usd: number } | { ok: false; reason: RefusalReason; detail: string };

const DAY = 86400;
const cents = (usd: number) => Math.round(usd * 100);

/** "YYYY-MM-DD" (UTC). */
const dayOf = (d: Date) => d.toISOString().slice(0, 10);
/** Monday (UTC) of the week — same scheme as schedule.ts weekOf. */
function mondayOf(d: Date): string {
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day)).toISOString().slice(0, 10);
}

export function countersFor(op: SpendOp, clinicId: string, cfg: GuardConfig, now = new Date()): Counter[] {
  const c = cents(cfg.costUsd[op]);
  const day = dayOf(now);
  const month = day.slice(0, 7);
  const monday = mondayOf(now);
  const counters: Counter[] = [
    { key: `dv:spend:usd:day:${day}`, by: c, cap: cents(cfg.dailyUsd), ttlSec: 3 * DAY, reason: "global_daily_usd" },
    { key: `dv:spend:usd:month:${month}`, by: c, cap: cents(cfg.monthlyUsd), ttlSec: 40 * DAY, reason: "global_monthly_usd" },
    { key: `dv:spend:usd:clinic:${clinicId}:${day}`, by: c, cap: cents(cfg.clinicDailyUsd), ttlSec: 2 * DAY, reason: "clinic_daily_usd" },
  ];
  if (op === "week")
    counters.push({ key: `dv:spend:ops:week:${clinicId}:${monday}`, by: 1, cap: cfg.maxWeeksPerClinicWeek, ttlSec: 8 * DAY, reason: "clinic_weekly_weeks" });
  if (op === "restyle")
    counters.push({ key: `dv:spend:ops:restyle:${clinicId}:${day}`, by: 1, cap: cfg.maxRestylesPerClinicDay, ttlSec: 2 * DAY, reason: "clinic_daily_restyles" });
  if (op === "recording")
    counters.push({ key: `dv:spend:ops:recording:${clinicId}:${monday}`, by: 1, cap: cfg.maxRecordingsPerClinicWeek, ttlSec: 8 * DAY, reason: "clinic_weekly_recordings" });
  return counters;
}

/** Global reasons concern everyone (owner must act); clinic reasons concern one clinic. */
export const isGlobalReason = (r: RefusalReason) => r === "paused" || r === "store_unavailable" || r === "global_daily_usd" || r === "global_monthly_usd";

export type GuardOptions = {
  /** Number of clinics with plan = 'active' (Liman). Cached for `cacheMs`. */
  activeClinics?: () => Promise<number>;
  cacheMs?: number;
  /** Owner alert when the count cannot be read (once a day; the env caps apply meanwhile). */
  alert?: AlertSender;
};

export const ACTIVE_COUNT_CACHE_MS = 10 * 60 * 1000;

export class SpendGuard {
  private active: { n: number; at: number } | null = null;

  constructor(
    private store: GuardStore | null,
    private cfg: () => GuardConfig = () => guardConfig(),
    private opts: GuardOptions = {},
  ) {}

  /**
   * Active clinics, from cache when fresh. When the count fails the env caps
   * apply (never a silent block of paying clinics beyond them) and the owner
   * gets one alert a day; a cached count is not trusted past its age.
   */
  async activeClinics(now = Date.now()): Promise<number | null> {
    if (!this.opts.activeClinics) return null;
    const ttl = this.opts.cacheMs ?? ACTIVE_COUNT_CACHE_MS;
    if (this.active && now - this.active.at < ttl) return this.active.n;
    try {
      const n = await this.opts.activeClinics();
      if (!Number.isFinite(n) || n < 0) throw new Error(`bad count ${n}`);
      this.active = { n, at: now };
      return n;
    } catch (e) {
      this.active = null;
      const msg = (e as Error).message;
      logger.error({ err: msg }, "dentvid: active clinic count failed — using env spend caps");
      if (await this.once(`dv:spend:alert:clinic_count:${dayOf(new Date(now))}`, DAY)) {
        await (this.opts.alert ?? sendOwnerAlert)(
          "[DentVideo] spend guard: active clinic count unavailable",
          [
            "The spend guard could not count active clinics on Liman, so the global ceilings fell back to the env caps",
            `(DENTVID_DAILY_USD_CAP / DENTVID_MONTHLY_USD_CAP) instead of growing with the number of paying clinics.`,
            "",
            `Error: ${msg}`,
            "",
            "If you have more paying clinics than those caps cover, some weeks may be parked (they resume automatically).",
            "No further email about this today.",
          ].join("\n"),
        ).catch(() => false);
      }
      return null;
    }
  }

  /** Reserve the budget for one operation, or say why not. Nothing is spent on a refusal. */
  async reserve(op: SpendOp, clinicId: string, opts: { dryRun?: boolean; now?: Date } = {}): Promise<GuardDecision> {
    const base = this.cfg();
    if (base.paused) return { ok: false, reason: "paused", detail: "DENTVID_PAUSE_GENERATION is set" };
    if (!this.store) return { ok: false, reason: "store_unavailable", detail: "no counter store configured" };
    const cfg = { ...base, ...scaledCaps(base, await this.activeClinics(opts.now?.getTime())) };
    const counters = countersFor(op, clinicId, cfg, opts.now);
    let idx: number;
    try {
      idx = await this.store.reserve(counters, opts.dryRun);
    } catch (e) {
      return { ok: false, reason: "store_unavailable", detail: `counter store error: ${(e as Error).message}` };
    }
    if (idx < 0) return { ok: true, usd: cfg.costUsd[op] };
    const c = counters[idx];
    const unit = c.reason.endsWith("_usd") ? `$${(c.cap / 100).toFixed(2)}` : `${c.cap}`;
    return { ok: false, reason: c.reason, detail: `${op} for clinic ${clinicId} would exceed ${c.reason} (cap ${unit})` };
  }

  /** True once per key per ttl (Redis), or once per process per ttl when Redis is down. */
  async once(key: string, ttlSec: number): Promise<boolean> {
    if (this.store) {
      try {
        return await this.store.once(key, ttlSec);
      } catch {
        // fall through to the in-process gate
      }
    }
    const now = Date.now();
    const until = localOnce.get(key) ?? 0;
    if (until > now) return false;
    localOnce.set(key, now + ttlSec * 1000);
    return true;
  }
}

const localOnce = new Map<string, number>();

// ---- Redis store --------------------------------------------------------------

const RESERVE_LUA = `
local n = #KEYS
local dry = ARGV[n * 3 + 1] == "1"
for i = 1, n do
  local cur = tonumber(redis.call("GET", KEYS[i]) or "0")
  if cur + tonumber(ARGV[(i - 1) * 3 + 1]) > tonumber(ARGV[(i - 1) * 3 + 2]) then return i - 1 end
end
if dry then return -1 end
for i = 1, n do
  redis.call("INCRBY", KEYS[i], ARGV[(i - 1) * 3 + 1])
  if redis.call("TTL", KEYS[i]) < 0 then redis.call("EXPIRE", KEYS[i], ARGV[(i - 1) * 3 + 3]) end
end
return -1
`;

export class RedisGuardStore implements GuardStore {
  constructor(private r: IORedis) {}
  async reserve(counters: Counter[], dryRun = false): Promise<number> {
    // A worker started while Redis is down must not queue the command and
    // spend later: refuse now.
    if (this.r.status !== "ready") throw new Error(`redis ${this.r.status}`);
    const args = counters.flatMap((c) => [String(c.by), String(c.cap), String(c.ttlSec)]);
    const res = await this.r.eval(RESERVE_LUA, counters.length, ...counters.map((c) => c.key), ...args, dryRun ? "1" : "0");
    return Number(res);
  }
  async once(key: string, ttlSec: number): Promise<boolean> {
    return (await this.r.set(key, "1", "EX", ttlSec, "NX")) === "OK";
  }
}

/** For tests (and a sanity reference for the Lua script). */
export class MemoryGuardStore implements GuardStore {
  values = new Map<string, number>();
  onceKeys = new Set<string>();
  down = false;
  async reserve(counters: Counter[], dryRun = false): Promise<number> {
    if (this.down) throw new Error("store down");
    for (let i = 0; i < counters.length; i++) {
      const c = counters[i];
      if ((this.values.get(c.key) ?? 0) + c.by > c.cap) return i;
    }
    if (!dryRun) for (const c of counters) this.values.set(c.key, (this.values.get(c.key) ?? 0) + c.by);
    return -1;
  }
  async once(key: string): Promise<boolean> {
    if (this.down) throw new Error("store down");
    if (this.onceKeys.has(key)) return false;
    this.onceKeys.add(key);
    return true;
  }
}

// ---- Owner alerts ---------------------------------------------------------------

export type AlertSender = (subject: string, text: string) => Promise<boolean>;

/**
 * One email to OWNER_ALERT_EMAIL — through the shared owner-alert helper
 * (ops-alert.ts: kill switch DENTVID_OWNER_ALERTS=off, per-day de-duplication,
 * hourly storm cap, Resend transport). Never throws.
 */
export const sendOwnerAlert: AlertSender = async (subject, text) => {
  const r = await ownerAlert(alerts.raw({ key: `spend:${hash(subject + "\n" + text)}`, subject, text }));
  if (r === "failed") logger.error({ subject }, "dentvid alert: email failed or not configured — alert only in logs");
  return r === "sent";
};

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h * 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

const REASON_TEXT: Record<RefusalReason, string> = {
  paused: "Generation is paused (DENTVID_PAUSE_GENERATION=1).",
  store_unavailable: "The spend counter (Redis) is unreachable, so no paid API calls are made (fail-closed).",
  global_daily_usd: "Today's global spend ceiling (DENTVID_DAILY_USD_CAP) is reached.",
  global_monthly_usd: "This month's global spend ceiling (DENTVID_MONTHLY_USD_CAP) is reached.",
  clinic_daily_usd: "One clinic reached its daily spend ceiling (DENTVID_CLINIC_DAILY_USD_CAP).",
  clinic_weekly_weeks: "One clinic asked for more week runs than allowed this week (DENTVID_MAX_WEEKS_PER_CLINIC_WEEK).",
  clinic_daily_restyles: "One clinic reached its daily restyle limit (DENTVID_MAX_RESTYLES_PER_CLINIC_DAY).",
  clinic_weekly_recordings: "One clinic reached its weekly recording limit (DENTVID_MAX_RECORDINGS_PER_CLINIC_WEEK).",
};

/**
 * Tell the owner about a refusal — at most one email per reason per UTC day
 * (per clinic for clinic-level reasons), however many jobs are refused.
 */
export async function alertRefusal(
  guard: SpendGuard,
  args: { op: SpendOp; clinicId: string; reason: RefusalReason; detail: string; parked: boolean },
  send: AlertSender = sendOwnerAlert,
  now = new Date(),
): Promise<boolean> {
  const scope = isGlobalReason(args.reason) ? "global" : args.clinicId;
  if (!(await guard.once(`dv:spend:alert:${args.reason}:${scope}:${dayOf(now)}`, DAY))) return false;
  const subject = `[DentVideo] spend guard: ${args.reason}${args.parked ? " — jobs parked" : ""}`;
  const text = [
    REASON_TEXT[args.reason],
    "",
    `First refused: ${args.op} for clinic ${args.clinicId}`,
    args.detail,
    "",
    args.parked
      ? "The job is parked, not lost: it is retried automatically every 15 minutes (DENTVID_PARK_RESUME_MIN) once there is room again (or the pause is lifted). Parked jobs older than 7 days are dropped."
      : "The request was refused; the clinic can try again later.",
    "No further email for this reason today. See docs/SECURITY.md → Spend guards for the knobs.",
  ].join("\n");
  logger.error({ ...args }, "dentvid: spend guard refused");
  return send(subject, text);
}
