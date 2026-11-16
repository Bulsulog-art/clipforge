# DentVideo: post-purchase reliability

Goal: a clinic that pays gets what it paid for, every time — five videos in its library by
Monday 07:00 in its own time zone, an email that says so, and an honest state in the app
whenever that is not true yet. Anything that leaves a paying clinic without its week alerts
the owner (ops-alert, `OWNER_ALERT_EMAIL`, one email per incident key per day).

This file maps the chain end to end, lists every failure mode reviewed (round 1,
2026-11-16), what happens now and the test that proves it, and what is left for the owner.

Code: web `web/src/lib/dentvid/{billing,billing-webhook,week-job,ops-server,ops-alert}.ts`,
`web/src/app/api/dodo/webhook/route.ts`; worker `worker/src/dentvid/{jobs,schedule,watchdog,
delivery,reconcile,park,notify,retry,job-options,job-failures,ops,ops-alert}.ts`,
`worker/src/index.ts`. Tests named below live next to the code.

## 1. The pieces

| Piece | Where | Durable? |
|---|---|---|
| Plan state | Liman `dentvid_clinics.plan` (`trial` = unpaid, `active`, `paused`, `cancelled`), `plan_tier`, `plan_renews_at`, `dodo_subscription_id`, `admin_paused_at` | Postgres |
| Subscription ledger | `dentvid_subscriptions` (status, period_end, last_event_at), payment index | Postgres (0007) |
| Funnel events | `dentvid_events` (`payment_succeeded` with `first`, `activated`) | Postgres |
| Videos | `dentvid_items` (`week_of`, `status` ready/flagged/rejected), bucket `dentvid` | Postgres + storage |
| Queues | BullMQ `dentvid` (week, recording, restyle, dispatch), `dentvid-mail` (notify, watchdogs, reconcile, digest, lifecycle), `crons` (synthetic monitor) | Redis, AOF (`--appendonly yes`) |
| Ops state | `dv:ops:*` (dispatch marker, paid markers, alert log, delivery report), `dv:weekstate:*` (library delay note), `dv:parked` (spend-guard parked jobs) | Redis |
| Webhook replay | `claimWebhook` by `webhook-id` | Redis (limiter) |

Job ids are the idempotency keys: a week is `week:<clinic>:<monday>` everywhere (payment,
button, dispatch, watchdogs), so it is queued once however many paths fire. Since this round
the week job itself is idempotent too (it makes only what the week is missing).

## 2. Flows (sequence diagrams)

### 2.1 Payment → activation → first week → "ready" email

```
Clinic        Dodo            Web /api/dodo/webhook            Liman              Redis/BullMQ          Worker                     Web notify     Resend
  | checkout -> |                    |                            |                    |                      |                          |              |
  |             |-- subscription.active (signed) -->|             |                    |                      |                          |              |
  |             |                    | verify sig, claim webhook-id ----------------->| (replay store)       |                          |              |
  |             |                    | clinicFor(metadata→sub→ledger→payment) -->|      |                      |                          |              |
  |             |                    | ledger row (stale / ended / duplicate checks) ->|                       |                          |              |
  |             |                    | (DODO_API_KEY) confirm status with Dodo  |       |                      |                          |              |
  |             |                    | UPDATE plan=active, tier, renews_at ------>|     |                      |                          |              |
  |             |                    | markPaid (dv:ops:paid) ---------------------------->|                     |                          |              |
  |             |                    | event payment_succeeded{first,activated} ->|      |                      |                          |              |
  |             |                    | enqueueFirstWeek (≤5 s) ----------------------------> week:<c>:<monday> p1 |                         |              |
  |             |                    | welcome email (once per clinic) -------------------------------------------------------------------------------->|
  |             |<------ 200 --------|                            |                    |                      |                          |              |
  |             |                    |                            |                    |-- week job --------->| paying? week already made?|             |
  |             |                    |                            |                    |                      | spend guard reserve       |              |
  |             |                    |                            |                    |                      | OpenAI scripts/reviews, TTS, Remotion, upload ×2
  |             |                    |                            |<--- insert items (retried) --------------|                          |              |
  |             |                    |                            |                    |<- notify (or held) --| ------------------------>| send ------->|
  |  library shows 5 videos; email "your week is ready"           |                    |                      |                          |              |
Watchdog every 15 min: activation without videos at 45 min → re-queue once; at 2 h → owner alert.
```

