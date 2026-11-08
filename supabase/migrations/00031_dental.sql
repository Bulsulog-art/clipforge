-- ============================================================
-- DentVid — clinics and the content made for them
--
-- Additive only: two new tables, no change to existing ones.
--
-- clinics        one row per account that runs a clinic: the profile the
--                agents read (language, services, tone, address, brand).
-- dental_items   every video made for a clinic — generated from a topic or
--                cut from the dentist's own recording — with the reviewers'
--                verdicts and the QA measurements. Nothing is publishable
--                until the clinic sets approval = 'approved'.
--
-- The clinic owner may read their rows and change only the approval and the
-- note; everything else is written by the worker with the service role.
-- ============================================================

set search_path = clipforge, public;

create table if not exists clipforge.clinics (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references clipforge.profiles(id) on delete cascade,
  -- The ClinicProfile the agents read (see worker/src/dental/profile.ts).
  profile     jsonb not null,
  logo_path   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists clipforge.dental_items (
  id           uuid primary key default gen_random_uuid(),
  clinic_id    uuid not null references clipforge.clinics(id) on delete cascade,
  owner_id     uuid not null references clipforge.profiles(id) on delete cascade,
  kind         text not null check (kind in ('generated', 'recording')),
  -- The Monday of the week the item belongs to.
  week_of      date not null default (date_trunc('week', now()))::date,
  -- ready: passed every review and QA. flagged: needs the dentist's eyes
  -- (findings say why). rejected: could not be made safely.
  status       text not null check (status in ('ready', 'flagged', 'rejected')),
  approval     text not null default 'pending' check (approval in ('pending', 'approved', 'rejected')),
  approval_note text,
  title        text not null,
  topic        jsonb,
  plan         jsonb,
  copy         jsonb,
  spoken       text,
  checks       jsonb,
  findings     jsonb not null default '[]'::jsonb,
  shoot_card   jsonb,
  qa           jsonb,
  video_path   text,
  thumb_path   text,
  source_path  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists dental_items_clinic_week on clipforge.dental_items (clinic_id, week_of desc);

alter table clipforge.clinics      enable row level security;
alter table clipforge.dental_items enable row level security;

drop policy if exists "clinic self read"   on clipforge.clinics;
drop policy if exists "clinic self write"  on clipforge.clinics;
drop policy if exists "clinic self insert" on clipforge.clinics;
create policy "clinic self read"  on clipforge.clinics for select using (auth.uid() = owner_id);
create policy "clinic self write" on clipforge.clinics for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "clinic self insert" on clipforge.clinics for insert with check (auth.uid() = owner_id);

drop policy if exists "dental item self read" on clipforge.dental_items;
create policy "dental item self read" on clipforge.dental_items for select using (auth.uid() = owner_id);

-- Owners change only the approval and its note; the API route enforces the
-- column list, and this keeps the row theirs.
drop policy if exists "dental item self approve" on clipforge.dental_items;
create policy "dental item self approve" on clipforge.dental_items for update
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

comment on table clipforge.clinics is 'DentVid: one clinic per account; profile is read by the content agents.';
comment on table clipforge.dental_items is 'DentVid: videos made for a clinic, with review verdicts and QA. Publishable only when approval = approved.';
