import { describe, expect, it } from "vitest";
import { DV_CLIENT_EVENTS, DV_EVENTS, DV_SERVER_EVENTS, buildEventRow, isDvEvent, parseClientEvent, sanitizeProps } from "./events";
import { recordEvent } from "./events-server";

/**
 * video_declined: a dentist declined a video in the app. Recorded by the
 * server only (handlers/item-patch.ts), with the reason tag and nothing else:
 * never the dentist's words, never attribution or device tags, and never
 * accepted from a browser.
 */

const CLINIC = "0b8a3c6e-1d2f-4a5b-9c8d-7e6f5a4b3c2d";

describe("video_declined, a server-only event", () => {
  it("is a known event, but not a funnel step and never a browser event", () => {
    expect(DV_SERVER_EVENTS).toEqual(["video_declined"]);
    expect(isDvEvent("video_declined")).toBe(true);
    expect((DV_EVENTS as readonly string[]).includes("video_declined")).toBe(false);
    expect((DV_CLIENT_EVENTS as readonly string[]).includes("video_declined")).toBe(false);
    expect(parseClientEvent(JSON.stringify({ name: "video_declined", props: { reason: "wrong" } }))).toBeNull();
  });

  it("keeps only the reason tag, and only a tag the app writes", () => {
    for (const reason of ["wrong", "notUs", "look", "other"]) expect(sanitizeProps("video_declined", { reason })).toEqual({ reason });
    expect(
      sanitizeProps("video_declined", {
        reason: "notUs",
        note: "We do not place implants",
        title: "Same-day implants",
        utm_source: "google",
        ref: "example.com",
        device: "mobile",
      }),
    ).toEqual({ reason: "notUs" });
    for (const reason of ["NOTUS", "[notUs]", "angry", "", 3, null]) expect(sanitizeProps("video_declined", { reason })).toEqual({});
    expect(sanitizeProps("video_declined", "not an object")).toEqual({});
  });

  it("is stored with the clinic it belongs to", async () => {
    expect(buildEventRow({ name: "video_declined", props: { reason: "look", note: "x" }, clinicId: CLINIC })).toEqual({ name: "video_declined", locale: null, props: { reason: "look" }, clinic_id: CLINIC });
    const inserted: unknown[] = [];
    const db = { from: () => ({ insert: async (row: unknown) => (inserted.push(row), { error: null }) }) };
    await expect(recordEvent("video_declined", { clinicId: CLINIC, props: { reason: "wrong", note: "the enamel claim" }, db: db as never })).resolves.toBe(true);
    expect(inserted).toEqual([{ name: "video_declined", locale: null, props: { reason: "wrong" }, clinic_id: CLINIC }]);
  });

  it("funnel events still carry their attribution tags", () => {
    expect(sanitizeProps("video_approved", { utm_source: "google", device: "mobile" })).toEqual({ utm_source: "google", device: "mobile" });
  });
});
