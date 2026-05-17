-- ============================================================
-- ClipForge — initial schema  (isolated `clipforge` schema)
-- Designed to coexist alongside other apps on the same Supabase
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create schema if not exists clipforge;

-- Make the API expose the clipforge schema
-- (also do this once in Supabase Dashboard → Settings → API → Exposed schemas)
grant usage on schema clipforge to anon, authenticated, service_role;
alter default privileges in schema clipforge grant all on tables to anon, authenticated, service_role;
alter default privileges in schema clipforge grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema clipforge grant all on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------------
-- enums
-- ---------------------------------------------------------------
create type clipforge.subscription_tier as enum ('free', 'starter', 'pro', 'agency');
create type clipforge.job_status as enum ('queued','transcribing','scoring','rendering','ready','failed');
create type clipforge.clip_status as enum ('draft','rendering','ready','scheduled','published','failed');
create type clipforge.platform as enum ('tiktok','instagram','youtube','x','facebook','linkedin');
create type clipforge.publish_status as enum ('pending','publishing','published','failed');

-- ---------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------
create table clipforge.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text,
  avatar_url text,
  tier clipforge.subscription_tier not null default 'free',
  revenuecat_app_user_id text unique,
  niche text,
  brand_color text default '#FF3366',
  watermark_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on clipforge.profiles (revenuecat_app_user_id);

alter table clipforge.profiles enable row level security;
create policy "profile self read" on clipforge.profiles for select using (auth.uid() = id);
create policy "profile self update" on clipforge.profiles for update using (auth.uid() = id);

create or replace function clipforge.handle_new_user()
returns trigger language plpgsql security definer set search_path = clipforge, public as $$
begin
  insert into clipforge.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_clipforge on auth.users;
create trigger on_auth_user_created_clipforge
  after insert on auth.users
  for each row execute procedure clipforge.handle_new_user();

-- ---------------------------------------------------------------
-- usage_quotas
-- ---------------------------------------------------------------
create table clipforge.usage_quotas (
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  period_start date not null default date_trunc('month', current_date),
  videos_used int not null default 0,
  minutes_processed int not null default 0,
  clips_generated int not null default 0,
  primary key (user_id, period_start)
);
alter table clipforge.usage_quotas enable row level security;
create policy "usage self read" on clipforge.usage_quotas for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- video_jobs
-- ---------------------------------------------------------------
create table clipforge.video_jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  source_type text not null check (source_type in ('upload','youtube','tiktok_url')),
  source_url text,
  storage_path text,
  title text,
  duration_seconds int,
  niche text,
  language text default 'en',
  status clipforge.job_status not null default 'queued',
  progress int not null default 0,
  transcript jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index on clipforge.video_jobs (user_id, created_at desc);
create index on clipforge.video_jobs (status);

