import { solutionTexts } from "../guides/text";
import { claimsIn, type CompetitorClaim } from "./claims";
import type { SolutionPage } from "./types";

/** The competitor claims a page quotes, once each, in order of first appearance. */
export function pageClaims(p: SolutionPage): CompetitorClaim[] {
  const seen = new Map<string, CompetitorClaim>();
  for (const t of solutionTexts(p)) for (const c of claimsIn(t, p.locale)) if (!seen.has(c.id)) seen.set(c.id, c);
  return [...seen.values()];
}
