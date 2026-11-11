import Link from "next/link";
import { AlertTriangle, CircleCheck, Info } from "lucide-react";
import { ADMIN_SECTIONS, type AdminSection } from "@/lib/dentvid/admin-nav";
import { ACTION_MESSAGES, isActionCode, type ActionCode } from "@/lib/dentvid/admin-actions";

/**
 * Building blocks of the owner admin panel: the shell (navigation, flash,
 * warnings), the confirm-before-acting form, tables and badges. All server
 * components — the panel ships no JavaScript of its own; forms are plain
 * POSTs and filters plain GETs.
 */

export const usd = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
export const int = (n: number) => new Intl.NumberFormat("en-US").format(n);
export const day = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }) : "—");
export const when = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—";

/** "3 min ago", "5 h ago", "2 d ago". */
export function ago(iso: string | null | undefined, now: Date): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 1000));
  if (s < 90) return `${s} s ago`;
  if (s < 5400) return `${Math.round(s / 60)} min ago`;
  if (s < 172_800) return `${Math.round(s / 3600)} h ago`;
  return `${Math.round(s / 86_400)} d ago`;
}

/** How each admin page builds its links: the site (dvHref) or the dev harness (query strings). */
export type AdminLinks = {
  section: (key: AdminSection, query?: string) => string;
  clinic: (id: string) => string;
  /** A GET filter form for a section: where it submits and the hidden fields it needs. */
  form: (key: AdminSection) => { action: string; hidden: Record<string, string> };
};

/** The URL every action form posts to (same path on dentvideo.com and the app host). */
export const ACTION_URL = "/api/dentvideo/admin/action";

export type Viewer = { email: string; csrf: string };

