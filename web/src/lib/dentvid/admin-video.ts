/**
 * What the admin panel shows inside a video: its compliance / accuracy
 * reviews and its words. Pure (unit-tested), from the stored item row.
 */

export type CheckView = { label: string; verdict: string; hard: string[]; issues: { quote: string; problem: string; fix?: string }[] };

/**
 * The reviews stored on an item (checks jsonb): generated videos keep
 * { script: {compliance, accuracy}, copy: {…} }, recordings
 * { compliance, accuracy }. Unknown shapes give nothing.
 */
export function checkViews(checks: unknown): CheckView[] {
  const out: CheckView[] = [];
  const one = (label: string, v: unknown) => {
    if (!v || typeof v !== "object") return;
    const r = v as { verdict?: unknown; hard?: unknown; issues?: unknown };
    if (typeof r.verdict !== "string") return;
    const hard = Array.isArray(r.hard)
      ? r.hard.map((h) => (h && typeof h === "object" ? `${(h as { rule?: string }).rule ?? "rule"}: “${(h as { match?: string }).match ?? ""}”` : String(h)))
      : [];
    const issues = Array.isArray(r.issues)
      ? r.issues
          .filter((i): i is { quote?: string; problem?: string; fix?: string } => !!i && typeof i === "object")
          .map((i) => ({ quote: String(i.quote ?? ""), problem: String(i.problem ?? ""), ...(i.fix ? { fix: String(i.fix) } : {}) }))
      : [];
    out.push({ label, verdict: r.verdict, hard, issues });
  };
  if (!checks || typeof checks !== "object") return out;
  const c = checks as Record<string, unknown>;
  if ("script" in c || "copy" in c) {
    for (const part of ["script", "copy"]) {
      const p = c[part] as Record<string, unknown> | undefined;
      one(`${part} · compliance`, p?.compliance);
      one(`${part} · accuracy`, p?.accuracy);
    }
  } else {
    one("compliance", c.compliance);
    one("accuracy", c.accuracy);
  }
  return out;
}

/** The words of a video: a recording's transcript, a generated video's narration, else its on-screen text. */
export function scriptText(item: { spoken?: string | null; plan?: unknown }): string {
  if (item.spoken) return item.spoken;
  const plan = (item.plan ?? {}) as { voiceover?: unknown; scenes?: unknown };
  const vo = plan.voiceover;
  if (typeof vo === "string" && vo.trim()) return vo;
  if (vo && typeof vo === "object" && typeof (vo as { text?: unknown }).text === "string") return (vo as { text: string }).text;
  if (Array.isArray(plan.scenes)) {
    return plan.scenes
      .flatMap((s) => {
        const x = (s ?? {}) as { text?: unknown; sub?: unknown; heading?: unknown; items?: unknown };
        return [x.heading, x.text, x.sub, ...(Array.isArray(x.items) ? x.items : [])].filter((t): t is string => typeof t === "string" && !!t);
      })
      .join("\n");
  }
  return "";
}

/** Findings as text (reviewer reasons and QA notes are stored as strings). */
export function findingsList(f: unknown): string[] {
  return Array.isArray(f) ? f.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).filter(Boolean) : [];
}
