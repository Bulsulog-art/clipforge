import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { scanKnownMistakes } from "./known-mistakes";
import { EXAMPLES } from "@/content/dentvideo-examples";

/**
 * The mistakes seen in rendered videos (docs/KNOWN_MISTAKES.md; the rules are
 * mirrored from worker/src/dental/known-mistakes.ts) must not be on anything
 * the site shows: the live preview library and the examples pages. A sample
 * whose flaw is spoken cannot be fixed without a paid re-render; it is listed
 * here with its register id, and nowhere else may carry one.
 */
const LIVE_FLAWS: Record<string, string[]> = {
  // Empty since 15.11.2026: the DE aligner (KM-18), the FR whitening narration (KM-17)
  // and the TR aligner preview (KM-19) were re-voiced and re-rendered.
};

type Scene = { kind: string; text?: string; heading?: string; caption?: string; sub?: string; context?: string; items?: string[]; left?: { label?: string; text?: string }; right?: { label?: string; text?: string } };

function screenLines(scenes: Scene[]): string[] {
  const out: string[] = [];
  for (const s of scenes) {
    for (const v of [s.text, s.sub, s.heading, s.caption, s.context]) if (v) out.push(v);
    for (const i of s.items ?? []) out.push(i);
    for (const side of [s.left, s.right]) if (side) out.push([side.label, side.text].filter(Boolean).join(": "));
  }
  return out;
}

const sentences = (t: string) => t.split(/(?<=[.!?…;])\s+/u).map((s) => s.trim()).filter(Boolean);

describe("known mistakes on the site", () => {
  const PREVIEW = path.resolve(__dirname, "../../../public/dentvideo/preview");

  it("none in the live preview library (every language)", () => {
    let n = 0;
    for (const lang of fs.readdirSync(PREVIEW)) {
      const dir = path.join(PREVIEW, lang);
      if (!fs.statSync(dir).isDirectory()) continue;
      for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
        const plan = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as { language?: string; scenes: Scene[] };
        const lines = screenLines(plan.scenes);
        const hook = plan.scenes.find((s) => s.kind === "hook")?.text;
        expect(scanKnownMistakes({ hook, screen: lines.filter((l) => l !== hook) }, plan.language ?? lang), `${lang}/${f}`).toEqual([]);
        n++;
      }
    }
    expect(n).toBeGreaterThan(20);
  });

  it("none on the examples pages, apart from the listed live flaws", () => {
    for (const e of EXAMPLES) {
      const key = `${e.locale}/${e.slug}`;
      const found = [...new Set(scanKnownMistakes({ screen: e.onScreen.flatMap(sentences) }, e.locale).map((h) => h.id))].sort();
      expect(found, key).toEqual(LIVE_FLAWS[key] ?? []);
    }
  });

  it("the re-rendered ES, FR and DE cards are the fixed ones", () => {
    const text = (slug: string) => EXAMPLES.find((e) => e.slug === slug)!.onScreen.join("\n");
    expect(text("limpieza-dental")).toContain("La limpieza llega al borde de la encía.");
    expect(text("blanchiment-email")).toContain("évitez le café et le thé");
    expect(text("aligner-verfaerbung")).toContain("mit Schiene nur Wasser");
    expect(text("aligner-verfaerbung")).not.toMatch(/\bTray\b/);
    expect(scanKnownMistakes({ screen: ["Llega al borde de la encía.", "Évitez vin rouge"] }, "es").map((h) => h.id)).toEqual(["KM-16"]);
  });
});
