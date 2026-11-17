import { describe, it, expect } from "vitest";
import { ACCOUNT_TEXT } from "./dentvideo-account";
import { LOCALES } from "./dentvideo";

function leaves(o: unknown, prefix = ""): [string, unknown][] {
  if (o && typeof o === "object") return Object.entries(o).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
  return [[prefix, o]];
}

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

describe("account dictionary", () => {
  const en = new Map(leaves(ACCOUNT_TEXT.en));

  it.each(LOCALES)("%s has exactly the English keys, no empty strings, the same placeholders", (l) => {
    const mine = leaves(ACCOUNT_TEXT[l]);
    expect(mine.map(([k]) => k).sort()).toEqual([...en.keys()].sort());
    for (const [k, v] of mine) {
      expect(typeof v, k).toBe("string");
      expect((v as string).trim().length, k).toBeGreaterThan(0);
      expect(placeholders(v as string), k).toBe(placeholders(en.get(k) as string));
      if (l !== "en") expect(v, `${l}.${k} is still English`).not.toBe(en.get(k));
    }
  });
});
