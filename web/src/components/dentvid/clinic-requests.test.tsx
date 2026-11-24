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
const { ChangeNote, ChangeRequest, RetentionNotice, SubtitlesLink, TopicRequests, clipChangeNote } = await import("./clinic-requests");
const { CHANGE_NOTE_MAX } = await import("@/content/dentvideo-requests");

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

  it("before migration 0025 the suggestion box is not shown at all", () => {
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

describe("a change request opened with words already in it (from the review player's decline form)", () => {
  const t = REQUESTS_TEXT.en.change;
  const render = (props: Partial<Parameters<typeof ChangeRequest>[0]> = {}) => renderToStaticMarkup(createElement(ChangeRequest, { locale: "en", itemId: "x", onQueued: () => {}, ...props }));

  it("initialNote prefills the open form, with its count", () => {
    const h = render({ startOpen: true, initialNote: "  Say twice a day, not three times.  " });
    expect(h).toContain(">Say twice a day, not three times.</textarea>");
    expect(h).toContain(`${[..."Say twice a day, not three times."].length}/${CHANGE_NOTE_MAX}`);
    expect(h).toContain(esc(t.title));
    expect(h).toContain(esc(t.submit));
    // Open, the form is the whole control: no second "Ask for a change" button beside it.
    expect(h).not.toContain(esc(t.button));
  });

  it.each(LOCALES)("%s: a longer note from the decline form (up to 400) is cut to what a change takes, never sent over the limit", (locale) => {
    const long = "ä".repeat(CHANGE_NOTE_MAX + 100);
    expect([...clipChangeNote(long)]).toHaveLength(CHANGE_NOTE_MAX);
    const h = renderToStaticMarkup(createElement(ChangeRequest, { locale, itemId: "x", onQueued: () => {}, startOpen: true, initialNote: long }));
    expect(h).toContain(`${CHANGE_NOTE_MAX}/${CHANGE_NOTE_MAX}`);
    expect(h).toContain(`maxLength="${CHANGE_NOTE_MAX}"`);
  });

  it("emoji and other astral characters count as one, the way the server counts them", () => {
    expect(clipChangeNote("😀".repeat(CHANGE_NOTE_MAX + 5))).toBe("😀".repeat(CHANGE_NOTE_MAX));
  });

  it("without the new props it behaves as before: a closed button, an empty note (the library card)", () => {
    const h = render();
    expect(h).toContain(esc(t.button));
    expect(h).not.toContain("<textarea");
    expect(render({ initialNote: "ignored until opened" })).not.toContain("ignored until opened");
  });
});

describe("sending a change: what the form hands up", () => {
  const t = REQUESTS_TEXT.en.change;
  const note = "Say twice a day, not three times.";
  /** What ChangeRequest renders (its hooks run in a render), so the form's submit handler can be called. */
  function formOf(props: Partial<Parameters<typeof ChangeRequest>[0]>) {
    let out: React.ReactNode = null;
    function Spy() {
      out = ChangeRequest({ locale: "en", itemId: "x", onQueued: () => {}, startOpen: true, initialNote: note, ...props });
      return createElement(React.Fragment, null, out);
    }
    renderToStaticMarkup(createElement(Spy));
    const find = (n: unknown): React.ReactElement<{ onSubmit: (e: { preventDefault: () => void }) => Promise<void> }> | null => {
      if (Array.isArray(n)) return n.map(find).find(Boolean) ?? null;
      if (!React.isValidElement(n)) return null;
      if (n.type === "form") return n as never;
      return find((n.props as { children?: unknown }).children);
    };
    return find(out)!;
  }
  async function submit(respond: () => Promise<Response>) {
    const onQueued = vi.fn();
    const onFailed = vi.fn();
    const fetchMock = vi.fn(respond);
    vi.stubGlobal("fetch", fetchMock);
    try {
      await formOf({ onQueued, onFailed }).props.onSubmit({ preventDefault: () => {} });
    } finally {
      vi.unstubAllGlobals();
    }
    return { onQueued, onFailed, fetchMock };
  }
  const json = (status: number, body: unknown) => async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("accepted: the confirmation with how many changes are left, once; nothing reported as failed", async () => {
    const { onQueued, onFailed, fetchMock } = await submit(json(200, { ok: true, left: 2 }));
    expect(fetchMock).toHaveBeenCalledWith("/api/dentvideo/items/x/change", expect.objectContaining({ method: "POST", body: JSON.stringify({ note }) }));
    expect(onQueued).toHaveBeenCalledTimes(1);
    expect(onQueued).toHaveBeenCalledWith(`${t.status.queued}. Changes left this week: 2 of 3`, 2);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("accepted: how many changes are left is handed up as the server said it, so the week's last one can be told apart", async () => {
    const last = await submit(json(200, { ok: true, left: 0 }));
    expect(last.onQueued).toHaveBeenCalledWith(`${t.status.queued}. Changes left this week: 0 of 3`, 0);
    // An answer without the count is not read as "none left".
    const unsure = await submit(json(200, { ok: true }));
    expect(unsure.onQueued).toHaveBeenCalledTimes(1);
    expect(unsure.onQueued.mock.calls[0][1]).toBeUndefined();
  });

  it("refused by the server: its code and message, with the note as typed; never reported as queued", async () => {
    const { onQueued, onFailed } = await submit(json(429, { error: t.errors.limit, code: "limit", left: 0 }));
    expect(onQueued).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledWith({ code: "limit", message: t.errors.limit, note });
    const busy = await submit(json(409, { error: t.errors.busy, code: "busy" }));
    expect(busy.onQueued).not.toHaveBeenCalled();
    expect(busy.onFailed).toHaveBeenCalledWith({ code: "busy", message: t.errors.busy, note });
  });

  it("unreachable, or an answer that is not JSON: the general message and no code; never reported as queued", async () => {
    const offline = await submit(async () => Promise.reject(new TypeError("offline")));
    expect(offline.onQueued).not.toHaveBeenCalled();
    expect(offline.onFailed).toHaveBeenCalledWith({ message: t.errors.unavailable, note });
    const broken = await submit(async () => new Response("<html>bad gateway</html>", { status: 502 }));
    expect(broken.onQueued).not.toHaveBeenCalled();
    expect(broken.onFailed).toHaveBeenCalledWith({ code: undefined, message: t.errors.unavailable, note });
  });

  it("without onFailed (the library card) a refusal is shown in the form as before, and nothing breaks", async () => {
    const onQueued = vi.fn();
    vi.stubGlobal("fetch", vi.fn(json(429, { error: t.errors.limit, code: "limit" })));
    try {
      await formOf({ onQueued, onFailed: undefined }).props.onSubmit({ preventDefault: () => {} });
    } finally {
      vi.unstubAllGlobals();
    }
    expect(onQueued).not.toHaveBeenCalled();
  });
});
