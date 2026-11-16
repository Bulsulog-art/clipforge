import Link from "next/link";
import type { AdminChangeRequest, AdminTopicRequest } from "@/lib/dentvid/admin-loaders";
import type { AdminClinic } from "@/lib/dentvid/admin-metrics";
import { AdminShell, Badge, Empty, Section, Stat, Table, Warn, int, when, type AdminLinks, type Viewer } from "./admin-ui";

/**
 * What clinics asked for (0025): topic suggestions and "Ask for a change"
 * requests, newest first, with what became of each. The clinic's own words
 * are shown as text (React escapes them); nothing here acts on them.
 */

type Common = { links: AdminLinks; viewer: Viewer; flash?: string | null; back: string };

const TOPIC_TONE: Record<string, "teal" | "grey" | "amber" | "red"> = { pending: "grey", used: "teal", refused: "amber" };
const CHANGE_TONE: Record<string, "teal" | "grey" | "amber" | "red"> = { queued: "grey", working: "grey", done: "teal", refused: "amber", failed: "red" };

export function TopicRequestsTable({ rows, names, links }: { rows: AdminTopicRequest[]; names?: Map<string, string>; links: AdminLinks }) {
  if (!rows.length) return <Empty>No topic suggestions yet.</Empty>;
  return (
    <Table caption="Topic suggestions" head={["When", ...(names ? ["Clinic"] : []), "Suggestion", "Status", "Why / week"]} minWidth="44rem">
      {rows.map((r) => (
        <tr key={r.id}>
          <td className="whitespace-nowrap text-xs">{when(r.created_at)}</td>
          {names && (
            <th scope="row" className="max-w-[12rem] truncate font-medium">
              <Link href={links.clinic(r.clinic_id)} className="text-dv-ink hover:text-dv-teal hover:underline">
                {names.get(r.clinic_id) ?? "clinic"}
              </Link>
            </th>
          )}
          <td dir="auto" className="max-w-[22rem] break-words">{r.text}</td>
          <td>
            <Badge tone={TOPIC_TONE[r.status] ?? "grey"}>{r.status}</Badge>
          </td>
          <td className="text-xs">{r.status === "used" ? (r.week_of ?? "") : (r.reason ?? "").replace(/_/g, " ")}</td>
        </tr>
      ))}
    </Table>
  );
}

export function ChangeRequestsTable({ rows, names, links }: { rows: AdminChangeRequest[]; names?: Map<string, string>; links: AdminLinks }) {
  if (!rows.length) return <Empty>No change requests yet.</Empty>;
  return (
    <Table caption="Change requests" head={["When", ...(names ? ["Clinic"] : []), "Note", "Video", "Status", "Reason"]} minWidth="48rem">
      {rows.map((r) => (
        <tr key={r.id}>
          <td className="whitespace-nowrap text-xs">{when(r.created_at)}</td>
          {names && (
            <th scope="row" className="max-w-[12rem] truncate font-medium">
              <Link href={links.clinic(r.clinic_id)} className="text-dv-ink hover:text-dv-teal hover:underline">
                {names.get(r.clinic_id) ?? "clinic"}
              </Link>
            </th>
          )}
          <td dir="auto" className="max-w-[22rem] break-words">{r.note}</td>
          <td className="font-mono text-[0.6875rem]">{r.item_id.slice(0, 8)}</td>
          <td>
            <Badge tone={CHANGE_TONE[r.status] ?? "grey"}>{r.status}</Badge>
          </td>
          <td className="text-xs">{(r.reason ?? "").replace(/_/g, " ")}</td>
        </tr>
      ))}
    </Table>
  );
}

export function AdminRequests({ now, topics, changes, clinics, warnings, ...c }: Common & { now: string; topics: AdminTopicRequest[] | null; changes: AdminChangeRequest[] | null; clinics: AdminClinic[]; warnings: string[] }) {
  const names = new Map(clinics.map((x) => [x.id, x.profile?.name || "(no name)"]));
  const week = Date.parse(now) - 7 * 86_400_000;
  const failed7 = (changes ?? []).filter((r) => r.status === "failed" && Date.parse(r.created_at) > week).length;
  return (
    <AdminShell active="requests" title="Requests" lead="Topic suggestions and change requests from clinics. A failed change also sent you an alert." now={now} warnings={warnings} {...c}>
      {(topics === null || changes === null) && <Warn>Requests appear once supabase/liman/0025_dentvid_clinic_requests.sql is applied.</Warn>}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Suggestions waiting" value={int((topics ?? []).filter((t) => t.status === "pending").length)} />
        <Stat label="Suggestions used" value={int((topics ?? []).filter((t) => t.status === "used").length)} />
        <Stat label="Changes · 7 days" value={int((changes ?? []).filter((r) => Date.parse(r.created_at) > week).length)} />
        <Stat label="Changes failed · 7 days" value={int(failed7)} tone={failed7 ? "red" : "teal"} />
      </div>
      <Section title="Change requests" id="changes">
        <ChangeRequestsTable rows={changes ?? []} names={names} links={c.links} />
      </Section>
      <Section title="Topic suggestions" id="topics">
        <TopicRequestsTable rows={topics ?? []} names={names} links={c.links} />
      </Section>
    </AdminShell>
  );
}
