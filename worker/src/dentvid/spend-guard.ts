import type IORedis from "ioredis";
import { logger } from "../logger.js";
import { ownerAlert } from "./ops.js";
import { alerts } from "./ops-alert.js";
import { elevenSurchargePerVideoUsd, ttsCostUsd, type TtsProvider } from "../dental/elevenlabs.js";

/**
 * Hard spend guards for DentVideo's metered work (OpenAI text, TTS — OpenAI
 * or ElevenLabs — and Whisper).
 *
 * Every dentvid job that can call a paid API reserves its estimated cost
 * here BEFORE the first call. A reservation is all-or-nothing across:
 *
 *   global   $ today, $ this month — the larger of the env ceiling
 *            (DENTVID_DAILY_USD_CAP / DENTVID_MONTHLY_USD_CAP) and the number
 *            of paying clinics × a per-clinic allowance, so growth never
 *            parks paying clinics; the global cap only catches runaway bugs
 *   clinic   $ today                                   (DENTVID_CLINIC_DAILY_USD_CAP)
 *            runs of one delivery week, restyles today,
 *            recordings this ISO week                  (DENTVID_MAX_*)
 *
 * and is refused when any of them would go over, or when the kill switch
 * DENTVID_PAUSE_GENERATION=1 is set. Fail-closed: if the counter store
 * (Redis) cannot be reached, nothing is spent.
 *
 * Costs are estimates per operation, deliberately on the high side (see
 * COST_DEFAULTS and docs/SECURITY.md): the guard caps the bill, it is not
 * the bill. Reservations are not given back when a job fails half-way —
 * by then the money is usually spent — except a week whose very first call
 * the provider refused (out of credit, bad key: retry.ts providerRefused),
 * which spent nothing (SpendGuard.release).
 *
 * What a refusal does is up to the job (jobs.ts): the Monday week and a
 * dentist's recording are parked (kept, retried automatically once there is
 * room again — see resumeParked) and the owner gets one alert email per
 * reason per day; a restyle is simply refused (the card says it failed).
 */

/**
 * topup: extra topics for a week short of five usable videos (jobs.ts WEEK_VIDEOS) —
 * money only, no count of its own (it belongs to a week already counted).
 * change: one video re-made from a clinic's "Ask for a change" (change.ts) —
 * money, and a count per clinic per ISO week (DENTVID_MAX_CHANGES_PER_CLINIC_WEEK).
 */
export type SpendOp = "week" | "restyle" | "recording" | "topup" | "change";

