import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dentvideo/app",
  useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {}, prefetch: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}));

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LOCALES, type Locale } from "@/content/dentvideo";
import { APP_TEXT, fmt } from "@/content/dentvideo-app";
import { LIBRARY_WEEKS_TEXT } from "@/content/dentvideo-library-weeks";
import { REASON_TEXT } from "@/content/dentvideo-reasons";
import { weekLabelDate } from "@/lib/dentvid/app-ui";
import { Library, type LibraryItem } from "./library";

(globalThis as { React?: typeof React }).React = React;

const WEEK = "2026-11-23";
const LAST = "2026-11-16";
const OLDER = "2026-11-02";
let seq = 0;
const item = (over: Partial<LibraryItem> = {}): LibraryItem => ({
  id: `i${String(++seq).padStart(3, "0")}`,
  kind: "generated",
  status: "ready",
  approval: "pending",
  title: `Video ${seq}`,
  week_of: WEEK,
  reasons: [],
  videoUrl: "/v.mp4",
  thumbUrl: "/v.jpg",
  ...over,
});
const skipped = (week = WEEK, title = "Implants for everyone over 60") => item({ week_of: week, title, status: "rejected", reasons: ["skipped"], videoUrl: undefined, thumbUrl: undefined });
const week = (w: string, n = 5, over: Partial<LibraryItem> = {}) => Array.from({ length: n }, () => item({ week_of: w, ...over }));

const decode = (h: string) => h.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const html = (el: React.ReactElement) => decode(renderToStaticMarkup(el));
const lib = (props: Partial<React.ComponentProps<typeof Library>> & { items: LibraryItem[] }) =>
  html(<Library locale="en" canStartWeek={false} currentWeek={WEEK} {...props} />);

describe("'Show earlier weeks'", () => {
  const items = [...week(WEEK), ...week(LAST, 5, { approval: "approved" }), ...week(OLDER, 5, { approval: "approved" })];

  it.each(LOCALES)("%s: a quiet link to 12 more weeks, only when older weeks exist", (l: Locale) => {
    const label = LIBRARY_WEEKS_TEXT[l].showEarlier;
    const withEarlier = html(<Library locale={l} items={items} canStartWeek={false} currentWeek={WEEK} hasEarlier />);
    expect(withEarlier).toContain(label);
    expect(withEarlier).toContain('href="?weeks=24"');
    const without = html(<Library locale={l} items={items} canStartWeek={false} currentWeek={WEEK} />);
    expect(without).not.toContain(label);
    expect(without).not.toContain("?weeks=");
  });

  it("comes after the last folded week and asks for 12 more than shown", () => {
    const h = lib({ items, hasEarlier: true, weeks: 24 });
    expect(h).toContain('href="?weeks=36"');
    expect(h.indexOf(LIBRARY_WEEKS_TEXT.en.showEarlier)).toBeGreaterThan(h.lastIndexOf(fmt(APP_TEXT.en.home.weekOf, { date: weekLabelDate(OLDER, "en") })));
  });

  it("is not offered once the library shows the most it can (520 weeks)", () => {
    expect(lib({ items, hasEarlier: true, weeks: 520 })).not.toContain(LIBRARY_WEEKS_TEXT.en.showEarlier);
  });

  it("still leads somewhere when the window happens to hold nothing", () => {
    expect(lib({ items: [], hasEarlier: true })).toContain('href="?weeks=24"');
  });
});

describe("'Topics we did not make'", () => {
  const heading = (n: number, l: Locale = "en") => fmt(APP_TEXT[l].library.notMadeHeading, { n });

  it.each(LOCALES)("%s: shows this week's skipped topics while the week has fewer than five videos", (l: Locale) => {
    const h = html(<Library locale={l} items={[...week(WEEK, 4), skipped()]} canStartWeek={false} currentWeek={WEEK} />);
    expect(h).toContain(heading(1, l));
    expect(h).toContain(REASON_TEXT[l].skipped);
  });

  it("is hidden once the week was topped up to five", () => {
    const h = lib({ items: [...week(WEEK, 5), skipped(), skipped(WEEK, "Whitening for everyone")] });
    expect(h).not.toContain(heading(2));
    expect(h).not.toContain(heading(1));
    expect(h).not.toContain("Implants for everyone over 60");
  });

  it("never lists an earlier week's skipped topics, even a short week's", () => {
    const h = lib({ items: [...week(WEEK, 5), ...week(LAST, 3, { approval: "approved" }), skipped(LAST), skipped(OLDER, "Teeth in a day")] });
    expect(h).not.toContain(APP_TEXT.en.library.notMadeLead);
    expect(h).not.toContain("Teeth in a day");
    expect(h).not.toContain("Implants for everyone over 60");
  });

  it("counts only this week's: a short week with older skips shows its own one", () => {
    const h = lib({ items: [...week(WEEK, 3), skipped(), skipped(LAST, "Teeth in a day"), skipped(OLDER, "Gum lift")] });
    expect(h).toContain(heading(1));
    expect(h).not.toContain("Teeth in a day");
  });

  it("does not count a failed row or one still being made as a video", () => {
    const h = lib({ items: [...week(WEEK, 4), item({ status: "failed", videoUrl: undefined }), skipped()] });
    expect(h).toContain(heading(1));
  });
});

