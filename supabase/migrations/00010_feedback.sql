-- ============================================================
-- ClipForge — in-app feedback inbox
--
-- Captures lightweight feedback messages submitted from Settings.
-- Insert-only via RLS (users can write their own rows but never read
-- the inbox); service-role-only read for the admin dashboard.
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.feedback (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  message text not null check (char_length(message) between 1 and 4000),
  app_version text,         -- "1.0 (33)" style — for triage
  os_version text,          -- "iOS 18.2"
  device_model text,        -- "iPhone15,3"
  created_at timestamptz not null default now()
);
create index if not exists feedback_user_id_idx
  on clipforge.feedback (user_id, created_at desc);

alter table clipforge.feedback enable row level security;

-- Users may insert their own rows but never read/update/delete them.
-- The admin dashboard reads via service role (RLS bypassed).
drop policy if exists "feedback insert self" on clipforge.feedback;
create policy "feedback insert self"
  on clipforge.feedback
  for insert
  with check (auth.uid() = user_id);

-- Defensive deny for other ops so a misconfigured client can't fish
-- through the inbox.
drop policy if exists "feedback no select" on clipforge.feedback;
create policy "feedback no select"
  on clipforge.feedback
  for select
  using (false);