alter table clipforge.video_jobs enable row level security;
create policy "job self read" on clipforge.video_jobs for select using (auth.uid() = user_id);
create policy "job self insert" on clipforge.video_jobs for insert with check (auth.uid() = user_id);
create policy "job self delete" on clipforge.video_jobs for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- clips
-- ---------------------------------------------------------------
create table clipforge.clips (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references clipforge.video_jobs(id) on delete cascade,
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  index_in_job int not null,
  start_seconds numeric(10,3) not null,
  end_seconds numeric(10,3) not null,
  viral_score numeric(5,2),
  hook text,
  caption text,
  hashtags text[],
  storage_path text,
  thumbnail_path text,
  aspect_ratio text not null default '9:16',
  duration_seconds numeric(6,2),
  status clipforge.clip_status not null default 'draft',
  render_config jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on clipforge.clips (user_id, created_at desc);
create index on clipforge.clips (job_id);
create index on clipforge.clips (status);

alter table clipforge.clips enable row level security;
create policy "clip self read" on clipforge.clips for select using (auth.uid() = user_id);
create policy "clip self update" on clipforge.clips for update using (auth.uid() = user_id);
create policy "clip self delete" on clipforge.clips for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- social_accounts
-- ---------------------------------------------------------------
create table clipforge.social_accounts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  platform clipforge.platform not null,
  external_user_id text not null,
  username text,
  display_name text,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  meta jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, external_user_id)
);
alter table clipforge.social_accounts enable row level security;
create policy "social self read" on clipforge.social_accounts for select using (auth.uid() = user_id);
create policy "social self all" on clipforge.social_accounts for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- publishes
-- ---------------------------------------------------------------
create table clipforge.publishes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  clip_id uuid not null references clipforge.clips(id) on delete cascade,
  social_account_id uuid not null references clipforge.social_accounts(id) on delete cascade,
  platform clipforge.platform not null,
  scheduled_for timestamptz,
  published_at timestamptz,
  status clipforge.publish_status not null default 'pending',
  external_post_id text,
  external_url text,
  caption text,
  error_message text,
  created_at timestamptz not null default now()
);
create index on clipforge.publishes (user_id, scheduled_for);
create index on clipforge.publishes (status, scheduled_for);

alter table clipforge.publishes enable row level security;
create policy "publish self all" on clipforge.publishes for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- analytics_snapshots
-- ---------------------------------------------------------------
create table clipforge.analytics_snapshots (
  id bigserial primary key,
  publish_id uuid not null references clipforge.publishes(id) on delete cascade,
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  fetched_at timestamptz not null default now(),
  views int,
  likes int,
  comments int,
  shares int,
  watch_time_seconds bigint,
  meta jsonb
);
create index on clipforge.analytics_snapshots (publish_id, fetched_at desc);

alter table clipforge.analytics_snapshots enable row level security;
create policy "analytics self read" on clipforge.analytics_snapshots for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- brand_kits
-- ---------------------------------------------------------------
create table clipforge.brand_kits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  name text not null,
  primary_color text not null default '#FF3366',
  secondary_color text not null default '#1A1A1A',
  font_family text not null default 'Inter',
  logo_path text,
  intro_path text,
  outro_path text,
  caption_style jsonb,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
alter table clipforge.brand_kits enable row level security;
create policy "brand self all" on clipforge.brand_kits for all using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- view: current month usage with limits
-- ---------------------------------------------------------------
create or replace view clipforge.v_user_quota as
select
  p.id as user_id,
  p.tier,
  coalesce(q.videos_used, 0) as videos_used,
  coalesce(q.minutes_processed, 0) as minutes_processed,
  coalesce(q.clips_generated, 0) as clips_generated,
  case p.tier
    when 'free' then 2
    when 'starter' then 10
    when 'pro' then 50
    when 'agency' then 250
  end as videos_limit
from clipforge.profiles p
left join clipforge.usage_quotas q
  on q.user_id = p.id and q.period_start = date_trunc('month', current_date);

-- ---------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------
create or replace function clipforge.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger trg_profiles_updated before update on clipforge.profiles
  for each row execute procedure clipforge.set_updated_at();
create trigger trg_clips_updated before update on clipforge.clips
  for each row execute procedure clipforge.set_updated_at();
create trigger trg_social_updated before update on clipforge.social_accounts
  for each row execute procedure clipforge.set_updated_at();

-- ---------------------------------------------------------------
-- DONE.
-- ---------------------------------------------------------------
-- After running this:
-- 1. Supabase Dashboard → Settings → API → "Exposed schemas":
--    add `clipforge` (comma-separated with `public,storage,graphql_public`)
-- 2. Storage buckets to create (Studio → Storage):
--    - clipforge-videos-raw    (private)
--    - clipforge-videos-rendered (private)
--    - clipforge-thumbnails    (public)
-- 3. The web/worker .env points at this Supabase URL/keys
--    AND sets PG search_path or uses .schema("clipforge") on every query.
