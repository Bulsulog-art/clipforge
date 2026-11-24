import { describe, expect, it } from "vitest";
import { EXAMPLES, HOOK_BANK } from "./examples.js";
import { planWeek, sharpenHooks, type Topic } from "./strategist.js";
import type { ClinicProfile } from "./profile.js";

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

/**
 * The planner and the hook editor are shown example hooks every week ("a
 * common mistake: \"You're brushing too hard. Here's the sign.\""). A hook
 * becomes the on-screen opener and the first line of the caption, so an
 * example with an em dash teaches one. The prompts themselves are
 * instructions nobody but the model reads; what is checked here is every
 * quoted example inside them, in the words the model actually receives.
 */
const QUOTED = /"([^"\n]+)"/g;
const dashedQuotes = (prompt: string) =>
  prompt.split("\n").flatMap((line) => [...line.matchAll(QUOTED)].map((m) => m[1]).filter((q) => DASH.test(q)));

function capturing(prompts: string[], reply: unknown) {
  return {
    chat: {
      completions: {
        create: async (args: { messages: { content: string }[] }) => {
          prompts.push(...args.messages.map((m) => m.content));
          return { choices: [{ message: { content: JSON.stringify(reply) } }] };
        },
      },
    },
  } as never;
}

const TOPIC: Topic = {
  title: "Brushing pressure",
  pillar: "prevention",
  question: "Am I brushing too hard?",
  hook: "Your brush tells you how hard you press.",
  service: "Cleanings",
  takeaway: "Hold the brush lightly.",
} as Topic;

const profile = (language: string, country: string): ClinicProfile =>
  ({ name: "Sample Dental Practice", city: "Sample City", country, language, services: ["Cleanings", "Implants", "Whitening"], tone: "warm", address: "formal" }) as ClinicProfile;

const MARKETS: [string, string][] = [
  ["en", "US"],
  ["en", "GB"],
  ["de", "DE"],
  ["tr", "TR"],
  ["es", "ES"],
  ["fr", "FR"],
  ["pl", "PL"],
  ["ar", "AE"],
  ["ja", "JP"],
];

describe("the planner's and the hook editor's example hooks: no em dashes", () => {
  it.each(MARKETS)("planWeek and sharpenHooks quote only dash-free examples (%s, %s)", async (language, country) => {
    const prompts: string[] = [];
    const p = profile(language, country);
    await planWeek(capturing(prompts, { topics: [TOPIC], refused: [] }), p, { count: 1, history: [], today: new Date("2026-11-23") });
    await sharpenHooks(capturing(prompts, { hooks: [] }), p, [TOPIC], ["Your gums tell you more than you think."]);
    // Both prompts were really read: the planner's hook shapes and the editor's shape list.
    expect(prompts.join("\n")).toContain("a common mistake:");
    expect(prompts.join("\n")).toContain("Vary the shapes across the week");
    expect(prompts.flatMap(dashedQuotes)).toEqual([]);
  });

  it("the check finds a dashed example inside a prompt line and ignores dashes outside quotes", () => {
    expect(dashedQuotes(`  * a common mistake: "You're brushing too hard — here's the sign."`)).toEqual(["You're brushing too hard — here's the sign."]);
    expect(dashedQuotes(`a mistake ("Your toothbrush has an expiry date – most people miss it.")`)).toHaveLength(1);
    expect(dashedQuotes(`the clinic posts it — never "What is X?" and never "3 tips…"`)).toEqual([]);
    expect(dashedQuotes(`"Wear them 20–22 hours a day."`)).toEqual([]);
  });
});
