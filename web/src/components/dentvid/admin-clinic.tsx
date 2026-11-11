import { ExternalLink } from "lucide-react";
import { isProblemVideo, qs } from "@/lib/dentvid/admin-filters";
import { checkViews, findingsList, scriptText } from "@/lib/dentvid/admin-video";
import { sourceOf } from "@/lib/dentvid/admin-metrics";
import type { ClinicDetail, DetailItem } from "@/lib/dentvid/admin-loaders";
import { ActionForm, AdminShell, AllClear, Badge, Empty, PlanBadge, Section, StatusBadge, Table, Warn, ago, day, when, type AdminLinks, type Viewer } from "./admin-ui";
import { dodoDashboard } from "./admin-screens";

/**
 * One clinic, everything about it: profile and logo, plan and payments, every
 * video with a player (signed server-side for this page view only), its
 * script and review results, the funnel timeline, emails, and the owner's
 * actions with their audit trail.
 */

const EVENT_LABEL: Record<string, string> = {
  signup_completed: "Signed up",
  clinic_saved: "Saved clinic profile",
  preview_started: "Started a preview",
  preview_step_viewed: "Saw their preview",
  preview_played: "Played the preview",
  preview_completed: "Watched the preview to the end",
  plan_viewed: "Saw the plans",
  plan_clicked: "Clicked a plan",
  checkout_opened: "Opened checkout",
  payment_succeeded: "Paid",
  week_ready: "Videos ready",
  video_approved: "Approved a video",
  video_shared: "Shared a video",
};

function VideoCard({ i, viewer, back, now }: { i: DetailItem; viewer: Viewer; back: string; now: Date }) {
  const problem = isProblemVideo(i);
  const checks = checkViews(i.checks);
  const findings = findingsList(i.findings);
  const words = scriptText(i);
  return (
    <li className={`dv-card grid min-w-0 gap-3 p-3 sm:grid-cols-[9rem_minmax(0,1fr)] ${problem ? "ring-2 ring-[#f2cccc]" : ""}`} data-item={i.id}>
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[11rem] overflow-hidden rounded-xl bg-dv-sand sm:max-w-none">
        {i.videoUrl ? (
          <video controls preload="metadata" playsInline poster={i.thumbUrl} src={i.videoUrl} className="absolute inset-0 h-full w-full object-cover" aria-label={i.title} />
        ) : i.thumbUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img src={i.thumbUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-dv-muted">no video file</span>
        )}
      </div>
      <div className="min-w-0 text-sm">
        <p className="font-semibold leading-snug text-dv-ink">{i.title || "(untitled)"}</p>
        <p className="mt-1 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={i.status} problem={problem} />
          <Badge tone={i.approval === "approved" ? "teal" : i.approval === "rejected" ? "red" : "grey"}>{i.approval === "pending" ? "awaiting dentist" : `dentist ${i.approval}`}</Badge>
          <span className="text-xs text-dv-muted">
            {i.kind} · updated {ago(i.updated_at, now)}
          </span>
          {i.restyle_status && <Badge tone="amber">re-render {i.restyle_status}</Badge>}
        </p>
        {i.approval_note && <p className="mt-1 text-xs text-dv-body">Dentist&apos;s note: {i.approval_note}</p>}
        {i.error && <code className="mt-1.5 block break-words font-mono text-xs text-[#8a1f1f]">{i.error}</code>}
        {findings.length > 0 && (
          <ul className="mt-1.5 list-disc ps-5 text-xs text-[#7a4b00]">
            {findings.map((f, n) => (
              <li key={n}>{f}</li>
            ))}
          </ul>
        )}
        {checks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Review results">
            {checks.map((c) => (
              <Badge key={c.label} tone={c.verdict === "pass" ? "teal" : c.verdict === "block" ? "red" : "amber"} title={c.issues.map((x) => x.problem).join(" · ")}>
                {c.label}: {c.verdict}
                {c.issues.length ? ` (${c.issues.length})` : ""}
              </Badge>
            ))}
          </div>
        )}
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-dv-teal">Script, caption and review details</summary>
          <div className="mt-2 grid gap-2 text-xs">
            {words ? <p className="whitespace-pre-wrap rounded-lg bg-dv-sand/60 p-2 text-dv-ink">{words}</p> : <p className="text-dv-muted">No script stored.</p>}
            {i.copy?.caption && (
              <p className="text-dv-body">
                <span className="font-semibold">Caption:</span> {i.copy.caption} {(i.copy.hashtags ?? []).join(" ")}
              </p>
            )}
            {checks.map((c) => (
              <div key={c.label}>
                <p className="font-semibold text-dv-ink">
                  {c.label}: {c.verdict}
                </p>
                {c.hard.length > 0 && <p className="text-[#8a1f1f]">Hard rules: {c.hard.join("; ")}</p>}
                {c.issues.map((x, n) => (
                  <p key={n} className="text-dv-body">
                    “{x.quote}” — {x.problem}
                    {x.fix ? ` → ${x.fix}` : ""}
                  </p>
                ))}
              </div>
            ))}
          </div>
        </details>
        {(problem || i.status === "flagged" || i.status === "rejected") && (
          <div className="mt-2">
            <ActionForm
              viewer={viewer}
              action="retry_video"
              fields={{ itemId: i.id }}
              back={back}
              label="Retry this video"
              explain="A generated video is re-rendered from its stored, already-reviewed script; a recording is processed again. Ahead of the weekly batch; the spend guard still applies."
            />
          </div>
        )}
      </div>
    </li>
  );
}

