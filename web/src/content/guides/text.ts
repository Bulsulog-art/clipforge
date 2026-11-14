import { GUIDES, LANDING_PATH, findGuide, guidePath, type Guide, type Locale } from "../dentvideo";
import { ABOUT_PATH, CHECKER_PATH, GUIDES_INDEX_PATH } from "./ui";
import { findSolution, solutionPath, type SolutionPage } from "../solutions";
import type { SectionTable } from "./types";
import { sampleSrc, samplesFor, type SampleVideo } from "../dentvideo-samples";

/** A piece of guide text: plain, or an inline link written as [label](target). */
export type Inline = { kind: "text"; text: string } | { kind: "link"; label: string; target: string };

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    if (m.index! > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "link", label: m[1], target: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** The text without link markup, for structured data, word counts and descriptions. */
export function plainText(text: string): string {
  return text.replace(LINK, "$1");
}

/**
 * The in-app path (or external URL) a link target points to, for a page in
 * `locale`. Null when an internal target does not exist (tests catch those).
 */
export function resolveTarget(target: string, locale: Locale): string | null {
  if (/^https?:\/\//.test(target)) return target;
  const [kind, arg = ""] = target.split(/:(.*)/s);
  switch (kind) {
    case "guide": {
      const g = findGuide(arg);
      return g ? guidePath(g) : null;
    }
    case "guides":
      return GUIDES_INDEX_PATH[locale];
    case "landing":
      return LANDING_PATH[locale];
    case "about":
      return ABOUT_PATH[locale];
    case "start":
      return `/dentvideo/start?lang=${locale}`;
    case "checker":
      return CHECKER_PATH[locale];
    case "video": {
      const p = findSolution(arg);
      return p ? solutionPath(p) : null;
    }
    default:
      return null;
  }
}

/** The cells of a section table, in reading order (caption, header, then row by row). */
export function tableTexts(t: SectionTable | undefined): string[] {
  if (!t) return [];
  return [t.caption, ...t.columns, ...t.rows.flat(), ...(t.note ? [t.note] : [])];
}

/** A section table as a Markdown table. */
function tableMarkdown(t: SectionTable, link: (s: string) => string): string[] {
  const row = (cells: string[]) => `| ${cells.map((c) => link(c).replace(/\|/g, "\\|")).join(" | ")} |`;
  const lines = [`**${t.caption}**`, "", row(t.columns), `|${" --- |".repeat(t.columns.length)}`, ...t.rows.map(row), ""];
  if (t.note) lines.push(link(t.note), "");
  return lines;
}

/** The date a page's facts were last checked: `reviewed`, else `updated`, else `published`. */
export function reviewedDate(p: { reviewed?: string; updated?: string; published?: string }): string | undefined {
  return p.reviewed ?? p.updated ?? p.published;
}

/** Every piece of running text in a guide, in reading order. */
export function guideTexts(g: Guide): string[] {
  return [
    g.intro,
    ...g.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? []), ...tableTexts(s.table), ...(s.after ?? [])]),
    ...g.faq.flatMap((f) => [f.q, f.a]),
  ];
}

/** Every piece of running text on a commercial page, in reading order. */
export function solutionTexts(p: SolutionPage): string[] {
  return [
    p.intro,
    ...p.sections.flatMap((s) => [s.heading, ...s.paragraphs, ...(s.list ?? []), ...tableTexts(s.table), ...(s.after ?? [])]),
    ...(p.table ? [p.table.caption, ...p.table.rows.flatMap((r) => [r.label, ...r.values]), p.table.note ?? ""] : []),
    ...p.faq.flatMap((f) => [f.q, f.a]),
  ];
}

/** A commercial page as Markdown, with absolute links, for llms-full.txt. */
export function solutionMarkdown(p: SolutionPage, abs: (path: string) => string): string {
  const link = (t: string) =>
    t.replace(LINK, (_, label: string, target: string) => {
      const to = resolveTarget(target, p.locale);
      return to ? `[${label}](${/^https?:/.test(to) ? to : abs(to)})` : label;
    });
  const lines = [`## ${p.h1}`, "", `URL: ${abs(solutionPath(p))}`, `Language: ${p.locale}`, "", link(p.intro), ""];
  if (p.table) {
    lines.push(`### ${p.table.caption}`, "", `| | ${p.table.columns.join(" | ")} |`, `|${" --- |".repeat(p.table.columns.length + 1)}`);
    for (const r of p.table.rows) lines.push(`| ${r.label} | ${r.values.join(" | ")} |`);
    lines.push("");
    if (p.table.note) lines.push(p.table.note, "");
  }
  for (const s of p.sections) {
    lines.push(`### ${s.heading}`, "");
    for (const para of s.paragraphs) lines.push(link(para), "");
    if (s.list?.length) {
      s.list.forEach((item, i) => lines.push(`${s.ordered ? `${i + 1}.` : "-"} ${link(item)}`));
      lines.push("");
    }
    if (s.table) lines.push(...tableMarkdown(s.table, link));
    for (const para of s.after ?? []) lines.push(link(para), "");
  }
  lines.push("### FAQ", "");
  for (const f of p.faq) lines.push(`**${f.q}**`, link(f.a), "");
  return lines.join("\n");
}

