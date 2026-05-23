-- ============================================================
-- ClipForge — server-side feature flags
--
-- Lets the team flip features per-user (rollout %, tier, app version)
-- without an iOS submission. Reads happen via the /api/flags endpoint
-- which resolves the bool for the caller; the iOS app never sees the
-- raw conditions, only the resolved on/off.
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.feature_flags (
  key text primary key check (char_length(key) between 1 and 80),
  enabled boolean not null default false,
  rollout_percent int not null default 100
    check (rollout_percent between 0 and 100),
  conditions jsonb not null default '{}'::jsonb,
  description text,
  updated_at timestamptz not null default now()
);

-- RLS: deny all client reads — clients use the resolved /api/flags
-- endpoint which runs under the service role.
alter table clipforge.feature_flags enable row level security;
drop policy if exists "flags no read" on clipforge.feature_flags;
create policy "flags no read"
  on clipforge.feature_flags
  for select using (false);

-- A couple of seed rows so the API has something to return out of the
-- gate. Both default to disabled — flipping them only takes a SQL
-- UPDATE in the admin dashboard.
insert into clipforge.feature_flags (key, enabled, rollout_percent, description)
values
  ('experimental_voice_clone', false, 0,
   'Surfaces the ElevenLabs voice clone option in AvatarStudio. Requires backend wiring before flipping on.'),
  ('thumbnail_style_v2', false, 0,
   'Adds a 4th thumbnail style preset. Set rollout_percent to 10/50/100 for staged rollout.')
on conflict (key) do nothing;
