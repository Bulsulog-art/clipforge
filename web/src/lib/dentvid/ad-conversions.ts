import { CLICK_TTL_MS, consentRequired, validClick, type AdClick, type ClickConsent, type ClickType } from "./ad-click";

/**
 * Offline conversions for Google Ads: the rows, their values and the CSV
 * file the owner uploads (Google Ads → Goals → Conversions → Uploads).
 * Pure; the database side is ad-conversions-server.ts and the procedure is in
 * docs/ADS_TRACKING.md.
 *
 * Two conversions, at most one of each per account (unique in the table, so
 * a replayed webhook or a retried sign-up never counts twice):
 *   dv_signup  5 USD    an account was created          (signup route)
 *   dv_paid    100 USD (clinic in Türkiye) / 150 USD (elsewhere): the clinic's
 *              first payment (Dodo webhook, first activation). Roughly the
 *              target cost per paying clinic per market at the 2026-11-15 prices
 *              ($49/$79, €49/€79, 1.490/2.490 TL), so bidding values a TR
 *              clinic below a EUR/USD one.
 * Both only for a visitor who came from a Google ad and whose click id we
 * may keep (consent in the EU/EEA/UK/CH), and only within 90 days of the click.
 */

export const AD_CONVERSIONS = {
  dv_signup: { value: 5, currency: "USD" },
  dv_paid: { value: 150, currency: "USD" },
} as const;

/** dv_paid's value for the clinic's country (TR clinics pay in TL, about two-thirds of the EUR/USD price). */
export function paidConversionValue(country: string | null | undefined): number {
  return (country ?? "").trim().toUpperCase() === "TR" ? 100 : AD_CONVERSIONS.dv_paid.value;
}
export type AdConversionName = keyof typeof AD_CONVERSIONS;

/** A stored conversion row (dentvid_ad_conversions, migration 0019). */
export type AdConversionRow = {
  id: number;
  owner_id: string;
  clinic_id: string | null;
  conversion_name: AdConversionName;
  conversion_time: string;
  value: number | string;
  currency: string;
  click_type: ClickType;
  click_id: string;
  consent: ClickConsent;
  clicked_at: string;
  exported_at: string | null;
  created_at: string;
};

/**
 * May this click be kept, given the country the sign-up request came from?
 * In a consent country (or an unknown one) only an explicit "granted" counts;
 * a browser cannot skip the prompt by claiming "not_required".
 */
export function acceptableClick(raw: unknown, requestCountry: string | undefined, now = Date.now()): AdClick | null {
  const click = validClick(raw, now);
  if (!click) return null;
  if (click.consent !== "granted" && consentRequired(requestCountry)) return null;
  return click;
}

/** Is a conversion at `at` still reportable for a click at `clickedAt` (after it, within 90 days)? */
export function withinWindow(clickedAt: string | number, at: Date): boolean {
  const c = typeof clickedAt === "number" ? clickedAt : Date.parse(clickedAt);
  return Number.isFinite(c) && at.getTime() >= c - 10 * 60_000 && at.getTime() - c <= CLICK_TTL_MS;
}

/** The two upload files: Google's click template (gclid), and iOS app-campaign ids (gbraid / wbraid). */
export type CsvKind = "gclid" | "braid";

/** "yyyy-MM-dd HH:mm:ss" in UTC; the file says Parameters:TimeZone=+0000. */
export function googleTime(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** Rows that belong in a file of this kind, still inside Google's 90-day window. */
export function rowsFor(kind: CsvKind, rows: AdConversionRow[], now = new Date()): AdConversionRow[] {
  return rows.filter((r) => (kind === "gclid" ? r.click_type === "gclid" : r.click_type !== "gclid") && withinWindow(r.clicked_at, now) && withinWindow(r.clicked_at, new Date(r.conversion_time)));
}

/**
 * The upload file, in the layout of Google Ads' "conversions from clicks"
 * template: a Parameters:TimeZone line, then the header row, then one row
 * per conversion. Times are UTC. "Ad User Data" is GRANTED for a visitor who
 * accepted the prompt and left empty where no prompt applied (outside the
 * EU/EEA/UK/CH); "Ad Personalization" is left empty — we never ask for it.
 *
 * The gbraid / wbraid file puts those ids in GBRAID / WBRAID columns instead
 * of Google Click ID (check the header against the template your Google Ads
 * account offers before the first upload: docs/ADS_TRACKING.md).
 */
export function conversionsCsv(kind: CsvKind, rows: AdConversionRow[]): string {
  const ids = kind === "gclid" ? ["Google Click ID"] : ["GBRAID", "WBRAID"];
  const head = [...ids, "Conversion Name", "Conversion Time", "Conversion Value", "Conversion Currency", "Ad User Data", "Ad Personalization"];
  const lines = ["Parameters:TimeZone=+0000", head.join(",")];
  for (const r of rows) {
    const idCells = kind === "gclid" ? [r.click_id] : [r.click_type === "gbraid" ? r.click_id : "", r.click_type === "wbraid" ? r.click_id : ""];
    const value = Number(r.value);
    lines.push(
      [...idCells, r.conversion_name, googleTime(r.conversion_time), Number.isFinite(value) ? value.toFixed(2) : "0.00", r.currency, r.consent === "granted" ? "GRANTED" : "", ""].map(cell).join(","),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