### 2.2 Weekly run (every paying clinic, every Monday)

```
Sat 18:00 UTC  dispatch (dentvid queue)  → week:<c>:<next monday> for each active, not admin-paused clinic,
                                            priority by Monday-07:00-local deadline; marker dv:ops:dispatch:<week>
Sat 19:30 UTC  watchdog-monday           → every paying clinic has a job? missing → queued + owner alert
Sat → Mon      worker renders in waves (Auckland/Tokyo first … Americas last); ready email held to Mon 07:00 local
Hourly :41     watchdog-delivery (NEW)   → deadline + 1 h passed and the week is not in the library?
                                            re-queue at the front (once), library "taking longer", owner alert;
                                            writes dv:ops:delivery (the sweep's report)
Mon 07:00 loc  "ready" mail job fires    → notify → Resend; retried ~2.5 h, then owner alert (NEW)
```

### 2.3 Approvals

```
Dentist ── opens library (app) or "approve all" link in the ready email (signed, expiring token)
        ── POST /api/dentvideo/approve or items/[id] → item approved → posts from its own accounts
```
Purely request/response against Liman; a failure is shown to the dentist and changes nothing.
Out of the worker's path; nothing to retry.

### 2.4 Renewal, payment failure, on hold, recovery

```
Dodo ── subscription.renewed ──> webhook: plan stays active, renews_at moves (no new week: the Monday run makes it)
Dodo ── payment.failed / past_due ─> plan unchanged (grace), clinic emailed (portal / email fix), owner "at risk"
Dodo ── subscription.on_hold ──> plan=paused, clinic emailed, owner "at risk"; Monday run skips it
Dodo ── subscription.renewed/active after on_hold ──> plan=active, week queued now (F1 makes this work), watched (F3)
Nightly 03:17 UTC reconcile: Dodo status (with DODO_API_KEY) or renews_at + 3 days grace → paused/cancelled + owner alert
```

### 2.5 Cancellation and re-subscribe

```
Dodo ── subscription.cancelled / expired (current subscription only; a late cancel of an old one is ignored)
        paid-through date = event next_billing_date, else GET /subscriptions/{id} (DODO_API_KEY)
        ├─ in the future (and ledger 0007 present) → plan stays active, plan_renews_at = end,
        │    ledger status cancelled/expired + period_end = end; owner "at risk" once;
        │    app settings: "Your plan ends on {date}. You keep getting your weekly videos until then."
        │    Monday weeks keep coming. Hourly (with watchdog-delivery) plan-end.ts: end passed → plan=cancelled
        │    (conditional on still active on that subscription → idempotent). Reconcile never cuts the tail early.
        └─ missing / past / no ledger → plan=cancelled at once
Clinic ── new checkout ──> refused while a subscription is live/pending (checkoutBlock) ──> new subscription.active
        ──> plan=active, week queued (F1), watched (F3), "a clinic came back" to the owner, no second welcome
```

### 2.6 Plan change (Starter ↔ Practice)

```
Clinic ── POST /api/dentvideo/billing/change-plan ──> Dodo change-plan (prorated) ──> subscription.plan_changed{status active}
        ──> webhook: plan_tier = the new product's tier (never metadata). No new week (the clinic is active already).
Worker: tier is read at run time — a recording queued before a downgrade to Starter is skipped (recordings are Practice).
```

### 2.7 Recording upload → clips

