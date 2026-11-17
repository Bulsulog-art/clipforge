import { AdminEmails } from "@/components/dentvid/admin-screens";
import { requireAdmin } from "@/lib/dentvid/admin-server";
import { loadEmails } from "@/lib/dentvid/admin-loaders";
import { backPath, flashOf, siteAdminLinks } from "@/lib/dentvid/admin-links";

export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/** Emails per clinic with status and errors; resend where safe. 404 for everyone but an admin. */
export default async function AdminEmailsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const viewer = await requireAdmin();
  const sp = await searchParams;
  const status = one(sp.status);
  const kind = one(sp.kind);
  const data = await loadEmails();
  return (
    <AdminEmails
      now={data.now}
      log={data.log}
      sends={data.sends}
      clinics={data.clinics}
      status={status === "failed" || status === "sent" ? status : null}
      kind={/^[a-z_]{3,40}$/.test(kind) ? kind : null}
      warnings={data.warnings}
      links={siteAdminLinks}
      viewer={viewer}
      flash={flashOf(sp)}
      back={backPath("/dentvideo/admin/emails", sp)}
    />
  );
}
