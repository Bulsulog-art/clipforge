import { describe, expect, it } from "vitest";
import { storedCues, subtitleFileName, subtitleResponse, toSrt, toVtt } from "./subtitles";

const CUES = { v: 1, source: "pauses", cues: [
  { start: 0.25, end: 2.9, text: "Sensitive teeth after whitening\nare common." },
  { start: 3.45, end: 8.4, text: "The feeling usually fades within a few days." },
  { start: 61.5, end: 3725.123, text: "too long" },
] };

describe("subtitle files", () => {
  it("SRT: numbered cues, comma milliseconds, the narrator's words", () => {
    const srt = toSrt(storedCues({ cues: CUES.cues.slice(0, 2) }));
    expect(srt).toBe("1\n00:00:00,250 --> 00:00:02,900\nSensitive teeth after whitening\nare common.\n\n2\n00:00:03,450 --> 00:00:08,400\nThe feeling usually fades within a few days.\n");
  });

  it("WebVTT: header, dot milliseconds, language", () => {
    const vtt = toVtt(storedCues({ cues: CUES.cues.slice(0, 1) }), "en");
    expect(vtt.startsWith("WEBVTT\nLanguage: en\n\n1\n00:00:00.250 --> 00:00:02.900\n")).toBe(true);
  });

  it("drops malformed, out-of-order and over-long cues, and text that could break the file", () => {
    expect(storedCues(CUES)).toHaveLength(2);
    expect(storedCues(null)).toEqual([]);
    expect(storedCues({ cues: "x" })).toEqual([]);
    expect(storedCues({ cues: [{ start: 2, end: 1, text: "backwards" }, { start: NaN, end: 1, text: "nan" }, { start: 0, end: 1, text: 5 }] })).toEqual([]);
    const [c] = storedCues({ cues: [{ start: 0, end: 1, text: "a --> b\n\n\n<b>bold</b>" }] });
    expect(c.text).toBe("a → b\nbbold/b");
    expect(toSrt([c])).not.toMatch(/\n\n.*\n\n/);
  });

  it("is named like the video download", () => {
    expect(subtitleFileName("Diş taşı temizliği", "srt")).toBe("dentvideo-dis-tasi-temizligi.srt");
  });
});

describe("GET a video's subtitles", () => {
  const OWNER = "1c9b4d7f-2e3a-4b6c-8d9e-0f1a2b3c4d5e";
  const ITEM = "9d1e2f3a-4b5c-4d6e-8f7a-1b2c3d4e5f6a";
  const rows = [{ id: ITEM, owner_id: OWNER, title: "Whitening and sensitivity", subtitles: CUES, plan: { language: "en" } }];
  // RLS and the owner filter: a row is found only by its own owner.
  const db = {
    from: () => {
      const f: Record<string, unknown> = {};
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => ((f[k] = v), q),
        maybeSingle: async () => ({ data: rows.find((r) => r.id === f.id && r.owner_id === f.owner_id) ?? null, error: null }),
      };
      return q;
    },
  } as never;

  it("the owner gets the file, as an attachment that is never cached", async () => {
    const res = await subtitleResponse(db, OWNER, ITEM, "srt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-subrip");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="dentvideo-whitening-and-sensitivity.srt"');
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(await res.text()).toContain("00:00:03,450 --> 00:00:08,400");
  });

  it("another clinic gets nothing, and a video without cues is 'not found'", async () => {
    expect((await subtitleResponse(db, "2d0c5e8a-3f4b-4c7d-9e0f-1a2b3c4d5e6f", ITEM, "srt")).status).toBe(404);
    rows[0].subtitles = null as never;
    expect((await subtitleResponse(db, OWNER, ITEM, "vtt")).status).toBe(404);
    expect((await subtitleResponse(db, OWNER, "not-a-uuid", "srt")).status).toBe(404);
  });
});
