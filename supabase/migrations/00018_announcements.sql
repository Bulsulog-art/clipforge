-- ============================================================
-- ClipForge — server-driven "what's new" announcements
--
-- Lets the team push in-app cards (new feature, maintenance window,
-- promo, etc.) without an iOS submission. iOS reads via /api/announcements
-- which filters by app version + active window. Users dismiss per id;
-- dismissals are client-only (UserDefaults).
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null check (char_length(title) between 1 and 80),
  body text not null check (char_length(body) between 1 and 400),
  cta_text text,
  cta_url text,                       -- supports https:// + clipforge://
  starts_at timestamptz not null default now(),
  ends_at timestamptz,                -- null = no expiry
  min_app_version text,               -- e.g. "1.0.34"
  max_app_version text,
  created_at timestamptz not null default now()
);

-- Index for the typical query: active right now.
create index if not exists announcements_active_idx
  on clipforge.announcements (starts_at, ends_at);

-- RLS: clients read via the /api/announcements endpoint (service role)
-- which filters. Deny direct SELECTs so a leaked anon key can't preview
-- announcements scheduled for the future.
alter table clipforge.announcements enable row level security;
drop policy if exists "announcements no read" on clipforge.announcements;
create policy "announcements no read"
  on clipforge.announcements
  for select using (false);
