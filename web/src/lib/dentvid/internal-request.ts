import { isBotUserAgent } from "./hot-leads";

/**
 * Is this browser request ours or a machine's rather than a visitor's?
 * Pure (no I/O, no Next imports): the event route and the tests share it.
 *
 * The funnel analysis of 2026-11-20 found ~72 real devices in 13 days, with
 * automated browsers (HeadlessChrome, Playwright runs, crawlers that render
 * JavaScript) mixed into the landing views. Their events are kept but tagged
 * props.internal = true, so the admin views leave them out by default
 * (lib/dentvid/internal-traffic) and ?internal=1 still shows them.
 *
 *   bot       the user agent is a crawler, a link previewer, a headless or
 *             automated browser or an HTTP library (hot-leads isBotUserAgent)
 *   marker    the request carries `x-dv-internal: 1`: our own monitor, smoke
 *             and e2e scripts set it on their calls to the event endpoint
 *   campaign  the visit's first touch is utm_source=internal: the campaign
 *             value our scripts use instead of real ad tags
 *
 * Like the rest of "internal", this is a measurement label only. Anyone can
 * send the header or the tag; all they get is to be left out of our funnel.
 */

export const INTERNAL_HEADER = "x-dv-internal";
/** utm_source our scripts and monitors use (never a real campaign source). */
export const INTERNAL_UTM_SOURCE = "internal";

export type InternalRequestReason = "bot" | "marker" | "campaign";

type HeadersLike = Pick<Headers, "get">;

/** Did a script of ours mark this request (the header, or the internal campaign tag)? */
export function markedInternal(headers: HeadersLike, props?: Record<string, unknown> | null): "marker" | "campaign" | null {
  if ((headers.get(INTERNAL_HEADER) ?? "").trim() === "1") return "marker";
  if (props?.utm_source === INTERNAL_UTM_SOURCE) return "campaign";
  return null;
}

/** Why this browser event is not a visitor's, or null when it looks like a person. */
export function internalRequestReason(headers: HeadersLike, props?: Record<string, unknown> | null): InternalRequestReason | null {
  const marked = markedInternal(headers, props);
  if (marked) return marked;
  if (isBotUserAgent(headers.get("user-agent"))) return "bot";
  return null;
}