export function AdminClinicDetail({ d, links, viewer, flash, back }: { d: ClinicDetail; links: AdminLinks; viewer: Viewer; flash?: string | null; back: string }) {
  const now = new Date(d.now);
  const c = d.clinic;
  const p = (c.profile ?? {}) as Record<string, unknown>;
  const weeks = [...new Set(d.items.map((i) => i.week_of))].sort().reverse();
  const comps = (d.actions ?? []).filter((a) => a.action === "comp_month" && a.outcome === "ok");
  const firstTouch = [...d.events].reverse().map((e) => sourceOf(e.props)).find(Boolean) ?? null;
  const services = Array.isArray(p.services) ? (p.services as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const dodo = dodoDashboard();
  return (
    <AdminShell
      active="clinics"
      title={(p.name as string) || "(no name)"}
      lead={
        <span className="flex flex-wrap items-center gap-2">
          <PlanBadge plan={c.plan} tier={c.plan_tier} adminPaused={!!c.admin_paused_at} />
          <span>
            {[p.city, p.country].filter(Boolean).join(", ") || "—"} · <span className="uppercase">{(p.language as string) ?? "—"}</span> · since {day(c.created_at)}
          </span>
        </span>
      }
      links={links}
      viewer={viewer}
      now={d.now}
      flash={flash}
      right={
        d.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img src={d.logoUrl} alt={`${(p.name as string) ?? "Clinic"} logo`} className="h-16 w-16 rounded-2xl bg-white object-contain p-1.5 ring-1 ring-dv-line" />
        ) : undefined
      }
    >
      {c.admin_paused_at && (
        <div className="mt-4">
          <Warn>
            Paused by the owner {ago(c.admin_paused_at, now)}
            {c.admin_pause_note ? ` — “${c.admin_pause_note}”` : ""}. No weeks, recordings or re-renders run until unpaused. Billing is unchanged.
          </Warn>
        </div>
      )}

      <Section title="Owner actions" id="actions" lead="Each asks for confirmation and is recorded in the audit log below.">
        <div className="flex flex-wrap gap-2">
          <ActionForm
            viewer={viewer}
            action="requeue_week"
            fields={{ clinicId: c.id }}
            back={back}
            label="Requeue this week"
            explain="Queues this clinic's current delivery week at the front of the line — the same job as the clinic's own &quot;make this week&quot; button. If it is already waiting it moves to the front; a week already made is left alone."
          />
          <ActionForm viewer={viewer} action="resend_ready" fields={{ clinicId: c.id }} back={back} label="Resend “videos ready”" explain="Emails the owner the &quot;your videos are ready&quot; note for their latest week, in the clinic's language." />
          <ActionForm
            viewer={viewer}
            action="comp_month"
            fields={{ clinicId: c.id }}
            back={back}
            label="Comp / extend"
            explain={
              <>
                Records a goodwill credit in the audit log. <strong>It does not change billing</strong> — apply it in the{" "}
                <a href={dodo} target="_blank" rel="noopener noreferrer" className="text-dv-teal underline">
                  Dodo dashboard
                </a>
                .
              </>
            }
          >
            <label className="grid gap-1 text-xs font-medium text-dv-muted">
              Months
              <select name="months" defaultValue="1" className="min-h-9 rounded-lg border border-dv-line bg-white px-2 text-sm text-dv-ink">
                <option value="1">1 month</option>
                <option value="2">2 months</option>
                <option value="3">3 months</option>
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium text-dv-muted">
              Why (required)
              <textarea name="note" required minLength={3} maxLength={300} rows={2} className="rounded-lg border border-dv-line bg-white px-2 py-1.5 text-sm text-dv-ink" />
            </label>
          </ActionForm>
          {c.admin_paused_at ? (
            <ActionForm viewer={viewer} action="unpause" fields={{ clinicId: c.id }} back={back} label="Unpause" explain="The clinic is back in the weekly batch and its buttons work again." />
          ) : (
            <ActionForm
              viewer={viewer}
              action="pause"
              fields={{ clinicId: c.id }}
              back={back}
              label="Pause clinic"
              danger
              explain={
                <>
                  Stops all video making for this clinic (weekly batch, its buttons, re-renders) until you unpause. Billing continues — pause or cancel in Dodo separately.
                  {!d.pauseColumn && <span className="mt-1 block text-[#8a1f1f]">Needs supabase/liman/0010_dentvid_admin.sql.</span>}
                </>
              }
            >
              <label className="grid gap-1 text-xs font-medium text-dv-muted">
                Note
                <input name="note" maxLength={300} className="min-h-9 rounded-lg border border-dv-line bg-white px-2 text-sm text-dv-ink" />
              </label>
            </ActionForm>
          )}
          <a href={dodo} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 rounded-full bg-white px-3.5 text-sm font-medium text-dv-body ring-1 ring-dv-line hover:ring-dv-edge">
            Dodo <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        </div>
      </Section>

      <Section title="Profile" id="profile">
        <dl className="dv-card grid gap-x-6 gap-y-2 p-4 text-sm sm:grid-cols-2">
          {[
            ["Owner email", d.ownerEmail ?? "—"],
            ["Clinic id", c.id],
            ["Services", services.join(", ") || "—"],
            ["Tone / address", [p.tone, p.address].filter(Boolean).join(" · ") || "—"],
            ["Booking link", (p.bookingUrl as string) || "—"],
            ["First touch", firstTouch ?? "direct / unknown"],
            ["Emails", c.email_opt_out_at ? `opted out ${day(c.email_opt_out_at)}` : "subscribed"],
            ["Renews", day(c.plan_renews_at)],
          ].map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-xs text-dv-muted">{k}</dt>
              <dd className="break-words text-dv-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Plan, subscriptions and payments" id="billing">
        <div className="grid gap-3">
          {d.subs === null ? (
            <Warn>Subscription ledger (0007) not on this database.</Warn>
          ) : d.subs.length === 0 ? (
            <Empty>No subscriptions recorded.</Empty>
          ) : (
            <Table caption="Subscriptions" head={["Subscription", "Status", "Tier", "Interval", "Founding", "Period end", "Last event"]} minWidth="44rem">
              {d.subs.map((s) => (
                <tr key={s.dodo_subscription_id}>
                  <th scope="row" className="font-mono text-[0.6875rem] font-normal">
                    {s.dodo_subscription_id}
                  </th>
                  <td>
                    <Badge tone={s.status === "active" ? "teal" : "grey"}>{s.status}</Badge>
                  </td>
                  <td className="capitalize">{s.tier ?? "—"}</td>
                  <td>{s.interval ?? "—"}</td>
                  <td>{s.founding ? "yes" : ""}</td>
                  <td className="text-xs">{day(s.period_end)}</td>
                  <td className="whitespace-nowrap text-xs text-dv-muted">
                    {s.last_event_type ?? "—"} · {when(s.last_event_at)}
                  </td>
                </tr>
              ))}
            </Table>
          )}
          {d.payments && d.payments.length > 0 && (
            <Table caption="Payments" head={["When", "Payment", "Subscription"]} minWidth="30rem">
              {d.payments.map((x) => (
                <tr key={x.dodo_payment_id}>
                  <td className="whitespace-nowrap text-xs">{when(x.created_at)}</td>
                  <td className="font-mono text-[0.6875rem]">{x.dodo_payment_id}</td>
                  <td className="font-mono text-[0.6875rem] text-dv-muted">{x.dodo_subscription_id ?? "—"}</td>
                </tr>
              ))}
            </Table>
          )}
          {comps.length > 0 && (
            <ul className="dv-card grid gap-1 p-3 text-sm">
              {comps.map((a) => (
                <li key={a.id}>
                  <Badge tone="teal">comp</Badge> <span className="text-dv-body">{(a.params as { months?: number }).months ?? 1} month(s) · {(a.params as { note?: string }).note ?? ""}</span>{" "}
                  <span className="text-xs text-dv-muted">
                    {when(a.created_at)} · {a.admin_email ?? a.admin_id}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section title="Videos" id="videos" lead={`${d.items.length} videos · players are signed for ${Math.round(d.signedTtlSec / 60)} minutes; reload the page for fresh links.`}>
        {d.items.length === 0 ? (
          <Empty>No videos made for this clinic yet.</Empty>
        ) : (
          weeks.map((w) => (
            <div key={w} className="mt-4 first:mt-0">
              <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-dv-muted">Week of {day(w)}</h3>
              <ul className="mt-2 grid gap-3 lg:grid-cols-2">
                {d.items
                  .filter((i) => i.week_of === w)
                  .map((i) => (
                    <VideoCard key={i.id} i={i} viewer={viewer} back={back} now={now} />
                  ))}
              </ul>
            </div>
          ))
        )}
      </Section>

      <Section title="Funnel timeline" id="timeline" lead="This clinic's events, newest first (anonymous steps before sign-up are not linked to a clinic).">
        {d.events.length === 0 ? (
          <Empty>No events tied to this clinic.</Empty>
        ) : (
          <ol className="dv-card divide-y divide-dv-line text-sm">
            {d.events.slice(0, 80).map((e, n) => {
              const props = Object.entries(e.props ?? {})
                .filter(([k]) => !["geo"].includes(k))
                .map(([k, v]) => `${k}=${String(v)}`)
                .join(" · ");
              return (
                <li key={n} className="grid gap-0.5 px-3 py-2 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-3">
                  <span className="text-xs tabular-nums text-dv-muted">{when(e.created_at)}</span>
                  <span className="min-w-0">
                    <span className="font-medium text-dv-ink">{EVENT_LABEL[e.name] ?? e.name}</span>
                    {props && <span className="block truncate text-xs text-dv-muted">{props}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      <Section title="Emails" id="emails">
        {d.emailSends === null && d.emailLog.length === 0 ? (
          <Empty>No emails recorded (delivery records need 0010).</Empty>
        ) : (
          <Table caption="Emails to this clinic" head={["When", "Type", "Status", "Error"]} minWidth="30rem">
            {[
              ...(d.emailSends ?? []).map((s) => ({ at: s.created_at, kind: s.kind, status: s.status, error: s.error })),
              ...d.emailLog.filter((l) => !(d.emailSends ?? []).some((s) => s.kind === l.kind)).map((l) => ({ at: l.sent_at, kind: l.kind, status: "sent", error: null as string | null })),
            ]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((r, n) => (
                <tr key={n}>
                  <td className="whitespace-nowrap text-xs">{when(r.at)}</td>
                  <td className="text-xs">{r.kind.replace(/_/g, " ")}</td>
                  <td>{r.status === "failed" ? <Badge tone="red">failed</Badge> : <Badge tone="teal">sent</Badge>}</td>
                  <td className="break-words font-mono text-[0.6875rem] text-[#8a1f1f]">{r.error ?? ""}</td>
                </tr>
              ))}
          </Table>
        )}
      </Section>

      <Section title="Audit log" id="audit" lead="Every owner action on this clinic.">
        {d.actions === null ? (
          <Warn>Actions are not audited until supabase/liman/0010_dentvid_admin.sql is applied (they are still written to the server log).</Warn>
        ) : d.actions.length === 0 ? (
          <AllClear>No owner actions on this clinic yet.</AllClear>
        ) : (
          <Table caption="Audit log" head={["When", "Who", "Action", "Outcome", "Detail"]} minWidth="40rem">
            {d.actions.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-xs">{when(a.created_at)}</td>
                <td className="text-xs">{a.admin_email ?? a.admin_id}</td>
                <th scope="row" className="font-medium">
                  {a.action.replace(/_/g, " ")}
                </th>
                <td>
                  <Badge tone={a.outcome === "ok" ? "teal" : a.outcome === "refused" ? "amber" : "red"}>{a.outcome}</Badge>
                </td>
                <td className="break-words text-xs text-dv-body">{a.detail ?? ""}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <p className="mt-10 text-xs">
        <a href={links.section("videos", qs({ clinic: c.id }))} className="text-dv-teal hover:underline">
          This clinic in the Videos view →
        </a>
      </p>
    </AdminShell>
  );
}
