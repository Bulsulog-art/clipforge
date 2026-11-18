#!/usr/bin/env node
// Every user-visible text of the iOS demo clinic (App/Sources/Demo/DemoContent.swift), per language,
// so it can be run through the product's own advertising rules. The App Store screenshots show
// these texts as the clinic's posts and filming cards: a line our checker would flag (a Turkish
// close that steers viewers to book, a superlative, a guarantee) must not appear there.
//
// The check itself runs in the web tests, with the public checker's code:
//   web/src/lib/dentvid/ios-demo-strings.test.ts → checkText() of ad-checker.ts for the language's
//   own markets (checker-markets.ts PAGE_MARKETS: en US+GB, tr TR, de DE+AT+CH, es ES+MX, fr FR,
//   ja JP, ar AE+SA, pl PL).
//
// Usage: node ios/DentVideo/scripts/demo-strings.mjs   prints the extracted texts as JSON.
// Pure module otherwise: extractDemoStrings(swiftSource) → [{ lang, field, text }].
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const DEMO_CONTENT = join(dirname(fileURLToPath(import.meta.url)), "..", "App", "Sources", "Demo", "DemoContent.swift");

/**
 * The fields read, as they appear in DemoContent / ShootCard. "avoid" is left out on purpose: those
 * lines name what not to say ("Promising a shade", "Before-and-after claims"), so the checker
 * flagging them is correct and expected; they are instructions, never published.
 */
export const CONTENT_FIELDS = ["clinic", "city", "services", "closing", "titles", "captions", "tags"];
export const CARD_FIELDS = ["opening", "points", "closing", "setup"];

/** A Swift string literal's value (the escapes DemoContent uses: \u{…}, \", \\, \n). */
function unescapeSwift(s) {
  return s.replace(/\\u\{([0-9a-fA-F]+)\}|\\(["\\n])/g, (_, hex, ch) =>
    hex ? String.fromCodePoint(parseInt(hex, 16)) : ch === "n" ? "\n" : ch,
  );
}

const STRING = /"((?:[^"\\]|\\.)*)"/y;

/** The value after `name:` at or after `from`: a string or an array of strings. */
function readField(src, name, from) {
  const re = new RegExp(`\\b${name}:\\s*`, "g");
  re.lastIndex = from;
  const m = re.exec(src);
  if (!m) return null;
  let i = m.index + m[0].length;
  const one = () => {
    STRING.lastIndex = i;
    const s = STRING.exec(src);
    if (!s) return null;
    i = STRING.lastIndex;
    return unescapeSwift(s[1]);
  };
  if (src[i] === "[") {
    i++;
    const out = [];
    for (;;) {
      while (/[\s,]/.test(src[i])) i++;
      if (src[i] === "]") break;
      const v = one();
      if (v === null) throw new Error(`DemoContent: cannot read ${name} at ${i}`);
      out.push(v);
    }
    return out;
  }
  const v = one();
  return v === null ? null : [v];
}

/** Every user-visible demo text: [{ lang, field, text }]. Throws if a language block cannot be read. */
export function extractDemoStrings(src) {
  const out = [];
  const blocks = [...src.matchAll(/static let (\w+) = DemoContent\(/g)];
  for (let b = 0; b < blocks.length; b++) {
    const lang = blocks[b][1];
    const start = blocks[b].index;
    const end = b + 1 < blocks.length ? blocks[b + 1].index : src.length;
    const block = src.slice(start, end);
    const cardAt = block.indexOf("card: ShootCard(");
    if (cardAt < 0) throw new Error(`DemoContent.${lang}: no filming card`);
    const head = block.slice(0, cardAt);
    for (const f of CONTENT_FIELDS) {
      const v = readField(head, f, 0);
      if (!v) throw new Error(`DemoContent.${lang}: no ${f}`);
      v.forEach((text, i) => out.push({ lang, field: v.length > 1 || f.endsWith("s") ? `${f}[${i}]` : f, text }));
    }
    for (const f of CARD_FIELDS) {
      const v = readField(block, f, cardAt);
      if (!v) throw new Error(`DemoContent.${lang}: no card ${f}`);
      v.forEach((text, i) => out.push({ lang, field: `card.${f}${v.length > 1 || f.endsWith("s") ? `[${i}]` : ""}`, text }));
    }
  }
  return out;
}

export function readDemoStrings(path = DEMO_CONTENT) {
  return extractDemoStrings(readFileSync(path, "utf8"));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(JSON.stringify(readDemoStrings(), null, 1));
}
