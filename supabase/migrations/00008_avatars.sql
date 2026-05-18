-- ---------------------------------------------------------------
-- AI Avatar (HeyGen-style talking head)
--   Script → ElevenLabs TTS → Replicate SadTalker lip-sync → 9:16 clip
--   Cost: 5 credits ($1.00 worth) per avatar clip.
-- ---------------------------------------------------------------

set search_path = clipforge, public;

create type clipforge.avatar_job_status as enum (
  'queued', 'synthesizing_voice', 'lipsyncing', 'rendering', 'ready', 'failed'
);

-- Stock avatars curated by us. Custom uploads land in `clipforge-uploads`.
create table clipforge.avatars (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  -- portrait image, square, recommended 768x768
  image_path text not null,
  -- ElevenLabs voice id paired with this avatar by default
  default_voice_id text,
  -- gender / persona tag for UI grouping
  persona text not null default 'neutral',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index on clipforge.avatars (is_active, sort_order);

insert into storage.buckets (id, name, public)
values ('clipforge-avatars', 'clipforge-avatars', true)
on conflict (id) do nothing;

-- Seed 4 stock avatars (portraits must be uploaded to `clipforge-avatars/<image_path>`)
insert into clipforge.avatars (name, description, image_path, default_voice_id, persona, sort_order) values
  ('Alex',  'Calm coach voice — works for motivation & business',  'stock/alex.jpg',  'pNInz6obpgDQGcFmaJgB', 'masc',     1),
  ('Maya',  'Bright energetic — great for fitness & lifestyle',    'stock/maya.jpg',  'EXAVITQu4vr4xnSDxMAc', 'fem',      2),
  ('Theo',  'Authoritative narrator — finance, tech, news',        'stock/theo.jpg',  'TxGEqnHWrfWFTfGW9XjX', 'masc',     3),
  ('Iris',  'Warm storyteller — spirituality, education',          'stock/iris.jpg',  '21m00Tcm4TlvDq8ikWAM', 'fem',      4)
on conflict do nothing;

-- ---------------------------------------------------------------
-- avatar_jobs — a request to render a talking-head clip from a script
-- ---------------------------------------------------------------
create table clipforge.avatar_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  -- script the avatar will speak (max ~600 chars = ~60s)
  script text not null check (length(script) between 10 and 1200),
  -- avatar_id is null when user uploaded a custom portrait
  avatar_id uuid references clipforge.avatars(id) on delete set null,
  custom_image_path text,
  voice_id text not null,
  niche text default 'motivation',
  bg_music_enabled boolean not null default true,
  status clipforge.avatar_job_status not null default 'queued',
  progress int not null default 0,
  error_message text,
  -- resulting clip row (after pipeline finishes)
  clip_id uuid references clipforge.clips(id) on delete set null,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  -- one of avatar_id or custom_image_path must be set
  check (avatar_id is not null or custom_image_path is not null)
);
create index on clipforge.avatar_jobs (user_id, created_at desc);
create index on clipforge.avatar_jobs (status);

alter table clipforge.avatar_jobs enable row level security;
create policy "avatar_job self read"   on clipforge.avatar_jobs for select using (auth.uid() = user_id);
create policy "avatar_job self insert" on clipforge.avatar_jobs for insert with check (auth.uid() = user_id);
create policy "avatar_job self delete" on clipforge.avatar_jobs for delete using (auth.uid() = user_id);

-- avatars: read for any signed-in user
alter table clipforge.avatars enable row level security;
create policy "avatar list" on clipforge.avatars for select using (is_active);

-- ---------------------------------------------------------------
-- clips.source_kind so we can tell avatar-generated clips apart.
-- Avatar clips have no parent video_jobs row, so job_id must be nullable.
-- ---------------------------------------------------------------
alter table clipforge.clips
  add column if not exists source_kind text not null default 'pipeline'
    check (source_kind in ('pipeline', 'avatar'));

alter table clipforge.clips alter column job_id drop not null;
