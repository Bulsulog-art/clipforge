import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import { createElement } from "react";
(globalThis as { React?: typeof React }).React = React;
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES } from "@/content/dentvideo";
import { REQUESTS_TEXT } from "@/content/dentvideo-requests";
import { changeViews } from "@/lib/dentvid/items";
import { retentionDates } from "@/lib/dentvid/plan";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
const { ChangeNote, ChangeRequest, RetentionNotice, SubtitlesLink, TopicRequests } = await import("./clinic-requests");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");

describe("the clinic's request controls, in every language", () => {
  it.each(LOCALES)("%s", (locale) => {
    const t = REQUESTS_TEXT[locale];
    const topics = renderToStaticMarkup(
      createElement(TopicRequests, {
        locale,
        initial: [
          { id: "a", text: "Whitening and sensitivity", status: "refused", reason: "not_offered", week_of: null },
          { id: "b", text: "Flossing", status: "used", reason: null, week_of: "2026-11-16" },
          { id: "c", text: "Aligners", status: "pending", reason: null, week_of: null },
        ],
      }),
    );
    expect(topics).toContain(esc(t.topics.title));
    expect(topics).toContain(esc(t.topics.reasons.not_offered));
    expect(topics).toContain(esc(t.topics.status.used));
    // Only a waiting suggestion can be withdrawn.
    expect(topics.match(new RegExp(esc(t.topics.withdraw), "g"))?.length).toBe(2);
    expect(renderToStaticMarkup(createElement(ChangeRequest, { locale, itemId: "x", onQueued: () => {} }))).toContain(esc(t.change.button));
    const link = renderToStaticMarkup(createElement(SubtitlesLink, { locale, itemId: "abc" }));
    expect(link).toContain('href="/api/dentvideo/items/abc/subtitles?format=srt"');
    expect(link).toContain(esc(t.subtitles.download));
    const notice = renderToStaticMarkup(createElement(RetentionNotice, { locale, endedAt: "2026-11-16T09:41:00Z", deleteOn: "2027-02-14T09:41:00Z" }));
    expect(notice).toMatch(/2027/);
    expect(notice).not.toMatch(/\{\w+\}/);
  });

  it("before migration 0024 the suggestion box is not shown at all", () => {
    expect(renderToStaticMarkup(createElement(TopicRequests, { locale: "en", initial: null }))).toBe("");
  });

  it("the card says what became of a change: running, done (until decided), refused with the reason", () => {
    const now = new Date().toISOString();
    const t = REQUESTS_TEXT.en.change;
    expect(renderToStaticMarkup(createElement(ChangeNote, { locale: "en", change: { status: "working", reason: null, at: now } }))).toContain(t.status.working);
    expect(renderToStaticMarkup(createElement(ChangeNote, { locale: "en", change: { status: "done", reason: null, at: now }, approval: "pending" }))).toContain(esc(t.status.done));
    expect(renderToStaticMarkup(createElement(ChangeNote, { locale: "en", change: { status: "done", reason: null, at: now }, approval: "approved" }))).toBe("");
    expect(renderToStaticMarkup(createElement(ChangeNote, { locale: "en", change: { status: "refused", reason: "checks", at: now } }))).toContain(esc(t.reasons.checks));
    // A week later the outcome is no longer news.
    expect(renderToStaticMarkup(createElement(ChangeNote, { locale: "en", change: { status: "failed", reason: "busy", at: "2020-01-01T00:00:00Z" } }))).toBe("");
  });
});

describe("what the library reads", () => {
  it("the latest change per video; one lost in the queue for over an hour reads as failed", () => {
    const now = Date.parse("2026-11-18T12:00:00Z");
    const v = changeViews(
      [
        { item_id: "a", status: "done", reason: null, created_at: "2026-11-17T10:00:00Z" },
        { item_id: "a", status: "queued", reason: null, created_at: "2026-11-18T11:30:00Z" },
        { item_id: "b", status: "working", reason: null, created_at: "2026-11-18T09:00:00Z" },
      ],
      now,
    );
    expect(v.get("a")).toMatchObject({ status: "queued" });
    expect(v.get("b")).toMatchObject({ status: "failed", reason: "technical" });
  });

  it("retention dates: only for an ended plan; never earlier than 90 days, later when the notice moved it", () => {
    expect(retentionDates("active", "2026-11-16T00:00:00Z", null)).toBeNull();
    expect(retentionDates("cancelled", null, null)).toBeNull();
    expect(retentionDates("cancelled", "2026-11-16T00:00:00Z", null)?.deleteOn).toBe("2027-02-14T00:00:00.000Z");
    expect(retentionDates("cancelled", "2026-11-16T00:00:00Z", "2027-03-01T00:00:00Z")?.deleteOn).toBe("2027-03-01T00:00:00.000Z");
    expect(retentionDates("cancelled", "2026-11-16T00:00:00Z", "2026-12-01T00:00:00Z")?.deleteOn).toBe("2027-02-14T00:00:00.000Z");
  });
});
