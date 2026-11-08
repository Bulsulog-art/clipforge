-- ============================================================
-- DentVid on Liman (self-hosted Supabase, liman.bulsulabs.com)
--
-- Liman's API exposes only the public schema, and every app there prefixes
-- its tables (aires_*, coz_*…), so DentVid does the same. Accounts are Liman
-- auth users. Additive only.
--
-- dentvid_clinics  one row per account: the profile the agents read.
-- dentvid_items    every video made for a clinic, with the reviewers'
--                  verdicts and QA. Publishable only when approval = approved.
-- Owners read their rows and change only approval / approval_note (the API
-- route enforces the column list); the worker writes with the service role.
-- ============================================================

create table if not exists public.dentvid_clinics (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users(id) on delete cascade,
  profile     jsonb not null,
  logo_path   text,
  plan        text not null default 'trial' check (plan in ('trial', 'active', 'paused', 'cancelled')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.dentvid_items (
  id            uuid primary key default gen_random_uuid(),
  clinic_id     uuid not null references public.dentvid_clinics(id) on delete cascade,
  owner_id      uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('generated', 'recording')),
  week_of       date not null default (date_trunc('week', now()))::date,
  status        text not null check (status in ('queued', 'working', 'ready', 'flagged', 'rejected', 'failed')),
  approval      text not null default 'pending' check (approval in ('pending', 'approved', 'rejected')),
  approval_note text,
  title         text not null,
  topic         jsonb,
  plan          jsonb,
  copy          jsonb,
  spoken        text,
  checks        jsonb,
  findings      jsonb not null default '[]'::jsonb,
  shoot_card    jsonb,
  qa            jsonb,
  video_path    text,
  thumb_path    text,
  source_path   text,
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists dentvid_items_clinic_week on public.dentvid_items (clinic_id, week_of desc);

alter table public.dentvid_clinics enable row level security;
alter table public.dentvid_items   enable row level security;

drop policy if exists "dentvid clinic self read"   on public.dentvid_clinics;
drop policy if exists "dentvid clinic self insert" on public.dentvid_clinics;
drop policy if exists "dentvid clinic self update" on public.dentvid_clinics;
create policy "dentvid clinic self read"   on public.dentvid_clinics for select using (auth.uid() = owner_id);
create policy "dentvid clinic self insert" on public.dentvid_clinics for insert with check (auth.uid() = owner_id);
create policy "dentvid clinic self update" on public.dentvid_clinics for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "dentvid item self read"    on public.dentvid_items;
drop policy if exists "dentvid item self approve" on public.dentvid_items;
create policy "dentvid item self read"    on public.dentvid_items for select using (auth.uid() = owner_id);
create policy "dentvid item self approve" on public.dentvid_items for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Private storage for logos, recordings and rendered videos; served to the
-- owner through signed URLs only.
insert into storage.buckets (id, name, public) values ('dentvid', 'dentvid', false)
  on conflict (id) do nothing;

drop policy if exists "dentvid storage own folder read"  on storage.objects;
drop policy if exists "dentvid storage own folder write" on storage.objects;
create policy "dentvid storage own folder read" on storage.objects for select
  using (bucket_id = 'dentvid' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "dentvid storage own folder write" on storage.objects for insert
  with check (bucket_id = 'dentvid' and (storage.foldername(name))[1] = auth.uid()::text);

comment on table public.dentvid_clinics is 'DentVid: one clinic per account; profile is read by the content agents.';
comment on table public.dentvid_items is 'DentVid: videos made for a clinic, with review verdicts and QA. Publishable only when approval = approved.';
