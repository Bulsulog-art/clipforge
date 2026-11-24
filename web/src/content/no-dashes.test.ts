import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * No em dashes in anything a dentist or a visitor reads.
 *
 * The owner's standing copy rule: text must never look machine-made, and the
 * em dash is the most visible tell. Every content module under web/src/content
 * (the app's interface text, the landing, guides, help, legal, solutions and
 * SEO pages, in all eight languages) is checked for:
 *  - an em dash (U+2014) anywhere, and
 *  - an en dash (U+2013) used as punctuation, i.e. with a space on either side
 *    ("Woche 1 – Zähneputzen", "– und was nicht").
 *
 * An en dash with no spaces is a range and stays: "1–7 Feb", "2026–2027",
 * "§§ 20–22", "11 May–11 June". Hyphens are never touched.
 *
 * Two passes, so nothing slips through:
 *  1. Every module is imported and every string value it exports is walked
 *     (the same way en-spelling.test.ts loads them), which names the exact
 *     key path of a finding.
 *  2. Every string and template literal in each module's source is read with
 *     the TypeScript parser, which also covers text built inside functions.
 *     Comments are not strings, so they are never read.
 */

const CONTENT_DIR = __dirname;

/** An em dash anywhere, or an en dash with a space (or the string's edge) on either side. */
const DASH = /—|(?:^|\s)–|–(?:\s|$)/;

/**
 * The documented exceptions. A file-level entry (no `text`) covers the whole
 * module; a text entry covers only strings it matches. Each says why.
 */
type Allowed = { file: string; text?: RegExp; why: string };
const ALLOWED: Allowed[] = [
  {
    file: "dentvideo-lifecycle.ts",
    why: "Owned tonight by the small-followups package, which rewrites the dashes in its own lifecycle copy. Remove this entry once that lands.",
  },
  {
    file: "dentvideo-lifecycle-sequence.ts",
    why: "Owned tonight by the small-followups package, which rewrites the dashes in its own lifecycle copy. Remove this entry once that lands.",
  },
  {
    file: "guides/calendar-de.ts",
    text: /„Gesund beginnt im Mund – Kau dich fit!“/,
    why: "The 2026 motto of the Aktionskreis Tag der Zahngesundheit, quoted exactly as the organizer publishes it. A quoted title keeps its own punctuation.",
  },
];

/** File-level entries belong to another package; they may already be clean, so they are not checked for staleness. */
const OTHER_PACKAGE = (a: Allowed) => !a.text;

function allowed(file: string, text: string): Allowed | undefined {
  return ALLOWED.find((a) => a.file === file && (!a.text || a.text.test(text)));
}

function contentModules(dir = CONTENT_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return contentModules(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts") ? [p] : [];
  });
}

const rel = (f: string) => path.relative(CONTENT_DIR, f).replace(/\\/g, "/");

type Finding = { file: string; where: string; text: string };

/** Every string value reachable from a module's exports that has a dash in it. */
function dashedValues(file: string, exports: Record<string, unknown>, seen = new WeakSet<object>()): Finding[] {
  const found: Finding[] = [];
  const visit = (v: unknown, where: string) => {
    if (typeof v === "string") {
      if (DASH.test(v)) found.push({ file, where, text: v });
      return;
    }
    if (!v || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);
    if (Array.isArray(v)) return v.forEach((x, i) => visit(x, `${where}[${i}]`));
    for (const [k, x] of Object.entries(v)) visit(x, `${where}.${k}`);
  };
  for (const [name, value] of Object.entries(exports)) {
    if (typeof value === "function") continue;
    visit(value, `${file}#${name}`);
  }
  return found;
}