describe("when the next five arrive", () => {
  // Everything this week declined: nothing left to do.
  const idle = [...week(WEEK, 5, { approval: "rejected" }), ...week(LAST, 5, { approval: "approved" })];

  it.each(LOCALES)("%s: the idle card names the Monday after the latest delivered week, by date", (l: Locale) => {
    const h = html(<Library locale={l} items={idle} canStartWeek={false} currentWeek={WEEK} />);
    expect(h).toContain(APP_TEXT[l].home.idleTitle);
    expect(h).toContain(fmt(LIBRARY_WEEKS_TEXT[l].nextDelivery, { date: weekLabelDate("2026-11-30", l) }));
    // The old dateless line is gone.
    expect(h).not.toContain(APP_TEXT[l].home.idleLead);
  });

  it("reads 'Monday, November 30' in the US and 'Monday, 30 November' in the UK and without a country", () => {
    expect(lib({ items: idle, country: "US" })).toContain("Your next five videos arrive Monday, November 30.");
    expect(lib({ items: idle, country: "GB" })).toContain("Your next five videos arrive Monday, 30 November.");
    expect(lib({ items: idle })).toContain("Your next five videos arrive Monday, 30 November.");
  });

  it("a clinic that paid on Sunday already has the coming Monday's week: its next five come the Monday after", () => {
    const sundayWeek = "2026-11-30";
    const h = html(<Library locale="en" items={week(sundayWeek, 5, { approval: "rejected" })} canStartWeek={false} currentWeek={sundayWeek} />);
    expect(h).toContain("Your next five videos arrive Monday, 7 December.");
  });

  it("says it again once every video of the week is posted", () => {
    const posted = week(WEEK, 5, { approval: "approved", postedAt: "2026-11-24T10:00:00Z" });
    const h = lib({ items: posted });
    expect(h).toContain(APP_TEXT.en.library.post.allPosted);
    expect(h).toContain("Your next five videos arrive Monday, 30 November.");
    expect(h).not.toContain(APP_TEXT.en.home.shareLead);
  });

  it("leaves the other states as they were", () => {
    expect(lib({ items: week(WEEK, 5) })).not.toContain("Your next five videos arrive");
    const approved = lib({ items: week(WEEK, 5, { approval: "approved" }) });
    expect(approved).toContain(APP_TEXT.en.home.shareLead);
    expect(approved).not.toContain("Your next five videos arrive");
  });
});

describe("US clinics see US dates and times in the library", () => {
  // Three to approve, two approved: the approved cards carry their suggested posting time.
  const items = [...week(WEEK, 3), ...week(WEEK, 2, { approval: "approved" }), ...week(LAST, 5, { approval: "approved" }), ...week(OLDER, 5, { approval: "approved" })];

  it("US: month first and a 12-hour clock", () => {
    const h = lib({ items, country: "US" });
    expect(h).toContain("November 23");
    expect(h).toContain("November 16");
    expect(h).toContain("Week of November 2");
    expect(h).toMatch(/Best time: (Mon|Tue|Wed|Thu|Fri) \d{1,2}:\d{2} (AM|PM)/);
    expect(h).not.toMatch(/Best time: \w{3} (19:00|12:30)(?!\u00a0)/);
  });

  it.each([["GB"], [null]])("%s: unchanged, day first and 24 hours", (country) => {
    const h = lib({ items, country });
    expect(h).toContain("23 November");
    expect(h).toContain("Week of 2 November");
    expect(h).toMatch(/Best time: (Mon|Tue|Wed|Thu|Fri) (19:00|12:30)/);
    expect(h).not.toMatch(/\d (AM|PM)/);
  });
});
