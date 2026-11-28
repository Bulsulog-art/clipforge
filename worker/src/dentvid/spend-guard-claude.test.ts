import { describe, expect, it } from "vitest";
import { COST_DEFAULTS_CLAUDE, COST_DEFAULTS_OPENAI, costDefaults, guardConfig, MemoryGuardStore, SpendGuard } from "./spend-guard.js";

/**
 * With text on Claude a video costs more than on the OpenAI models, so the
 * guard budgets more per operation: a clinic's normal Monday must still fit
 * its own cap, and a runaway loop must still be stopped.
 */
const CLAUDE = { ANTHROPIC_API_KEY: "k" };

describe("spend guard on Claude", () => {
  it("uses the Claude estimates when text runs on Claude, the OpenAI ones after a rollback", () => {
    expect(costDefaults(CLAUDE)).toBe(COST_DEFAULTS_CLAUDE);
    expect(costDefaults({})).toBe(COST_DEFAULTS_OPENAI);
    expect(costDefaults({ ...CLAUDE, LLM_PROVIDER: "openai" })).toBe(COST_DEFAULTS_OPENAI);
    expect(guardConfig(CLAUDE).costUsd).toEqual(COST_DEFAULTS_CLAUDE);
    expect(guardConfig({ ...CLAUDE, LLM_PROVIDER: "openai" }).costUsd).toEqual(COST_DEFAULTS_OPENAI);
  });

  it("budgets about twice the measured $0.14 of text per video plus TTS, for every paid operation", () => {
    const c = COST_DEFAULTS_CLAUDE;
    expect(c.week).toBeGreaterThanOrEqual(2 * 5 * (0.14 + 0.02));
    expect(c.topup).toBeGreaterThanOrEqual(2 * 3 * (0.14 + 0.02));
    expect(c.change).toBeGreaterThanOrEqual(2 * (0.14 + 0.02));
    for (const op of Object.keys(c) as (keyof typeof c)[]) expect(c[op]).toBeGreaterThanOrEqual(COST_DEFAULTS_OPENAI[op]);
  });

  it("an explicit DENTVID_COST_*_USD still wins", () => {
    expect(guardConfig({ ...CLAUDE, DENTVID_COST_WEEK_USD: "2.5" }).costUsd.week).toBe(2.5);
  });

  it("a retrying Monday fits the clinic's daily cap; a runaway does not", async () => {
    const cfg = guardConfig(CLAUDE);
    // 4 attempts, each with a top-up, plus a recording, restyles and the week's changes.
    expect(cfg.clinicDailyUsd).toBeGreaterThanOrEqual(4 * (cfg.costUsd.week + cfg.costUsd.topup) + cfg.costUsd.recording);
    const g = new SpendGuard(new MemoryGuardStore(), () => ({ ...cfg, dailyUsd: 1e6, monthlyUsd: 1e6 }));
    const monday = new Date("2026-11-30T05:00:00Z");
    for (let i = 0; i < 4; i++) {
      expect((await g.reserve("week", "clinic-a", { now: monday, week: "2026-11-30" })).ok).toBe(true);
      expect((await g.reserve("topup", "clinic-a", { now: monday, week: "2026-11-30" })).ok).toBe(true);
    }
    let refused = false;
    for (let i = 0; i < 50 && !refused; i++) refused = !(await g.reserve("topup", "clinic-a", { now: monday, week: "2026-11-30" })).ok;
    expect(refused).toBe(true);
  });
});
