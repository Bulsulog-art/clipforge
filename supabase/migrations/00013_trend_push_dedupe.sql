-- ============================================================
-- ClipForge — per-user/niche dedupe for trend-match push notifications
--
-- The worker scans new trend snapshots, picks the top hook per niche,
-- and pushes users whose history shows interest in that niche. To avoid
-- spam we keep one row per (user, niche) with the last hook we pushed
-- and the timestamp. New hook + ≥ 7d since last push = green light.
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.trend_push_dedupe (
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  niche text not null,
  last_hook text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, niche)
);

create index if not exists trend_push_dedupe_sent_idx
  on clipforge.trend_push_dedupe (sent_at desc);

-- No RLS policies needed — only worker (service role) writes here, no
-- client ever touches the table. Defense-in-depth: enable RLS with no
-- policies so a stolen anon key can't read it.
alter table clipforge.trend_push_dedupe enable row level security;
