import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { routeForHost } from "@/lib/dentvid/host";
import { ACCOUNT_TEXT } from "./dentvideo-account";
import { HELP_IDS, HELP_PATH } from "./dentvideo-help-links";
import { LOCALES } from "./dentvideo-locales";
import { HELP } from "./help";

/**
 * docs/SUPPORT.md, the mailbox playbook, links the help center instead of
 * carrying its own copy of each answer (copies went stale: "about 15 minutes"
 * after the product said "within an hour", "tap Share" after the button became
 * "Post it", invoices "in your receipt email" after "Manage billing" went live).
 * These checks keep it that way: every answer it links exists, every language
 * has its link, nothing is pasted, and its short summaries say what the help
 * center and the app say.
 */

const PLAYBOOK = readFileSync(path.join(__dirname, "../../../docs/SUPPORT.md"), "utf8");
const IDS = new Set<string>(HELP_IDS);

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

/** Everything wrong with a playbook, as readable lines (empty: fine). */
function playbookProblems(md: string): string[] {
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
  });
});
