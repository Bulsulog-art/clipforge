# Security & cost-abuse map (DentVideo + ClipForge)

Owner's brief: *never let a flood of requests or a runaway job turn into a bill.*
The VPS (Hostinger, one box, Coolify) is fixed-price, so raw request counts do
not bill — but these do:

| Metered thing | Who pays per call | Where it is called |
|---|---|---|
| OpenAI text (gpt-5.4-mini / gpt-5.4), TTS (tts-1-hd), Whisper API fallback | us | worker only (dentvid jobs, ClipForge pipeline/generate/derivatives) |
| fal.ai | us | our own photo generation scripts only (not reachable from the web) |
| Resend email | us (plan quota) | web `/api/internal/dentvideo/notify`, worker owner alerts |
| ElevenLabs | us | ClipForge `/api/voice-clones` (paid tier only) |
| Dodo checkout API | free per call, but rate-limited by Dodo | `/api/dentvideo/checkout`, `/api/billing/checkout` |
| VPS CPU / disk / bandwidth | finite | Remotion renders, ffmpeg, local Whisper, uploads into Liman storage |

Defence in layers:

1. **Edge** (owner step): Cloudflare in front of dentvideo.com — WAF, bot fight mode, rate-limit rules.
2. **Middleware**: cheap per-IP limit on every `/api/*` request (300/min, in memory).
3. **Per-route limits** (Redis, `web/src/lib/rate-limit*.ts`): per IP / per account / global.
4. **Spend guard** (worker, `worker/src/dentvid/spend-guard.ts`): every paid API call in a DentVideo job is budgeted in Redis first — per clinic and globally, per day and per month — **fail-closed**.
5. **Provider hard limits** (owner step): OpenAI monthly cap, fal.ai auto top-up off, Resend quota.

Layers 2–3 fail **open** (if Redis is down, requests pass — availability) because
layer 4 fails **closed** (if Redis is down, nothing is spent).

---

## 1. Threat / cost map

Legend — **Caller**: anon = anyone on the internet; user = signed-in account;
paying = clinic with `plan = active`; worker = bearer `WORKER_INTERNAL_TOKEN`;
signed = provider signature. **Limit** after this change; ⚠ = a gap found
(fixed unless marked *open*).

### DentVideo web (`web/src/app/api/dentvideo/*`, served on dentvideo.com)

