import { describe, it, expect, vi, afterEach } from "vitest";
import os from "node:os";
import { renderConcurrency, generateConcurrency } from "./capacity.js";

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
