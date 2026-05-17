-- ============================================================
-- ClipForge — Face Swap + Translation features
-- ============================================================
set search_path = clipforge, public;

create type clipforge.derivative_kind as enum ('face_swap', 'translation');
create type clipforge.derivative_status as enum ('queued', 'processing', 'ready', 'failed');

create table clipforge.clip_derivatives (
  id uuid primary key default uuid_generate_v4(),
  source_clip_id uuid not null references clipforge.clips(id) on delete cascade,
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  kind clipforge.derivative_kind not null,
  status clipforge.derivative_status not null default 'queued',
  progress int not null default 0,

  -- face_swap inputs
  target_face_path text,                     -- storage path of uploaded face photo

  -- translation inputs
  target_language text,                      -- 'en', 'tr', 'es', 'fr', 'de', 'pt', 'ar' …
  voice_clone boolean not null default false,

  -- output
  storage_path text,                         -- new rendered mp4
  thumbnail_path text,

  error_message text,
  credits_charged int not null default 0,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);

create index on clipforge.clip_derivatives (user_id, created_at desc);
create index on clipforge.clip_derivatives (source_clip_id);
create index on clipforge.clip_derivatives (status, kind);

alter table clipforge.clip_derivatives enable row level security;
create policy "derivative self all" on clipforge.clip_derivatives
  for all using (auth.uid() = user_id);

create trigger trg_derivatives_updated
  before update on clipforge.clip_derivatives
  for each row execute procedure clipforge.set_updated_at();

-- helper: clip with available derivatives
create or replace view clipforge.v_clip_with_derivatives as
select
  c.*,
  coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', d.id,
        'kind', d.kind,
        'status', d.status,
        'target_language', d.target_language,
        'storage_path', d.storage_path,
        'thumbnail_path', d.thumbnail_path,
        'progress', d.progress
      )
      order by d.created_at desc
    ) filter (where d.id is not null),
    '[]'::jsonb
  ) as derivatives
from clipforge.clips c
left join clipforge.clip_derivatives d on d.source_clip_id = c.id
group by c.id;
