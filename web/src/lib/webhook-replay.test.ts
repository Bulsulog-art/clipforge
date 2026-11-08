import { describe, expect, it } from "vitest";
import { DONE_TTL_SEC, MemoryReplayStore, PROCESSING_TTL_SEC, claimWebhook, settleWebhook, type ReplayStore } from "./webhook-replay";

describe("webhook replay protection", () => {
  it("processes an id once; a replay after success is a duplicate", async () => {
    const s = new MemoryReplayStore();
    expect(await claimWebhook(s, "msg_1")).toBe("new");
    await settleWebhook(s, "msg_1", true);
    expect(await claimWebhook(s, "msg_1")).toBe("duplicate");
    expect(await claimWebhook(s, "msg_2")).toBe("new");
  });

  it("a concurrent copy of a delivery in progress is in flight, not processed twice", async () => {
    const s = new MemoryReplayStore();
    expect(await claimWebhook(s, "msg_1")).toBe("new");
    expect(await claimWebhook(s, "msg_1")).toBe("inflight");
  });

  it("a failed delivery is released, so the provider's retry is processed", async () => {
    const s = new MemoryReplayStore();
    await claimWebhook(s, "msg_1");
    await settleWebhook(s, "msg_1", false);
    expect(await claimWebhook(s, "msg_1")).toBe("new");
  });

  it("a crashed handler's lock expires; done is remembered for days", async () => {
    let now = 0;
    const s = new MemoryReplayStore(() => now);
    await claimWebhook(s, "msg_1");
    now += (PROCESSING_TTL_SEC + 1) * 1000;
    expect(await claimWebhook(s, "msg_1")).toBe("new");
    await settleWebhook(s, "msg_1", true);
    now += (DONE_TTL_SEC - 60) * 1000;
    expect(await claimWebhook(s, "msg_1")).toBe("duplicate");
  });

  it("without a store (or with a broken one) it processes rather than lose a payment", async () => {
    expect(await claimWebhook(null, "msg_1")).toBe("unchecked");
    const broken: ReplayStore = {
      setNx: async () => {
        throw new Error("down");
      },
      get: async () => null,
      set: async () => {},
      del: async () => {},
    };
    expect(await claimWebhook(broken, "msg_1")).toBe("unchecked");
  });
});
