/** Monday (UTC) of the week a date falls in, as YYYY-MM-DD — same as worker/src/dentvid/schedule.ts. */
export function weekOf(d = new Date()): string {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}

/**
 * The week something made now is for — same as worker/src/dentvid/schedule.ts.
 * The weekly batch starts on Saturday 18:00 UTC for the coming Monday (every
 * clinic's videos ready by Monday 07:00 in its own time zone), so from that
 * moment "this week" in the app, a first week after payment and the "make
 * this week" button all mean the coming Monday's week. weekOf(now + 30 h).
 */
export function deliveryWeek(d = new Date()): string {
  return weekOf(new Date(d.getTime() + 30 * 3_600_000));
}
