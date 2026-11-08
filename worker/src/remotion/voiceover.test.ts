import { describe, it, expect, vi, beforeEach } from "vitest";
vi.mock("../steps/tts.js", () => ({ synthesizeSpeech: vi.fn() }));

// A chainable stand-in for fluent-ffmpeg. Each run records its filter and
// output, then ends or errors as the test's `behave` says.
type Run = { input: string; filter?: string; output?: string; freq?: number };
const ff = vi.hoisted(() => ({
  runs: [] as Run[],
  behave: (_r: Run): { error?: Error; stderr?: string } => ({}),
  probe: {} as Record<string, number>,
}));
vi.mock("fluent-ffmpeg", () => {
  const make = (input: string) => {
    const run: Run = { input };
    const handlers: Record<string, (...a: unknown[]) => void> = {};
    const chain = {
      audioFilters: (f: string) => ((run.filter = f), chain),
      audioCodec: () => chain,
      audioBitrate: () => chain,
      audioFrequency: (n: number) => ((run.freq = n), chain),
      noVideo: () => chain,
      format: () => chain,
      on: (ev: string, cb: (...a: unknown[]) => void) => ((handlers[ev] = cb), chain),
      save: (out: string) => {
        run.output = out;
        ff.runs.push(run);
        const b = ff.behave(run);
        queueMicrotask(() => (b.error ? handlers.error?.(b.error) : handlers.end?.(null, b.stderr ?? "")));
        return chain;
      },
    };
    return chain;
  };
  return {
    default: Object.assign(make, {
      ffprobe: (f: string, cb: (e: null, d: { format: { duration: number } }) => void) =>
        cb(null, { format: { duration: ff.probe[f] ?? 0 } }),
    }),
  };
});

const { fitPlanToVoice, TAIL_SECONDS, normalizeLoudness, parseLoudnormJson, prepareVoiceover } = await import("./voiceover.js");
const { synthesizeSpeech } = await import("../steps/tts.js");
import { totalSeconds, LIMITS, type ScenePlan } from "./scene-plan.js";

const plan = (secs: number[]): ScenePlan =>
  ({
    title: "t",
    aspect: "9:16",
    theme: "sunrise",
    music: "none",
    scenes: secs.map((seconds, i) => ({ kind: "statement", text: `Line ${i}`, seconds })),
  }) as ScenePlan;

describe("fitPlanToVoice", () => {
  it("stretches the video so narration is never cut off", () => {
    const fitted = fitPlanToVoice(plan([3, 4, 5, 3]), 24);
    expect(totalSeconds(fitted)).toBeGreaterThanOrEqual(24 + TAIL_SECONDS - 0.2);
    // proportions are kept: the longest scene stays the longest
    expect(fitted.scenes[2].seconds).toBeGreaterThan(fitted.scenes[0].seconds);
  });

  it("never shrinks a plan for a short narration (text must stay readable)", () => {
    const p = plan([3, 4, 5]);
    expect(fitPlanToVoice(p, 5)).toBe(p);
  });

  it("respects the per-scene ceiling by spreading time to scenes with room", () => {
    const fitted = fitPlanToVoice(plan([9, 2, 2]), 30);
    for (const s of fitted.scenes) expect(s.seconds).toBeLessThanOrEqual(LIMITS.sceneSeconds.max);
    expect(totalSeconds(fitted)).toBeGreaterThanOrEqual(29.5);
  });

  it("caps at the total limit", () => {
    const fitted = fitPlanToVoice(plan([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]), 500);
    expect(totalSeconds(fitted)).toBeLessThanOrEqual(LIMITS.totalSeconds.max + 0.5);
  });
});

const MEASURE = `[Parsed_loudnorm_0 @ 0x1]
{
	"input_i" : "-26.40",
	"input_tp" : "-9.80",
	"input_lra" : "4.20",
	"input_thresh" : "-36.70",
	"output_i" : "-16.02",
	"normalization_type" : "dynamic",
	"target_offset" : "0.12"
}`;

describe("parseLoudnormJson", () => {
  it("reads the measurement block out of ffmpeg stderr", () => {
    expect(parseLoudnormJson(`size=N/A time=00:00:04.10\n${MEASURE}\n`)).toEqual({
      input_i: "-26.40",
      input_tp: "-9.80",
      input_lra: "4.20",
      input_thresh: "-36.70",
      target_offset: "0.12",
    });
  });
  it("rejects silence (-inf) and garbage", () => {
    expect(parseLoudnormJson(MEASURE.replace('"-26.40"', '"-inf"'))).toBeNull();
    expect(parseLoudnormJson("no json here")).toBeNull();
  });
});

describe("normalizeLoudness", () => {
  beforeEach(() => {
    ff.runs = [];
    ff.behave = (r) => (r.output === "-" ? { stderr: MEASURE } : {});
  });

  it("measures, then applies one linear gain to -16 LUFS / -1.5 dBTP", async () => {
    const out = await normalizeLoudness("/w/voiceover.mp3");
    expect(out).toBe("/w/voiceover.loud.mp3");
    expect(ff.runs).toHaveLength(2);
    expect(ff.runs[0].output).toBe("-");
    expect(ff.runs[0].filter).toBe("loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json");
    expect(ff.runs[1].output).toBe("/w/voiceover.loud.mp3");
    expect(ff.runs[1].filter).toBe(
      "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=-26.40:measured_TP=-9.80:measured_LRA=4.20:measured_thresh=-36.70:offset=0.12:linear=true",
    );
    // loudnorm resamples to 192 kHz internally; the output must not stay there
    expect(ff.runs[1].freq).toBe(48000);
  });

  it("falls back to one-pass when the measurement fails", async () => {
    ff.behave = (r) => (r.output === "-" ? { error: new Error("measure failed") } : {});
    expect(await normalizeLoudness("/w/voiceover.mp3")).toBe("/w/voiceover.loud.mp3");
    expect(ff.runs[1].filter).toBe("loudnorm=I=-16:TP=-1.5:LRA=11");
  });

  it("keeps the original file when the encode fails", async () => {
    ff.behave = (r) => (r.output === "-" ? { stderr: MEASURE } : { error: new Error("ffmpeg exited with code 1") });
    expect(await normalizeLoudness("/w/voiceover.mp3")).toBe("/w/voiceover.mp3");
  });
});

describe("prepareVoiceover loudness", () => {
  const p = { ...plan([3, 3]), voiceover: { text: "Hello there.", voice: "nova" } } as ScenePlan;
  beforeEach(() => {
    ff.runs = [];
    ff.probe = { "/w/voiceover.mp3": 9.9, "/w/voiceover.loud.mp3": 10 };
    vi.mocked(synthesizeSpeech).mockResolvedValue({ audioPath: "/w/voiceover.mp3", bytes: 1 });
  });

  it("renders the normalised file and times the plan to it", async () => {
    ff.behave = (r) => (r.output === "-" ? { stderr: MEASURE } : {});
    const r = await prepareVoiceover(p, "/w");
    expect(r.voiceoverPath).toBe("/w/voiceover.loud.mp3");
    expect(r.voiceSeconds).toBe(10);
    expect(totalSeconds(r.plan)).toBeGreaterThanOrEqual(10 + TAIL_SECONDS - 0.2);
  });

  it("still renders, with the original narration, when ffmpeg fails", async () => {
    ff.behave = () => ({ error: new Error("boom") });
    const r = await prepareVoiceover(p, "/w");
    expect(r.voiceoverPath).toBe("/w/voiceover.mp3");
    expect(r.voiceSeconds).toBe(9.9);
  });
});
