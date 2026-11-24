import { describe, it, expect } from "vitest";
import { GENERAL_SHOTS, SERVICE_SHOTS, dentalQuery, guardFootage, serviceShots } from "./footage.js";
import type { ScenePlan } from "../remotion/scene-plan.js";

const plan = (query: string) =>
  ({
    title: "t",
    aspect: "9:16",
    theme: "midnight",
    music: "none",
    scenes: [
      { kind: "hook", text: "A hook here", seconds: 3 },
      { kind: "footage", source: { type: "stock", query }, caption: "c", seconds: 3 },
    ],
  }) as unknown as ScenePlan;
const q = (p: ScenePlan) => (p.scenes[1] as { source: { query: string } }).source.query;

describe("guardFootage", () => {
  it("replaces people and clinical settings with an object shot for the service", () => {
    expect(q(guardFootage(plan("dental implant process"), "Implantes", new Set()))).toBe("dental implant model");
    expect(q(guardFootage(plan("dentist examining patient"), "Bleaching", new Set()))).toBe("teeth whitening tray");
    expect(q(guardFootage(plan("smiling woman"), "Kanal tedavisi", new Set()))).toBe("tooth model close up");
  });
  it("keeps a safe object query", () => {
    expect(q(guardFootage(plan("Child Brushing Teeth"), "Children's dentistry", new Set()))).toBe("child brushing teeth");
  });
  it("never repeats a shot within a week", () => {
    const used = new Set<string>();
    const a = q(guardFootage(plan("brushing teeth close up"), "Limpieza dental", used));
    const b = q(guardFootage(plan("brushing teeth close up"), "Limpieza dental", used));
    expect(a).toBe("brushing teeth close up");
    expect(b).not.toBe(a);
    expect(b).toBe("toothbrush close up");
  });
  it("maps Japanese, Arabic and Polish service names to object shots", () => {
    expect(q(guardFootage(plan("dentist with patient"), "インプラント", new Set()))).toBe("dental implant model");
    expect(q(guardFootage(plan("dentist with patient"), "تبييض الأسنان", new Set()))).toBe("teeth whitening tray");
    expect(q(guardFootage(plan("dentist with patient"), "Leczenie kanałowe", new Set()))).toBe("tooth model close up");
  });
});

/** A service name each pool answers to, in a few of the clinics' languages. */
const SERVICES: [string, string[]][] = [
  ["implant", ["Dental implants", "İmplant", "Implantologie", "インプラント"]],
  ["whitening", ["Teeth whitening", "Diş beyazlatma", "Blanqueamiento", "تبييض الأسنان"]],
  ["aligner", ["Clear aligners", "Şeffaf plak", "Aligneurs"]],
  ["root canal", ["Root canal treatment", "Kanal tedavisi", "Leczenie kanałowe"]],
  ["children", ["Children's dentistry", "Çocuk diş hekimliği", "Kinderzahnheilkunde"]],
  ["cleaning", ["Hygienist cleaning", "Diş taşı temizliği", "Limpieza dental"]],
];

describe("each service's pool of object shots", () => {
  it("has six to eight shots, every one a dental object the guard keeps as it is", () => {
    expect(SERVICE_SHOTS).toHaveLength(6);
    for (const pool of [...SERVICE_SHOTS.map(([, shots]) => shots), GENERAL_SHOTS]) {
      expect(pool.length).toBeGreaterThanOrEqual(6);
      expect(pool.length).toBeLessThanOrEqual(8);
      expect(new Set(pool).size).toBe(pool.length);
      for (const shot of pool) {
        expect(dentalQuery(shot), shot).toBe(true);
        expect(shot.split(" ").length, shot).toBeLessThanOrEqual(4);
        expect(q(guardFootage(plan(shot), "Anything", new Set())), shot).toBe(shot);
      }
    }
  });

  it("is found from the service's name in the clinic's language", () => {
    for (const [what, names] of SERVICES) {
      const pools = names.map((n) => serviceShots(n));
      for (const p of pools) expect(p.length, what).toBeGreaterThanOrEqual(6);
      expect(new Set(pools).size, what).toBe(1);
    }
    expect(serviceShots("Emergency dental care")).toEqual([]);
  });
});

describe("with the clinic's weekly rotation (produceWeek)", () => {
  const seed = "Live Oak Family Dentistry|Austin|US";
  const replaced = (service: string, turn: number, rotationSeed = seed) =>
    q(guardFootage(plan("dentist with patient"), service, new Set(), { seed: rotationSeed, turn }));

  it("a query that has to be replaced takes a different shot from week to week, all from the service's own pool", () => {
    for (const [, names] of SERVICES) {
      const own = serviceShots(names[0]);
      const weeks = Array.from({ length: own.length }, (_, w) => replaced(names[0], 2914 + w));
      // One turn per week walks the whole pool before any shot comes back.
      expect(new Set(weeks).size, names[0]).toBe(own.length);
      for (const shot of weeks) expect(own).toContain(shot);
    }
  });

  it("two clinics in the same week usually start at different shots", () => {
    const clinics = Array.from({ length: 60 }, (_, i) => `Clinic ${i}|City|TR`);
    const shots = clinics.map((c) => replaced("Dental implants", 2917, c));
    expect(new Set(shots).size).toBeGreaterThanOrEqual(5);
  });

  it("still keeps a safe query and never repeats a shot within a week", () => {
    expect(q(guardFootage(plan("Clear Aligner Case"), "Clear aligners", new Set(), { seed, turn: 5 }))).toBe("clear aligner case");
    const used = new Set<string>();
    const week = Array.from({ length: 12 }, () => q(guardFootage(plan("smiling woman"), "Teeth whitening", used, { seed, turn: 2917 })));
    expect(new Set(week).size).toBe(12);
    for (const shot of week) expect(dentalQuery(shot)).toBe(true);
  });

  it("without a rotation, replacements come in the fixed order they always did", () => {
    expect(q(guardFootage(plan("dentist with patient"), "Dental implants", new Set()))).toBe("dental implant model");
    expect(q(guardFootage(plan("dentist with patient"), "Emergency dental care", new Set()))).toBe("toothbrush close up");
  });
});

