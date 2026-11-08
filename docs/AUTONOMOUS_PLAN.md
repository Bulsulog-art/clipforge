# Autonomous work plan — dental Reels product

Started 2026-11-08 03:05 UTC, runs until **2026-11-08 11:05 UTC** (8 hours).
The owner is asleep. Each hourly check-in reads this file, continues the next
open item, updates the status here, commits and pushes.

## Ground rules (do not break)
- Quality over quantity: every change tested; renders checked frame by frame.
- No purchases, no domain registration, no App Store submissions, no emails
  or messages to real users, no changes to the Dodo account (paused by the
  owner until the domain is decided), no destructive database operations.
- Database: additive migrations only (new tables/columns), never drop or
  rewrite existing data.
- Production deploys only after tests pass; check health after each deploy.
- Never invent facts, trends or testimonials on public pages.
- Record every decision and every open question for the owner below.

## Workstreams and status
| # | Item | Status |
|---|------|--------|
| 1 | Product name + .com availability + conflict check, decision recorded | done — **DentVideo** (dentvideo.com) |
| 2 | Data model: clinics, dental content items (additive migration) | done — on Liman (`supabase/liman/0001_dentvid.sql`) |
| 3 | Worker jobs: weekly content run + recording run, results stored | done |
| 4 | Web app: clinic onboarding (profile, brand colour, logo) | done — /dentvideo/app |
| 5 | Web app: content library — preview, findings, approve / reject, download | done |
| 6 | Web app: upload a recording (shoot card shown) | done — /dentvideo/app/record |
| 7 | Brand landing + SEO/GEO pages for dentists (EN, DE, ES, TR) | done — EN + DE/ES/TR/FR landings, 7 guides, hreflang, /dentvideo/llms.txt, sitemap (PR #13) |
| 8 | End-to-end check on production, QA pass, final report for the owner | in progress — test clinic week running on production worker |

## Decisions log
- **Name: DentVideo — dentvideo.com (available 2026-11-08), the owner's
  suggestion over my first pick "DentVid"**: "video" is the same word in
  EN/DE/ES/TR and matches "dental video" searches. No company or product of
  that name found (closest: Video Dental Concepts, intraoral cameras,
  videodental.com — different field). Internal table prefix stays `dentvid_`.
- First pick before that: DentVid — dentvid.com (available). Checked ~80 candidates.
  Rejected "…Clip(s)" names (a "dental clip" is a physical denture/orthodontic
  part — search results would be about hardware), "…Reels"/"…Shorts" names
  (Meta's and YouTube's product names: trademark risk), and every premium-
  sounding .com (all registered). No product named DentVid found on the web.
  Clear meaning in EN/DE/ES/TR ("dental video"), short, no platform names.

- **Backend on Liman** (owner's instruction): tables `dentvid_clinics`,
  `dentvid_items` in Liman's public schema (Liman exposes only public; other
  apps there use prefixes too), private storage bucket `dentvid`, RLS so a
  clinic sees only its own rows. Accounts are Liman auth users. The same two
  tables were first created in the ClipForge cloud project (clipforge.clinics,
  clipforge.dental_items); they are empty and unused — left in place, not
  dropped (no destructive operations overnight).
- **App location**: DentVideo runs inside the existing web app under
  /dentvideo with its own Liman client, so it can be served on dentvideo.com
  later by pointing the domain at the same app (host-based routing).

- **Sign-up**: Liman has public sign-up disabled (it hosts other apps), so
  DentVideo creates accounts server-side with the service role
  (/api/dentvideo/signup) and the browser signs in with the password. The
  global Liman setting was not changed.
- **Pricing**: not invented. The site says "first week free, founding clinics
  get introductory pricing when plans open" until the owner sets prices.

## Questions for the owner
- Prices for DentVideo (and then the Dodo brand + products once the domain is bought).
- Buy **dentvideo.com** (and ideally dentvideo.de / .es / .com.tr). Before buying,
  a trademark search (USPTO, EUIPO, TÜRKPATENT) was not possible from here.
