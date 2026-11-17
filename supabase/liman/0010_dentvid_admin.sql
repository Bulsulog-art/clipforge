-- ============================================================
-- DentVideo owner admin panel (/admin): audit log, owner pause, email sends.
-- Additive only. NOT applied automatically: run it on Liman by hand.
-- Until it is applied the panel works read-only for these parts:
--   * owner actions still run, but are not audited (the panel says so),
--   * pause / unpause is refused (no column to write),
--   * the Emails screen shows only dentvid_email_log (0005).
--
-- dentvid_admin_actions  every owner action taken in the admin panel: who,
--                        what, when, which clinic, with what outcome.
-- dentvid_clinics.admin_paused_at / admin_pause_note
--                        the owner paused this clinic: no weekly batch, no
--                        week / recording / restyle jobs (the worker checks
--                        it, worker/src/dentvid/schedule.ts shouldRun). Not
--                        billing: Dodo keeps charging; pause there separately.
-- dentvid_email_sends    one row per transactional email the web app tried
--                        to send for a clinic (kind, language, sent/failed,
--                        provider error). No addresses, no content.
-- All service role only.
-- ============================================================

create table if not exists public.dentvid_admin_actions (
  id          bigint generated always as identity primary key,
  admin_id    uuid not null,
  admin_email text,
  action      text not null check (action ~ '^[a-z_]{3,40}$'),
  clinic_id   uuid references public.dentvid_clinics(id) on delete set null,
  target      text check (target is null or length(target) <= 200),
  params      jsonb not null default '{}'::jsonb check (jsonb_typeof(params) = 'object' and pg_column_size(params) <= 4096),
  outcome     text not null check (outcome in ('ok', 'refused', 'error')),
  detail      text check (detail is null or length(detail) <= 1000),
  created_at  timestamptz not null default now()
);

create index if not exists dentvid_admin_actions_created on public.dentvid_admin_actions (created_at desc);
create index if not exists dentvid_admin_actions_clinic on public.dentvid_admin_actions (clinic_id, created_at desc) where clinic_id is not null;

alter table public.dentvid_admin_actions enable row level security;
revoke all on public.dentvid_admin_actions from anon, authenticated;
comment on table public.dentvid_admin_actions is 'DentVideo: audit log of owner actions in the admin panel. Service role only; append-only by convention.';

alter table public.dentvid_clinics add column if not exists admin_paused_at timestamptz;
alter table public.dentvid_clinics add column if not exists admin_pause_note text check (admin_pause_note is null or length(admin_pause_note) <= 500);

create table if not exists public.dentvid_email_sends (
  id          bigint generated always as identity primary key,
  clinic_id   uuid references public.dentvid_clinics(id) on delete cascade,
  kind        text not null check (kind ~ '^[a-z_]{3,40}$'),
  language    text check (language is null or language ~ '^[a-z]{2}$'),
  status      text not null check (status in ('sent', 'failed')),
  error       text check (error is null or length(error) <= 500),
  created_at  timestamptz not null default now()
);

create index if not exists dentvid_email_sends_created on public.dentvid_email_sends (created_at desc);
create index if not exists dentvid_email_sends_clinic on public.dentvid_email_sends (clinic_id, created_at desc) where clinic_id is not null;

alter table public.dentvid_email_sends enable row level security;
revoke all on public.dentvid_email_sends from anon, authenticated;
comment on table public.dentvid_email_sends is 'DentVideo: transactional email attempts per clinic (kind, language, outcome). No addresses or content. Service role only.';

-- The clinic owner can update their own row through the REST API (0001's
-- "self update" policy); like plan/billing (0002's guard), the owner's pause
-- is kept out of their reach: only the service role may set or clear it.
create or replace function public.dentvid_clinics_guard_admin()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.admin_paused_at := null;
      new.admin_pause_note := null;
    else
      new.admin_paused_at := old.admin_paused_at;
      new.admin_pause_note := old.admin_pause_note;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_clinics_guard_admin on public.dentvid_clinics;
create trigger dentvid_clinics_guard_admin
  before insert or update on public.dentvid_clinics
  for each row execute function public.dentvid_clinics_guard_admin();

-- Checks (run after applying) -------------------------------------------------
-- select relname, relrowsecurity from pg_class where relname in ('dentvid_admin_actions', 'dentvid_email_sends');  -- t, t
-- select count(*) from pg_policies where tablename in ('dentvid_admin_actions', 'dentvid_email_sends');             -- 0
-- select column_name from information_schema.columns where table_name = 'dentvid_clinics' and column_name like 'admin_%';