| Endpoint | Caller | Cost per call | Limits now | Gaps found |
|---|---|---|---|---|
| `POST /signup` | anon | Liman `auth.admin.createUser` (service role, confirmed account), DB row | 5/10 min + 20/day per IP, 200/h global; honeypot + min 2.5 s fill time | ⚠ no rate limit, no bot check → mass account creation |
| login (browser → Liman GoTrue directly) | anon | GoTrue CPU | GoTrue's own `GOTRUE_RATE_LIMIT_*`; Cloudflare | *open*: the app never sees it — owner step (Cloudflare rule on `/auth/v1/token`) |
| `POST /clinic` | user | DB upsert | 30/10 min per user; logo path must be exactly `<uid>/logo.<ext>` | ⚠ prefix-only path check |
| `POST /verify-email` (send / confirm / change) | user | send: 1 Resend email; confirm: Redis get/set + admin `updateUserById`; change: admin `updateUserById` + 1 email | send: 1 per 60 s per user (code record), 6/h per user, 6/h per address, 20/h per IP, 300/h global; confirm: 5 tries per code (then re-send), 15/10 min per user, 60/10 min per IP; change: 3/h per user, unverified accounts only. Only an HMAC of the code is stored (Redis `dv:verify:<uid>`, 15-min TTL) | `/signup` creates Liman-confirmed accounts, so ownership is tracked separately in `user_metadata.email_verified_at/for` |
| `POST /password-reset/exchange` | anon (holder of a reset link) | GoTrue `verifyOtp` + admin `updateUserById` | 20/h per IP | A successful recovery exchange proves the address and marks it verified |
| `POST /checkout` | user | 1–2 Dodo API calls | 10/10 min per user, 30/h per IP; **403 unless the address is verified** | ⚠ none |
| `POST /recording` (after browser upload to Liman) | paying (Practice/Group) | queues **recording** job: download, ffprobe, transcription (local Whisper = CPU; API fallback $0.006/min), LLM scoring + reviews, up to 6 renders | 6/h + 5/day per user; strict path regex; worker: spend guard, ≤ 600 MB, ≤ 30 min | ⚠ unlimited; ⚠ `..` in path only prefix-checked; ⚠ no size/duration cap server-side |
| `POST /week` | paying | queues **week** job: ~5 videos × (LLM writers + reviewers + TTS + Remotion render) ≈ $0.25 | 10/h per user; job id per clinic+week; worker: ≤ 3 week runs per clinic per ISO week | ⚠ a failed run could be re-queued forever |
| `POST /items/[id]/backgrounds` | user (owner of item) | queues **restyle**: 1 TTS (~$0.02) + 1 full render (CPU minutes) | 6/10 min + 10/day per user; worker: paying check + 10/day per clinic | ⚠ unlimited; ⚠ worker did not check the plan (cancelled clinics could re-render) |
| `PATCH /items/[id]` | user (owner) | DB update | 120/10 min per user | — |
| `POST /event` | anon / user | 1 DB insert (`dentvid_events`, migration 0006) | 60/10 min per IP, 20k/h global; body ≤ 1 KB; allow-listed names and per-event prop shapes (no free text, emails/phones dropped); browsers may send only `landing_view`, `preview_started`, `preview_step_viewed`, `plan_clicked`, `video_shared` — payment, sign-up, checkout, approval and week events are recorded server-side only; clinic id taken from the session, never the body; no IP/UA stored | — |
| `/admin`, `/admin/clinic/[id]` (owner dashboard, pages) | admin | service-role reads of all clinics, items, events; Redis spend counters; optional Dodo `GET /discounts` | 404 unless the signed-in Liman user **id** is in `DENTVIDEO_ADMIN_USER_IDS`; noindex | Email-based access would be unsafe: `/signup` creates confirmed accounts before the address is verified (the 6-digit code only gates checkout and mail), so anyone could register an admin's email first. Ids are assigned by Liman. |
| storage upload (browser → Liman `dentvid` bucket) | user, own folder (RLS) | VPS disk | migration 0004: 500 MB per object, MIME allow-list (mp4/mov/webm/m4v/png/jpeg/webp) | ⚠ no server-side size/type limit (client-only 500 MB) → disk exhaustion *(fixed once 0004 is applied)* |

### Webhooks & internal

| Endpoint | Caller | Cost | Limits now | Gaps found |
|---|---|---|---|---|
| `POST /api/dodo/webhook` | signed (Standard Webhooks HMAC, 5-min timestamp tolerance — verified) | DB writes; DentVideo activation queues the first week | 600/min per IP; body ≤ 256 KB; **replay protection**: each `webhook-id` processed once (Redis, 7 days), failed deliveries released for Dodo's retry | ⚠ signed request could be replayed within 5 min; raw DB error text returned |
| `POST /api/revenuecat/webhook` | bearer secret | DB writes | global per-IP | — |
| `POST /api/internal/dentvideo/notify` | worker (bearer, constant-time compare) | 1 Resend email | 6/h per clinic, 300/h global | ⚠ leaked token = unlimited emails to every clinic |
| `POST /api/internal/dentvideo/lifecycle` | worker, hourly (bearer, constant-time compare) | ≤ 50 reminder emails per run | 6 runs/h; 100 reminders/h global; once per clinic and kind (`dentvid_email_log`) | a leaked token can only send reminders that are already due, once |
| `GET`/`POST /api/dentvideo/unsubscribe?t=` | anyone with the signed link (HMAC token). GET only shows a confirm page (link scanners cannot opt out); POST = the button or RFC 8058 one-click, exempt from the Origin check | 1 DB write (POST only) | 30 / 10 min per IP | — |
| `GET /api/health?deep=1` | anon | outbound calls to Supabase, Redis, OpenAI | 10/min per IP; error text no longer exposed | ⚠ public amplifier; leaked raw error messages |
| `GET /api/health` | anon | none | excluded from middleware | — |