```
Browser ── signed upload to <owner>/recordings/… ──> POST /api/dentvideo/recording (Practice, rate-limited)
        ──> rec:<path> on dentvid (priority 5) ──> worker: paying? tier? spend guard → download, ≤30 min check,
            Whisper + review + render ≤6 clips → insert → notifyReady (immediate)
Final failure → owner alert "recording could not be processed" (job-failures.ts).
```

### 2.8 Refund / dispute

```
dispute.opened/accepted/lost → active clinic paused, ledger "disputed", owner alert; dispute.won → back to active,
week queued (bounded, alerted if it cannot be queued — NEW), watched (F3).
```

## 3. Failure modes

"Before" is the behaviour on `main` at 1e948ea; "After" is this branch. Tests: web
`web/src/lib/dentvid/*.test.ts`, worker `worker/src/dentvid/*.test.ts`.

| # | Scenario | Before | After | Test |
|---|---|---|---|---|
| 1 | Duplicate webhook delivery | `webhook-id` claimed once; same event again is idempotent (`applyTransition` no-op) | unchanged — OK | `app/api/dodo/webhook/replay.test.ts`, `lib/webhook-replay.test.ts` |
| 2 | Out-of-order webhooks (old cancel after new active, payment before activation) | ledger `last_event_at` ignores older events; a cancel of a non-current subscription is ignored | unchanged — OK | `billing-webhook-ledger.test.ts` |
| 3 | Late activation of an ended subscription | ignored unless newer than the end or Dodo confirms; owner alerted | unchanged — OK | `billing-webhook-ledger.test.ts` |
| 4 | Webhook while Liman is down | 500 → Dodo retries for days; nothing half-applied; owner alert per event type | unchanged — OK; proved | `reliability.test.ts` "webhook while the database is down" |
| 5 | **Webhook while Redis is down** | `queue.add` hangs (offline queue, no retry limit): no answer to Dodo, no welcome, no "could not queue" alert | enqueue bounded to 5 s → `firstWeek: "failed"`, owner alerted, welcome sent, watchdog marker written first | `reliability.test.ts` F2 |
| 6 | **Re-subscribe / renewal-after-on-hold while the Saturday job already ran** (skipped: not paying) | `queue.add` with the same id swallowed by the kept *completed* job → no week until next Saturday, no alert | finished job with nothing delivered is removed and re-queued; a waiting batch job jumps to the front | `reliability.test.ts` F1 |
| 7 | **Returning clinic whose week could not be queued** | first-week watchdog only knew first-ever payments | every activation is marked (`activated`, Redis `returning`) and watched; alert says "came back" | web `reliability.test.ts` F3, `billing-webhook-ledger.test.ts` H8; worker `reliability.test.ts` F3 |
| 8 | Worker crash mid-job (OOM, deploy) | BullMQ stalled → re-run; **a crash after the insert made and paid for a second full week** | week job makes only what the week is missing (`videosToMake`); stalled final attempt alerts (existing) | `jobs-week.test.ts` "a week is made once" |
| 9 | OpenAI / TTS timeout, 5xx, 429 | per-video re-attempt, job retried 4× (2/4/8 min); out-of-credit = permanent, budget released; owner alerted on last | unchanged — OK | `retry.test.ts`, `jobs-week.test.ts` |
| 10 | Remotion / ffmpeg failure | per video: re-attempt, else rejected; zero usable → transient retry; thin week (<3) alert | unchanged — OK | `jobs-week.test.ts` |
| 11 | Storage upload failure | one retry per file, else the video is dropped (not a broken card) | unchanged — OK | `jobs-week.test.ts` |
| 12 | **DB blip at the final insert** | whole job failed; retry re-made the week (paid twice), first run's files orphaned | insert retried 4× with exponential backoff + jitter; only then the job fails (transient) | `jobs-week.test.ts` F7 |
| 13 | **Clinic deleted mid-job** | FK error retried as transient; uploaded videos left in storage after account deletion | FK not retried; files of the run removed; no alert | `jobs-week.test.ts` F10 |
| 14 | Redis restart | AOF keeps jobs. **A week lost after Sat 19:30 (data loss, removed job, worker down Sunday) reached Monday silently** | hourly delivery watchdog: deadline + 1 h → re-queue, honest note, owner alert | worker `reliability.test.ts` F4 |
| 15 | Monday run after a mid-week language change | profile read at run time: the next run uses the new language; a week already made stays in the old one | unchanged — acceptable (the dentist approves every video) | — |
| 16 | Monday run after a mid-week plan change | tier read at run time; Starter skips queued recordings | unchanged — acceptable | `jobs-guard.test.ts` |
| 17 | DST / time zones, every market | deadlines from `mondayMorning` (IANA zones) | proved across every 2026 DST weekend (US, EU, UK, AU, NZ, CL) and no-DST markets (TR, MX, JP, SA, AE) | worker `reliability.test.ts` "DST and time-zone edges" |
| 18 | Email provider failure (ready email) | **notify returned false: held job "completed", no retry, no alert; immediate sends only logged** | 5xx/429/network/provider-failure → retried ~2.5 h on the mail queue, then owner alert; final reasons (test account, no address) not retried | worker `reliability.test.ts` F5 |
| 19 | Email provider failure (welcome, payment problem) | welcome failure alerts the owner; payment mail logged | unchanged — OK | `billing-webhook.test.ts` |
| 20 | Spend cap hit | week parked, owner alerted, library "taking longer", resumed every 15 min | unchanged; **after 7 days it was dropped with only a log line** → now owner alert + library "delayed" | worker `reliability.test.ts` F6 |
| 21 | Partial week (3 of 5) | top-up round; <3 usable → thin-week alert; the button tops up the missing ones | unchanged — OK; a re-run never overshoots 5 (#8) | `jobs-week.test.ts` |
| 22 | Renewal fails then succeeds | on_hold → paused (+clinic email); renewal → active + week (now actually made, #6) | fixed via #6/#7 | `reliability.test.ts` F1, F3 |
| 23 | Cancellation at period end vs immediate | `subscription.cancelled` → `cancelled` at once, whatever `next_billing_date` says (the app said "paid until {date}" but no weeks came) | **F9:** future paid-through date → active until then, "ends on {date}" in settings, cancelled hourly after the date; past/missing date → at once; re-subscribing clears it; duplicates idempotent | web `reliability.test.ts` F9, `plan-ends.test.tsx`; worker `reliability.test.ts` F9, `reconcile.test.ts` |
| 24 | Plan change Starter ↔ Practice | tier from the signed product on `plan_changed`; no extra week | unchanged — OK | `billing-webhook-plan-change.test.ts` |
| 25 | Recording upload failure | owner alerted on final failure; the clinic sees nothing new | unchanged — see §5.3 | `job-failures.test.ts` |
| 26 | Dispute won while Redis is down | week enqueue could hang; failure only logged | bounded, owner alerted, watched (#7) | covered by F2/F3 code path |

## 4. Fixes in this round

- **F1** `web/src/lib/dentvid/week-job.ts` `enqueueFirstWeek`: a kept `completed`/`failed` job under
  the week's id (nothing usable delivered) is removed before re-adding; a waiting one is moved to
  priority 1.
- **F2** `billing-webhook.ts`: `withTimeout(enqueue, 5 s)` on the payment and dispute-won paths;
  the watchdog marker is written before the enqueue is tried.
- **F3** every activation is marked (`markPaid(…, returning)`, event prop `activated`, allow-listed
  in `events.ts`); the worker's first-week watchdog includes them; alert wording for "came back".
- **F4** `worker/src/dentvid/delivery.ts` (hourly `watchdog-delivery`): Monday-deadline check per
  clinic, re-queue once, library note, `weekLate` alert, report `dv:ops:delivery`; shown on
  `/dentvideo/admin/system` as "Delivery check"; failing cron alerts (`MAIL_CRONS`).
- **F5** `notify.ts` `notifyReadyChecked` classifies the outcome; held `notify` jobs throw on a
  retryable failure (6 attempts, 5 min exponential); failed immediate sends are handed to the mail
  queue; final failure → `readyEmailFailed` alert (`job-failures.ts`).
- **F6** `park.ts` `onDrop` → `parkedDropped` alert and library "delayed".
- **F7** `jobs.ts` insert retried with backoff + jitter.
- **F8** `jobs.ts` `videosToMake`: a run makes `min(requested, 5 − usable already)`; 0 → no spend.
- **F10** `jobs.ts`: clinic deleted mid-run → uploaded files removed, nothing stored.
- **F9** cancelled but paid until a date: `billing-webhook.ts` step 6 (date from the event or
  Dodo's subscription), `billing.ts` `planEndsAt` / `checkoutBlock` (a second checkout still gets
  the "paid until, write to us" answer), `billing-state.ts` `loadPlanEnd`, settings `PlanStatus`
  "ends on" copy in all 8 languages (`content/dentvideo-app.ts` `billing.ends`), worker
  `plan-end.ts` (hourly end), `reconcile.ts` (keeps the tail). No migration: the end lives in
  `plan_renews_at` and the 0007 ledger row (`status`, `period_end`); without 0007 a cancel is
  immediate as before.
- `scripts/dentvideo-delivery-report.sql`: read-only Liman view of the same facts.

`ops-alert.ts` stays byte-identical in web and worker (new: `weekLate`, `parkedDropped`,
`readyEmailFailed`, `firstWeekLate.returning`, cron text for `watchdog-delivery`).

## 5. Owner decisions and open items

1. **Cancellation (F9) — done on the owner's direction.** A clinic keeps its weeks to the end of
   the paid period. Two edges: a Saturday batch run for a clinic whose period ends on Sunday still
   makes that Monday's week (the clinic gets one week more, never less); and an owner who refunds
   a cancelled clinic and wants access to stop now should pause it in `/dentvideo/admin`.
2. **Deploy order.** Web and worker both changed. The new `activated` event prop and Redis
   `returning` flag are additive (old worker ignores them; new worker reads old rows as before).
   Deploy the worker to start the hourly delivery watchdog and the plan-end check; no env change,
   no migration. Deploy web and worker together: the web keeps cancelled-but-paid clinics active and
   the worker's hourly check is what ends them.
3. **Recording failures are invisible to the clinic** (#25). The owner is alerted, but the library
   shows nothing pending. Needs a small UI state (a "processing / could not process" card) — a
   feature-level change for the app agent; not done here.
4. **Redis durability.** AOF with `everysec` loses at most ~1 s; losing the volume loses queued jobs,
   parked jobs and alert dedupe. The delivery watchdog now catches the consequence (weeks
   re-queued from Liman's view), but parked recordings would be lost. Keep the Redis volume in the
   VPS backups.
5. **Ready email after a crash between insert and notify** is not resent (the run that finds the
   week made sends nothing, to avoid duplicates). The videos are in the library; rare.

## 6. Daily sweep (ops-guardian)

1. `/dentvideo/admin/system` → **Delivery check**: `late` and `behind` must be 0, report not
   `STALE` (older than 3 h means the hourly watchdog is not running); per-clinic failed / stuck
   job counts.
2. Same page: failed jobs on `dentvid` / `dentvid-mail`, parked jobs, alerts of the last 24 h.
3. Database view when Redis is in doubt (read-only):
   `psql "$LIMAN_DB_URL" -f scripts/dentvideo-delivery-report.sql` — last delivered week per
   paying clinic (`BEHIND` / `NEVER DELIVERED`), active clinics past `plan_renews_at` + 3 days,
   thin weeks in the last 4 weeks.
