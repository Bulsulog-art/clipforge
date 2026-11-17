import { AdminShell, Badge, Empty, Section, Stat, Table, Warn, when, type AdminLinks, type Viewer } from "./admin-ui";
import { AD_CONVERSIONS, rowsFor, type AdConversionRow, type CsvKind } from "@/lib/dentvid/ad-conversions";

/**
 * /admin/ads — Google Ads offline conversions: what is waiting to be
 * uploaded, the upload files, and what was exported. The click ids
 * themselves are shown shortened: the full id only goes into the file.
 * Procedure: docs/ADS_TRACKING.md.
 */
export function AdminAds({
  rows,
  available,
  error,
  purged,
  now,
  exportAction,
  ...c
}: {
  rows: AdConversionRow[];
  available: boolean;
  error?: string;
  purged: number | null;
  now: string;
  exportAction: string;
  links: AdminLinks;
  viewer: Viewer;
  flash?: string | null;
}) {
  const at = new Date(now);
  const pending = rows.filter((r) => !r.exported_at);
  const ready = (kind: CsvKind) => rowsFor(kind, pending, at).length;
  const stale = pending.length - ready("gclid") - ready("braid");
  const warnings = [
    ...(available ? [] : ["The ad conversion tables are missing: apply supabase/liman/0019_dentvid_ad_conversions.sql on Liman."]),
    ...(error ? [`Conversions could not be read: ${error}`] : []),
  ];
  const short = (id: string) => (id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id);

  return (
    <AdminShell
      active="ads"
      title="Ad conversions"
      lead="Offline conversions for Google Ads: sign-ups (dv_signup) and first payments (dv_paid) from visitors who came from an ad and whose click id we may keep."
      now={now}
      warnings={warnings}
      {...c}
    >
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Pending (gclid)" value={ready("gclid")} tone={ready("gclid") ? "teal" : undefined} />
        <Stat label="Pending (gbraid / wbraid)" value={ready("braid")} />
        <Stat label="Exported" value={rows.length - pending.length} />
        <Stat label="Values" value={`$${AD_CONVERSIONS.dv_signup.value} / $${AD_CONVERSIONS.dv_paid.value}`} sub="dv_signup / dv_paid, USD" />
      </div>

      <Section title="Download the upload file" lead="Google Ads → Goals → Conversions → Uploads → upload the file. Pending rows in the file are marked exported. Reload this page afterwards.">
        {c.viewer.csrf ? (
          <div className="flex flex-wrap gap-3">
            {(["gclid", "braid"] as const).map((kind) => (
              <form key={kind} method="post" action={exportAction} className="dv-card flex flex-wrap items-center gap-3 p-4">
                <input type="hidden" name="csrf" value={c.viewer.csrf} />
                <input type="hidden" name="kind" value={kind} />
                <label className="flex items-center gap-2 text-sm text-dv-body">
                  <input type="checkbox" name="include" value="all" /> include already exported
                </label>
                <button type="submit" className="inline-flex min-h-9 items-center rounded-full bg-dv-teal px-4 text-sm font-semibold text-white">
                  {kind === "gclid" ? "Download CSV (Google Click ID)" : "Download CSV (GBRAID / WBRAID)"}
                </button>
              </form>
            ))}
          </div>
        ) : (
          <Warn>Set DENTVIDEO_ADMIN_CSRF_SECRET (or the service role key) to enable downloads.</Warn>
        )}
        <p className="mt-3 text-xs text-dv-muted">
          Times are UTC (Parameters:TimeZone=+0000). Ad User Data is GRANTED for visitors who accepted the prompt and empty where no prompt applied. The GBRAID / WBRAID file: check its header against the template your Google Ads account offers before the first upload.
          {stale > 0 && ` ${stale} pending row(s) are past Google's 90-day click window and are left out.`}
          {purged ? ` ${purged} row(s) older than 90 days were deleted just now.` : ""}
        </p>
      </Section>

      <Section title="Conversions" lead={`${pending.length} pending · newest first · kept 90 days from the click`}>
        {rows.length === 0 ? (
          <Empty>No ad conversions yet.</Empty>
        ) : (
          <Table caption="Ad conversions" head={["Conversion", "Time (UTC)", "Value", "Click", "Consent", "Clicked", "Exported"]}>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium text-dv-ink">{r.conversion_name}</td>
                <td className="whitespace-nowrap">{when(r.conversion_time)}</td>
                <td className="tabular-nums">
                  {Number(r.value).toFixed(2)} {r.currency}
                </td>
                <td className="font-mono text-xs">
                  {r.click_type}: {short(r.click_id)}
                </td>
                <td>{r.consent === "granted" ? <Badge tone="teal">granted</Badge> : <Badge>not required</Badge>}</td>
                <td className="whitespace-nowrap">{when(r.clicked_at)}</td>
                <td className="whitespace-nowrap">{r.exported_at ? when(r.exported_at) : <Badge tone="amber">pending</Badge>}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </AdminShell>
  );
}
