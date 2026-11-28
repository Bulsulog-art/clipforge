import { describe, expect, it } from "vitest";
import type OpenAI from "openai";
import { narrate } from "./narrate.js";
import { reviewCompliance } from "./compliance.js";
import type { ClinicProfile } from "./profile.js";
import type { Topic } from "./strategist.js";
import type { ScenePlan } from "../remotion/scene-plan.js";

/**
 * A warning sign (bleeding that keeps coming back, pain or swelling that gets
 * worse, something loose) is to be looked at by the viewer's own dentist
 * soon. The narrator and the compliance reviewer must agree on that, in
 * Türkiye too: in an eval the Turkish narrator was told both "only a
 * check-up" and "see a dentist soon", and the reviewer then flagged the safety
 * advice as urgency and rewrote it away.
 */

const TOPIC = { title: "Is it the root canal?", pillar: "myth", question: "Why does it hurt?", hook: "Night pain is a signal.", service: "Root canals" } as Topic;
const PLAN = {
  title: "t",
  aspect: "9:16",
  theme: "sunrise",
  music: "none",
  scenes: [
    { kind: "hook", text: "Night pain is a signal.", seconds: 3 },
    { kind: "statement", text: "Swelling that gets worse needs a look.", seconds: 4 },
  ],
  voiceover: { text: "x", voice: "nova" },
} as ScenePlan;
const profile = (country: string, language: string) =>
  ({ name: "Sample Dental Practice", city: "Sample City", country, language, services: ["Root canals"], tone: "warm", address: "formal" }) as ClinicProfile;

/** A fake client that records each system prompt and answers with the given JSON. */
function recorder(reply: unknown) {
  const systems: string[] = [];
  const client = {
    chat: {
      completions: {
        create: async (req: { messages: { role: string; content: string }[] }) => {
          systems.push(req.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n"));
          return { choices: [{ message: { content: JSON.stringify(reply) } }] };
        },
      },
    },
  } as unknown as OpenAI;
  return { client, systems };
}

describe("warning signs: the narrator and the compliance reviewer agree", () => {
  it("the Turkish narrator is no longer told 'only a check-up' next to 'see a dentist soon'", async () => {
    const { client, systems } = recorder({ text: "Gece ağrısı bir işarettir." });
    await narrate(client, profile("TR", "tr"), TOPIC, PLAN);
    const sys = systems[0];
    expect(sys).not.toMatch(/only point to asking their own dentist at a check-up/);
    expect(sys).toMatch(/In Türkiye, point the viewer to their own dentist/);
    expect(sys).toMatch(/for a warning sign, say calmly to have it looked at by their own dentist without waiting for the routine check-up/);
    expect(sys).toMatch(/looked at by their own dentist soon, without waiting for the routine check-up/);
    // Still never towards this clinic.
    expect(sys).toMatch(/Never tell viewers to contact or book with this clinic/);
  });

  it("outside Türkiye the narrator gets the warning-sign rule without the Türkiye line", async () => {
    const { client, systems } = recorder({ text: "Night pain is a signal." });
    await narrate(client, profile("US", "en"), TOPIC, PLAN);
    expect(systems[0]).toMatch(/looked at by their own dentist soon/);
    expect(systems[0]).not.toMatch(/In Türkiye/);
  });

  for (const [country, language] of <const>[
    ["TR", "tr"],
    ["DE", "de"],
    ["US", "en"],
  ]) {
    it(`${country}: the compliance reviewer is told that warning-sign advice is safety advice, not urgency`, async () => {
      const { client, systems } = recorder({ verdict: "pass", issues: [] });
      const r = await reviewCompliance(client, { country, language }, "Gece ağrısı veya artan şişlik varsa kendi hekiminize bir an önce görünün.");
      expect(r.verdict).toBe("pass");
      expect(systems[0]).toMatch(/Safety advice is not pressure/);
      expect(systems[0]).toMatch(/must NOT be flagged as urgency, in any market \(Türkiye included\)/);
      // Booking pressure is still an issue.
      expect(systems[0]).toMatch(/urgency or pressure to book/);
    });
  }
});
