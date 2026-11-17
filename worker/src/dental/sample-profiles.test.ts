import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clinicProfileSchema } from "./profile.js";

/**
 * The example clinic profiles the CLI renders samples from (worker/dental-examples).
 * A sample's sign-off shows the profile's handle, and an invented @handle can
 * belong to a real account (the TR samples showed "@demodisklinigi" until
 * 17.11.2026). Sample profiles carry no handle: the sign-off then shows the
 * logo and the clinic's name only, as for a real clinic without one.
 */
const DIR = path.join(__dirname, "../../dental-examples");

describe("sample clinic profiles", () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json"));

  it("exist and are valid profiles", () => {
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(clinicProfileSchema.safeParse(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"))).success, f).toBe(true);
  });

  it("never carry an invented Instagram/TikTok handle", () => {
    for (const f of files) expect(JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")).handle, f).toBeUndefined();
  });
});
