import { NextResponse } from "next/server";
import { adminViewer } from "@/lib/dentvid/admin-server";
import { csrfSecret, sameOrigin, verifyCsrf } from "@/lib/dentvid/admin-csrf";
import { allowedOrigins } from "@/lib/origin-guard";
import { conversionsCsv, rowsFor, type CsvKind } from "@/lib/dentvid/ad-conversions";
import { listAdConversions, markExported } from "@/lib/dentvid/ad-conversions-server";

/**
 * POST /api/dentvideo/admin/ad-conversions — the Google Ads offline
 * conversion upload file (form fields: csrf, kind = gclid | braid,
 * include = "all" to re-download rows already exported). The rows in the
 * file that were pending are marked exported.
 *
 * Admins only (DENTVIDEO_ADMIN_USER_IDS); everyone else gets the plain 404.
 * A POST (not a GET link) so a prefetch or a crawler can never mark rows
 * exported; same-origin and the per-session CSRF token as for every admin
 * action (lib/dentvid/admin-csrf).
 */
export const dynamic = "force-dynamic";

const NOT_FOUND = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export async function POST(req: Request) {
  const viewer = await adminViewer();
  if (!viewer) return NOT_FOUND();
  const h = req.headers;
  const origin = { origin: h.get("origin"), secFetchSite: h.get("sec-fetch-site"), host: h.get("x-forwarded-host") ?? h.get("host"), proto: h.get("x-forwarded-proto") };
  if (!sameOrigin(origin, allowedOrigins(process.env))) return NextResponse.json({ error: "Cross-site request refused." }, { status: 403 });
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Send the form." }, { status: 400 });
  if (!verifyCsrf(form.get("csrf"), viewer.id, viewer.sessionId, csrfSecret())) return NextResponse.json({ error: "The page is out of date; reload it and try again." }, { status: 403 });
  const kind: CsvKind = form.get("kind") === "braid" ? "braid" : "gclid";
  const includeExported = form.get("include") === "all";

  const list = await listAdConversions();
  if (!list.available) return NextResponse.json({ error: "The ad conversion tables are missing: apply supabase/liman/0019." }, { status: 503 });
  if (list.error) return NextResponse.json({ error: list.error }, { status: 500 });
  const now = new Date();
  const rows = rowsFor(kind, list.rows, now).filter((r) => includeExported || !r.exported_at);
  const csv = conversionsCsv(kind, rows);
  const marked = await markExported(rows.filter((r) => !r.exported_at).map((r) => r.id), now);
  if (!marked) return NextResponse.json({ error: "Could not mark the rows as exported; nothing was downloaded. Try again." }, { status: 500 });

  const day = now.toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="dentvideo-google-ads-${kind}-${day}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