export function AdminShell({
  active,
  title,
  lead,
  links,
  viewer,
  now,
  flash,
  warnings = [],
  right,
  children,
}: {
  active: AdminSection;
  title: string;
  lead?: React.ReactNode;
  links: AdminLinks;
  viewer: Viewer;
  now: string;
  flash?: string | null;
  warnings?: string[];
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const code: ActionCode | null = isActionCode(flash) ? flash : null;
  const good = code && /^(week_queued|week_promoted|video_requeued|recording_requeued|ready_sent|comp_recorded|paused|unpaused|job_retried)$/.test(code);
  return (
    <main lang="en" className="relative isolate min-h-screen overflow-x-hidden" data-admin={active}>
      <div aria-hidden="true" className="dv-grid absolute inset-x-0 top-0 -z-10 h-[20rem]" />
      <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6 sm:pt-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-dv-muted">
          <span className="font-semibold uppercase tracking-[0.12em] text-dv-teal">DentVideo · owner</span>
          <span>
            {when(now)} UTC · {viewer.email}
          </span>
        </div>
        <nav aria-label="Admin sections" className="-mx-4 mt-3 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <ul className="flex w-max gap-1.5 sm:w-auto sm:flex-wrap">
            {ADMIN_SECTIONS.map((s) => (
              <li key={s.key}>
                <Link
                  href={links.section(s.key)}
                  aria-current={s.key === active ? "page" : undefined}
                  className={`inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition ${
                    s.key === active ? "bg-dv-teal text-white" : "bg-white text-dv-body ring-1 ring-dv-line hover:text-dv-ink hover:ring-dv-edge"
                  }`}
                >
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {code && (
          <div role="status" className={`mt-5 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${good ? "bg-dv-teal-50 text-dv-teal" : "bg-[#fdf1dc] text-[#7a4b00]"}`}>
            {good ? <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
            <span>{ACTION_MESSAGES[code]}</span>
          </div>
        )}
        {warnings.length > 0 && (
          <div role="status" className="mt-5 rounded-xl bg-[#fdf1dc] px-4 py-3 text-sm text-[#7a4b00]">
            {warnings.map((w) => (
              <p key={w}>{w}</p>
            ))}
          </div>
        )}

        <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="dv-display text-[2rem] leading-[1.05] text-dv-ink sm:text-[2.75rem]">{title}</h1>
            {lead && <div className="mt-1.5 text-sm text-dv-muted">{lead}</div>}
          </div>
          {right}
        </header>
        {children}
      </div>
    </main>
  );
}

export function Section({ title, lead, right, children, id }: { title: string; lead?: React.ReactNode; right?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section aria-labelledby={id} className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="text-lg font-semibold text-dv-ink">
            {title}
          </h2>
          {lead && <p className="mt-0.5 text-sm text-dv-muted">{lead}</p>}
        </div>
        {right}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "red" | "amber" | "teal" }) {
  const colour = tone === "red" ? "text-[#b42318]" : tone === "amber" ? "text-[#9a5b00]" : tone === "teal" ? "text-dv-teal" : "text-dv-ink";
  return (
    <div className="dv-card min-w-0 p-4">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-dv-muted">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold leading-none tabular-nums ${colour}`}>{value}</p>
      {sub && <div className="mt-1.5 text-xs leading-snug text-dv-body">{sub}</div>}
    </div>
  );
}

export function Chip({ href, on, children }: { href: string; on: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`inline-flex min-h-8 items-center whitespace-nowrap rounded-full px-3 text-xs font-medium transition ${
        on ? "bg-dv-ink text-white" : "bg-white text-dv-body ring-1 ring-dv-line hover:text-dv-ink"
      }`}
    >
      {children}
    </Link>
  );
}

const TONES: Record<string, string> = {
  teal: "bg-dv-teal-50 text-dv-teal ring-dv-teal-100",
  grey: "bg-dv-sand text-dv-body ring-dv-line",
  amber: "bg-[#fdf1dc] text-[#7a4b00] ring-[#f3dcae]",
  red: "bg-[#fbeaea] text-[#8a1f1f] ring-[#f2cccc]",
};

export function Badge({ tone = "grey", children, title }: { tone?: "teal" | "grey" | "amber" | "red"; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ring-1 ${TONES[tone]}`}>
      {children}
    </span>
  );
}

export function PlanBadge({ plan, tier, adminPaused }: { plan: string; tier?: string | null; adminPaused?: boolean }) {
  const label = plan === "trial" ? "unpaid" : plan === "active" && tier ? tier : plan;
  const tone = plan === "active" ? "teal" : plan === "paused" ? "amber" : plan === "cancelled" ? "red" : "grey";
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge tone={tone}>
        <span className="capitalize">{label}</span>
      </Badge>
      {adminPaused && <Badge tone="amber">paused by owner</Badge>}
    </span>
  );
}

export function StatusBadge({ status, problem }: { status: string; problem?: boolean }) {
  const tone = problem || status === "failed" ? "red" : status === "flagged" || status === "rejected" ? "amber" : status === "ready" ? "teal" : "grey";
  return <Badge tone={tone}>{problem && status !== "failed" ? `${status} · needs fix` : status}</Badge>;
}

/** A table that scrolls sideways inside its card on a phone, never the page. */
export function Table({ caption, head, children, minWidth = "40rem" }: { caption: string; head: React.ReactNode[]; children: React.ReactNode; minWidth?: string }) {
  return (
    <div className="dv-card overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-dv-line text-[0.6875rem] uppercase tracking-[0.06em] text-dv-muted [&>th]:whitespace-nowrap [&>th]:px-3 [&>th]:py-2.5 [&>th]:font-semibold">
            {head.map((h, i) => (
              <th key={i} scope="col">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-dv-line [&>tr:last-child]:border-0 [&_td]:px-3 [&_td]:py-2.5 [&_th]:px-3 [&_th]:py-2.5">{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="dv-card p-5 text-center text-sm text-dv-muted">{children}</p>;
}

export function AllClear({ children }: { children: React.ReactNode }) {
  return (
    <p className="dv-card flex items-center gap-2 p-4 text-sm text-dv-teal">
      <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

export function Warn({ children, tone = "amber" }: { children: React.ReactNode; tone?: "amber" | "red" }) {
  return (
    <p className={`flex items-start gap-2 rounded-xl px-3 py-2 text-sm ${tone === "red" ? "bg-[#fbeaea] text-[#8a1f1f]" : "bg-[#fdf1dc] text-[#7a4b00]"}`}>
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/**
 * An owner action: a disclosure that opens a POST form with an explanation, a
 * required "I understand" box (checked again on the server) and the CSRF
 * token. Without a token (no secret configured) the action is shown disabled.
 */
export function ActionForm({
  viewer,
  action,
  fields,
  back,
  label,
  explain,
  danger = false,
  children,
}: {
  viewer: Viewer;
  action: string;
  fields: Record<string, string>;
  back: string;
  label: string;
  explain: React.ReactNode;
  danger?: boolean;
  children?: React.ReactNode;
}) {
  if (!viewer.csrf)
    return (
      <span className="inline-flex min-h-9 items-center rounded-full px-3 text-xs text-dv-muted ring-1 ring-dv-line" title="Set DENTVIDEO_ADMIN_CSRF_SECRET (or the service role key) to enable actions">
        {label} (disabled)
      </span>
    );
  return (
    <details className="group relative">
      <summary
        className={`inline-flex min-h-9 cursor-pointer list-none items-center rounded-full px-3.5 text-sm font-medium ring-1 transition [&::-webkit-details-marker]:hidden ${
          danger ? "bg-white text-[#8a1f1f] ring-[#f2cccc] hover:bg-[#fbeaea]" : "bg-white text-dv-teal ring-dv-line hover:ring-dv-edge"
        }`}
      >
        {label}
      </summary>
      <form method="post" action={ACTION_URL} className="dv-card mt-2 grid w-full max-w-sm gap-3 p-4 text-sm sm:absolute sm:z-20 sm:w-80">
        <input type="hidden" name="csrf" value={viewer.csrf} />
        <input type="hidden" name="action" value={action} />
        <input type="hidden" name="back" value={back} />
        {Object.entries(fields).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <div className="text-dv-body">{explain}</div>
        {children}
        <label className="flex items-start gap-2 text-dv-ink">
          <input type="checkbox" name="confirm" value="yes" required className="mt-0.5 h-4 w-4 accent-[#0f5c5c]" />
          <span>I understand — go ahead.</span>
        </label>
        <button type="submit" className={`dv-btn min-h-10 rounded-full px-4 text-sm font-semibold text-white ${danger ? "bg-[#b42318]" : "dv-btn-primary"}`}>
          {label}
        </button>
      </form>
    </details>
  );
}

/** A GET filter bar: selects and a search box, submitted as a plain form. */
export function FilterForm({
  links,
  section,
  children,
  reset,
}: {
  links: AdminLinks;
  section: AdminSection;
  children: React.ReactNode;
  reset: string;
}) {
  const f = links.form(section);
  return (
    <form method="get" action={f.action} className="dv-card mt-5 flex flex-wrap items-end gap-3 p-3 text-sm">
      {Object.entries(f.hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {children}
      <div className="flex gap-2">
        <button type="submit" className="dv-btn dv-btn-primary min-h-10 rounded-full px-4 text-sm font-semibold">
          Apply
        </button>
        <Link href={reset} className="inline-flex min-h-10 items-center rounded-full px-3 text-sm text-dv-muted hover:text-dv-ink">
          Reset
        </Link>
      </div>
    </form>
  );
}

export function Select({ name, label, value, options }: { name: string; label: string; value: string | null; options: [string, string][] }) {
  return (
    <label className="grid min-w-[7.5rem] flex-1 gap-1 text-xs font-medium text-dv-muted sm:flex-none">
      {label}
      <select name={name} defaultValue={value ?? ""} className="min-h-10 rounded-xl border border-dv-line bg-white px-2.5 text-sm text-dv-ink">
        <option value="">All</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TextInput({ name, label, value, placeholder, type = "text" }: { name: string; label: string; value: string | null; placeholder?: string; type?: string }) {
  return (
    <label className="grid min-w-[10rem] flex-[2] gap-1 text-xs font-medium text-dv-muted">
      {label}
      <input type={type} name={name} defaultValue={value ?? ""} placeholder={placeholder} className="min-h-10 rounded-xl border border-dv-line bg-white px-3 text-sm text-dv-ink" />
    </label>
  );
}
