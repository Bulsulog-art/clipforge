import { describe, it, expect, vi, afterEach } from "vitest";
import os from "node:os";
import { renderConcurrency, generateConcurrency, dentvidConcurrency, renderTuning } from "./capacity.js";

/**
 * The point of this module is that it never returns a number the machine
 * cannot honour. These tests pin the two ends of that: a small box must not be
 * over-subscribed, and a big one must not be left idle.
 */

function pretend(cores: number, freeGb: number) {
  vi.spyOn(os, "cpus").mockReturnValue(Array.from({ length: cores }, () => ({}) as os.CpuInfo));
  vi.spyOn(os, "freemem").mockReturnValue(freeGb * 1024 * 1024 * 1024);
}

afterEach(() => vi.restoreAllMocks());

describe("frames in parallel", () => {
  it("leaves a core free on the production box", () => {
    pretend(2, 4);
    expect(renderConcurrency({})).toBe(1);
  });

  it("scales up when the machine can take it", () => {
    pretend(8, 16);
    expect(renderConcurrency({})).toBe(7);
  });

  it("is held back by memory, not just cores", () => {
    // Sixteen cores are no use with 1.4GB free — that is two browsers' worth.
    pretend(16, 1.4);
    expect(renderConcurrency({})).toBe(2);
  });

  it("never returns zero, however starved the box", () => {
    pretend(1, 0.1);
    expect(renderConcurrency({})).toBe(1);
  });

  it("lets an explicit setting win", () => {
    pretend(2, 4);
    expect(renderConcurrency({ REMOTION_CONCURRENCY: "6" })).toBe(6);
  });

  it("ignores a setting that is not a usable number", () => {
    pretend(8, 16);
    expect(renderConcurrency({ REMOTION_CONCURRENCY: "" })).toBe(7);
    expect(renderConcurrency({ REMOTION_CONCURRENCY: "banana" })).toBe(7);
    expect(renderConcurrency({ REMOTION_CONCURRENCY: "0" })).toBe(7);
  });

  it("still clamps an override that would thrash the box", () => {
    pretend(2, 4);
    expect(renderConcurrency({ REMOTION_CONCURRENCY: "64" })).toBe(8);
  });
});

describe("videos at a time", () => {
  it("runs one at a time on a small box", () => {
    pretend(2, 4);
    expect(generateConcurrency({})).toBe(1);
  });

  it("runs two once there are cores to spare", () => {
    pretend(4, 8);
    expect(generateConcurrency({})).toBe(2);
  });

  it("lets an explicit setting win", () => {
    pretend(2, 4);
    expect(generateConcurrency({ GENERATE_CONCURRENCY: "3" })).toBe(3);
  });
});

describe("DentVideo jobs at a time (DENTVID_RENDER_CONCURRENCY)", () => {
  it("one by default — the box is shared with the website", () => {
    expect(dentvidConcurrency({})).toBe(1);
  });
  it("the env var wins; the old name still works; nonsense is ignored", () => {
    expect(dentvidConcurrency({ DENTVID_RENDER_CONCURRENCY: "3" })).toBe(3);
    expect(dentvidConcurrency({ DENTVID_CONCURRENCY: "2" })).toBe(2);
    expect(dentvidConcurrency({ DENTVID_RENDER_CONCURRENCY: "4", DENTVID_CONCURRENCY: "2" })).toBe(4);
    expect(dentvidConcurrency({ DENTVID_RENDER_CONCURRENCY: "0" })).toBe(0); // no renders on this box (a render server has them)
    expect(dentvidConcurrency({ DENTVID_RENDER_CONCURRENCY: "-1" })).toBe(1);
    expect(dentvidConcurrency({ DENTVID_RENDER_CONCURRENCY: "lots" })).toBe(1);
    expect(dentvidConcurrency({ DENTVID_RENDER_CONCURRENCY: "500" })).toBe(16);
  });
});

describe("render flags sized to the box", () => {
  const GB = 1024 ** 3;
  it("2 cores: fast x264 preset, a small footage cache, one decoder thread", () => {
    expect(renderTuning({}, 2, 8 * GB)).toEqual({ x264Preset: "veryfast", offthreadVideoCacheSizeInBytes: 256 * 1024 ** 2, offthreadVideoThreads: 1 });
  });
  it("a render-only box gets the defaults back, with a cache bounded by its memory", () => {
    expect(renderTuning({}, 8, 16 * GB)).toEqual({ x264Preset: "medium", offthreadVideoCacheSizeInBytes: 2 * GB, offthreadVideoThreads: 2 });
    expect(renderTuning({}, 4, 4 * GB).offthreadVideoCacheSizeInBytes).toBe(0.5 * GB);
  });
  it("explicit settings win; invalid ones are ignored", () => {
    expect(renderTuning({ REMOTION_X264_PRESET: "Faster", REMOTION_OFFTHREAD_CACHE_MB: "512", REMOTION_OFFTHREAD_THREADS: "3" }, 2, 8 * GB)).toEqual({
      x264Preset: "faster",
      offthreadVideoCacheSizeInBytes: 512 * 1024 ** 2,
      offthreadVideoThreads: 3,
    });
    expect(renderTuning({ REMOTION_X264_PRESET: "warp", REMOTION_OFFTHREAD_CACHE_MB: "1" }, 2, 8 * GB)).toMatchObject({ x264Preset: "veryfast", offthreadVideoCacheSizeInBytes: 256 * 1024 ** 2 });
  });
});
