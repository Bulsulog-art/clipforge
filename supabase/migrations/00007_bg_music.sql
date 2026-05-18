-- ---------------------------------------------------------------
-- Background music catalog + per-job/per-clip references
--
-- Free tier: bg_music forced on (subtle signature track = brand recall).
-- Plus tier: per-job toggle (default on), per-niche track selection.
-- ---------------------------------------------------------------

set search_path = clipforge, public;

create type clipforge.music_mood as enum (
  'hype', 'chill', 'motivational', 'dramatic', 'lofi', 'cinematic', 'comedic'
);

create table clipforge.music_tracks (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  artist text,
  mood clipforge.music_mood not null default 'motivational',
  -- niche tags (e.g. ['motivation','business','fitness']); empty = matches any niche
  niches text[] not null default '{}',
  duration_sec int not null check (duration_sec > 0),
  -- relative path in storage bucket `clipforge-music`
  storage_path text not null,
  -- 1 (mellow) → 10 (very hype). Score helps match clip energy.
  energy int not null default 5 check (energy between 1 and 10),
  license text not null default 'CC0',
  attribution text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index on clipforge.music_tracks (is_active, mood);
create index on clipforge.music_tracks using gin (niches);

-- Music bucket. Worker downloads via signed URL during render.
insert into storage.buckets (id, name, public)
values ('clipforge-music', 'clipforge-music', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------
-- Job- and clip-level music flags
-- ---------------------------------------------------------------
alter table clipforge.video_jobs
  add column if not exists bg_music_enabled boolean not null default true,
  add column if not exists bg_music_mood clipforge.music_mood;

alter table clipforge.clips
  add column if not exists bg_music_track_id uuid references clipforge.music_tracks(id) on delete set null;

-- ---------------------------------------------------------------
-- Catalog seed — placeholder rows. Tracks must be uploaded manually
-- to `clipforge-music/<storage_path>` from royalty-free sources
-- (Pixabay Music, YouTube Audio Library CC0 set, Mixkit).
-- Worker gracefully skips music when a track file is missing.
-- ---------------------------------------------------------------
insert into clipforge.music_tracks (name, artist, mood, niches, duration_sec, storage_path, energy, license, attribution) values
  ('Rise Up',          'Pixabay', 'motivational', array['motivation','business','fitness'],         180, 'motivational/rise-up.mp3',          7, 'CC0', null),
  ('Forward Motion',   'Pixabay', 'motivational', array['motivation','business','tech','finance'],  165, 'motivational/forward-motion.mp3',   6, 'CC0', null),
  ('Steel & Stone',    'Pixabay', 'dramatic',     array['motivation','fitness'],                    200, 'dramatic/steel-and-stone.mp3',      8, 'CC0', null),
  ('Open Sky',         'Pixabay', 'cinematic',    array['motivation','spirituality','education'],   210, 'cinematic/open-sky.mp3',            5, 'CC0', null),
  ('Slow Burn',        'Pixabay', 'lofi',         array['education','tech','spirituality'],         200, 'lofi/slow-burn.mp3',                3, 'CC0', null),
  ('Glow Up',          'Pixabay', 'hype',         array['fitness','comedy','tech'],                 150, 'hype/glow-up.mp3',                  9, 'CC0', null),
  ('Wall Street Beat', 'Pixabay', 'hype',         array['business','finance'],                      170, 'hype/wall-street-beat.mp3',         8, 'CC0', null),
  ('Calm Tide',        'Pixabay', 'chill',        array['health','spirituality'],                   220, 'chill/calm-tide.mp3',               2, 'CC0', null),
  ('Punchline',        'Pixabay', 'comedic',      array['comedy'],                                  130, 'comedic/punchline.mp3',             6, 'CC0', null),
  ('Iron Will',        'Pixabay', 'motivational', array['fitness','motivation'],                    180, 'motivational/iron-will.mp3',        9, 'CC0', null),
  ('After Hours',      'Pixabay', 'lofi',         array['education','tech','finance'],              240, 'lofi/after-hours.mp3',              3, 'CC0', null),
  ('Skyline',          'Pixabay', 'cinematic',    array['business','tech','motivation'],            200, 'cinematic/skyline.mp3',             6, 'CC0', null)
on conflict do nothing;
