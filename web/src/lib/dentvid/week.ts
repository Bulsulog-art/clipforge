/** Monday (UTC) of the week a date falls in, as YYYY-MM-DD — same as worker/src/dentvid/schedule.ts. */
export function weekOf(d = new Date()): string {
  const day = (d.getUTCDay() + 6) % 7; // Monday = 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return monday.toISOString().slice(0, 10);
}
