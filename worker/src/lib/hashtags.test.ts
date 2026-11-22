import { describe, expect, it } from "vitest";
import { capHashtags, INSTAGRAM_MAX_HASHTAGS } from "./hashtags.js";

describe("capHashtags", () => {
  it("Instagram's cap is five", () => {
    expect(INSTAGRAM_MAX_HASHTAGS).toBe(5);
  });

  it("trims a longer list to five, drops duplicates (case and '#' ignored) and keeps the order", () => {
    const tags = ["#dentist", "oralhealth", "#Dentist", "flossing", "", "OralHealth", "smile", "teeth", "gums", "enamel"];
    expect(capHashtags(tags)).toEqual(["#dentist", "oralhealth", "flossing", "smile", "teeth"]);
  });

  it("leaves a short list as it is and honours a smaller cap", () => {
    expect(capHashtags(["a", "b"])).toEqual(["a", "b"]);
    expect(capHashtags(["a", "b", "c", "d"], 3)).toEqual(["a", "b", "c"]);
    expect(capHashtags([])).toEqual([]);
  });
});
