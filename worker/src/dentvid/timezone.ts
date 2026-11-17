/**
 * A clinic's own clock: when its Monday morning is, and when an email to it
 * arrives at a civil hour.
 *
 * Clinics give a country (profile.country, ISO 3166-1 alpha-2), not a time
 * zone. Each country maps to the zone most of its clinics keep; a country
 * that spans several zones maps to its EARLIEST mainland Monday (US → New
 * York, Australia → Sydney): a promise kept for the earliest zone is kept for
 * the rest. A profile that one day carries an explicit IANA `timezone` wins.
 * An unknown country falls back to UTC.
 *
 * Pure apart from Intl (Node ships full ICU), so the waves and the email
 * timing are tested with a fake clock across zones and DST changes.
 */

export const DEFAULT_TIME_ZONE = "UTC";

/** Country → IANA zone. Covers the eight product languages' markets and their neighbours (docs/MARKETS.md). */
export const COUNTRY_TIME_ZONE: Record<string, string> = {
  // English
  US: "America/New_York",
  CA: "America/Toronto",
  GB: "Europe/London",
  IE: "Europe/Dublin",
  AU: "Australia/Sydney",
  NZ: "Pacific/Auckland",
  SG: "Asia/Singapore",
  ZA: "Africa/Johannesburg",
  IN: "Asia/Kolkata",
  MT: "Europe/Malta",
  // German
  DE: "Europe/Berlin",
  AT: "Europe/Vienna",
  CH: "Europe/Zurich",
  LI: "Europe/Vaduz",
  LU: "Europe/Luxembourg",
  // Spanish
  ES: "Europe/Madrid",
  MX: "America/Mexico_City",
  AR: "America/Argentina/Buenos_Aires",
  CO: "America/Bogota",
  CL: "America/Santiago",
  PE: "America/Lima",
  UY: "America/Montevideo",
  EC: "America/Guayaquil",
  VE: "America/Caracas",
  BO: "America/La_Paz",
  PY: "America/Asuncion",
  CR: "America/Costa_Rica",
  PA: "America/Panama",
  GT: "America/Guatemala",
  DO: "America/Santo_Domingo",
  PR: "America/Puerto_Rico",
  // French
  FR: "Europe/Paris",
  BE: "Europe/Brussels",
  MC: "Europe/Monaco",
  // Turkish
  TR: "Europe/Istanbul",
  CY: "Asia/Nicosia",
  // Japanese
  JP: "Asia/Tokyo",
  // Arabic
  AE: "Asia/Dubai",
  SA: "Asia/Riyadh",
  QA: "Asia/Qatar",
  KW: "Asia/Kuwait",
  BH: "Asia/Bahrain",
  OM: "Asia/Muscat",
  EG: "Africa/Cairo",
  JO: "Asia/Amman",
  LB: "Asia/Beirut",
  MA: "Africa/Casablanca",
  TN: "Africa/Tunis",
  DZ: "Africa/Algiers",
  IQ: "Asia/Baghdad",
  // Polish
  PL: "Europe/Warsaw",
  // Neighbours and next markets
  NL: "Europe/Amsterdam",
  IT: "Europe/Rome",
  PT: "Europe/Lisbon",
  BR: "America/Sao_Paulo",
  GR: "Europe/Athens",
  RO: "Europe/Bucharest",
  BG: "Europe/Sofia",
  CZ: "Europe/Prague",
  SK: "Europe/Bratislava",
  HU: "Europe/Budapest",
  HR: "Europe/Zagreb",
  SI: "Europe/Ljubljana",
  RS: "Europe/Belgrade",
  SE: "Europe/Stockholm",
  NO: "Europe/Oslo",
  DK: "Europe/Copenhagen",
  FI: "Europe/Helsinki",
  EE: "Europe/Tallinn",
  LV: "Europe/Riga",
  LT: "Europe/Vilnius",
  IS: "Atlantic/Reykjavik",
  UA: "Europe/Kyiv",
  IL: "Asia/Jerusalem",
  KR: "Asia/Seoul",
  TW: "Asia/Taipei",
  HK: "Asia/Hong_Kong",
  MY: "Asia/Kuala_Lumpur",
  ID: "Asia/Jakarta",
  TH: "Asia/Bangkok",
  PH: "Asia/Manila",
  VN: "Asia/Ho_Chi_Minh",
  CN: "Asia/Shanghai",
};

