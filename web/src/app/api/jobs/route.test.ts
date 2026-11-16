import { beforeEach, describe, expect, it, vi } from "vitest";

// A YouTube link used to be queued and fail on our servers minutes later (YouTube
// blocks data-centre downloads). It is now refused before quota, insert or queue.

const inserts: unknown[] = [];
const queued: unknown[] = [];

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) } }),
  createServiceClient: () => ({
    from: (table: string) => {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({ data: table === "v_user_quota" ? { videos_used: 0, videos_limit: 3 } : null }),
        maybeSingle: async () => ({ data: { tier: "free" } }),
        insert: (row: unknown) => {
          inserts.push(row);
          return { select: () => ({ single: async () => ({ data: { id: "job1" }, error: null }) }) };
        },
      };
      return q;
    },
  }),
}));
vi.mock("@/lib/queue", () => ({ videoQueue: { add: async (...a: unknown[]) => void queued.push(a) } }));

const { POST } = await import("./route");

function req(sourceUrl: string, sourceType = "youtube") {
  return new Request("https://clipforge.bulsulabs.com/api/jobs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sourceType, sourceUrl, niche: "business" }),
  });
}

describe("POST /api/jobs", () => {
  beforeEach(() => {
    inserts.length = 0;
    queued.length = 0;
  });

  it("refuses a YouTube link up front with a message that points at upload", async () => {
    for (const url of ["https://www.youtube.com/watch?v=abc", "https://youtu.be/abc", "https://m.youtube.com/shorts/abc"]) {
      const res = await POST(req(url));
      expect(res.status).toBe(422);
      const body = await res.json();
      expect(body.code).toBe("youtube_blocked");
      expect(body.error).toMatch(/upload the file/i);
    }
    expect(inserts).toHaveLength(0);
    expect(queued).toHaveLength(0);
  });

  it("still queues a TikTok link", async () => {
    const res = await POST(req("https://www.tiktok.com/@a/video/123", "tiktok_url"));
    expect(res.status).toBeLessThan(300);
    expect(inserts).toHaveLength(1);
  });
});
