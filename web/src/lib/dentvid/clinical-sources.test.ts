import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AFTERCARE_SOURCES, CLINICAL_BODIES, CLINICAL_CHECKED, CLINICAL_SOURCE_LIST } from "./clinical-sources";

/**
 * The web copy of the clinical reviewer's sources (worker/src/dental/accuracy.ts
 * AFTERCARE_SOURCES) is the worker's block word for word, so the help center
 * never lists a page the reviewer's rules do not rest on, or misses one.
 */

const here = path.resolve(__dirname);
const workerFile = path.resolve(here, "../../../../worker/src/dental/accuracy.ts");

const START = "/** A public patient-information page from a national dental body. */";
/** The shared block: from the ClinicalSource type to the end of AFTERCARE_SOURCES. */
function sharedBlock(src: string): string {
  const start = src.indexOf(START);
  const decl = src.indexOf("export const AFTERCARE_SOURCES", start);
  const end = src.indexOf("\n};\n", decl);
  if (start < 0 || decl < 0 || end < 0) return "";
  return src.slice(start, end + 4);
}

const ALLOWED_HOSTS = ["www.nhs.uk", "www.mouthhealthy.org", "www.ada.org", "www.dentalhealth.org", "aaoinfo.org"];

describe.runIf(fs.existsSync(workerFile))("clinical sources: the web copy matches the worker", () => {
  const web = sharedBlock(fs.readFileSync(path.join(here, "clinical-sources.ts"), "utf8"));
  const worker = sharedBlock(fs.readFileSync(workerFile, "utf8"));

  it("finds the block in both files", () => {
    expect(web.length).toBeGreaterThan(2000);
    expect(worker.length).toBeGreaterThan(2000);
    expect(web).toContain("export const AFTERCARE_SOURCES");
  });

  it("is word for word the same block", () => {
    expect(web).toBe(worker);
  });

  it("would notice a changed page, a new rule or a dropped source", () => {
    const changed = worker.replace("https://www.nhs.uk/tests-and-treatments/teeth-whitening/", "https://www.nhs.uk/teeth-whitening/");
    expect(changed).not.toBe(web);
    const dropped = worker.replace(/\n\s+\{\n\s+body: "Oral Health Foundation",[\s\S]*?\n\s+\},/, "");
    expect(dropped).not.toBe(web);
  });

  it("every URL in the worker's block is one the web lists", () => {
    const urls = [...worker.matchAll(/url: "([^"]+)"/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThanOrEqual(7);
    expect(new Set(urls)).toEqual(new Set(CLINICAL_SOURCE_LIST.map((s) => s.url)));
  });
});

describe("clinical sources: what the help center shows", () => {
  it("every aftercare rule has at least one source", () => {
    for (const [id, r] of Object.entries(AFTERCARE_SOURCES)) expect(r.sources.length, id).toBeGreaterThan(0);
  });

  it("lists each page once, https, on a national dental body's site", () => {
    const urls = CLINICAL_SOURCE_LIST.map((s) => s.url);
    expect(new Set(urls).size).toBe(urls.length);
    for (const s of CLINICAL_SOURCE_LIST) {
      const u = new URL(s.url);
      expect(u.protocol, s.url).toBe("https:");
      expect(ALLOWED_HOSTS, s.url).toContain(u.hostname);
    }
  });

  it("names the bodies, and the day the pages were read", () => {
    expect(CLINICAL_BODIES).toEqual(["Oral Health Foundation", "American Dental Association", "American Association of Orthodontists", "NHS"]);
    expect(CLINICAL_CHECKED).toBe("2026-11-24");
  });
});
