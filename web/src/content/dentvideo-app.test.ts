import { describe, it, expect } from "vitest";
import { APP_TEXT, fmt } from "./dentvideo-app";
import { LOCALES } from "./dentvideo";

function leaves(o: unknown, prefix = ""): [string, unknown][] {
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  return [[prefix, o]];
}

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe("app dictionary", () => {
  const en = new Map(leaves(APP_TEXT.en));

  it.each(LOCALES)("%s has exactly the English keys, no empty strings, the same placeholders", (l) => {
    const mine = leaves(APP_TEXT[l]);
    expect(mine.map(([k]) => k).sort()).toEqual([...en.keys()].sort());
    for (const [k, v] of mine) {
      expect(typeof v, k).toBe("string");
      expect((v as string).trim().length, k).toBeGreaterThan(0);
      expect(placeholders(v as string), k).toBe(placeholders(en.get(k) as string));
    }
  });

  it("formats placeholders", () => {
    expect(fmt("week of {date} ({n})", { date: "2026-11-02", n: 3 })).toBe("week of 2026-11-02 (3)");
    expect(fmt("{missing}", {})).toBe("{missing}");
  });
});
