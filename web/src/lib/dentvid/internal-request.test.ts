import { describe, expect, it } from "vitest";
import { INTERNAL_HEADER, internalRequestReason, markedInternal } from "./internal-request";

const h = (init: Record<string, string>) => new Headers(init);
const SAFARI = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const INSTAGRAM = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 357.0.0.25.101";

describe("internal requests (bots, automation, our scripts)", () => {
  it("automated browsers and crawlers are bots", () => {
    for (const ua of [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh) AppleWebKit/537.36 Chrome/131.0 Safari/537.36 Playwright/1.49",
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0)",
      "DentVideo-Monitor/1 (+synthetic check)",
      "python-requests/2.32",
      "",
    ]) {
      expect(internalRequestReason(h({ "user-agent": ua })), ua).toBe("bot");
    }
  });

  it("real browsers, in-app browsers included, are visitors", () => {
    for (const ua of [SAFARI, CHROME, INSTAGRAM]) expect(internalRequestReason(h({ "user-agent": ua }), { utm_source: "google" })).toBeNull();
  });

  it("our scripts mark themselves with the header or utm_source=internal, whatever their user agent", () => {
    expect(internalRequestReason(h({ "user-agent": SAFARI, [INTERNAL_HEADER]: "1" }))).toBe("marker");
    expect(internalRequestReason(h({ "user-agent": SAFARI }), { utm_source: "internal", utm_campaign: "internal-smoke" })).toBe("campaign");
    expect(markedInternal(h({ [INTERNAL_HEADER]: "true" }))).toBeNull();
    expect(markedInternal(h({}), { utm_source: "internal-ish" })).toBeNull();
    expect(markedInternal(h({}), { utm_campaign: "internal" })).toBeNull();
  });
});