### ClipForge web (`web/src/app/api/*`, clipforge.bulsulabs.com + iOS app)

All need a ClipForge (cloud Supabase) session or bearer token unless noted; all
are now under the 300/min per-IP middleware limit. Paid work is gated by
**credits / monthly quota** reserved before queueing (ClipForge's existing
cost model; `worker/src/jobs/cost-monitor.ts` pushes a daily $ alert).

| Endpoint | Cost | Existing gate | Notes |
|---|---|---|---|
| `POST /api/jobs`, `/api/jobs/upload` (≤ 4 GB), `/api/jobs/[id]/retry` | download/transcribe/render (CPU), gpt-4o-mini scoring | monthly `videos_limit` quota | upload size checked server-side |
| `POST /api/generate`, `/api/generate/assets` (≤ 200 MB) | LLM plan + TTS + render | 1 credit | — |
| `POST /api/clips/[id]/translate` | LLM + TTS | 2–5 credits | — |
| `POST /api/clips/[id]/remix` | full pipeline | 1 credit (charged in worker) | — |
| `POST /api/clips/[id]/publish`, `/api/publishes/*` | social APIs | own clips | — |
| `POST /api/voice-clones` (≤ 8 MB) | ElevenLabs voice add | paid tier | *open*: no per-user count cap (ElevenLabs slot limit applies) |
| `POST /api/promo/redeem`, `/api/referrals/apply` | credits | RPC-validated codes | brute-force of codes limited only by the global per-IP limit — *open, low* |
| `POST /api/events`, `/api/feedback`, `/api/account/*`, `/api/branding*`, `/api/storage/sign`, `/api/analytics`, `/api/flags`, `/api/trends`, `/api/announcements`, `/api/channels*`, `/api/push-preferences`, `/api/avatars`, `/api/billing/checkout`, `/api/auth/*` (OAuth) | DB / storage | session | global per-IP only |

### Worker jobs (`worker/src/index.ts`)

| Queue / job | Trigger | Cost per run | Limits now |
|---|---|---|---|
| `dentvid` **week** | Monday 05:00 UTC dispatch (paying clinics), `/week`, Dodo activation | ≈ $0.25 OpenAI (budgeted $0.50) + 5 renders | paying check → **spend guard** (global day/month $ scaled by active clinics, clinic day $, ≤ 6 runs/clinic/week) → parked + alert on refusal; 4 attempts with backoff, top-up of thin weeks, owner alert on final failure (§2b) |
| `dentvid` **recording** | `/recording` | ≤ $0.50 budgeted; CPU heavy | paying check → spend guard (≤ 5/clinic/week) → path ownership, ≤ 600 MB, ≤ 30 min |
| `dentvid` **restyle** | `/items/[id]/backgrounds` | ≈ $0.02 TTS + 1 render | paying check (new) → spend guard (≤ 10/clinic/day) → refused = card shows "failed" |
| `dentvid` **dispatch** | scheduler | DB read | — |
| `video-pipeline`, `generate`, `derivative`, `publish` | ClipForge routes | per ClipForge credit model | credits/quota; concurrency env; daily cost-monitor alert |
| cron: trend snapshot, cost monitor, metrics, stuck-job reaper | timers | small | — |
| cron (new): resume parked dentvid jobs | every 15 min (`DENTVID_PARK_RESUME_MIN`) | none | re-queues a parked job only when a dry-run of the guard passes |

Concurrency (`DENTVID_CONCURRENCY=1`, `VIDEO_CONCURRENCY`, …) bounds CPU: a
flood of queued jobs makes a queue longer, it does not make the box fall over.

### Data isolation (Liman, `supabase/liman/*.sql`)

- `dentvid_clinics`, `dentvid_items`: RLS on; select/update only `auth.uid() = owner_id`; no owner insert/delete on items. Cross-clinic **reads/writes are blocked**. ✔
- ⚠ The owner's update policy covers the **whole row**, and the owner holds the anon key + their JWT, so they can call PostgREST directly:
  - `dentvid_items.plan` → rewrite narration → unreviewed text through TTS under their brand (compliance bypass, spend);
  - `dentvid_items.video_path` → point at another clinic's file → the restyle job then **deleted it with the service role**;
  - `dentvid_clinics.logo_path` → another owner's file read with the service role.
  Fixed twice: the worker only touches keys inside `<owner_id>/` (`ownedKey`), and migration **0004** adds triggers that limit owner edits to `approval`, `approval_note`, `plan.backgrounds` (library paths only), `restyle_*`, and a logo path of the exact form `<uid>/logo.<ext>`.
