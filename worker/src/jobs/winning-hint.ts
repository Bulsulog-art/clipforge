/**
 * Pure: turn a creator's winning hooks into a scoring-prompt hint. Empty in →
 * empty out, so a creator with no track record gets the unbiased prompt
 * unchanged. Kept supabase-free so it's unit-testable without DB env.
 */
export function buildWinningHint(hooks: string[]): string {
  const clean = hooks.map((h) => h.trim()).filter(Boolean).slice(0, 5);
  if (clean.length === 0) return "";
  return (
    `This creator's best-performing clips so far opened with hooks like:\n` +
    clean.map((h) => `• ${h}`).join("\n") +
    `\nFavour moments that could carry hooks with similar energy (match the vibe, not the exact words).`
  );
}
