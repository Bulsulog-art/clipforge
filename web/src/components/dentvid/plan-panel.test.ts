import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The plan buttons go "Opening checkout…" and disabled while the tab leaves for Dodo. A Back from
// Dodo's page can restore this page from the back-forward cache exactly as it was left (Safari does
// so even for no-store pages), so the panel must free the buttons on a persisted pageshow — otherwise
// the clinic is stuck on a disabled "Opening checkout…" until it reloads. (Checked end to end with
// Playwright against the dev harness: dispatching pageshow{persisted} re-enables both buttons.)
describe("plan panel after a back-forward cache restore", () => {
  const src = fs.readFileSync(path.join(__dirname, "plan-panel.tsx"), "utf8");

  it("listens for pageshow and clears the busy state when the page was restored", () => {
    expect(src).toMatch(/addEventListener\("pageshow"/);
    expect(src).toMatch(/if \(e\.persisted\) setBusy\(null\)/);
    expect(src).toMatch(/removeEventListener\("pageshow"/);
  });
});
