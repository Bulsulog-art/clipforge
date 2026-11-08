import { describe, expect, it } from "vitest";
import { MIN_FILL_MS, botSignup } from "./bot-check";
import { isOwnLogoPath, isOwnRecordingPath } from "./paths";

describe("botSignup", () => {
  it("lets a person through", () => {
    expect(botSignup({ honeypot: "", elapsedMs: 9000 })).toBeNull();
  });
  it("catches the honeypot, an instant submit and a missing timing", () => {
    expect(botSignup({ honeypot: "http://spam", elapsedMs: 9000 })).toBe("honeypot");
    expect(botSignup({ honeypot: "", elapsedMs: MIN_FILL_MS - 1 })).toBe("too-fast");
    expect(botSignup({})).toBe("no-timing");
  });
});

describe("clinic storage paths", () => {
  const U = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
  const OTHER = "2d0c5e8a-3f4b-4c7d-9e0f-1a2b3c4d5e6f";
  it("accepts exactly what the browser uploads", () => {
    expect(isOwnRecordingPath(`${U}/recordings/1731081600000.mp4`, U)).toBe(true);
    expect(isOwnRecordingPath(`${U}/recordings/1731081600000.mov`, U)).toBe(true);
    expect(isOwnLogoPath(`${U}/logo.png`, U)).toBe(true);
  });
  it("refuses another owner's folder, traversal and other shapes", () => {
    expect(isOwnRecordingPath(`${OTHER}/recordings/1731081600000.mp4`, U)).toBe(false);
    expect(isOwnRecordingPath(`${U}/recordings/../../${OTHER}/recordings/1731081600000.mp4`, U)).toBe(false);
    expect(isOwnRecordingPath(`${U}/recordings/x/1731081600000.mp4`, U)).toBe(false);
    expect(isOwnRecordingPath(`${U}/logo.png`, U)).toBe(false);
    expect(isOwnLogoPath(`${OTHER}/logo.png`, U)).toBe(false);
    expect(isOwnLogoPath(`${U}/../${OTHER}/logo.png`, U)).toBe(false);
  });
});
