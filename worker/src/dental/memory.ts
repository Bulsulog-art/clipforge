/**
 * Anti-repetition: what this clinic has already posted, and how not to say
 * it again.
 *
 * A clinic gets five videos a week, every week. By week six a strategist with
 * no memory is writing "Is whitening bad for enamel?" for the third time and
 * every video closes with the same line (the baseline: 25 of 30 scripts share
 * a closing with another video of their week). The memory is built from the
 * clinic's past items, so it costs nothing and needs no new storage:
 *
 *   - a topic too close to a past one (title, question or hook) is dropped
 *     before any money is spent writing it;
 *   - the strategist is told which services were covered recently and which
 *     were not, and which hook openings and shapes it has leaned on;
 *   - the writers are told the openings and closings already used this week.
 *
 * Works with titles alone (all the jobs table passes today) and gets sharper
 * with hooks, services and dates when the caller has them.
 */
import { hookShape } from "./style.js";
import { similarity, type PastTopic } from "./rubric.js";

export type { PastTopic };

const norm = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const DAY = 86_400_000;

export type ClinicMemory = {
  recentHooks: string[];
  /** Services by how often they were covered in the last four weeks. */
  serviceCounts: Map<string, number>;
  /** Hook shapes (question, moment…) used in the last four weeks. */
  shapeCounts: Map<string, number>;
};

export function clinicMemory(history: PastTopic[], now: Date = new Date()): ClinicMemory {
  const recent = history.filter((h) => !h.weekOf || now.getTime() - Date.parse(h.weekOf) <= 28 * DAY);
  const serviceCounts = new Map<string, number>();
  const shapeCounts = new Map<string, number>();
  for (const h of recent) {
    if (h.service) serviceCounts.set(h.service.toLowerCase(), (serviceCounts.get(h.service.toLowerCase()) ?? 0) + 1);
    if (h.hook) shapeCounts.set(hookShape(h.hook), (shapeCounts.get(hookShape(h.hook)) ?? 0) + 1);
  }
  return { recentHooks: recent.map((h) => h.hook).filter((h): h is string => !!h).slice(-15), serviceCounts, shapeCounts };
}

/** The strategist's view of the clinic's history, in a few lines. */
export function memoryBrief(history: PastTopic[], services: string[], now: Date = new Date()): string {
  if (!history.length) return "";
  const mem = clinicMemory(history, now);
  const lines: string[] = [];
  const titles = history.slice(-40).map((h) => h.title);
  lines.push(`Already published (never repeat a topic or answer the same question again, even in other words): ${titles.join(" | ")}`);
  if (mem.serviceCounts.size) {
    const unused = services.filter((s) => !mem.serviceCounts.has(s.toLowerCase()));
    const heavy = [...mem.serviceCounts].filter(([, n]) => n >= 3).map(([s]) => s);
    if (unused.length) lines.push(`Not covered in the last four weeks — favour these: ${unused.join(", ")}.`);
    if (heavy.length) lines.push(`Covered a lot recently — at most one video each this week: ${heavy.join(", ")}.`);
  }
  if (mem.recentHooks.length) lines.push(`Recent hooks — do not reuse their opening words or wording: ${mem.recentHooks.slice(-10).map((h) => `"${h}"`).join(" ")}`);
  const top = [...mem.shapeCounts].sort((a, b) => b[1] - a[1])[0];
  if (top && top[1] >= 3) lines.push(`Recent hooks leaned on the "${top[0]}" shape; use other shapes this week.`);
  return lines.join("\n");
}

/** A topic that repeats something the clinic already posted. */
export function repeats(topic: { title: string; question?: string; hook?: string }, history: PastTopic[]): PastTopic | undefined {
  return history.find(
    (h) =>
      similarity(h.title, topic.title) >= 0.5 ||
      (!!h.question && !!topic.question && similarity(h.question, topic.question) >= 0.6) ||
      (!!h.hook && !!topic.hook && norm(h.hook) === norm(topic.hook)),
  );
}

