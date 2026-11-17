/**
 * A clinic's clock for lifecycle email: which zone it is in and whether now
 * is a decent hour there to land in a dentist's inbox.
 *
 * The country → zone map is a copy of worker/src/dentvid/timezone.ts (the
 * worker decides when the week is made and when "ready" goes out; the web
 * app decides when reminders, nudges and summaries go out). A test compares
 * the two maps, so they cannot drift. An explicit IANA profile.timezone wins;
 * an unknown country falls back to UTC.
 *
 * Send window: SEND_FROM_HOUR to SEND_UNTIL_HOUR local, so nothing arrives at
 * night or before the morning patients. The hourly run simply waits for the
 * window; the email stays due.
 */

export const DEFAULT_TIME_ZONE = "UTC";
/** Earliest local hour a lifecycle email goes out (inclusive). */
export const SEND_FROM_HOUR = 8;
/** Local hour from which lifecycle email waits for the next morning (exclusive). */
export const SEND_UNTIL_HOUR = 20;

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

export type LocalTime = { year: number; month: number; day: number; hour: number; weekday: number };

/** The wall clock in `tz` at `at`. weekday: 0 = Sunday. */
export function localTime(at: Date, tz: string): LocalTime {
  const p: Record<string, string> = {};
  const f = new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", weekday: "short" });
  for (const { type, value } of f.formatToParts(at)) p[type] = value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour) % 24,
    weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday),
  };
}

/** Is `at` inside the send window in `tz`? */
export function inSendWindow(at: Date, tz: string): boolean {
  const h = localTime(at, tz).hour;
  return h >= SEND_FROM_HOUR && h < SEND_UNTIL_HOUR;
}
