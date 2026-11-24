import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { routeForHost } from "@/lib/dentvid/host";
import { ACCOUNT_TEXT } from "./dentvideo-account";
import { HELP_IDS, HELP_PATH } from "./dentvideo-help-links";
import { LOCALES } from "./dentvideo-locales";
import { POSTING_TEXT } from "./dentvideo-posting";
import { HELP } from "./help";

/**
 * docs/SUPPORT.md, the mailbox playbook, links the help center instead of
 * carrying its own copy of each answer (copies went stale: "about 15 minutes"
 * after the product said "within an hour", "tap Share" after the button became
 * "Post it", invoices "in your receipt email" after "Manage billing" went live).
 * These checks keep it that way: every answer it links exists, every language
 * has its link, nothing is pasted, and the facts its short summaries state are
 * what the help center, the app and the admin page say.
 */

const PLAYBOOK = readFileSync(path.join(__dirname, "../../../docs/SUPPORT.md"), "utf8");
const ADMIN_CLINIC_PAGE = readFileSync(path.join(__dirname, "../components/dentvid/admin-clinic.tsx"), "utf8");
const IDS = new Set<string>(HELP_IDS);

/** Curly quotes as straight ones and every run of space or line break as one space, so wrapped lines compare. */
const flat = (s: string) => s.replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, " ");

const help = HELP.en.articles;
const answer = (id: keyof typeof help) => [help[id].a, ...(help[id].steps ?? [])].join(" ");

/**
 * What a top question's summary states, and the text in the product that says
 * it. Both sides are checked: the playbook question must still say it, and so
 * must the source. When the help center, the app or the admin page changes one
 * of these, the test fails until the summary here follows.
 */
type Fact = { q: number; says: string; source: string; where: string };
const FACTS: Fact[] = [
  { q: 1, says: "ready within an hour", source: answer("first-videos"), where: 'help "first-videos"' },
  { q: 2, says: '"Watch and approve"', source: answer("approve"), where: 'help "approve"' },
  { q: 2, says: '"Approve all"', source: answer("approve"), where: 'help "approve"' },
  { q: 2, says: '"Approve & share"', source: `"${POSTING_TEXT.en.email.approveShare}"`, where: "the videos-ready email (POSTING_TEXT.en.email.approveShare)" },
  { q: 3, says: '"Post it"', source: answer("share"), where: 'help "share"' },
  { q: 3, says: '"Save video + copy caption"', source: answer("share"), where: 'help "share"' },
  { q: 3, says: '"Mark as posted"', source: answer("share"), where: 'help "share"' },
  { q: 3, says: '"Download"', source: answer("share"), where: 'help "share"' },
  { q: 5, says: '"What to check before posting"', source: answer("needs-a-look"), where: 'help "needs-a-look"' },
  { q: 6, says: '"Ask for a change"', source: answer("wrong-video"), where: 'help "wrong-video"' },
  { q: 6, says: "up to 3 changes a week", source: answer("wrong-video"), where: 'help "wrong-video"' },
  { q: 7, says: "works for 15 minutes", source: answer("sign-in"), where: 'help "sign-in"' },
  { q: 8, says: '"Update payment details"', source: answer("payment-failed"), where: 'help "payment-failed"' },
  { q: 8, says: '"Manage billing"', source: `"${ACCOUNT_TEXT.en.billingButton}"`, where: "the settings button (ACCOUNT_TEXT.en.billingButton)" },
  { q: 8, says: '"There is no active subscription on this account."', source: `"${ACCOUNT_TEXT.en.errors.noSubscription}"`, where: "the portal error (ACCOUNT_TEXT.en.errors.noSubscription)" },
  { q: 8, says: '"We couldn\'t open the billing portal. Please try again in a moment."', source: `"${ACCOUNT_TEXT.en.errors.billingFailed}"`, where: "the portal error (ACCOUNT_TEXT.en.errors.billingFailed)" },
  { q: 8, says: '"Plan, subscriptions and payments"', source: ADMIN_CLINIC_PAGE, where: "the admin clinic page (admin-clinic.tsx)" },
  { q: 9, says: '"Manage billing"', source: answer("cancel") + answer("invoices"), where: 'help "cancel" and "invoices"' },
  { q: 9, says: "90 days", source: answer("after-cancel"), where: 'help "after-cancel"' },
  { q: 9, says: "14 days and 1 day before", source: answer("after-cancel"), where: 'help "after-cancel"' },
  { q: 9, says: '"Download my data"', source: answer("after-cancel"), where: 'help "after-cancel"' },
  { q: 9, says: '"Plan, subscriptions and payments"', source: ADMIN_CLINIC_PAGE, where: "the admin clinic page (admin-clinic.tsx)" },
  { q: 10, says: '"Unsubscribe"', source: answer("reminder-emails"), where: 'help "reminder-emails"' },
  { q: 11, says: '"Suggest a topic for next week"', source: answer("topics"), where: 'help "topics"' },
  { q: 11, says: "up to 140 characters", source: answer("topics"), where: 'help "topics"' },
  { q: 11, says: "up to three a week", source: answer("topics"), where: 'help "topics"' },
  { q: 11, says: '"Your suggestions"', source: answer("topics"), where: 'help "topics"' },
  { q: 12, says: '"Download subtitles (.srt)"', source: answer("captions"), where: 'help "captions"' },
];