// Japanese has no spaces between words: a run of kana/kanji is split into
// words by the platform's dictionary segmenter instead of counted as one.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const JA_WORDS = new Intl.Segmenter("ja", { granularity: "word" });

export function wordCount(text: string): number {
  let n = 0;
  for (const w of plainText(text).split(/\s+/)) {
    if (!/[\p{L}\p{N}]/u.test(w)) continue;
    n += CJK.test(w) ? [...JA_WORDS.segment(w)].filter((s) => s.isWordLike).length : 1;
  }
  return n;
}

export function guideWordCount(g: Guide): number {
  return guideTexts(g).reduce((n, t) => n + wordCount(t), 0);
}

export function readingMinutes(g: Guide): number {
  return Math.max(1, Math.round(guideWordCount(g) / 200));
}

/** A stable id for a section heading, for the table of contents. */
export function sectionId(heading: string, i: number): string {
  const slug = heading
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return slug || `section-${i + 1}`;
}

/**
 * Other guides worth reading next: same category first, then the rest of the
 * language, in library order.
 */
export function relatedGuides(g: Guide, limit = 4): Guide[] {
  const others = GUIDES.filter((o) => o.locale === g.locale && o.slug !== g.slug);
  const same = others.filter((o) => o.category && o.category === g.category);
  const rest = others.filter((o) => !same.includes(o));
  return [...same, ...rest].slice(0, limit);
}

/** The same guide in other languages (shared topic key), including itself. */
export function translationsOf(g: Guide): Guide[] {
  if (!g.topic) return [g];
  return GUIDES.filter((o) => o.topic === g.topic);
}

/** The sample video a guide embeds, if it names one that exists in its own language. */
export function guideSample(g: Pick<Guide, "locale" | "sample">): SampleVideo | undefined {
  if (!g.sample) return undefined;
  return samplesFor(g.locale)?.find((v) => v.slug === g.sample);
}

/** A guide as Markdown, with absolute links, for llms-full.txt. */
export function guideMarkdown(g: Guide, abs: (path: string) => string): string {
  const link = (t: string) =>
    t.replace(LINK, (_, label: string, target: string) => {
      const to = resolveTarget(target, g.locale);
      return to ? `[${label}](${/^https?:/.test(to) ? to : abs(to)})` : label;
    });
  const lines = [`## ${g.h1}`, "", `URL: ${abs(guidePath(g))}`, `Language: ${g.locale}`];
  if (g.updated) lines.push(`Updated: ${g.updated}`);
  const reviewed = reviewedDate(g);
  if (reviewed) lines.push(`Last reviewed: ${reviewed} by the DentVideo editorial team (Bulsu Labs)`);
  const sample = guideSample(g);
  if (sample) lines.push(`Sample video: "${sample.name}" (${sample.seconds} s, a real DentVideo video for a demo clinic): ${abs(sampleSrc(g.locale, sample.slug, "mp4"))}`);
  lines.push("", link(g.intro), "");
  for (const s of g.sections) {
    lines.push(`### ${s.heading}`, "");
    for (const p of s.paragraphs) lines.push(link(p), "");
    if (s.list?.length) {
      s.list.forEach((item, i) => lines.push(`${s.ordered ? `${i + 1}.` : "-"} ${link(item)}`));
      lines.push("");
    }
    if (s.table) lines.push(...tableMarkdown(s.table, link));
    for (const p of s.after ?? []) lines.push(link(p), "");
  }
  if (g.faq.length) {
    lines.push("### FAQ", "");
    for (const f of g.faq) lines.push(`**${f.q}**`, link(f.a), "");
  }
  if (g.sources?.length) {
    lines.push("### Sources", "");
    for (const s of g.sources) lines.push(`- [${s.label}](${s.url})`);
    lines.push("");
  }
  return lines.join("\n");
}