- Billing columns (`plan`, `plan_tier`, …) are already protected by the 0002 trigger. ✔
- Storage: read/insert only in `(foldername)[1] = auth.uid()`. ✔ Signed URLs are created with the *user's* client, so a forged path cannot be signed. ✔
- *Note (functional, not security)*: there is no storage UPDATE policy, so `upload(..., { upsert: true })` of a logo with the same extension as the existing one fails. Fix by adding an own-folder UPDATE policy if logo replacement errors are reported.

### Retention (owner decision — not automated)

Raw recordings (`<uid>/recordings/*`) are kept forever after processing, and so
are all past weeks' videos (only the file a restyle replaces is deleted).
Storage grows by roughly 5 videos × ~10 MB per clinic per week plus recordings.
Recommended: delete raw recordings 30 days after their clips were made. Run on
Liman (review first, it is destructive):

```sql
-- what would go
select o.name, o.created_at, (o.metadata->>'size')::bigint as bytes
  from storage.objects o
 where o.bucket_id = 'dentvid' and o.name ~ '^[0-9a-f-]{36}/recordings/' and o.created_at < now() - interval '30 days';
-- then delete through the Storage API (deleting rows in storage.objects leaves the files on disk).
```

---

## 2. Spend guards (worker)

`worker/src/dentvid/spend-guard.ts`, wired in `worker/src/dentvid/jobs.ts` and `worker/src/index.ts`.

- Before the **first** paid call of a week, recording or restyle, the job reserves its estimated cost atomically (one Redis Lua script, all-or-nothing) against:
  `dv:spend:usd:day:<date>`, `dv:spend:usd:month:<yyyy-mm>`, `dv:spend:usd:clinic:<id>:<date>`, and the per-clinic op counter for that job type.
- **Refused →** week / recording: the BullMQ job fails with an `UnrecoverableError` (no retry storm) and is **parked** in `dv:parked`; every 15 minutes parked jobs whose guard check now passes are put back on the queue (same job id, so no duplicates). Parked > 7 days → dropped and logged. Restyle: refused, card shows "failed".
- **Alert**: one email to `OWNER_ALERT_EMAIL` per reason per day (per clinic for clinic-level reasons), via Resend from the worker. De-duplicated in Redis, or in process memory when Redis is down. Never more than a handful of emails a day.
- **Fail-closed**: no Redis (or Redis not `ready`) → nothing is spent; the job errors and BullMQ retries it with backoff (it cannot be parked without Redis either).
- **Kill switch**: `DENTVID_PAUSE_GENERATION=1` → every week/recording is parked, every restyle refused, one alert. Remove it and redeploy/restart: parked jobs resume within 15 minutes.

Cost estimates (on purpose ≈ 2× measured; change via env when models or prices change):

| Op | Budgeted | Basis |
|---|---|---|
| week (5 videos) | $0.50 | text $0.034 per ready video with gpt-5.4-mini/gpt-5.4 incl. rewrites (docs/AUTONOMOUS_PLAN.md); tts-1-hd $30/1M chars × ~600 chars ≈ $0.02/video |
| restyle | $0.03 | one tts-1-hd re-synthesis of the stored narration |
| recording | $0.50 | Whisper API fallback $0.006/min × 30 min max = $0.18 (local faster-whisper = $0) + scoring/reviews for ≤ 6 clips |

**Global ceilings scale with paying clinics.** Their job is to catch runaway
bugs, not to limit growth (per-clinic caps bound abuse, and unpaid clinics
cannot generate at all). In force at any moment:

- daily = max(`DENTVID_DAILY_USD_CAP` = $20, active × `DENTVID_DAILY_USD_PER_ACTIVE_CLINIC`)
  — default per clinic = week + one recording + 5 restyles = **$1.15**, because every week runs on Monday;
