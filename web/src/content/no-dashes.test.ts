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
 * SEO pages, in all eight languages), plus the site layout that sets every
 * page's title and description, is checked for:
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
 * The site layout sets the title, the description and the share card text of
 * every DentVideo page (browser tab, search result, sign-up, app, 404). It is
 * not a content module, so it is not imported, but its literals are read too.
 */
const SRC_DIR = path.join(CONTENT_DIR, "..");
const EXTRA_FILES = [path.join(SRC_DIR, "app/dentvideo/layout.tsx")];

/**
 * The documented exceptions. Each entry covers only the strings its `text`
 * matches in its own file, so a new dash anywhere else, even in the same file,
 * is still caught. Each says why.
 *
 * `owner` marks a string that another package owns and rewrites itself. Its
 * branch may already be clean, so such an entry is allowed to match nothing
 * (it simply goes inert once that lands) instead of failing as stale.
 */
type Allowed = { file: string; text: RegExp; why: string; owner?: string };
const SMALL_FOLLOWUPS =
  "Lifecycle email copy, owned by the small-followups package, whose branch already rewrites these sentences without dashes. Once it lands this entry matches nothing.";
const SITE_A11Y =
  "The site title and description in the DentVideo layout, owned by the site-a11y-polish package. Its branch still has the dash; fix it there or in a follow-up, then this entry matches nothing.";
const ALLOWED: Allowed[] = [
  { file: "dentvideo-lifecycle.ts", text: /na \{email\} — wypiszemy Państwa ręcznie/, why: SMALL_FOLLOWUPS, owner: "small-followups" },
  { file: "dentvideo-lifecycle-sequence.ts", text: /^Sehen Sie sie sich an – und wenn sie Ihnen gefallen/, why: SMALL_FOLLOWUPS, owner: "small-followups" },
  { file: "dentvideo-lifecycle-sequence.ts", text: /^Mit Ihrem Logo und Ihren Farben – zu den Leistungen/, why: SMALL_FOLLOWUPS, owner: "small-followups" },
  { file: "dentvideo-lifecycle-sequence.ts", text: /neue Videos wie diese – zu Ihren Leistungen/, why: SMALL_FOLLOWUPS, owner: "small-followups" },
  { file: "dentvideo-lifecycle-sequence.ts", text: /^Richtigkeit, Zeit und Kosten – kurz beantwortet\.$/, why: SMALL_FOLLOWUPS, owner: "small-followups" },
  { file: "dentvideo-lifecycle-sequence.ts", text: /^Sind die Inhalte korrekt – und überhaupt erlaubt\?$/, why: SMALL_FOLLOWUPS, owner: "small-followups" },
  { file: "dentvideo-lifecycle-sequence.ts", text: /danke – dann ignorieren Sie diese E-Mail bitte/, why: SMALL_FOLLOWUPS, owner: "small-followups" },
  { file: "dentvideo-lifecycle-sequence.ts", text: /bereit zum Posten – wir posten nichts für Sie/, why: SMALL_FOLLOWUPS, owner: "small-followups" },
  { file: "app/dentvideo/layout.tsx", text: /^DentVideo — patient-education videos for dental clinics$/, why: SITE_A11Y, owner: "site-a11y-polish" },
  { file: "app/dentvideo/layout.tsx", text: /software-checked against advertising rules — and writes and narrates/, why: SITE_A11Y, owner: "site-a11y-polish" },
  {
    file: "guides/calendar-de.ts",
    text: /„Gesund beginnt im Mund – Kau dich fit!“/,
    why: "The 2026 motto of the Aktionskreis Tag der Zahngesundheit, quoted exactly as the organizer publishes it. A quoted title keeps its own punctuation.",
  },
];

function allowed(file: string, text: string): Allowed | undefined {
  return ALLOWED.find((a) => a.file === file && a.text.test(text));
}

function contentModules(dir = CONTENT_DIR): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return contentModules(p);
    return /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) && !e.name.endsWith(".d.ts") ? [p] : [];
  });
}

/** Content modules are named from web/src/content ("legal/pl.ts"), the extra files from web/src ("app/dentvideo/layout.tsx"). */
const rel = (f: string) => {
  const r = path.relative(CONTENT_DIR, f);
  return (r.startsWith("..") ? path.relative(SRC_DIR, f) : r).replace(/\\/g, "/");
};

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

type Literal = { file: string; where: string; pieces: string[] };

/** Every string, template and JSX text literal in a source file, with its line. A template's text pieces are kept apart. Comments are not literals. */
function literals(file: string, src: string): Literal[] {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const found: Literal[] = [];
  const visit = (n: ts.Node) => {
    let pieces: string[] = [];
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isJsxText(n)) pieces = [n.text];
    else if (ts.isTemplateExpression(n)) pieces = [n.head.text, ...n.templateSpans.map((s) => s.literal.text)];
    if (pieces.length) found.push({ file, where: `${file}:${sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1}`, pieces });
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return found;
}

