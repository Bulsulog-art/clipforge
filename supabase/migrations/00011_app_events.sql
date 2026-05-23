-- ============================================================
-- ClipForge — minimal in-house analytics events
--
-- One row per event the iOS app emits (Studio open, job created,
-- paywall viewed, sub purchased, channel connected, …). Stays inside
-- our Supabase project so we don't ship a third-party SDK and don't
-- bloat the iOS binary. Service role reads aggregate metrics for the
-- admin dashboard; clients only ever INSERT.
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.app_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references clipforge.profiles(id) on delete cascade,
  event text not null check (char_length(event) between 1 and 80),
  props jsonb,
  app_version text,
  os_version text,
  created_at timestamptz not null default now()
);

-- Indexes tuned for the queries the admin dashboard actually runs:
--   • event funnels                 — (event, created_at)
--   • per-user activity timelines   — (user_id, created_at)
create index if not exists app_events_event_idx
  on clipforge.app_events (event, created_at desc);
create index if not exists app_events_user_idx
  on clipforge.app_events (user_id, created_at desc);

alter table clipforge.app_events enable row level security;

drop policy if exists "events insert self" on clipforge.app_events;
create policy "events insert self"
  on clipforge.app_events
  for insert
  with check (auth.uid() = user_id);

-- Defense-in-depth: deny SELECTs at the RLS layer so a leaked client
-- can't fish through other users' funnels. Admin reads happen via the
-- service role which bypasses RLS.
drop policy if exists "events no read" on clipforge.app_events;
create policy "events no read"
  on clipforge.app_events
  for select
  using (false);
