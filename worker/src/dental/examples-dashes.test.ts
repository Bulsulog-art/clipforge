import { describe, expect, it } from "vitest";
import { EXAMPLES, HOOK_BANK } from "./examples.js";

/**
 * The reference scripts and hooks are what the writers imitate for "how it
 * sounds and how it is built", so their punctuation is copied too. An em dash
 * or a spaced en dash here ("Nachts bildet sich weniger Speichel – Bakterien
 * …") teaches the writer to put one on screen and in the caption a dentist
 * posts. The owner's copy rule: no em dashes in anything a dentist reads.
 * An unspaced en dash in a range ("2–3 Minuten") is fine.
 */
const DASH = /—|(?:^|\s)–|–(?:\s|$)/;

function strings(v: unknown, where: string, out: [string, string][] = []): [string, string][] {
  if (typeof v === "string") out.push([where, v]);
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${where}[${i}]`, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) strings(x, `${where}.${k}`, out);
  return out;
}

describe("reference scripts and hooks: no em dashes", () => {
  it("every example (takeaway, hook, scenes, narration) and every hook in the bank is dash-free", () => {
    const all = [...strings(EXAMPLES, "EXAMPLES"), ...strings(HOOK_BANK, "HOOK_BANK")];
    expect(all.length).toBeGreaterThan(50);
    expect(all.filter(([, s]) => DASH.test(s)).map(([w, s]) => `${w}: ${s}`)).toEqual([]);
  });

  it("the check catches a spaced en dash and an em dash, and leaves ranges alone", () => {
    expect(DASH.test("Nachts bildet sich weniger Speichel – Bakterien haben leichtes Spiel.")).toBe(true);
    expect(DASH.test("Brush twice a day — two minutes.")).toBe(true);
    expect(DASH.test("2–3 Minuten, 1–7 Feb")).toBe(false);
  });
});
