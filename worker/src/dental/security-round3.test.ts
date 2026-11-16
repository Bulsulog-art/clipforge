/**
 * Security round 3 checks on the worker (docs/SECURITY.md, "Round 3").
 * No network and no paid call: ElevenLabs gets a fake fetch.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { elevenRequest, synthesizeEleven } from "./elevenlabs.js";
import { closingLineFindings, trSteering } from "./closing-line.js";
import { scanKnownMistakes } from "./known-mistakes.js";
import { scanHardRules, scanMarketRules } from "./hard-rules.js";
import { clinicProfileSchema } from "./profile.js";

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "sec3-"));
afterAll(() => fs.rmSync(DIR, { recursive: true, force: true }));

const KEY = "sk_eleven_secret_value_1234567890";
const env = { DENTVID_TTS_PROVIDER: "elevenlabs", ELEVENLABS_API_KEY: KEY };
const cfg = { voiceId: "Nhs7eitvQWFTQBsf0yiT", model: "eleven_multilingual_v2" };

describe("ElevenLabs: the key stays in the header, out of URLs and error text", () => {
  it("sends the key only as xi-api-key, never in the URL or body", () => {
    const r = elevenRequest("Hello", cfg, KEY);
    expect(r.url).not.toContain(KEY);
    expect(r.init.body).not.toContain(KEY);
    expect(r.init.headers["xi-api-key"]).toBe(KEY);
  });

  it("an error answer, a network error and a timeout never carry the key", async () => {
    const answers: Array<(u: string, i: RequestInit) => Promise<Response>> = [
      async () => new Response('{"detail":{"status":"invalid_api_key"}}', { status: 401 }),
      async () => {
        throw new TypeError("fetch failed");
      },
      (_u, i) => new Promise((_, rej) => i.signal!.addEventListener("abort", () => rej(new Error("aborted")))),
    ];
    for (const f of answers) {
      const err = await synthesizeEleven({ text: "x", workDir: DIR, cfg, env, fetchImpl: f as never, timeoutMs: 20 }).catch((e: Error) => e);
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).not.toContain(KEY);
    }
  });

  it("times out when the headers arrive but the audio body stalls", async () => {
    const stalled = (_u: string, i: RequestInit) =>
      Promise.resolve(
        new Response(
          new ReadableStream({
            start(c) {
              c.enqueue(new Uint8Array([1]));
              i.signal!.addEventListener("abort", () => c.error(new Error("aborted")));
            },
          }),
          { status: 200 },
        ),
      );
    await expect(synthesizeEleven({ text: "x", workDir: DIR, cfg, env, fetchImpl: stalled as never, timeoutMs: 30 })).rejects.toThrow(/timed out/);
  });

  it("encodes the voice id, so a bad override cannot add path segments to the URL", () => {
    const r = elevenRequest("x", { ...cfg, voiceId: "../../v1/user" }, KEY);
    expect(r.url).toContain(encodeURIComponent("../../v1/user"));
    expect(new URL(r.url).pathname).toBe(`/v1/text-to-speech/${encodeURIComponent("../../v1/user")}`);
  });
});

/**
 * The scanners run on clinic text (the closing line, ≤ 120 characters after
 * the web route's checks, ≤ 140 in the worker's profile) and on model output
 * (narration ≤ 1200, captions a few hundred). Several hard-rule patterns
 * carry a lookbehind over \s+, which is quadratic on a long run of spaces:
 * harmless at these sizes, so the sizes are what this test pins.
 */
describe("ReDoS: the rule scanners at the largest real input sizes", () => {
  const worst = [" ", "a ", "Évitez ", "vous ", "randevu ", "garanti ", "\n", "ş", "1", "before and after "];
  const fill = (seed: string, n: number) => seed.repeat(Math.ceil(n / seed.length)).slice(0, n);

  it("a closing line of 140 characters is scanned in a few milliseconds whatever it holds", () => {
    for (const seed of worst)
      for (const country of ["US", "TR", "DE", "FR", "ES", "MX", "GB"]) {
        // Best of three: a quadratic blow-up stays slow every time, CPU contention does not.
        let best = Infinity;
        for (let run = 0; run < 3; run++) {
          const t0 = performance.now();
          closingLineFindings(fill(seed, 140), country);
          trSteering(fill(seed, 140));
          best = Math.min(best, performance.now() - t0);
        }
        expect(best).toBeLessThan(100);
      }
  });

  it("a 1200-character narration plus caption is scanned in well under a second, in every language", () => {
    for (const lang of ["en", "de", "es", "fr", "it", "pt", "tr", "ja", "ar", "pl"])
      for (const seed of worst) {
        const t = fill(seed, 1200);
        const t0 = performance.now();
        scanKnownMistakes({ hook: fill(seed, 120), screen: [fill(seed, 120)], narration: t, caption: t }, lang);
        scanHardRules(t);
        scanMarketRules(t, lang === "en" ? "US" : lang.toUpperCase());
        expect(performance.now() - t0, `${lang} ${JSON.stringify(seed)}`).toBeLessThan(500);
      }
  });

  it("the worker's profile bounds the closing line before any scan", () => {
    const p = clinicProfileSchema.parse({ name: "A", country: "DE", language: "de", services: ["PZR"], closingLine: " ".repeat(5000) + "x" });
    expect(p.closingLine).toBeUndefined();
  });
});
