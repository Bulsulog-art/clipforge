# DentVideo revenue team

One director, ten specialists, one goal: paying clinics. The director runs once a day as a scheduled
cloud session and reports to the owner in Turkish. Every agent follows CLAUDE.md; this file adds the
outbound permissions and limits the owner approved.

## Owner approval (2026-11-28)

The owner asked for this pipeline in his words: "apifydan leads finderdan müşteri bulunacak ardından
müşteri doğrulanacak apifyda sonra mükemmel mail yazılacak ai gibi görünmeyen benim gibi kısa mailler
sıkmayan uygulamayı tanıtan instantly api ile devam edilecek". Within the limits below the team may find
leads, verify them, upload them to Instantly, send the approved sequence and answer replies without asking
again. Anything outside these limits needs the owner's explicit OK, recorded here with the date.

## The team

| # | Agent | Job |
|---|---|---|
| 0 | `growth-director` | Daily run: state, delegation, checks, report |
| 1 | `lead-scout` | Apify Leads Finder for approved markets |
| 2 | `lead-verifier` | Email verification, fit filters, bounce watch |
| 3 | `outreach-writer` | Sequences and reply templates in Berke's voice |
| 4 | `compliance-reviewer` | Law and honesty check, veto |
| 5 | `campaign-operator` | Instantly: upload, activate, volume, deliverability |
| 6 | `reply-handler` | Classify and answer replies, blocklist the no's |
| 7 | `demo-producer` | Personal demo link per interested clinic |
| 8 | `content-studio` | Remotion marketing clips and post drafts |
| 9 | `funnel-analyst` | Sent → reply → demo → sign-up → paid, and spend |
| 10 | `ops-guardian` | Site, worker and integrations health |

Code changes from any agent go through `release-manager` and the release gate in CLAUDE.md.

## Limits

| What | Limit |
|---|---|
| Markets for cold email | United States only (CAN-SPAM). Everything else: owner OK + legal check (`02-outreach-law-and-channels.md`) |
| Apify | ≤ $3 a day, ≤ $15 a month (the $19 Starter plan). Finder capped $2 a run, verifier $1 |
| Lead quality | Verifier status `valid` only; decision-makers only; ≤ 2 contacts per practice domain |
| Sending | Mon-Thu 09:00-16:00 recipient time. 30/day the first week, +15/day per week if bounce < 2% and no complaints, ceiling 90/day |
| Stop rules | Bounce > 3%, any spam complaint, mailbox warmup score < 85: pause the campaign and report |
| Senders | The six `berke*@bulsulabsb2b.com` / `bulsulabsb2c.com` mailboxes. Never dentvideo.com (protects product email) |
| Tracking | Text-only, no open or link tracking, `stop_on_reply` on |
| Replies | Interested and simple questions: answered by reply-handler. Legal, data, complaints, calls, partnerships: owner |
| Claude API | Within the ~$200/month budget across all products; the director's run should stay under ~$2 a day |
| Never | Discounts, free videos, guarantees, invented results, prices other than pricing.ts, other people's campaigns |

## Campaigns

| Market | Campaign | Id | State |
|---|---|---|---|
| US | DentVideo-EN-US-v3 | `dbd035f8-bbb9-4701-9739-2a82c8d02d1d` | Active since 2026-11-28, 104 verified leads |

The other `DentVideo-*-v3` drafts (UK, DE, ES, FR, PL, TR, AR, JA) stay drafts: those markets are not
cleared for cold email.

## Sequence (US, live)

Step 1 (day 0), subject `videos for {{companyName}}`: what DentVideo does in two sentences, offer to make a
sample for the practice. Step 2 (day 3, same thread): the problem it removes, "Should I send the sample?".
Step 3 (day 8, same thread): last note, free preview at dentvideo.com. Signed "Berke / dentvideo.com", opt-out
line and company address in every email.

## Pipeline

```
node scripts/outreach/find-and-load.mjs --market us --max 400 --dry-run   # look first
node scripts/outreach/find-and-load.mjs --market us --max 400             # verify + upload
```

First run 2026-11-28: 400 found ($0.68), 175 US decision-makers with email, 104 valid after verification
($0.14), all uploaded. Lead files live in `outreach-runs/` (gitignored, personal data, delete after 12 months).

## Daily report

`docs/gtm/runs/YYYY-MM-DD.md` with counts and sources, plus the Turkish summary the owner reads.
