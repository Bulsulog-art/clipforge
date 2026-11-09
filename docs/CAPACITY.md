# DentVideo capacity: can one box keep the delivery promises?

*Measured 2026-11-09 on branch `claude/fix-audit-capacity`. The promises are "five videos every Monday
morning" and "your first week right after you pay". This page is the arithmetic behind the schedule, the
queue priorities and the point at which rendering has to move to its own server.*

## TL;DR

- **One week (5 videos) renders in 6.0 minutes on two cores** and uses **0.5 of a core on average**
  (189 CPU-seconds over 363 s), with a **peak of 2.35 GB** (PSS, whole process tree: Node + Chromium +
  compositor + ffmpeg). Add the OpenAI time of a real week (scripts, reviews, narration — network wait, not
  CPU; estimated ~6 minutes) and **a clinic's week takes ~12 minutes end to end: 5 clinics an hour.**
- The weekly batch now starts **Saturday 18:00 UTC** and runs **earliest Monday morning first** (Auckland,
  Sydney, Tokyo, the Gulf, Istanbul, central Europe, London, the Americas). Every clinic's deadline is
  **Monday 07:00 in its own time zone**; the "videos ready" email is held until then.
- A first week after payment, the "make this week" button and a photo restyle **jump the whole batch**
  (BullMQ priority 1); recordings come next (5); the batch last (100 + hours to the clinic's deadline). A
  Monday payer now waits for at most the one week already rendering (~12 min), not for 100 of them.
- **One shared 2-core box carries ~120 paying clinics if many are in New Zealand/Australia, ~135 if most are
  in Europe/Türkiye** (at a planning load of 75 %). **Plan the render server at 80 paying clinics; it is
  required before 120.** The founding offer (100 clinics) should not fill on one box. The worker logs a
  warning at dispatch when its projection says a deadline will be missed.
- Marketing pages are now prerendered and sent with
  `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400`; the app, sign-in, checkout
  and every API route are never marked public.

## 1. Benchmark

`worker/src/bench/week-bench.ts` renders one realistic week with no OpenAI calls: the five first sample plans
of the English preview library (`web/public/dentvideo/preview/en`, already reviewed, with their narration
mp3), each dressed as a paying clinic's video is — a brand colour, three library background photos, the
narration, and a real 1080×1920 H.264 clip in place of each stock-footage scene, so decoding footage costs
what it costs in production. Each video goes through `renderPlan()` — the same function, flags and bundle as
a week job — one after the other, as `produceWeek` renders them. Peak memory is sampled every 250 ms over the
whole process tree (`/proc/*/smaps_rollup`, PSS so Chromium's shared pages are counted once).

```sh
cd worker
taskset -c 0,1 npx tsx src/bench/week-bench.ts                 # the production box has 2 cores
taskset -c 0,1 npx tsx src/bench/week-bench.ts --preset medium # the old encoder default
taskset -c 0,1 npx tsx src/bench/week-bench.ts --concurrency 2 # two frames at a time
# Options: --lang de|tr|ja|…  --videos N  --nice 10  --no-footage  --out DIR (writes bench.json)
# Locally without Remotion's Chrome download: REMOTION_BROWSER_EXECUTABLE=/usr/bin/google-chrome REMOTION_CHROME_MODE=chrome-for-testing
```

Box: 2 cores pinned (`taskset`) of an Intel Xeon @ 2.30 GHz cloud VM, comparable per core to the
Hostinger KVM. Other jobs were running on the machine's other cores, so treat the numbers as ±10 %.

| Run (5 videos, 105.5 s of video, 3 165 frames) | Wall | CPU-seconds | Peak memory (PSS / RSS) | Output |
|---|---|---|---|---|
| **1 frame at a time, x264 `veryfast` (new default on ≤2 cores)** | **362.8 s (6.0 min)** | **189** | **2 353 / 3 041 MB** | 16.8 MB |
| 1 frame at a time, x264 `medium` (old default) | 379.3 s | 253 | 2 409 / 3 105 MB | 19.2 MB |
| 2 frames at a time, `veryfast` | 411.9 s | 227 | 2 542 / 3 413 MB | 16.8 MB |

Per video: 63–93 s wall for 20–23 s of video (7.4–9.8 frames/s); the videos with a footage scene are the
slowest. Bundling (webpack) happens once per worker process and is not in these numbers.

What this says:

- **The `veryfast` encoder preset costs a quarter less CPU** (189 vs 253 CPU-s) for slightly *smaller* files
  at crf 23 on these mostly-flat graphics. It is now the default on boxes with ≤2 cores (`renderTuning()` in
  `worker/src/remotion/capacity.ts`; `REMOTION_X264_PRESET` overrides).
- **Two frames at a time is slower on two cores** (+14 % wall). The existing rule — frames in parallel =
  cores − 1 — is right; nothing to change.
- **A render leaves a core free.** One render averages half a core (189 CPU-s in 363 s); the website,
  Liman and ClipForge keep the rest.
- **Memory is the hard limit for parallel jobs, not CPU.** One job peaks at ~2.4 GB; two would be ~4.8 GB
  on an 8 GB box that also runs Liman (Postgres, GoTrue, Kong, Storage), the web app and ClipForge. So
  `DENTVID_RENDER_CONCURRENCY` stays **1** on the shared box.

### The website while rendering

`/dentvideo/start` (server-rendered on every request) and `/` (now prerendered), requested in a loop from a
`next start` pinned to **the same two cores** as a one-week render:

| Website p50 / p95 (ms) | `/start` (SSR) | `/` (static) |
|---|---|---|
| idle | 10 / 17 | 3.9 / 8 |
| during a render, normal priority | 14 / 39 | 4.7 / 17 |
| during a render, niced (`DENTVID_BATCH_NICE=10`, the weekend batch) | 12.5 / 36 | 4.9 / 16 |

(40–60 s of sequential requests each; two-video renders on the same two cores as the server.)
A render roughly doubles the slow tail of a server-rendered page (p95 17 → 39 ms) and niceing the batch
trims that by about a tenth — a render only uses half a core, so the contention is modest either way. The
bigger win is not rendering pages at all: a prerendered page stays at ~5 ms p50 under load, and the English,
Arabic and Japanese landings, about and guides pages were *not* prerendered before this change (§7).

## 2. One clinic's week, end to end

| Part | Minutes | Source |
|---|---|---|
| Rendering 5 videos | 6.0 | measured above |
| OpenAI: topics, script, compliance + accuracy review (1–3 rounds), copy, narration (TTS), per video ~70 s | ~6 | estimate — no API calls in the benchmark |
| Storage upload, thumbnails, logo analysis | <0.5 | small files (3–4 MB per video) |
| **Total, one job at a time** | **≈ 12** | `WEEK_MINUTES_DEFAULT` in `worker/src/dentvid/schedule.ts` |

**Throughput: 60 / 12 = 5 clinics per hour** with one DentVideo job at a time. Replace the estimate with
production numbers once a few weeks have run: BullMQ keeps `processedOn`/`finishedOn` on every completed
`week:*` job; set `DENTVID_WEEK_MINUTES` to the median and the dispatch's projection follows.

## 3. When each market's Monday morning is

The weekly dispatch runs **Saturday 18:00 UTC** (`DISPATCH_SCHEDULE`). Each clinic's deadline is **Monday
07:00 in its own time zone** (`worker/src/dentvid/timezone.ts`: country → zone; a country with several zones
takes its earliest mainland morning — US → New York, Australia → Sydney; unknown → UTC).

| Market | Zone (Nov / northern winter) | Deadline (UTC) | Hours after dispatch | Clinics that fit (100 % / **75 %** load) |
|---|---|---|---|---|
| New Zealand | Pacific/Auckland +13 | Sun 18:00 | 24 | 120 / **90** |
| Australia (east) | Australia/Sydney +11 | Sun 20:00 | 26 | 130 / **97** |
| Japan | Asia/Tokyo +9 | Sun 22:00 | 28 | 140 / **105** |
| Singapore | Asia/Singapore +8 | Sun 23:00 | 29 | 145 / **108** |
| UAE | Asia/Dubai +4 | Mon 03:00 | 33 | 165 / **123** |
| Türkiye, Saudi Arabia | +3 | Mon 04:00 | 34 | 170 / **127** |
| Poland, Germany, France, Spain | CET +1 (summer +2: 35 h) | Mon 06:00 | 36 | 180 / **135** |
| UK, Portugal, Ireland | GMT (summer 36 h) | Mon 07:00 | 37 | 185 / **138** |
| US East | New York −5 (summer 41 h) | Mon 12:00 | 42 | 210 / **157** |
| Mexico | Mexico City −6 | Mon 13:00 | 43 | 215 / **161** |
| US West | Los Angeles −8 | Mon 15:00 | 45 | 225 / **168** |

"Clinics that fit" = hours × 5 clinics/hour, i.e. how many clinics of that market alone the box can finish
by their deadline. With a mix, the batch runs earliest deadline first, so the test is cumulative: **for every
deadline D, the clinics due by D must be ≤ 5 × (hours to D) × load.** Example, 100 clinics = 15 Japan + 10
Gulf + 25 Türkiye + 40 EU + 10 UK: by Tokyo's 28 h, 15 ≤ 105; by 34 h, 50 ≤ 127; by 36 h, 90 ≤ 135; by 37 h,
100 ≤ 138 — on time, with the whole batch done ~20 hours after dispatch (Sunday ~14:00 UTC).

The 75 % planning load leaves room for what also runs on a weekend: first weeks of new payers, restyles,
recordings, retries (4 attempts, 2/4/8 min apart), ClipForge's own renders, and the box running a little
slower than the benchmark because Liman and the website share it.

## 4. The schedule and the queue

**Waves.** At Saturday 18:00 UTC `dispatchWeeks` (`worker/src/dentvid/schedule.ts`) queues every paying
clinic's week for the coming Monday. Each job carries `{ clinicId, count, week, batch: true }` — `week` is
the Monday it is for, so videos made on Saturday are stamped `week_of` = that Monday (the column's default
would stamp the week of the insert) — and a priority of **100 + hours from the dispatch to that clinic's
Monday 07:00**: the earliest morning renders first. The waves (zone, deadline, clinics) and the projected
misses are logged and stored in the dispatch marker.

**Delivery week.** From the Saturday 18:00 UTC dispatch on, "this week" means the coming Monday's week —
in the worker (`deliveryWeek()` in `schedule.ts`) and in the web app (`deliveryWeek()` in
`web/src/lib/dentvid/week.ts`), for the payment webhook's first week, the "make this week" button and the
library's "this week". So a clinic that pays on Sunday gets the coming week at once (and is not missed by a
dispatch that ran before it paid); one that pays on Wednesday gets the current week.

**Priorities** (`job-options.ts`, byte-identical in `worker/src/dentvid/` and `web/src/lib/dentvid/`, kept
so by `web/src/lib/dentvid/ops.test.ts`; lower runs first, and every dentvid job carries one because a BullMQ
job without a priority jumps every prioritized job):

| Priority | Job | Queued by |
|---|---|---|
| 1 | first week after payment, the "make this week" button, the first-week watchdog's re-queue | `web/src/lib/dentvid/week-job.ts`, `api/dentvideo/week`, `watchdog.ts` |
| 1 | re-render after new background photos (restyle) | `api/dentvideo/items/[id]/backgrounds` |
| 5 | the dentist's own recording | `api/dentvideo/recording` |
| 100 + h | the weekend batch, by deadline | `schedule.ts`; the dispatch watchdog re-queues missing ones at 100 |

A batch week still waiting when the dentist presses the button, or when the first-week watchdog finds a
paid clinic's week waiting behind other work, is moved to priority 1 (`changePriority`), not queued twice.

**The "videos ready" email** (`worker/src/dentvid/notify.ts`): a batch week is announced **not before Monday
07:00 local**, and never between 21:00 and 07:00 local (a week finished at 23:00 is announced at 07:00). The
email is a delayed `notify` job on the light `dentvid-mail` queue with id `ready:<clinic>:<week>`, so a
re-run week never sends two. A first week or a button week is announced at once — the dentist is waiting.

**Watchdogs** (`worker/src/dentvid/watchdog.ts`):

- *Dispatch*: Saturday 19:30 UTC, 90 minutes after the dispatch. Every paying clinic must have the coming
  week's job; missing ones are queued at once and the owner is told — with the weekend still ahead.
- *First week*: every 15 minutes. 45 minutes after payment with no videos → re-queued (or moved to the front);
  2 hours → the owner is told. With priority 1 the worst case is one week already rendering (~12 min) plus
  this one (~12 min) = ~24 min, so neither threshold fires for a healthy box any more — including for
  someone who pays on a Monday morning. A test (`watchdog.test.ts`) keeps the thresholds above that worst case.

## 5. Resource hygiene on the shared box

| Setting | Default | Where | Why |
|---|---|---|---|
| `DENTVID_RENDER_CONCURRENCY` | **1** (`0` = this box takes no renders) | `capacity.ts` `dentvidConcurrency()` | memory: ~2.4 GB per job. Old name `DENTVID_CONCURRENCY` still read. |
| `REMOTION_CONCURRENCY` | cores − 1 (1 on 2 cores) | `capacity.ts` `renderConcurrency()` | measured: 2 frames is slower on 2 cores |
| `REMOTION_X264_PRESET` | `veryfast` on ≤2 cores, `medium` above | `capacity.ts` `renderTuning()` | −25 % CPU per week |
| `REMOTION_OFFTHREAD_CACHE_MB` | 256 on ≤2 cores; ⅛ of RAM (≤2 GB) above | `renderTuning()` | Remotion's default is half the free memory — on a shared box, the website's memory |
| `REMOTION_OFFTHREAD_THREADS` | 1 on ≤2 cores, 2 above | `renderTuning()` | footage decoding threads |
| `DENTVID_BATCH_NICE` | **10** (`0` = off) | `worker/src/dentvid/nice.ts` | weekend-batch renders (Chromium, compositor, ffmpeg) run niced, thread by thread, so the website gets the CPU first; first weeks, restyles and recordings run at normal priority |
| `DENTVID_WEEK_MINUTES` | 12 | `schedule.ts` | end-to-end minutes per week for the dispatch's deadline projection |
| `WORKER_QUEUES` | all | `worker/src/roles.ts` | which queues/crons this process runs; `dentvid` on a render server |

## 6. Move rendering to a separate server (runbook)

**When:** plan it at **80 paying clinics**; it is **required before ~120** (sooner if many clinics are in New
Zealand, Australia or Japan — see §3), or as soon as the Saturday dispatch logs *"the batch is projected to
miss some Monday-morning deadlines"*, or the batch is still running on Sunday afternoon UTC.

**What:** a second VPS (Hostinger KVM 4: 4 vCPU / 16 GB is plenty; KVM 2 works at concurrency 1) running the
**same worker image** with only the DentVideo render queue. Redis and Liman stay where they are; the render
server talks to both over the network. Nothing in the web app changes.

1. **Network.** On the main box, expose Redis to the render server only: in Coolify → the Redis resource →
   set a strong password (if it has none) and either *Make it publicly available* on a non-default port with
   the VPS firewall (`ufw allow from <render-ip> to any port <port>`) restricted to the render server's IP, or
   (better) join both servers to a private network / WireGuard (Coolify supports multiple servers on one
   instance). Liman's API (`DENTVID_SUPABASE_URL`) is already reachable over HTTPS.
2. **Add the server to Coolify.** Servers → *Add* → the new VPS (SSH key), *Validate & install Docker*.
3. **Create the app.** In the ClipForge project → *+ New Resource* → the same repository, base directory
   `worker/`, build pack *Dockerfile*, **server: the render VPS**. No domain, no port.
4. **Environment** (copy the main worker's, then change):
   - `REDIS_URL=redis://:<password>@<main-box-private-ip>:<port>`
   - `DENTVID_SUPABASE_URL`, `DENTVID_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `PEXELS_API_KEY`,
     `WORKER_INTERNAL_TOKEN`, `DENTVIDEO_APP_URL`, `RESEND_API_KEY`/`OWNER_ALERT_EMAIL` (owner alerts),
     `SENTRY_DSN` — same values as the main worker
   - `WORKER_QUEUES=dentvid` — only DentVideo renders: no ClipForge queues, no crons, no email/watchdogs,
     no schedulers (the main box keeps those)
   - `DENTVID_RENDER_CONCURRENCY=2` on 4 vCPU / 8 GB+ (≈2× throughput: one job's OpenAI wait overlaps the
     other's render; memory 2 × 2.4 GB). `1` on a 2-vCPU box.
   - `DENTVID_BATCH_NICE=0` — nothing else runs there to protect
   - `DENTVID_WEEK_MINUTES` — leave at 12 until measured
5. **Deploy, then watch one job.** The render server logs `worker roles ["dentvid"]`; queue a test week
   from the admin (or wait for the next first week) and check it completes there.
6. **Stop rendering on the main box.** Main worker: `DENTVID_RENDER_CONCURRENCY=0` and redeploy. It keeps
   the dispatch scheduler, the watchdogs, the email queue, the crons and ClipForge. (Keep it at `1` instead if
   you want the main box to help on weekends — the batch is niced there.)
7. **Rollback:** set the main worker back to `DENTVID_RENDER_CONCURRENCY=1` and stop the render app; jobs
   wait in Redis, nothing is lost.

With one 4-vCPU render server at concurrency 2: ~10 clinics an hour → ~240 clinics by New Zealand's
Monday, ~360 by central Europe's (100 % load). Beyond that, add render servers — each is the same app with
`WORKER_QUEUES=dentvid`; BullMQ hands each job to exactly one of them.

## 7. Web caching

Marketing pages (landings in all 8 languages, about, the guides hub and every guide, the video pages,
`llms.txt`, `llms-full.txt`, `sitemap.xml`, `robots.txt`) are prerendered at build. The English, Arabic and
Japanese landing/about/guides pages used to render on every request — the DentVideo 404 boundary reads a
cookie, which made every page under it dynamic — and are now `force-static`. The middleware
(`web/src/middleware.ts`) marks exactly those paths (`web/src/lib/dentvid/cache-policy.ts`, an allow-list)
with

```
Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=86400
```

on dentvideo.com and on the app host, and skips the session lookup for them (no cookies on a public page).
Browsers revalidate every time, so a deploy shows at once; a CDN (Cloudflare with a cache rule for HTML)
keeps a page an hour and serves it stale for up to a day while it refreshes. Next's own default for a
prerendered page is a year in a shared cache, too long for copy that changes with each deploy.

Never public: `/dentvideo/app/*`, `/start`, `/reset`, `/admin`, `/dev/*`, `/account-deleted`,
`/preview-demo`, every `/api/*` route, and all of ClipForge's signed-in pages — they keep Next's
`private, no-cache, no-store`. Verified with `next start` and `curl -I` (`cache-policy.test.ts` pins the list).
Known limit: an unknown guide slug's 404 page carries the public header too (the middleware cannot know the
page will 404), so a CDN may keep that 404, in the language of whoever asked first, for an hour.
