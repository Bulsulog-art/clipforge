# DentVideo: operating brief

DentVideo (dentvideo.com) is a SaaS for dental clinics. Every Monday it delivers five short,
narrated, captioned patient-education videos in the clinic's language, with the clinic's logo and
colors. Every script is software-checked for clinical accuracy and the clinic's national
health-advertising rules before the dentist sees it. Nothing is published without the dentist's
approval, and the clinic posts from its own accounts.

Company: "BLS AI AUTOMATION" DOO PODGORICA (brand Bulsu Labs), Podgorica, Montenegro.
Contact: hello@dentvideo.com. The owner speaks Turkish: answer them in Turkish.

This repo also contains ClipForge (the older mobile app). DentVideo code lives mainly in
`web/src/**/dentvid*`, `web/src/app/dentvideo/**`, `web/src/app/api/dentvideo/**`,
`worker/src/dental/**`, `worker/src/dentvid/**` and `supabase/liman/**`.

## Non-negotiable rules

- **Money.** Do not spend paid API credit (Anthropic, OpenAI, ElevenLabs, Firecrawl, Apify, ads) unless
  the owner approved that specific spend. Tests run with `OPENAI_API_KEY=x`, no `ANTHROPIC_API_KEY`
  and mocked HTTP.
- **AI providers.** All text (scripts, reviews, captions, ClipForge scoring and translation) runs on
  the Claude API; OpenAI is used only for narration (TTS) and the transcription fallback.
  `LLM_PROVIDER=openai` switches text back to OpenAI without a deploy. Before clinics have had the
  DPA's 30-day sub-processor notice for Anthropic, the worker runs with `LLM_PROVIDER=openai`.
  Details: `docs/AUTONOMOUS_PLAN.md` ("Text on Claude").
- **Honesty.** No invented customers, testimonials, ratings, statistics, outcome claims, "#1" or
  "best" claims. No discounts, coupons, referral rewards, free videos, guarantees or refund offers.
- **No manipulation.** No click bots, fake reviews, fake traffic, doorway pages or keyword stuffing.
- **Outbound.** Never send outreach emails, DMs, posts or listings on the owner's behalf without
  explicit approval. Test emails go only to the owner or to `delivered@resend.dev`.
- **Secrets.** Never print, commit or ask for secrets in chat. Use the environment's credential
  mechanism. Never publish personal data (IDs, passport, birth dates).
- **bulsulabs.com** must not mention DentVideo.
- **New idea-level features:** ask the owner in one sentence first. Fixes, quality and polish
  within the agreed direction need no permission.
- **Never** commit `node_modules`, `web/node_modules` symlinks or `worker/package-lock.json`.

## Prices (source of truth: `web/src/lib/dentvid/pricing.ts`)

| Plan | USD | EUR | TRY |
|---|---|---|---|
| Starter | 49 | 49 | 1.490 |
| Practice | 79 | 79 | 2.490 |

Monthly, cancel anytime. Group: priced per location, by contact. Payments: Dodo Payments (merchant
of record). Products: Starter `pdt_0NrVahwZsINvy3TNz2H35`, Practice `pdt_0NrVai0xqpQKU8H3Zj3QN`.

## Release flow

1. Work in your own git worktree on a `claude/...` branch, never on `main`.
2. Before pushing: `node scripts/sync-hard-rules.mjs --check`, `node scripts/sync-remotion.mjs --check`,
   web `npx tsc --noEmit && npx vitest run`, worker `npx tsc --noEmit && OPENAI_API_KEY=x npx vitest run`.
3. Merge `origin/main` into the branch, re-run the checks, open a PR (draft first), squash-merge with
   the expected head SHA.
4. Deploy through the Coolify API (`POST /api/v1/deploy?uuid=`): web `y11bhiffmpb3u2hdekwhjhdq`,
   worker `aeoe3zdfhbhqzi89g32gkuwx` (only if worker code changed). Wait until `/deployments` is empty.
5. Verify live: pages return 200, changed assets match the repo by hash, worker `running:healthy`.
6. Migrations in `supabase/liman/` are applied by hand after review; run the check queries at the
   bottom of each file. Existing rows must still pass the guards.

## Release gate (owner rule: nothing ships until we are certain)

- **Web and worker:** a change reaches production only after every check passes, the risky paths
  (money, auth, data, emails, worker spend) have tests for success AND failure, cross-clinic access
  is tested for any new endpoint, and the changed screens were looked at in a local build. After the
  deploy, verify live; roll back at once if anything is off.
- **iOS app:** nothing goes to TestFlight external testers or App Store review until
  `docs/IOS_RELEASE_CHECKLIST.md` is fully green: unit + XCUITest suites on several simulators and
  iOS versions, and the owner's manual test on a real iPhone (sign-in, approve, post to Instagram and
  TikTok, record and upload, push notification). Internal TestFlight builds are allowed only for
  that testing. The owner approves every App Store submission explicitly.
- **iOS CI runs only when started by hand** (`.github/workflows/ios-dentvideo.yml`, workflow_dispatch).
  Pull requests do not trigger it, so failures on work in progress do not email the owner. Start it
  once the app work is ready, and do not add push or pull_request triggers back.
- When in doubt, do not ship: write down what is unproven and test it first.

## Quality references

- `docs/KNOWN_MISTAKES.md`: every mistake seen in a render, and the check that now catches it.
  A new mistake gets a row and a check before the next release.
- `docs/QUALITY.md`, `docs/PREVIEW_RERENDER.md`: how samples are rendered and judged.
- `docs/SECURITY.md`: threat model, findings by round, owner checklist.
- `docs/SITE_RESEARCH.md`: design system and the research behind it.
- `docs/SEO_PLAN.md`, `docs/ADS_TRACKING.md`, `docs/TTS.md`.

## Team

Specialised agents live in `.claude/agents/`. Use them for their area; each has its own checklist.
