import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { NOT_FOUND_META, adminMeta, devPreviewMeta } from "./private-meta";

const APP = path.join(__dirname, "../../app/dentvideo");

describe("private pages never name themselves on a 404", () => {
  it("admin pages: their title only for an admin", async () => {
    expect(await adminMeta("Owner dashboard", async () => false)).toEqual(NOT_FOUND_META);
    expect(await adminMeta("Owner dashboard", async () => Promise.reject(new Error("no session")))).toEqual(NOT_FOUND_META);
    expect((await adminMeta("Owner dashboard", async () => true)).title).toBe("Owner dashboard");
  });

  it("dev previews and the preview test bench: their title only with DENTVIDEO_DEV_PREVIEW=1", () => {
    expect(devPreviewMeta("Owner panel preview", undefined, {})).toEqual(NOT_FOUND_META);
    expect(devPreviewMeta("Owner panel preview", undefined, { DENTVIDEO_DEV_PREVIEW: "1" }).title).toBe("Owner panel preview");
    expect(NOT_FOUND_META.title).toEqual({ absolute: "Page not found · DentVideo" });
    expect(NOT_FOUND_META.robots).toMatchObject({ index: false });
  });

  it("no admin, dev or test-bench page declares a fixed title", () => {
    const files = [
      "admin/layout.tsx",
      "admin/demos/page.tsx",
      "admin/ads/page.tsx",
      "dev/admin/page.tsx",
      "dev/app/page.tsx",
      "dev/funnel/page.tsx",
      "dev/post/page.tsx",
      "dev/demo/page.tsx",
      "preview-demo/page.tsx",
    ];
    for (const f of files) {
      const src = fs.readFileSync(path.join(APP, f), "utf8");
      expect(src, f).not.toMatch(/export const metadata/);
      expect(src, f).toMatch(/adminMeta|devPreviewMeta/);
    }
    // The test bench 404s without the dev flag.
    expect(fs.readFileSync(path.join(APP, "preview-demo/page.tsx"), "utf8")).toMatch(/if \(!devPreviewOn\(\)\) notFound\(\)/);
  });
});
