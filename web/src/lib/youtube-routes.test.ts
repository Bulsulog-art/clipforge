import { beforeEach, describe, expect, it, vi } from "vitest";

// Retry and remix of a YouTube job: refused with the upload message, and
// nothing is reset, deleted, inserted or queued first.

type Row = Record<string, unknown>;
let job: Row;
const writes: string[] = [];
const queued: unknown[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
  createServiceClient: () => ({
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({ data: table === "video_jobs" ? job : null }),
        maybeSingle: async () => ({ data: table === "clips" ? { id: "c1", user_id: "u1", job_id: "j1" } : job }),
        delete: () => (writes.push(`delete ${table}`), q),
        update: () => (writes.push(`update ${table}`), q),
        insert: () => (writes.push(`insert ${table}`), { select: () => ({ single: async () => ({ data: { id: "j2" }, error: null }) }) }),
        then: (r: (v: { error: null }) => void) => r({ error: null }),
      };
      return q;
    },
  }),
}));
vi.mock("@/lib/queue", () => {
  const add = async (...a: unknown[]) => void queued.push(a);
  return { videoQueue: { add }, generateQueue: { add } };
});

const retry = (await import("@/app/api/jobs/[jobId]/retry/route")).POST;
const remix = (await import("@/app/api/clips/[clipId]/remix/route")).POST;

const base = {
  id: "j1", user_id: "u1", status: "failed", storage_path: null, niche: "business", language: "en",
  clip_prompt: null, aspect_ratio: null, source_asset_paths: null, scene_plan: null,
  bg_music_enabled: true, bg_music_mood: null,
};

describe("YouTube jobs on retry and remix", () => {
  beforeEach(() => {
    writes.length = 0;
    queued.length = 0;
  });

  it("retry is refused before the job is reset or its clips deleted", async () => {
    job = { ...base, source_type: "youtube", source_url: "https://youtu.be/abc" };
    const res = await retry(new Request("https://x/api/jobs/j1/retry", { method: "POST" }), { params: Promise.resolve({ jobId: "j1" }) });
    expect(res.status).toBe(409);
    expect((await res.json()).error).toMatch(/upload the file/i);
    expect(writes).toEqual([]);
    expect(queued).toEqual([]);
  });

  it("retry of a TikTok link once saved as youtube still runs", async () => {
    job = { ...base, source_type: "youtube", source_url: "https://www.tiktok.com/@a/video/1" };
    const res = await retry(new Request("https://x/api/jobs/j1/retry", { method: "POST" }), { params: Promise.resolve({ jobId: "j1" }) });
    expect(res.status).toBe(200);
    expect(queued).toHaveLength(1);
  });

  it("remix of a TikTok link once saved as youtube still runs", async () => {
    job = { ...base, source_type: "youtube", source_url: "https://www.tiktok.com/@a/video/1" };
    const res = await remix(new Request("https://x/api/clips/c1/remix", { method: "POST" }), { params: Promise.resolve({ clipId: "c1" }) });
    expect(res.status).toBeLessThan(300);
    expect(writes).toContain("insert video_jobs");
    expect(queued).toHaveLength(1);
  });

  it("remix is refused before a new job is inserted", async () => {
    job = { ...base, source_type: "youtube", source_url: "https://www.youtube.com/watch?v=abc" };
    const res = await remix(new Request("https://x/api/clips/c1/remix", { method: "POST" }), { params: Promise.resolve({ clipId: "c1" }) });
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("youtube_blocked");
    expect(writes).toEqual([]);
    expect(queued).toEqual([]);
  });
});
