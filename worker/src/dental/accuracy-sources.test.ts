import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import type OpenAI from "openai";
import { AFTERCARE_GUIDE, AFTERCARE_SOURCES, reviewAccuracy, type AftercareRuleId, type ClinicalSource } from "./accuracy.js";

/**
 * The public pages behind the clinical reviewer's aftercare rules
 * (accuracy.ts AFTERCARE_SOURCES). Every rule has at least one page from a
 * national dental body, each page was read on the day it records, and none of
 * it reaches the prompt: the reviewer's instructions stay exactly as they were.
 */

/** The guide's rule lines ("- extractions and implant surgery: …"). */
const GUIDE_LINES = AFTERCARE_GUIDE.split("\n").filter((l) => l.startsWith("- "));
const RULES = Object.entries(AFTERCARE_SOURCES) as [AftercareRuleId, (typeof AFTERCARE_SOURCES)[AftercareRuleId]][];
const ALL = RULES.flatMap(([, r]) => r.sources);

/** National dental bodies' patient pages: NHS, ADA, Oral Health Foundation, American Association of Orthodontists. */
const ALLOWED_HOSTS = ["www.nhs.uk", "www.mouthhealthy.org", "www.ada.org", "www.dentalhealth.org", "aaoinfo.org"];

/** The system prompt reviewAccuracy sends, read off a fake client (no request leaves the test). */
async function systemPrompt(mode: "script" | "recording"): Promise<string> {
  let system = "";
  const client = {
    chat: {
      completions: {
        create: async (req: { messages: { role: string; content: string }[] }) => {
          system = req.messages.find((m) => m.role === "system")?.content ?? "";
          return { choices: [{ message: { content: JSON.stringify({ verdict: "pass", issues: [] }) } }] };
        },
      },
    },
  } as unknown as OpenAI;
  await reviewAccuracy(client, { language: "en", country: "GB" }, { title: "t", question: "q", service: "s" }, { script: "x" }, mode);
  return system;
}

describe("AFTERCARE_SOURCES: a public source for every aftercare rule", () => {
  it("the guide has seven rule lines, and each one has exactly one entry", () => {
    expect(GUIDE_LINES).toHaveLength(7);
    expect(RULES).toHaveLength(GUIDE_LINES.length);
    for (const line of GUIDE_LINES) {
      const owners = RULES.filter(([, r]) => line.includes(r.line)).map(([id]) => id);
      expect(owners, line.slice(0, 60)).toHaveLength(1);
    }
    for (const [id, r] of RULES) {
      expect(GUIDE_LINES.filter((l) => l.includes(r.line)), id).toHaveLength(1);
    }
  });

  it("every rule has one or two sources", () => {
    for (const [id, r] of RULES) {
      expect(r.sources.length, id).toBeGreaterThanOrEqual(1);
      expect(r.sources.length, id).toBeLessThanOrEqual(2);
    }
  });

  it("every source is an https page on a national dental body's site, named and dated", () => {
    expect(ALL.length).toBeGreaterThanOrEqual(GUIDE_LINES.length);
    for (const s of ALL) {
      const u = new URL(s.url);
      expect(u.protocol, s.url).toBe("https:");
      expect(ALLOWED_HOSTS, s.url).toContain(u.hostname);
      expect(u.username + u.password + u.search + u.hash, s.url).toBe("");
      expect(s.body.trim(), s.url).not.toBe("");
      expect(s.title.trim(), s.url).not.toBe("");
      expect(s.supports.trim().length, s.url).toBeGreaterThan(20);
      expect(s.checked, s.url).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(s.checked)), s.url).toBe(false);
    }
  });

  it("no page is listed twice for the same rule", () => {
    for (const [id, r] of RULES) {
      const urls = r.sources.map((s) => s.url);
      expect(new Set(urls).size, id).toBe(urls.length);
    }
  });

  it("the host list catches a page from anywhere else (the check is not a no-op)", () => {
    const bad = ["http://www.nhs.uk/x", "https://nhs.uk.example.com/x", "https://example.com/teeth"];
    for (const url of bad) {
      const u = new URL(url);
      expect(u.protocol === "https:" && ALLOWED_HOSTS.includes(u.hostname), url).toBe(false);
    }
  });
});

describe("AFTERCARE_SOURCES: says how far each rule's pages go", () => {
  /**
   * Measured on 2026-11-24 by reading every page against its rule: for these
   * three rules no page says all the rule says (how long to avoid chewing
   * after a root canal, that a routine cleaning needs no special care, how
   * long to avoid coloured drinks after whitening). A rule like that names
   * what its pages leave out; a rule its pages fully back names nothing.
   */
  const PARTLY: AftercareRuleId[] = ["root-canal", "professional-cleaning", "whitening"];

  it("a rule its pages back only in part says what they leave out, and no other rule has a gap", () => {
    for (const [id, r] of RULES) {
      if (PARTLY.includes(id)) expect(r.gap?.trim().length ?? 0, id).toBeGreaterThan(40);
      else expect(r.gap, id).toBeUndefined();
    }
  });

  it("the temporary-filling note keeps the page's own time limit, and the gap says the rule goes further", () => {
    const rc = AFTERCARE_SOURCES["root-canal"];
    const ohf = rc.sources.find((s) => s.url === "https://www.dentalhealth.org/temporary-fillings");
    expect(ohf?.supports).toContain("for a few hours after placement");
    expect(rc.gap).toContain("until the permanent restoration");
  });

  it("professional cleaning is compared with a page on cleaning, not with one on deep cleaning", () => {
    const deep = (s: Pick<ClinicalSource, "title" | "url">) => /scaling|root.planing|deep.clean/i.test(`${s.title} ${s.url}`);
    // The check catches the deep-cleaning page that was listed for this rule before the review.
    expect(deep({ title: "Scaling and Root Planing for Gum Disease", url: "https://www.mouthhealthy.org/all-topics-a-z/scaling-and-root-planing" })).toBe(true);
    const cleaning = AFTERCARE_SOURCES["professional-cleaning"].sources;
    expect(cleaning.length).toBeGreaterThan(0);
    for (const s of cleaning) expect(deep(s), s.url).toBe(false);
  });
});

describe("the reviewer's prompt is unchanged by the sources", () => {
  it("carries the aftercare guide word for word and none of the source pages", async () => {
    for (const mode of ["script", "recording"] as const) {
      const system = await systemPrompt(mode);
      expect(system).toContain(AFTERCARE_GUIDE);
      for (const s of ALL) {
        expect(system, mode).not.toContain(s.url);
        expect(system, mode).not.toContain(s.supports);
      }
    }
  });

  it("is byte for byte the prompt the bench last measured (change it only together with a bench run)", async () => {
    const hash = (s: string) => createHash("sha256").update(s).digest("hex");
    expect(hash(AFTERCARE_GUIDE)).toBe("acdce7ce258d209e1b6a54c8a783ae24735b9daa4b90c3a9c9389e21b3df2436");
    expect(hash(await systemPrompt("script"))).toBe("8b9dfb2c9a18dcbb618a4c214162d3d3d15379be548f1350b8f99b54d36ecc22");
  });
});