/** Every string, template and JSX text literal in a source file that has a dash in it, with its line. Comments are not literals. */
function dashedLiterals(file: string, src: string): Finding[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Finding[] = [];
  const visit = (n: ts.Node) => {
    let texts: string[] = [];
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)) texts = [n.text];
    else if (ts.isTemplateExpression(n)) texts = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)];
    for (const t of texts) {
      if (DASH.test(t)) found.push({ file, where: `${file}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`, text: t });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

const excerpt = (t: string) => {
  const at = t.search(DASH);
  return t.slice(Math.max(0, at - 60), at + 40).replace(/\n/g, " ");
};
const show = (f: Finding[]) => f.map((x) => `${x.where}: …${excerpt(x.text)}…`).join("\n");

describe("no em dashes in what dentists and visitors read", () => {
  const files = contentModules();

  it("finds the content modules to scan", () => {
    const names = files.map(rel);
    expect(names.length).toBeGreaterThan(50);
    for (const f of ["dentvideo-app.ts", "dentvideo-billing.ts", "dentvideo-reasons.ts", "guides/calendar-tr.ts", "guides/treatments-de.ts", "legal/pl.ts", "solutions/en.ts", "landing/ja.ts", "help/ar.ts"]) {
      expect(names).toContain(f);
    }
  });

  it("no exported string value in any language has an em dash or a spaced en dash", async () => {
    const findings: Finding[] = [];
    const seen = new WeakSet<object>();
    for (const f of files) {
      const mod = (await import(f)) as Record<string, unknown>;
      findings.push(...dashedValues(rel(f), mod, seen));
    }
    // A guide written in guides/calendar-de.ts is also exported by dentvideo.ts (GUIDES), and the walk
    // names whichever module reached it first. An allow-list entry belongs to the file that holds the
    // literal, so a value is judged by the file(s) its text is written in.
    const home = new Map<string, string[]>();
    for (const f of files) for (const x of dashedLiterals(rel(f), readFileSync(f, "utf8"))) home.set(x.text, [...(home.get(x.text) ?? []), x.file]);
    const left = findings.filter((x) => !(home.get(x.text) ?? [x.file]).some((file) => allowed(file, x.text)));
    expect(show(left), "rewrite the sentence with a comma, period, colon or parentheses, natively in its language").toBe("");
  });

  it("no string literal in a content module's source has one either (text built inside functions included)", () => {
    const findings = files.flatMap((f) => dashedLiterals(rel(f), readFileSync(f, "utf8")));
    const left = findings.filter((x) => !allowed(x.file, x.text));
    expect(show(left), "rewrite the sentence with a comma, period, colon or parentheses, natively in its language").toBe("");
  });

  it("every allow-list entry gives a reason, and every text entry still matches something", () => {
    const findings = files.flatMap((f) => dashedLiterals(rel(f), readFileSync(f, "utf8")));
    for (const a of ALLOWED) {
      expect(a.why.length, a.file).toBeGreaterThan(30);
      expect(files.map(rel), a.file).toContain(a.file);
      if (OTHER_PACKAGE(a)) continue;
      expect(
        findings.some((x) => x.file === a.file && a.text!.test(x.text)),
        `${a.file} ${a.text}: nothing matches any more, remove the entry`,
      ).toBe(true);
    }
  });

  describe("the scan itself (a check that cannot fail proves nothing)", () => {
    it("catches an em dash and a spaced en dash at any depth, and names where", () => {
      const mod = {
        APP: { en: { delay: "Taking longer than usual — we're retrying." }, de: { list: ["ok", "Woche 1 – Zähneputzen"] } },
        EDGE: ["– am Anfang", "am Ende –", "sans espace—collé"],
      };
      expect(dashedValues("x.ts", mod).map((f) => f.where)).toEqual(["x.ts#APP.en.delay", "x.ts#APP.de.list[1]", "x.ts#EDGE[0]", "x.ts#EDGE[1]", "x.ts#EDGE[2]"]);
    });

    it("leaves ranges, hyphens, functions and other dash-like marks alone", () => {
      const mod = {
        T: ["1–7 Feb", "2026–2027", "§§ 20–22 HWG", "11 May–11 June in 2026", "follow-up", "Mon - Fri", "a ‐ b"],
        fmt: (x: string) => `${x} — never read here`,
      };
      expect(dashedValues("x.ts", mod)).toEqual([]);
    });

    it("reads string, template and JSX literals but not comments", () => {
      const src = [
        "// a comment — never read",
        "/** neither — is this */",
        'const a = "fine, no dash";',
        "const b = `built ${a} — inside a function`;",
        'const c = "Woche 1 – Zähneputzen";',
        "const d = <p>Text — in JSX</p>;",
        'const e = "1–7 Feb";',
      ].join("\n");
      expect(dashedLiterals("x.tsx", src).map((f) => f.where)).toEqual(["x.tsx:4", "x.tsx:5", "x.tsx:6"]);
    });

    it("a file-level allow-list entry covers only its own file", () => {
      expect(allowed("dentvideo-lifecycle.ts", "Hi — there")).toBeDefined();
      expect(allowed("dentvideo-app.ts", "Hi — there")).toBeUndefined();
    });
  });
});