/**
 * Drops topics that repeat history or each other, but never leaves fewer
 * than `keep`: a thin week is worse than a near-repeat, so the least similar
 * repeats are kept to fill it.
 */
export function dropRepeats<T extends { title: string; question?: string; hook?: string }>(topics: T[], history: PastTopic[], keep: number): T[] {
  const fresh: T[] = [];
  const stale: { t: T; sim: number }[] = [];
  for (const t of topics) {
    const seen: PastTopic[] = [...history, ...fresh.map((f) => ({ title: f.title, question: f.question, hook: f.hook }))];
    if (repeats(t, seen)) stale.push({ t, sim: Math.max(...seen.map((h) => similarity(h.title, t.title))) });
    else fresh.push(t);
  }
  if (fresh.length >= keep) return fresh;
  const fill = stale.sort((a, b) => a.sim - b.sim).slice(0, keep - fresh.length).map((s) => s.t);
  // Keep the strategist's order.
  return topics.filter((t) => fresh.includes(t) || fill.includes(t));
}

/**
 * What the week's earlier videos already said first and last, so the next
 * one opens and closes differently (the baseline repeated "Wissen Sie was?"
 * and "Daha fazla bilgi için…" across a whole week).
 */
export type WeekVoice = { openers: string[]; closings: string[] };

export function firstSentence(text: string): string {
  return (text.trim().split(/(?<=[.!?。？！؟…])\s+/u)[0] ?? "").slice(0, 80);
}

export function weekVoiceBrief(v: WeekVoice | undefined): string {
  if (!v || (!v.openers.length && !v.closings.length)) return "";
  return [
    v.openers.length ? `Earlier videos this week opened with: ${v.openers.map((o) => `"${o}"`).join(" ")} — open differently (different first words, different shape).` : "",
    v.closings.length ? `Earlier videos this week closed with: ${v.closings.map((o) => `"${o}"`).join(" ")} — close with a different sentence.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** A stored item as the week job reads it back (dentvid_items: title, topic, week_of, status). */
export type PastItemRow = { title?: unknown; topic?: unknown; week_of?: unknown; status?: unknown };

const str = (v: unknown, max = 200): string | undefined => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/**
 * The clinic's history for the strategist, from its stored items: title,
 * hook, service, pillar, question and week. This is what turns on the full
 * memory (services covered in the last four weeks, recent hooks and hook
 * shapes) instead of the title filter alone. Rows that never reached the
 * clinic (rejected, failed) are left out: they were not posted, so they do
 * not count as covered. Oldest first, as memoryBrief and clinicMemory
 * expect. The topic column is jsonb the agents wrote, so every field is
 * checked, never trusted.
 */
export function historyFromRows(rows: PastItemRow[]): PastTopic[] {
  const out: PastTopic[] = [];
  for (const r of rows) {
    if (r.status === "rejected" || r.status === "failed") continue;
    const t = (r.topic && typeof r.topic === "object" && !Array.isArray(r.topic) ? r.topic : {}) as Record<string, unknown>;
    const title = str(r.title) ?? str(t.title);
    if (!title) continue;
    const weekOf = str(r.week_of, 40);
    const hook = str(t.hook);
    const service = str(t.service, 80);
    const pillar = str(t.pillar, 40);
    const question = str(t.question);
    out.push({
      title,
      ...(hook ? { hook } : {}),
      ...(service ? { service } : {}),
      ...(pillar ? { pillar } : {}),
      ...(question ? { question } : {}),
      ...(weekOf && !Number.isNaN(Date.parse(weekOf)) ? { weekOf } : {}),
    });
  }
  // Oldest first; undated rows (none in practice: week_of is not null) go first, in their order.
  return out
    .map((h, i) => ({ h, i, t: h.weekOf ? Date.parse(h.weekOf) : -8.64e15 }))
    .sort((a, b) => a.t - b.t || a.i - b.i)
    .map((x) => x.h);
}