/** Every string, template and JSX text literal in a source file that has a dash in it, with its line. */
function dashedLiterals(file: string, src: string): Finding[] {
  return literals(file, src).flatMap((l) => l.pieces.filter((t) => DASH.test(t)).map((text) => ({ file, where: l.where, text })));
}

const excerpt = (t: string) => {
  const at = t.search(DASH);
  return t.slice(Math.max(0, at - 60), at + 40).replace(/\n/g, " ");
};
const show = (f: Finding[]) => f.map((x) => `${x.where}: …${excerpt(x.text)}…`).join("\n");

describe("no em dashes in what dentists and visitors read", () => {
  const files = contentModules();
  const scanned = [...files, ...EXTRA_FILES];

  it("finds the content modules to scan, and the site layout", () => {
    const names = scanned.map(rel);
    expect(names.length).toBeGreaterThan(50);
    for (const f of ["dentvideo-app.ts", "dentvideo-billing.ts", "dentvideo-reasons.ts", "guides/calendar-tr.ts", "guides/treatments-de.ts", "legal/pl.ts", "solutions/en.ts", "landing/ja.ts", "help/ar.ts", "app/dentvideo/layout.tsx"]) {
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

  it("no string literal in a content module's source, or in the site layout, has one either (text built inside functions included)", () => {
    const findings = scanned.flatMap((f) => dashedLiterals(rel(f), readFileSync(f, "utf8")));
    const left = findings.filter((x) => !allowed(x.file, x.text));
    expect(show(left), "rewrite the sentence with a comma, period, colon or parentheses, natively in its language").toBe("");
  });

  it("every allow-list entry gives a reason, and every entry of this package still matches something", () => {
    const findings = scanned.flatMap((f) => dashedLiterals(rel(f), readFileSync(f, "utf8")));
    for (const a of ALLOWED) {
      expect(a.why.length, a.file).toBeGreaterThan(30);
      expect(scanned.map(rel), a.file).toContain(a.file);
      if (a.owner) continue;
      expect(
        findings.some((x) => x.file === a.file && a.text.test(x.text)),
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

    it("an allow-list entry covers only its own sentence: a new dash in the same file is still caught", () => {
      const kept = "Prosimy napisać na {email} — wypiszemy Państwa ręcznie.";
      expect(allowed("dentvideo-lifecycle.ts", kept)).toBeDefined();
      expect(allowed("dentvideo-lifecycle.ts", "Dziękujemy — do zobaczenia.")).toBeUndefined();
      expect(allowed("dentvideo-lifecycle-sequence.ts", "Neue Woche – neue Videos.")).toBeUndefined();
      expect(allowed("app/dentvideo/layout.tsx", "DentVideo — sign in")).toBeUndefined();
      expect(allowed("dentvideo-app.ts", kept)).toBeUndefined();
    });
  });
});

/**
 * A dash is not swapped for a second colon.
 *
 * The quickest way to remove a dash is to put a colon where it was, and in a
 * sentence that already has one that leaves a chain ("Advertising rules:
 * claims are caught in ten languages: guarantees, …"), which reads just as
 * mechanical as the dash did. So no sentence in any content module has two
 * colons. Not counted, because they are not part of the sentence's own
 * punctuation: anything in quotation marks or parentheses (a quoted title, an
 * example), a colon that ends the sentence (it introduces the list or block
 * that follows), a " · " or "・" separated label row ("OK: 3 · Risky: 1",
 * "問題なし：3・要注意：1"), and the guide calendars' week label ("Week 3: ",
 * "Semaine 3 : ", "3. hafta: ").
 * Colons in times, URLs and link targets have no space after them and are
 * never counted.
 */
const ASIDE = /“[^”]*”|„[^“”]*[“”]|«[^»]*»|"[^"]*"|「[^」]*」|\([^()]*\)|（[^（）]*）/g;
const WEEK_LABEL = /^(?:Week|Woche|Semana|Semaine)\s+\d+\s?:\s|^\d+\.\s+hafta:\s/;
const SENTENCE_COLON = /：|:(?=\s|$)/g;

function colonChains(text: string): string[] {
  let t = text;
  for (let before = ""; before !== t; ) {
    before = t;
    // A quotation that ends a sentence ("… usually not.” Then …") still ends it.
    t = t.replace(ASIDE, (m) => (/[.?!。？！]\W?$/.test(m) ? " ¶. " : " ¶ "));
  }
  return t
    .replace(WEEK_LABEL, "")
    .split(/(?<=[.?!])\s+|(?<=[。？！])|\n+|\s·\s|・/)
    .map((s) => s.trim().replace(/\s?[:：]$/, ""))
    .filter((s) => (s.match(SENTENCE_COLON) ?? []).length >= 2);
}

const COLON_ALLOWED: { file: string; text: RegExp; why: string }[] = [
  {
    file: "guides/text.ts",
    text: /^Sample video: /,
    why: "The machine-readable text version of a guide (llms-full.txt) prints the sample as \"Label: name (details): link\", a field line, not a sentence.",
  },
  {
    file: "guides/buyers-en.ts",
    text: /^ASA and CAP AdviceOnline: Dental: Teeth whitening\b/,
    why: "A source label, \"Publisher: Title\", where the title is the ASA's own (\"Dental: Teeth whitening\"). A quoted title keeps its own punctuation.",
  },
];

describe("no sentence chains two colons", () => {
  const files = contentModules();
  const chains = () =>
    files.flatMap((f) =>
      literals(rel(f), readFileSync(f, "utf8")).flatMap((l) => colonChains(l.pieces.join("{…}")).map((sentence) => ({ file: l.file, where: l.where, sentence }))),
    );

  it("in any content module, in any language", () => {
    const left = chains().filter((c) => !COLON_ALLOWED.some((a) => a.file === c.file && a.text.test(c.sentence)));
    expect(
      left.map((c) => `${c.where}: ${c.sentence}`).join("\n"),
      "keep one colon: turn the second into a comma with 'such as' (etwa, como, gibi), a period, or parentheses",
    ).toBe("");
  });

  it("every exception gives a reason and still matches something", () => {
    const found = chains();
    for (const a of COLON_ALLOWED) {
      expect(a.why.length, a.file).toBeGreaterThan(30);
      expect(found.some((c) => c.file === a.file && a.text.test(c.sentence)), `${a.file} ${a.text}: nothing matches any more, remove the entry`).toBe(true);
    }
  });

  it("the check catches a chain in any language, and leaves the other colons alone", () => {
    for (const chain of [
      "Advertising rules: commonly restricted claims are caught in ten languages: guarantees, prices.",
      "Werberecht: häufig unzulässige Aussagen werden abgefangen: Garantien, Preise.",
      "Hashtags : par thème, cinq au maximum : depuis décembre 2025.",
      "Tanıtım kuralları: sık kısıtlanan ifadeler yakalanır: garanti, fiyat.",
      "Week 3: Bleeding gums: a reason to book: not to stop brushing.",
      "締切：月曜：午前。",
    ]) {
      expect(colonChains(chain), chain).toHaveLength(1);
    }
    for (const fine of [
      "Advertising rules: in ten languages, the checks catch commonly restricted claims such as guarantees and prices.",
      "Week 1: Brushing basics: two minutes, twice a day.",
      "Semaine 1 : Le brossage : deux minutes, deux fois par jour.",
      "1. hafta: Diş fırçalama: günde iki kez.",
      "You pay in the currency of your billing country: euros in the euro area, US dollars everywhere else:",
      "OK: {ok} · Risky: {risky} · Not allowed: {banned}",
      "Semaine 2 : « Gencives qui saignent : quand s'inquiéter ? » · Le premier rendez-vous",
      "Example: “Whitening thins enamel? Short answer: usually not.” Then explain why: calmly.",
      "Opening hours: 08:30 to 17:00, see [the guide](guide:posting-rhythm) or https://dentvideo.com.",
      "Group: custom terms (contact: {email}).",
      "問題なし：{ok}・要注意：{risky}・不可：{banned}",
      "食事中：外して食べます。装着中：水は飲めます。",
    ]) {
      expect(colonChains(fine), fine).toEqual([]);
    }
  });
});

/**
 * Rewrites from the sweep that a native reader found clumsy, fixed after
 * review. Each names the old wording so it does not come back in a merge.
 */
const CLUMSY: { file: string; text: RegExp; why: string }[] = [
  {
    file: "legal/tr.ts",
    text: /BLS AI Automation DOO \(Podgorica, Karadağ\) sicil/,
    why: "The company needs the genitive before 'sicil … bilgileri': BLS AI Automation DOO'nun.",
  },
  {
    file: "guides/treatments-tr.ts",
    text: /bakım ve tanıtım yönetmeliğine takılabilecek kesin sonuç vaatleri\.$/,
    why: "Reads as if the videos contained the risky promises. The sibling descriptions say what is left out ('… olmadan').",
  },
  {
    file: "guides/treatments-de.ts",
    text: /^„(?:Meist u|U)nter örtlicher Betäubung;/,
    why: "A semicolon after a phrase with no verb. On a screen a period reads naturally: „Unter örtlicher Betäubung. Wir erklären …“.",
  },
  {
    file: "dentvideo-app.ts",
    text: /^All approved, time to post$/,
    why: "Two clauses joined by a bare comma in a heading.",
  },
  {
    file: "dentvideo-app.ts",
    text: /^Kendinizi kaydedin: beş dakika yeterli$/,
    why: "TDK: a full sentence after a colon starts with a capital letter (the German sibling writes „Fünf Minuten genügen“).",
  },
];

describe("rewrites a native reader found clumsy stay fixed", () => {
  it.each(CLUMSY)("$file: $why", ({ file, text }) => {
    const src = readFileSync(path.join(CONTENT_DIR, file), "utf8");
    const hits = literals(file, src).filter((l) => l.pieces.some((p) => text.test(p)));
    expect(hits.map((h) => `${h.where}: ${h.pieces.join("{…}")}`)).toEqual([]);
  });
});