/** The facts the product no longer states: the playbook's summary must change with it. */
function staleFacts(facts: Fact[]): string[] {
  return facts.filter((f) => !flat(f.source).includes(f.says)).map((f) => `question ${f.q} says ${f.says}, but ${f.where} no longer does`);
}

/** "/dentvideo/de/help" → "/de/help": the address on dentvideo.com. */
const publicHelpPath = (appPath: string) => appPath.replace(/^\/dentvideo(?=\/|$)/, "") || "/";

/** The "### N. …" top questions, by number, with their text. */
function questions(md: string): Map<number, string> {
  const top = md.split(/^## /m).find((s) => s.startsWith("Top questions")) ?? "";
  const out = new Map<number, string>();
  for (const part of top.split(/^### /m).slice(1)) {
    const m = /^(\d+)\./.exec(part);
    if (m) out.set(Number(m[1]), part);
  }
  return out;
}

/** The help ids a playbook links: the "**Link:**" bullets and the "Other answers" table. */
function linkedIds(md: string): string[] {
  const ids: string[] = [];
  for (const m of md.matchAll(/\*\*Link:\*\*([\s\S]*?)(?=\n\s*- |\n\n|$)/g)) ids.push(...[...m[1].matchAll(/`([^`]+)`/g)].map((x) => x[1]));
  const other = md.split(/^### Other answers to link/m)[1]?.split(/^## /m)[0] ?? "";
  for (const row of other.split("\n").filter((l) => /^\|.*`[^`]+`\s*\|\s*$/.test(l))) ids.push(/`([^`]+)`\s*\|\s*$/.exec(row)![1]);
  return ids;
}

/** The "## Escalate …" section. */
const escalation = (md: string) => md.split(/^## /m).find((s) => s.startsWith("Escalate")) ?? "";

/** Everything wrong with a playbook, as readable lines (empty: fine). */
function playbookProblems(md: string, facts: Fact[] = FACTS): string[] {
  const problems: string[] = [];
  // 1. No pasted answers: the help center is the single source.
  for (const m of md.matchAll(/^\s*- \*\*(EN|DE|ES|TR|FR|JA|AR|PL|IT|PT):\*\*/gm)) problems.push(`pasted ${m[1]} answer: link the help center instead`);
  // 2. Every top question names the answer to link, and every linked answer exists.
  const qs = questions(md);
  if (qs.size < 10) problems.push(`only ${qs.size} top questions found`);
  for (const [n, text] of qs) if (!/\*\*Link:\*\*/.test(text)) problems.push(`question ${n} has no **Link:** to a help answer`);
  const ids = linkedIds(md);
  if (ids.length < 20) problems.push(`only ${ids.length} linked answers found`);
  for (const id of ids) if (!IDS.has(id)) problems.push(`links "${id}", which is not a help answer (HELP_IDS)`);
  // 3. Every concrete help address is a real page and a real answer.
  const pages = new Set(LOCALES.map((l) => publicHelpPath(HELP_PATH[l])));
  for (const m of md.matchAll(/https:\/\/dentvideo\.com(\/[a-z/]*help)#([a-z<>-]+)/g)) {
    if (!pages.has(m[1])) problems.push(`${m[0]}: no help center at ${m[1]}`);
    if (m[2] !== "<id>" && !IDS.has(m[2])) problems.push(`${m[0]}: no answer "${m[2]}"`);
  }
  // 4. One link pattern per site language.
  for (const l of LOCALES) {
    const pattern = `https://dentvideo.com${publicHelpPath(HELP_PATH[l])}#<id>`;
    if (!md.includes(pattern)) problems.push(`no link pattern for ${l} (${pattern})`);
  }
  // 5. What the product says today.
  const q = (n: number) => qs.get(n) ?? "";
  if (/about 15 minutes/i.test(md)) problems.push(`says "about 15 minutes" for the first week; the product says "within an hour"`);
  if (!/within an hour/.test(q(1))) problems.push(`question 1 doesn't say the first week is usually ready "within an hour"`);
  if (/\btap[^.\n]{0,3}\bShare\b/.test(md)) problems.push(`says "tap Share"; the button is "Post it"`);
  if (!/"Post it"/.test(q(3))) problems.push(`question 3 doesn't name the "Post it" button`);
  if (!/Invoices:[^\n]*\n?[^\n]*"Manage billing"/.test(q(9))) problems.push(`question 9 doesn't send invoices to Settings → Plan and billing → "Manage billing"`);
  // "Manage billing" shows on every paying plan (account-panel: selfServe && paying); a missing Dodo subscription is an error after the tap, not a missing button.
  if (/no button[^.]*no Dodo subscription/i.test(flat(md))) problems.push(`says the "Manage billing" button is missing when no Dodo subscription is stored; it shows, and the tap answers "There is no active subscription on this account."`);
  // The help center promises "we'll do it for you": the playbook must say who cancels, where, and when to escalate.
  if (/we do it for\s+them/.test(q(9)) && !/Dodo dashboard/.test(q(9))) problems.push(`question 9 promises "we do it for them" but doesn't say where to cancel (the Dodo dashboard)`);
  if (!/cancel for them/i.test(escalation(md))) problems.push(`the escalation list doesn't cover a clinic that asks us to cancel for them`);
  // 6. The facts each summary states are still in it.
  for (const f of facts) if (!flat(q(f.q)).includes(f.says)) problems.push(`question ${f.q} no longer says ${f.says} (${f.where} does)`);
  return problems;
}

