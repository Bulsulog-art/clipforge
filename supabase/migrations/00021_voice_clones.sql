-- ============================================================
-- ClipForge — ElevenLabs voice clones (Plus / Pro feature)
--
-- Users upload a 30–60s voice sample. The web API forwards it to
-- ElevenLabs /v1/voices/add, persists the returned voice_id, then
-- the AvatarStudio voice picker surfaces it alongside stock voices.
-- ============================================================
set search_path = clipforge, public;

create table if not exists clipforge.voice_clones (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  elevenlabs_voice_id text not null,        -- as returned by ElevenLabs
  sample_path text,                          -- original upload (for re-clone)
  status text not null default 'ready'
    check (status in ('processing', 'ready', 'failed')),
  error_message text,
  created_at timestamptz not null default now()
);
create index if not exists voice_clones_user_idx
  on clipforge.voice_clones (user_id, created_at desc);

alter table clipforge.voice_clones enable row level security;

drop policy if exists "voice_clones self read" on clipforge.voice_clones;
create policy "voice_clones self read"
  on clipforge.voice_clones for select using (auth.uid() = user_id);

drop policy if exists "voice_clones self delete" on clipforge.voice_clones;
create policy "voice_clones self delete"
  on clipforge.voice_clones for delete using (auth.uid() = user_id);

-- Inserts happen via the service-role upload endpoint (which talks to
-- ElevenLabs and only then writes a row), so no client-side insert
-- policy.