export type GuardConfig = {
  paused: boolean;
  dailyUsd: number;
  monthlyUsd: number;
  clinicDailyUsd: number;
  maxWeeksPerClinicWeek: number;
  maxRestylesPerClinicDay: number;
  maxRecordingsPerClinicWeek: number;
  maxChangesPerClinicWeek: number;
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
 *  - change: one video written, reviewed and narrated again ≈ a fifth of a
 *    week plus a rewrite round ≈ $0.07 → $0.15.
 * Override with DENTVID_COST_WEEK_USD / _RESTYLE_USD / _RECORDING_USD when
 * models or prices change.
 */
export const COST_DEFAULTS: Record<SpendOp, number> = { week: 0.5, restyle: 0.03, recording: 0.5, topup: 0.3, change: 0.15 };

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return v !== undefined && v.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Narrations each operation synthesises, for the ElevenLabs surcharge: a week
 * is 5 videos, a top-up up to 3 more, a restyle re-voices one; a recording
 * keeps the dentist's own voice.
 */
export const TTS_VIDEOS_PER_OP: Record<SpendOp, number> = { week: 5, restyle: 1, recording: 0, topup: 3, change: 1 };

export function guardConfig(env: Record<string, string | undefined> = process.env): GuardConfig {
  // With DENTVID_TTS_PROVIDER=elevenlabs a narration costs more than the
  // tts-1-hd estimate in COST_DEFAULTS; the difference is added to each
  // default, so the same Redis counters cap ElevenLabs spend too. An explicit
  // DENTVID_COST_*_USD is taken as the whole estimate and left as it is.
  const extra = elevenSurchargePerVideoUsd(env);
  const cost = (op: SpendOp, v: string | undefined) => num(v, Math.round((COST_DEFAULTS[op] + extra * TTS_VIDEOS_PER_OP[op]) * 100) / 100);
  const costUsd: Record<SpendOp, number> = {
    week: cost("week", env.DENTVID_COST_WEEK_USD),
    restyle: cost("restyle", env.DENTVID_COST_RESTYLE_USD),
    recording: cost("recording", env.DENTVID_COST_RECORDING_USD),
    topup: cost("topup", env.DENTVID_COST_TOPUP_USD),
    change: cost("change", env.DENTVID_COST_CHANGE_USD),
  };
  const maxChanges = num(env.DENTVID_MAX_CHANGES_PER_CLINIC_WEEK, 3);
  return {
    paused: env.DENTVID_PAUSE_GENERATION === "1" || env.DENTVID_PAUSE_GENERATION === "true",
    // ~40 paying clinics' Monday runs at the estimate above, with room for retries.
    dailyUsd: num(env.DENTVID_DAILY_USD_CAP, 20),
    monthlyUsd: num(env.DENTVID_MONTHLY_USD_CAP, 300),
    // A Monday whose week needed all 4 attempts (retry.ts) and a top-up each
    // time: 4 × 0.50 + 4 × 0.30 = $3.20, plus a recording or a few restyles.
    // With ElevenLabs the same Monday costs more; the default grows with the
    // estimates (never below $5) so a retrying clinic is not parked for it.
    clinicDailyUsd: num(
      env.DENTVID_CLINIC_DAILY_USD_CAP,
      Math.max(5, Math.round((4 * (costUsd.week + costUsd.topup) + costUsd.recording + 5 * costUsd.restyle + maxChanges * costUsd.change) * 100) / 100),
    ),
    // Runs of one delivery week: its 4 automatic attempts (retry.ts WEEK_ATTEMPTS), the one
    // extra run after a final failure (stalled-week.ts) and a "try again" or requeue by hand.
    maxWeeksPerClinicWeek: num(env.DENTVID_MAX_WEEKS_PER_CLINIC_WEEK, 6),
    maxRestylesPerClinicDay: num(env.DENTVID_MAX_RESTYLES_PER_CLINIC_DAY, 10),
    maxRecordingsPerClinicWeek: num(env.DENTVID_MAX_RECORDINGS_PER_CLINIC_WEEK, 5),
    // "Ask for a change": 3 a week per clinic (the web app refuses the 4th before it is queued).
    maxChangesPerClinicWeek: maxChanges,
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
  /** Take back what `reserve` added (never below zero). */
  release?(counters: Counter[]): Promise<void>;
  /** INCRBY with a TTL set on first write; metering only, never a cap. */
  add?(key: string, by: number, ttlSec: number): Promise<void>;
}

export type RefusalReason =
  | "paused"
  | "store_unavailable"
  | "global_daily_usd"
  | "global_monthly_usd"
  | "clinic_daily_usd"
  | "clinic_weekly_weeks"
  | "clinic_daily_restyles"
  | "clinic_weekly_recordings"
  | "clinic_weekly_changes";

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

/** "YYYY-MM-DD" that is a real date (schedule.ts validWeek), else undefined. */
function weekKey(w: unknown): string | undefined {
  return typeof w === "string" && /^\d{4}-\d{2}-\d{2}$/.test(w) && !Number.isNaN(Date.parse(`${w}T00:00:00Z`)) ? w : undefined;
}

/**
 * How long a week-run counter lives. It is keyed by the delivery week, which is
 * reserved from the Saturday before it (the batch) to the end of it (a "try
 * again", the owner's requeue, the delivery watchdog): 15 days covers all of it.
 */
const WEEK_RUNS_TTL_SEC = 15 * DAY;

/**
 * The budget counters one operation reserves. `week` is the Monday a week job
 * delivers (jobs.ts jobWeek): its runs count against that week, not the week
 * the job happens to run in. The Saturday batch for week W runs inside W-1's
 * calendar week; counted by the run date it shared one cap with W-1's first
 * week, its retries and the clinic's "try again", and could be parked until
 * Monday 00:00 UTC, past the Asia-Pacific deadlines. Without a (valid) week the
 * run date's Monday is used, as before. The dollar caps stay by day and month.
 */
export function countersFor(op: SpendOp, clinicId: string, cfg: GuardConfig, now = new Date(), week?: string): Counter[] {
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
    counters.push({ key: `dv:spend:ops:week:${clinicId}:${weekKey(week) ?? monday}`, by: 1, cap: cfg.maxWeeksPerClinicWeek, ttlSec: WEEK_RUNS_TTL_SEC, reason: "clinic_weekly_weeks" });
  if (op === "restyle")
    counters.push({ key: `dv:spend:ops:restyle:${clinicId}:${day}`, by: 1, cap: cfg.maxRestylesPerClinicDay, ttlSec: 2 * DAY, reason: "clinic_daily_restyles" });
  if (op === "recording")
    counters.push({ key: `dv:spend:ops:recording:${clinicId}:${monday}`, by: 1, cap: cfg.maxRecordingsPerClinicWeek, ttlSec: 8 * DAY, reason: "clinic_weekly_recordings" });
  if (op === "change")
    counters.push({ key: `dv:spend:ops:change:${clinicId}:${monday}`, by: 1, cap: cfg.maxChangesPerClinicWeek, ttlSec: 8 * DAY, reason: "clinic_weekly_changes" });
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

  /**
   * Reserve the budget for one operation, or say why not. Nothing is spent on a refusal.
   * `week`: the Monday a week job delivers (countersFor); ignored for other operations.
   */
  async reserve(op: SpendOp, clinicId: string, opts: { dryRun?: boolean; now?: Date; week?: string } = {}): Promise<GuardDecision> {
    const base = this.cfg();
    if (base.paused) return { ok: false, reason: "paused", detail: "DENTVID_PAUSE_GENERATION is set" };
    if (!this.store) return { ok: false, reason: "store_unavailable", detail: "no counter store configured" };
    const cfg = { ...base, ...scaledCaps(base, await this.activeClinics(opts.now?.getTime())) };
    const counters = countersFor(op, clinicId, cfg, opts.now, opts.week);
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

  /**
   * Give a reservation back. Only for a job that provably spent nothing —
   * the provider refused its very first call (retry.ts providerRefused: out
   * of credit, bad key), or the clinic's logo could not be downloaded before
   * any paid call (jobs.ts loadClinic) — so a clinic's retries after the
   * outage are not refused for runs that never happened. Best effort; never throws.
   */
  async release(op: SpendOp, clinicId: string, opts: { now?: Date; week?: string } = {}): Promise<boolean> {
    if (!this.store?.release) return false;
    const base = this.cfg();
    // The caps do not matter for a release; the keys and amounts are what reserve used (same week).
    const counters = countersFor(op, clinicId, base, opts.now, opts.week);
    try {
      await this.store.release(counters);
      return true;
    } catch (e) {
      logger.warn({ op, clinicId, err: (e as Error).message }, "dentvid: spend reservation not released");
      return false;
    }
  }

  /**
   * Meter one narration: characters sent to the provider that spoke, per
   * month globally and per clinic per day (`dv:tts:chars:*`), and the
   * estimated cost. The reservation above already budgeted it; this is the
   * measured side, for reconciling the estimate with the ElevenLabs plan's
   * character quota. Best effort; never throws.
   */
  async recordTts(provider: TtsProvider, chars: number, clinicId: string, now = new Date()): Promise<{ chars: number; usd: number }> {
    const usd = ttsCostUsd(chars, provider);
    if (!this.store?.add || !(chars > 0)) return { chars, usd };
    const day = dayOf(now);
    try {
      await this.store.add(`dv:tts:chars:${provider}:month:${day.slice(0, 7)}`, chars, 40 * DAY);
      await this.store.add(`dv:tts:chars:${provider}:clinic:${clinicId}:${day}`, chars, 8 * DAY);
    } catch (e) {
      logger.warn({ provider, chars, clinicId, err: (e as Error).message }, "dentvid: tts characters not metered");
    }
    return { chars, usd };
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
  async add(key: string, by: number, ttlSec: number): Promise<void> {
    if (this.r.status !== "ready") throw new Error(`redis ${this.r.status}`);
    await this.r.eval(ADD_LUA, 1, key, String(by), String(ttlSec));
  }
  async release(counters: Counter[]): Promise<void> {
    if (this.r.status !== "ready") throw new Error(`redis ${this.r.status}`);
    await this.r.eval(RELEASE_LUA, counters.length, ...counters.map((c) => c.key), ...counters.map((c) => String(c.by)));
  }
}

const ADD_LUA = `
redis.call("INCRBY", KEYS[1], ARGV[1])
if redis.call("TTL", KEYS[1]) < 0 then redis.call("EXPIRE", KEYS[1], ARGV[2]) end
return 0
`;

const RELEASE_LUA = `
for i = 1, #KEYS do
  local cur = tonumber(redis.call("GET", KEYS[i]) or "0")
  if cur > 0 then
    local by = math.min(cur, tonumber(ARGV[i]))
    redis.call("DECRBY", KEYS[i], by)
  end
end
return 0
`;

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
  async release(counters: Counter[]): Promise<void> {
    if (this.down) throw new Error("store down");
    for (const c of counters) this.values.set(c.key, Math.max(0, (this.values.get(c.key) ?? 0) - c.by));
  }
  async add(key: string, by: number): Promise<void> {
    if (this.down) throw new Error("store down");
    this.values.set(key, (this.values.get(key) ?? 0) + by);
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
  clinic_weekly_changes: "One clinic reached its weekly change-request limit (DENTVID_MAX_CHANGES_PER_CLINIC_WEEK).",
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
