-- ============================================================
-- ClipForge — Trend snapshots + monthly free-credit refill cron
-- ============================================================
set search_path = clipforge, public;

-- pg_cron lives in the cron schema. We schedule from this migration.
create extension if not exists pg_cron with schema cron;

-- Daily trend snapshots per niche (TikTok/YT scraped or LLM-summarised)
create table if not exists clipforge.trend_snapshots (
  id bigserial primary key,
  niche text not null,
  generated_at timestamptz not null default now(),
  source text not null default 'gpt',         -- 'tiktok_api' | 'gpt' | 'manual'
  items jsonb not null,                        -- [{ "title": "...", "hook": "...", "platform": "tiktok", "url": "...", "evidence": "..." }]
  meta jsonb
);

create index if not exists trend_snapshots_niche_idx on clipforge.trend_snapshots (niche, generated_at desc);

alter table clipforge.trend_snapshots enable row level security;

-- Everyone authenticated can read latest snapshots (it's content marketing)
create policy "trends read all"
  on clipforge.trend_snapshots
  for select using (auth.role() = 'authenticated');

-- View: latest snapshot per niche
create or replace view clipforge.v_trend_latest as
select distinct on (niche)
  niche, generated_at, source, items
from clipforge.trend_snapshots
order by niche, generated_at desc;

-- Schedule monthly free-credit refill at 00:05 UTC on day 1
select cron.schedule(
  'clipforge-free-monthly-refill',
  '5 0 1 * *',
  $$ select clipforge.refill_free_credits(5); $$
);

-- Optional: daily trend snapshot stub (populated by worker; cron just bumps a heartbeat row)
select cron.schedule(
  'clipforge-trend-heartbeat',
  '0 7 * * *',
  $$ insert into clipforge.trend_snapshots (niche, source, items)
     values ('_heartbeat', 'cron', '[]'::jsonb); $$
);
