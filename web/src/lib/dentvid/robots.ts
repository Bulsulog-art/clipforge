/**
 * dentvideo.com/robots.txt. Every public page is open to search engines and
 * to AI answer engines; only the signed-in app, the sign-up flow and internal
 * routes are closed.
 *
 * AI crawlers are named in groups of their own on purpose: it states plainly
 * that DentVideo wants to be read and cited by ChatGPT, Claude, Perplexity,
 * Gemini/AI Overviews (Google-Extended), Copilot and others. A crawler obeys
 * only the most specific group that names it, so each group repeats the same
 * Disallow lines as `*`.
 */

/** Paths that are not public pages. */
export const ROBOTS_DISALLOW = ["/app", "/start", "/dev/", "/api/"] as const;

/** AI and answer-engine crawlers given an explicit Allow (search + training + live retrieval agents). */
export const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
  "Meta-ExternalAgent",
  "Amazonbot",
  "DuckAssistBot",
  "MistralAI-User",
] as const;

export function robotsTxt(): string {
  const group = (agents: readonly string[]) => [...agents.map((a) => `User-agent: ${a}`), "Allow: /", ...ROBOTS_DISALLOW.map((p) => `Disallow: ${p}`), ""];
  return [
    ...group(["*"]),
    "# AI answer engines and assistants: welcome. Full text for them: https://dentvideo.com/llms.txt and https://dentvideo.com/llms-full.txt",
    ...group(AI_CRAWLERS),
    "Sitemap: https://dentvideo.com/sitemap.xml",
    "",
  ].join("\n");
}