- monthly = max(`DENTVID_MONTHLY_USD_CAP` = $300, active × `DENTVID_MONTHLY_USD_PER_ACTIVE_CLINIC`)
  — default per clinic = 4.5 weeks + 4 recordings + 30 restyles = **$5.15**.

`active` = clinics with `plan = 'active'` on Liman, counted with a head-only
count query and cached 10 minutes. If the count fails, the env caps apply
(spending is still bounded; nothing is blocked silently) and the owner gets one
alert that day; with many clinics some Monday weeks may then park and they
resume within 15 minutes of the count working again. Example: 100 paying
clinics → $115/day, $515/month; a single clinic looping is stopped after 6
week runs / 10 restyles / $5 a day whatever the global room. (6 = a week's 4
automatic attempts — see Self-healing below — plus room for a manual re-run.
A week that ends thin may reserve one `topup`, $0.30, money only.) If Redis is down the guard
still fails closed.

### Self-healing (before anyone is alerted)

`worker/src/dentvid/retry.ts`, `jobs.ts`, `watchdog.ts`, `dental/week.ts`.

- **Week jobs retry with backoff**: `attempts: 4`, exponential from 2 min (2 → 4 → 8 min) — the same options wherever a week is queued (Monday dispatch, payment webhook, the app's button, parked-job resume, watchdogs; web keeps the numbers in `lib/dentvid/week-job.ts`, a test checks they match).
- **Transient vs permanent** (`classifyFailure`): 429, 5xx, timeouts (incl. render timeouts), network resets, storage errors, "zero usable videos" → retried. 400/401/403, missing clinic, invalid profile (Zod), quota, `UnrecoverableError` → **not** retried; the owner is told at once. Unknown → retried (the spend guard caps what retries can cost).
- **Inside a week**: each video that fails technically is re-attempted once; a failed upload is retried once; a week with fewer than 3 usable videos is topped up with extra topics (one round, budgeted as `topup`); nothing usable and the failures were technical → nothing is stored and the job fails transiently so BullMQ retries it.
- **The clinic never sees raw errors**: technical failures go to `dentvid_items.error` (owner only), never to `findings`; the library shows a calm, localized note from the worker's `dv:weekstate:<clinic>:<week>` key — "taking a little longer, retrying automatically" while retries remain, "delayed, we're on it" after the last one.
- **First week** (`watchdog-first-week`, every 15 min): a clinic that paid (event `payment_succeeded` first=true, or the webhook's Redis marker `dv:ops:paid`) with no videos after 45 min is re-queued once per payment (missing job → added under its id; failed → retried; completed-but-empty → `week:<clinic>:<monday>:requeue`; queued/running → left alone).
- **Monday** (`watchdog-monday`, 07:00 UTC): every active clinic must have `week:<clinic>:<monday>`; missing ones are queued (same id, never doubled).

## 2b. Owner alerts

One helper, `ops-alert.ts`, byte-identical in `worker/src/dentvid/` and `web/src/lib/dentvid/` (a web test fails if they differ): what each alert says, one email per **incident key per UTC day**, at most `DENTVID_ALERT_MAX_PER_HOUR` (8) emails an hour (then one "muted" note), Redis de-duplication with an in-process fallback, Resend to `OWNER_ALERT_EMAIL`. Every email: Turkish + English subject, what happened, the clinic (name + id, tier, country, email when known), what the system already did, what to do.

| Alert | Raised by | Threshold / key |
|---|---|---|
| A paying clinic's week failed | worker `jobs.ts` | after the last attempt, or at once if permanent · `week_failed:<clinic>:<week>` |
| Thin week delivered | worker `jobs.ts` | < 3 usable after re-attempts and top-up · `thin_week:<clinic>:<week>` |
| Monday dispatch did not run / zero jobs / a clinic without a job | worker `watchdog.ts`, Mon 07:00 UTC | `dispatch:<week>` |
| First week not delivered 2 h after payment | worker `watchdog.ts` | 120 min (`DENTVID_FIRST_WEEK_ALERT_MIN`) · `first_week_late:<clinic>` |
| Webhook signature failures | web Dodo route | ≥ 5 / hour (`DENTVID_ALERT_WEBHOOK_SIG_PER_HOUR`) |
| Webhook processing failed (5xx / exception) | web Dodo route | every one, de-duplicated per event type per day |
| Customer payment failed / subscription stopped | web `billing-webhook.ts` | `payment.failed`, `past_due`, `on_hold`/`failed` (→ paused), `cancelled`/`expired` of an active clinic · per clinic + event |
| Emails failing (Resend) | web `email.ts` | ≥ 3 / hour (`DENTVID_ALERT_EMAIL_FAIL_PER_HOUR`) |
| Render failures spiking | worker | ≥ 5 / hour (`DENTVID_ALERT_RENDER_FAIL_PER_HOUR`) |
| 5xx spiking | web `instrumentation.ts` (`onRequestError`) + webhook 5xx | ≥ 10 / hour (`DENTVID_ALERT_5XX_PER_HOUR`) |
| New paying clinic (good news) / a clinic came back | web `billing-webhook.ts` | at once · `new_paying:<clinic>` |
| Spend guard refusals (existing) | worker `spend-guard.ts` | per reason per day (unchanged), now through the same helper |

**Daily digest** — 08:30 Europe/Istanbul (worker scheduler `dentvid-digest` → `POST /api/internal/dentvideo/digest`), only if anything happened in the last 24 h, once per day: sign-ups, new paying clinics, MRR and its 24 h delta (snapshot `dv:ops:mrr`), paying clinics, lost/at-risk clinics, weeks delivered/failed, emails sent/failed, alerts raised.

**Kill switch**: `DENTVID_OWNER_ALERTS=off` — alerts are only logged and the digest is not sent (self-healing keeps working). Counters live in Redis under `dv:ops:*` / `dv:alert:*` (TTL ≤ 3 days); no database migration.

ClipForge's own worker queues are not behind this guard; they spend credits
users paid for, and `cost-monitor.ts` alerts daily. The OpenAI dashboard cap
(owner checklist #1) is the backstop for both products.

## 3. Rate limiting (web)

- `web/src/lib/rate-limit.ts` — sliding-window counter (pure; tests in `rate-limit.test.ts`), `LIMITS` table (all numbers in one place), `clientIp()`.
- `web/src/lib/rate-limit-server.ts` — Redis store on `REDIS_URL`, 500 ms timeout, fail-open; `rateLimited()` returns a 429 with `Retry-After` and the localized `errors.tooMany` text (dvErrors) for DentVideo routes.
- `web/src/middleware.ts` — 300 req/min per IP on `/api/*`, in process memory (bounded map). Pages and static files are not counted.
- **Client IP**: `x-real-ip` (set by Traefik), else the last `x-forwarded-for` hop. Behind Cloudflare set `TRUST_CF_CONNECTING_IP=1` **only after** the origin accepts Cloudflare IPs only — otherwise anyone can choose their own bucket.
- Sign-up bot brakes: hidden honeypot field + ≥ 2.5 s form time (`lib/dentvid/bot-check.ts`). Optional upgrade: Cloudflare Turnstile (owner step below) — needs a site key + secret.
- Dodo webhook replay: `lib/webhook-replay.ts` (tests in `webhook-replay.test.ts`, `app/api/dodo/webhook/replay.test.ts`).

## 4. HTTP hardening

- CSP (`web/next.config.ts`): unchanged policy plus the Liman origin (from `NEXT_PUBLIC_DENTVID_SUPABASE_URL`, needed by the browser for sign-in, uploads and signed video URLs); removed `api.openai.com` and `fal.run` from `connect-src` (server-side only). `frame-ancestors 'none'` + `X-Frame-Options: DENY`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- HSTS `max-age=63072000; includeSubDomains; preload` ✔. Added `Cross-Origin-Opener-Policy: same-origin-allow-popups`, removed `X-Powered-By`.
- *Open*: `script-src` keeps `'unsafe-inline' 'unsafe-eval'` (Next bootstrap / Remotion player); moving to nonces is a separate change.
- noindex: `/app/*`, `/start`, `/preview-demo`, `/dev/funnel` carry `robots: noindex`; `/dev/funnel` 404s unless `DENTVIDEO_DEV_PREVIEW=1` (never set it in production); dentvideo.com `robots.txt` now also disallows `/dev/`.
- Secrets in client bundles: the production build was grepped for service-role keys, Resend/OpenAI/Dodo keys and `WORKER_INTERNAL_TOKEN` — none (only `NEXT_PUBLIC_*` values, which are public by design).
- Error messages: webhook grant failures and `/api/health` probes no longer echo database / network error text.

## 5. New environment variables

| Var | Where | Default | Meaning |
|---|---|---|---|
| `OWNER_ALERT_EMAIL` | worker + web | — (alerts only logged) | where owner alerts and the daily digest go |
| `RESEND_API_KEY` | worker (already on web) | — | needed for worker alerts |
| `DENTVID_OWNER_ALERTS` | worker + web | on | `off` = no owner alert emails, no digest (logged only) |
| `DENTVID_ALERT_MAX_PER_HOUR` | worker + web | `8` | most alert emails per clock hour (then one "muted" note) |
| `DENTVID_ALERT_WEBHOOK_SIG_PER_HOUR` / `_EMAIL_FAIL_PER_HOUR` / `_RENDER_FAIL_PER_HOUR` / `_5XX_PER_HOUR` | worker + web | `5` / `3` / `5` / `10` | spike thresholds |
| `DENTVID_FIRST_WEEK_REQUEUE_MIN` / `DENTVID_FIRST_WEEK_ALERT_MIN` | worker | `45` / `120` | first week: re-queue, then alert |
| `DENTVID_COST_TOPUP_USD` | worker | `0.30` | budget for topping up a thin week |
| `DENTVIDEO_EMAIL_FROM` | worker (optional) | `DentVideo <hello@dentvideo.com>` | sender |
| `DENTVIDEO_EMAIL_REPLY_TO` | web (optional) | `hello@dentvideo.com` | reply-to on every DentVideo email |
| `DENTVIDEO_UNSUBSCRIBE_SECRET` | web | falls back to `WORKER_INTERNAL_TOKEN` | signs unsubscribe links; changing it invalidates links already sent |
| `DENTVIDEO_LIFECYCLE_EMAILS` | web | on | `off` = no welcome / reminder emails |
| `DENTVIDEO_LIFECYCLE_MAX_PER_RUN` | web | `50` | reminders per hourly run |
| `DENTVID_PAUSE_GENERATION` | worker | off | `1` = kill switch for all DentVideo paid work |
| `DENTVID_DAILY_USD_CAP` | worker | `20` | floor of the global DentVideo $ per UTC day |
| `DENTVID_MONTHLY_USD_CAP` | worker | `300` | floor of the global DentVideo $ per month |
| `DENTVID_DAILY_USD_PER_ACTIVE_CLINIC` | worker | `1.15` (derived from the op costs) | daily ceiling growth per active clinic |
| `DENTVID_MONTHLY_USD_PER_ACTIVE_CLINIC` | worker | `5.15` (derived) | monthly ceiling growth per active clinic |
| `DENTVID_PARK_RESUME_MIN` | worker | `15` | how often parked jobs are re-checked |
| `DENTVID_CLINIC_DAILY_USD_CAP` | worker | `5` | per clinic per day (4 week attempts + top-ups fit) |
| `DENTVID_MAX_WEEKS_PER_CLINIC_WEEK` | worker | `6` | week runs per clinic per ISO week (4 automatic attempts + a re-run) |
| `DENTVID_MAX_RESTYLES_PER_CLINIC_DAY` | worker | `10` | re-renders per clinic per day |
| `DENTVID_MAX_RECORDINGS_PER_CLINIC_WEEK` | worker | `5` | recordings per clinic per ISO week |
| `DENTVID_MAX_RECORDING_MIN` | worker | `30` | longest recording processed |
| `DENTVID_COST_WEEK_USD` / `_RESTYLE_USD` / `_RECORDING_USD` | worker | `0.50` / `0.03` / `0.50` | per-op estimates |
| `TRUST_CF_CONNECTING_IP` | web | off | `1` once dentvideo.com is behind Cloudflare with the origin locked |
| `DENTVIDEO_ADMIN_USER_IDS` | web | — (nobody) | comma-separated Liman auth user UUIDs that may open `/dentvideo/admin`; email addresses grant nothing |

The compose file loads both services from `web/.env`, so in Coolify add them to the shared env.

## 6. Owner checklist (only you can do these — highest impact first)

1. **OpenAI hard cap** — platform.openai.com → Settings → Limits: set a monthly **budget** above the guard's monthly ceiling (≥ $300, or active clinics × $5.15 + ClipForge usage) and email alerts at 50% / 80%. Use a separate **project** + key for the worker so a leaked ClipForge key cannot drain DentVideo's budget and vice versa. This is the backstop behind everything in this document.
2. **Rotate the Coolify API token** — it appeared in a session scratchpad. Coolify → Keys & Tokens → revoke and create a new one; update anywhere it is used.
3. **fal.ai** — dashboard → Billing: turn **auto top-up OFF**, keep a small prepaid balance; delete keys you do not use. fal is only for our own photo generation.
4. **Set `OWNER_ALERT_EMAIL` + `RESEND_API_KEY` on the worker** and apply **`supabase/liman/0004_dentvid_hardening.sql`** on Liman (SQL editor; run the checks at its bottom). Also check Liman's storage `FILE_SIZE_LIMIT` env is ≥ 500 MB if large recordings must upload.
5. **Cloudflare in front of dentvideo.com** (free plan is enough):
   1. Add the site in Cloudflare, switch the nameservers at the registrar.
   2. DNS: `dentvideo.com` and `www` A records → VPS IP, **proxied (orange cloud)**. Do the same for `clipforge.bulsulabs.com` if wanted; leave `liman.bulsulabs.com` / Coolify **DNS-only** unless you also lock those down.
   3. SSL/TLS → **Full (strict)** (Traefik already has a Let's Encrypt cert); Always Use HTTPS on.
   4. Security → Bots: **Bot Fight Mode** on. WAF → managed rules on.
   5. WAF → Rate limiting rules: e.g. `/api/dentvideo/signup` 5 req / 10 s per IP → block 10 min; `/api/*` 300 req / min per IP → managed challenge; Liman `/auth/v1/token` (if proxied) 10 / min per IP.
   6. Lock the origin: in Hostinger's firewall (or `ufw`) allow 80/443 **only from Cloudflare's IP ranges** (cloudflare.com/ips), keep SSH restricted to your IP. Then set `TRUST_CF_CONNECTING_IP=1` on the web app.
   7. Optional: **Turnstile** on the sign-up form — create a widget, give us the site key/secret and we wire the server-side check into `/api/dentvideo/signup`.
6. **Resend** — set a daily sending limit / usage alert in the Resend dashboard; verify only the domains you send from; restrict the API key to "sending access".
7. **Backups** — Hostinger hPanel → VPS → Snapshots & Backups: enable weekly automatic backups and take a manual snapshot before each big deploy. **Liman database**: schedule a nightly `pg_dump` to off-box storage (Coolify → the Supabase service → Backups → S3-compatible destination, e.g. Backblaze B2 / Cloudflare R2) and test a restore once.
8. **2FA everywhere** — GitHub, Coolify, Dodo Payments, Hostinger, OpenAI, fal.ai, Resend, Cloudflare, Apple/App Store Connect, domain registrar. Prefer an authenticator app or passkey over SMS; store recovery codes offline.
9. **Liman GoTrue rate limits** — in the Liman (Supabase) env: `GOTRUE_RATE_LIMIT_TOKEN_REFRESH`, `GOTRUE_RATE_LIMIT_VERIFY`, `GOTRUE_RATE_LIMIT_EMAIL_SENT` at their defaults or lower; public sign-up stays disabled (accounts are created only by our rate-limited route).
10. **Dodo** — confirm the webhook secret is only in Coolify env; enable payout/charge notifications; review the API key's permissions.
11. **Sentry / uptime** — an uptime monitor on `/api/health` (shallow) and an alert on the worker's "dentvid: spend guard refused" log line if you use a log tool.