/** Is this a time zone Intl knows? */
export function isTimeZone(tz: string | null | undefined): tz is string {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** The zone a clinic's mornings are in: an explicit valid zone, else its country's, else UTC. */
export function clinicTimeZone(country?: string | null, explicit?: string | null): string {
  if (isTimeZone(explicit)) return explicit;
  const tz = country ? COUNTRY_TIME_ZONE[country.trim().toUpperCase()] : undefined;
  return tz && isTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number; weekday: number };

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function formatter(tz: string): Intl.DateTimeFormat {
  let f = fmtCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    fmtCache.set(tz, f);
  }
  return f;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** The wall clock in `tz` at instant `at`. weekday: 0 = Sunday. */
export function localParts(at: Date, tz: string): Parts {
  const p: Record<string, string> = {};
  for (const { type, value } of formatter(tz).formatToParts(at)) p[type] = value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
    second: Number(p.second),
    weekday: WEEKDAYS.indexOf(p.weekday),
  };
}

/** How far `tz` is ahead of UTC at instant `at`, in ms. */
function offsetMs(at: Date, tz: string): number {
  const p = localParts(at, tz);
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wall - (at.getTime() - at.getUTCMilliseconds());
}

/**
 * The instant at which the wall clock in `tz` reads `ymd` `hour`:`minute`.
 * A wall time skipped by a DST change resolves to the hour after; a repeated
 * one to its first occurrence — 07:00 is never either in practice.
 */
export function zonedTime(ymd: string, hour: number, minute: number, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  const wall = Date.UTC(y, m - 1, d, hour, minute);
  let t = wall - offsetMs(new Date(wall), tz);
  const again = offsetMs(new Date(t), tz);
  if (wall - again !== t) t = wall - again;
  return new Date(t);
}

/** The hour of the morning the week is promised for, and the earliest an email goes out. */
export const MORNING_HOUR = 7;
/** From this local hour on, an email waits for the next morning. */
export const QUIET_FROM_HOUR = 21;

/** Monday `week` at 07:00 in the clinic's zone — when its week must be in the library. */
export function mondayMorning(week: string, tz: string): Date {
  return zonedTime(week, MORNING_HOUR, 0, tz);
}

const ymdOf = (p: Pick<Parts, "year" | "month" | "day">) => `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;

/** `at`, or the next 07:00 in `tz` if `at` falls in the quiet hours (21:00–07:00 local). */
export function civilTime(at: Date, tz: string): Date {
  const p = localParts(at, tz);
  if (p.hour >= MORNING_HOUR && p.hour < QUIET_FROM_HOUR) return at;
  let day = ymdOf(p);
  if (p.hour >= QUIET_FROM_HOUR) {
    const next = new Date(Date.UTC(p.year, p.month - 1, p.day + 1));
    day = next.toISOString().slice(0, 10);
  }
  return zonedTime(day, MORNING_HOUR, 0, tz);
}

/**
 * When the "your videos are ready" email for a finished week goes out.
 *
 *   batch week     not before Monday 07:00 in the clinic's zone (the batch
 *                  runs from Saturday evening; a Saturday-night email about
 *                  "this week's videos" is noise), and never in the quiet
 *                  hours — a week finished at 23:00 is announced at 07:00
 *   week someone   at once: the dentist just paid or pressed the button and
 *   is waiting for is likely looking at the screen
 */
export function readyEmailAt(a: { now: Date; week: string; tz: string; batch: boolean }): Date {
  if (!a.batch) return a.now;
  const release = mondayMorning(a.week, a.tz);
  return civilTime(a.now.getTime() >= release.getTime() ? a.now : release, a.tz);
}
