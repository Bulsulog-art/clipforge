import { describe, it, expect } from "vitest";
import { PANEL, reportMarkdown, summarise, type EvalRow } from "./eval.js";

const row = (o: Partial<EvalRow>): EvalRow => ({ clinic: "C", language: "tr", topic: "T", service: "S", status: "ready", rewrites: 0, notes: [], ...o });

describe("eval", () => {
  it("panel covers every supported language with valid profiles", () => {
    expect(new Set(PANEL.map((p) => p.language))).toEqual(new Set(["tr", "de", "es", "en", "fr", "it", "pt"]));
  });
  it("summarises ready, first-pass, scores and spread per language", () => {
    const rows = [
      row({ hookScore: 4, voiceScore: 4, service: "A" }),
      row({ hookScore: 2, voiceScore: 3, rewrites: 1, service: "B" }),
      row({ status: "rejected", stage: "script" }),
      row({ language: "de", hookScore: 5, voiceScore: 5 }),
    ];
    const s = summarise(rows);
    expect(s.readyRate).toBe(0.75);
    expect(s.firstPass).toBe(0.5);
    const tr = s.byLang.find((l) => l.language === "tr")!;
    expect(tr).toMatchObject({ readyRate: 0.67, firstPass: 0.33, hook: 3, voice: 3.5, services: 2, videos: 3 });
    expect(reportMarkdown(rows, s, "now")).toContain("| tr | 67% | 33% | 3 | 3.5 | 2 | 3 |");
  });
});
