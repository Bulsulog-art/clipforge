import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { chromeText } from "./chrome-text";

/**
 * What DentVideo's public pages send to the browser as JavaScript.
 *
 * The walk follows static imports from each page's server files; a module
 * marked "use client" starts the browser bundle, and everything it imports
 * statically ships with it. Dynamic import() (next/dynamic, a lazy
 * `await import()`) is a separate chunk loaded later, so the walk stops there.
 * Type-only imports are erased and not followed.
 *
 * This guards the work that took the landing from ~390 KB of compressed
 * JavaScript to a fraction of it: the content modules (every language's
 * landing copy, the whole guide library, the app's interface text) and
 * libraries the page never runs (Supabase, sonner, Remotion) must not creep
 * back in through a header, a footer or a tracking link.
 */

const SRC = path.resolve(__dirname, "../..");
const APP = path.join(SRC, "app");

type Graph = { client: Set<string>; packages: Set<string> };

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.join(path.dirname(from), spec);
  else return null;
  for (const ext of [".ts", ".tsx", "/index.ts", "/index.tsx", ""]) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
  }
  throw new Error(`cannot resolve ${spec} from ${from}`);
}

const IMPORT = /^\s*(?:import|export)\s+([^;]*?)\s+from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;

/** Static value imports of a file: [specifier, resolved file or null for a package]. */
function imports(file: string): [string, string | null][] {
  const src = fs.readFileSync(file, "utf8");
  const out: [string, string | null][] = [];
  for (const m of src.matchAll(IMPORT)) {
    const clause = m[1];
    const spec = m[2] ?? m[3];
    if (clause) {
      if (/^type\s/.test(clause)) continue;
      // `import { type A, type B } from` is erased too.
      const named = clause.match(/^\{([^}]*)\}$/s);
      if (named && named[1].split(",").map((s) => s.trim()).filter(Boolean).every((s) => s.startsWith("type "))) continue;
    }
    if (/\.css$/.test(spec)) continue;
    out.push([spec, resolveImport(file, spec)]);
  }
  return out;
}

const isClient = (file: string) => /^\s*["']use client["']/.test(fs.readFileSync(file, "utf8"));

/** The browser bundle reachable from these server entry files. */
function clientGraph(entries: string[]): Graph {
  const g: Graph = { client: new Set(), packages: new Set() };
  const server = new Set<string>();
  const walkClient = (f: string) => {
    if (g.client.has(f)) return;
    g.client.add(f);
    for (const [spec, to] of imports(f)) {
      if (to) walkClient(to);
      else g.packages.add(spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0]);
    }
  };
  const walkServer = (f: string) => {
    if (server.has(f)) return;
    if (isClient(f)) return walkClient(f);
    server.add(f);
    for (const [, to] of imports(f)) if (to) walkServer(to);
  };
  for (const e of entries) walkServer(e);
  return g;
}

const rel = (f: string) => path.relative(SRC, f);
const kb = (files: Iterable<string>) => [...files].reduce((n, f) => n + fs.statSync(f).size, 0) / 1024;

/** The root layout and DentVideo's layout wrap every page below. */
const LAYOUTS = [path.join(APP, "layout.tsx"), path.join(APP, "dentvideo/layout.tsx")];
const PAGES: Record<string, string[]> = {
  landing: ["dentvideo/page.tsx", "dentvideo/[locale]/page.tsx", "dentvideo/ar/layout.tsx", "dentvideo/ar/page.tsx", "dentvideo/ja/layout.tsx", "dentvideo/ja/page.tsx"],
  guide: ["dentvideo/guides/[slug]/page.tsx", "dentvideo/guides/page.tsx"],
  commercial: ["dentvideo/videos/[slug]/page.tsx"],
  about: ["dentvideo/about/page.tsx"],
};

/** Content modules that hold every language's copy: server-only. */
const SERVER_ONLY_CONTENT = [
  "content/dentvideo.ts",
  "content/dentvideo-app.ts",
  "content/dentvideo-auth.ts",
  "content/guides/index.ts",
  "content/solutions/index.ts",
  "content/legal/index.ts",
];
/** Libraries the public pages never run on load. */
const NOT_ON_LOAD = ["@supabase/supabase-js", "@supabase/ssr", "sonner", "remotion", "@remotion/player", "framer-motion", "@tanstack/react-query"];

describe("DentVideo public pages: browser bundle", () => {
  for (const [name, pages] of Object.entries(PAGES)) {
    const entries = [...LAYOUTS, ...pages.map((p) => path.join(APP, p))].filter((f) => fs.existsSync(f));
    const g = clientGraph(entries);

    it(`${name}: ships no content module and no library it does not run`, () => {
      const files = [...g.client].map(rel);
      for (const c of SERVER_ONLY_CONTENT) expect(files, c).not.toContain(c);
      // No guide text either (content/guides/<lang>.ts and friends); its small UI/path module is fine.
      expect(files.filter((f) => f.startsWith("content/guides/") && f !== "content/guides/ui.ts" && f !== "content/guides/operator.ts")).toEqual([]);
      for (const p of NOT_ON_LOAD) expect([...g.packages], p).not.toContain(p);
    });

    it(`${name}: client source stays within budget`, () => {
      // Our own modules in the page's browser bundle, before minification (React, Next and
      // lucide icons not counted). ~800 KB before the content modules were kept on the server.
      expect(kb(g.client)).toBeLessThan(150);
    });
  }

  it("the sign-up page ships the account form, not the wizard, the guides or Supabase", () => {
    const g = clientGraph([...LAYOUTS, path.join(APP, "dentvideo/start/layout.tsx"), path.join(APP, "dentvideo/start/page.tsx")]);
    const files = [...g.client].map(rel);
    // The wizard (signed-in clinics only) is its own chunk: components/dentvid/onboarding-lazy.
    for (const f of ["components/dentvid/onboarding.tsx", "components/dentvid/plan-panel.tsx", "components/dentvid/clinic-form.tsx", "content/dentvideo.ts", "content/guides/index.ts"]) {
      expect(files, f).not.toContain(f);
    }
    // Sign-in loads the Supabase client when the form is sent.
    for (const p of NOT_ON_LOAD) expect([...g.packages], p).not.toContain(p);
    // The account form still carries the app's and the sign-up's interface text (every language).
    expect(kb(g.client)).toBeLessThan(400);
  });

  it("the header and footer get their words as one small table, not the content modules", () => {
    const json = JSON.stringify(chromeText());
    // Every language, passed once per page (React de-duplicates it between header and footer).
    expect(json.length / 1024).toBeLessThan(12);
  });
});