describe("docs/SUPPORT.md points to the help center and matches the product", () => {
  it("has no problems", () => {
    expect(playbookProblems(PLAYBOOK)).toEqual([]);
  });

  it("links the answers the top questions are about", () => {
    const ids = linkedIds(PLAYBOOK);
    for (const id of ["first-videos", "approve", "share", "software-check", "needs-a-look", "wrong-video", "logo-colors", "sign-in", "payment-failed", "update-card", "cancel", "invoices", "after-cancel", "reminder-emails", "topics", "captions"]) {
      expect(ids, id).toContain(id);
    }
  });

  it("each language's help address is the page dentvideo.com serves", () => {
    for (const l of LOCALES) {
      const pub = publicHelpPath(HELP_PATH[l]);
      expect(routeForHost("dentvideo.com", pub, ""), l).toEqual({ kind: "rewrite", path: HELP_PATH[l] });
    }
  });

  it("its summaries are what the help center and the app say", () => {
    const en = HELP.en.articles;
    expect(en["first-videos"].a).toMatch(/usually ready within an hour/);
    expect((en.share.steps ?? []).join(" ")).toContain("“Post it”");
    expect(en.invoices.a).toContain("“Manage billing”");
    expect(en.cancel.a).toContain("“Manage billing”");
    expect(en["update-card"].a).toContain("“Manage billing”");
    expect(ACCOUNT_TEXT.en.billingButton).toBe("Manage billing");
  });

  it("every fact a summary states is still what the help center, the app or the admin page says", () => {
    expect(FACTS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(FACTS.map((f) => f.q)).size).toBeGreaterThanOrEqual(10);
    expect(staleFacts(FACTS)).toEqual([]);
  });

  describe("the check itself", () => {
    const swap = (from: string | RegExp, to: string) => PLAYBOOK.replace(from, to);

    it("flags a pasted answer, an unknown answer and a broken address", () => {
      expect(playbookProblems(swap("- **Link:** `approve`.", "- **EN:** Open the video and tap Approve.\n- **Link:** `approve`."))).toContain("pasted EN answer: link the help center instead");
      expect(playbookProblems(swap("- **Link:** `approve`.", "- **Link:** `approve-video`."))).toContain(`links "approve-video", which is not a help answer (HELP_IDS)`);
      expect(playbookProblems(swap("| Deleting the account | `delete-account` |", "| Deleting the account | `delete-me` |"))).toContain(`links "delete-me", which is not a help answer (HELP_IDS)`);
      expect(playbookProblems(swap("https://dentvideo.com/de/help#cancel", "https://dentvideo.com/de/help#kuendigen"))).toContain(`https://dentvideo.com/de/help#kuendigen: no answer "kuendigen"`);
      expect(playbookProblems(swap("`https://dentvideo.com/pl/help#<id>`", "`https://dentvideo.com/help?lang=pl#<id>`"))).toContain("no link pattern for pl (https://dentvideo.com/pl/help#<id>)");
      expect(playbookProblems(swap("- **Link:** `captions`.", "- **Answer:** captions."))).toContain("question 12 has no **Link:** to a help answer");
    });

    it("flags the old wording: 15 minutes, tap Share, invoices without Manage billing", () => {
      expect(playbookProblems(swap("usually\n  ready within an hour", "usually\n  ready in about 15 minutes"))).toEqual(
        expect.arrayContaining([`says "about 15 minutes" for the first week; the product says "within an hour"`, `question 1 doesn't say the first week is usually ready "within an hour"`]),
      );
      expect(playbookProblems(swap('on an approved video, tap "Post it"', "on an approved video, tap Share"))).toEqual(
        expect.arrayContaining([`says "tap Share"; the button is "Post it"`]),
      );
      expect(playbookProblems(PLAYBOOK.replace(/Invoices: under Settings → Plan and billing → "Manage billing"\./, "Invoices: in the payment receipt email."))).toContain(
        `question 9 doesn't send invoices to Settings → Plan and billing → "Manage billing"`,
      );
    });

    it("flags the missing-button claim, a cancel promise with no way to keep it, and an escalation list without it", () => {
      const missingButton = swap(/- \*Check first:\* Admin → clinic → billing events\. "Manage billing" shows on[\s\S]*?\(question 9\)\.\n/, '- *Check first:* Admin → clinic → billing events. If "Manage billing" fails\n  for them (an error, or no button because no Dodo subscription is stored on\n  the clinic), pass it to Berke.\n');
      expect(missingButton).not.toBe(PLAYBOOK);
      expect(playbookProblems(missingButton)).toEqual(
        expect.arrayContaining([
          `says the "Manage billing" button is missing when no Dodo subscription is stored; it shows, and the tap answers "There is no active subscription on this account."`,
          `question 8 no longer says "There is no active subscription on this account." (the portal error (ACCOUNT_TEXT.en.errors.noSubscription) does)`,
        ]),
      );
      const noWayToCancel = swap(/- \*Cancel for them:\*[\s\S]*?paid for\.\n/, "");
      expect(noWayToCancel).not.toBe(PLAYBOOK);
      expect(playbookProblems(noWayToCancel)).toContain(`question 9 promises "we do it for them" but doesn't say where to cancel (the Dodo dashboard)`);
      const noEscalation = swap(/- a clinic asks us to cancel for them[\s\S]*?same day\.\n/, "");
      expect(noEscalation).not.toBe(PLAYBOOK);
      expect(playbookProblems(noEscalation)).toContain("the escalation list doesn't cover a clinic that asks us to cancel for them");
    });

    it("flags a summary that drifts from a fact, and a fact the product no longer states", () => {
      const drifted = swap("up to 3 changes a\n  week", "up to 5 changes a\n  week");
      expect(drifted).not.toBe(PLAYBOOK);
      expect(playbookProblems(drifted)).toContain(`question 6 no longer says up to 3 changes a week (help "wrong-video" does)`);
      // A wrapped line still counts as the same words.
      expect(playbookProblems(PLAYBOOK)).not.toContain(`question 6 no longer says up to 3 changes a week (help "wrong-video" does)`);
      // The help center raises the limit: the fact goes stale until the playbook follows.
      const changed: Fact = { q: 6, says: "up to 3 changes a week", source: "You can ask for up to 5 changes a week.", where: 'help "wrong-video"' };
      expect(staleFacts([changed])).toEqual([`question 6 says up to 3 changes a week, but help "wrong-video" no longer does`]);
      // Curly quotes in the source match straight quotes in the playbook.
      expect(staleFacts([{ q: 3, says: '"Post it"', source: "Tap \u201cPost it\u201d.", where: "x" }])).toEqual([]);
      // The admin section the playbook names must exist.
      expect(staleFacts([{ q: 9, says: '"Plan, subscriptions and payments"', source: '<Section title="Billing" id="billing">', where: "the admin clinic page (admin-clinic.tsx)" }])).toHaveLength(1);
    });
  });
});
