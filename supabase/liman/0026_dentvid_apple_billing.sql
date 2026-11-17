-- ============================================================
-- DentVideo: plans bought in the iPhone app (Apple in-app purchase through
-- RevenueCat) next to the web's Dodo plans (Liman). Additive only.
-- NOT applied automatically. Apply by hand after 0025 (Liman SQL editor or
-- psql), then run the checks at the bottom. Idempotent; safe to run twice.
-- docs/DENTVIDEO_IAP_PLAN.md describes the whole flow.
--
-- 1. dentvid_clinics.billing_source ('dodo' | 'apple', null = no plan yet or a
--    plan from before this migration, treated as the web's) and
--    apple_original_transaction_id (the App Store subscription the plan comes
--    from). Written only by the service role (the RevenueCat and Dodo
--    webhooks); a trigger reverts any owner write, like 0002 does for the
--    other billing columns.
-- 2. dentvid_apple_subscriptions: every App Store subscription seen for a
--    clinic, with the last RevenueCat event applied (id, time, type), so a
--    repeated or out-of-order webhook never undoes newer state, a second
--    subscription is recorded rather than overwriting the first, and a
--    cancelled one remembers until when it is paid. Service role only (RLS
--    on, no policies, grants revoked).
--
-- Until this is applied the app keeps working: the RevenueCat webhook still
-- switches a paying clinic on (and alerts the owner to apply this file), the
-- web shows the Dodo screens as before, and the nightly reconcile skips the
-- App Store branch.
-- ============================================================

-- 1. Billing source on the clinic ---------------------------------------------

alter table public.dentvid_clinics add column if not exists billing_source text;
alter table public.dentvid_clinics add column if not exists apple_original_transaction_id text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dentvid_clinics_billing_source_check') then
    alter table public.dentvid_clinics
      add constraint dentvid_clinics_billing_source_check check (billing_source is null or billing_source in ('dodo', 'apple'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dentvid_clinics_apple_otid_check') then
    alter table public.dentvid_clinics
      add constraint dentvid_clinics_apple_otid_check check (apple_original_transaction_id is null or apple_original_transaction_id ~ '^[A-Za-z0-9._:-]{1,120}$');
  end if;
end $$;

comment on column public.dentvid_clinics.billing_source is
  'DentVideo: where the plan is paid — dodo (web checkout) or apple (iPhone app, App Store via RevenueCat). Set by the webhooks only.';
comment on column public.dentvid_clinics.apple_original_transaction_id is
  'DentVideo: the App Store original transaction id of the subscription the plan comes from (billing_source = apple).';

create index if not exists dentvid_clinics_apple_otid on public.dentvid_clinics (apple_original_transaction_id)
  where apple_original_transaction_id is not null;

-- An owner cannot set or move these through the REST API (that would let the web believe the App Store bills it).
create or replace function public.dentvid_clinics_guard_billing_source()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.billing_source := null;
      new.apple_original_transaction_id := null;
    else
      new.billing_source := old.billing_source;
      new.apple_original_transaction_id := old.apple_original_transaction_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_clinics_guard_billing_source on public.dentvid_clinics;
create trigger dentvid_clinics_guard_billing_source
  before insert or update on public.dentvid_clinics
  for each row execute function public.dentvid_clinics_guard_billing_source();

-- 2. App Store subscription ledger ----------------------------------------------

create table if not exists public.dentvid_apple_subscriptions (
  original_transaction_id text primary key check (original_transaction_id ~ '^[A-Za-z0-9._:-]{1,120}$'),
  clinic_id        uuid not null references public.dentvid_clinics(id) on delete cascade,
  -- The Liman login RevenueCat knows as app_user_id.
  app_user_id      uuid not null,
  -- active, cancelled (auto-renew off, paid until period_end), billing_issue, expired, refunded,
  -- duplicate (a second subscription while another was live), transferred, ignored_sandbox.
  status           text not null,
  product          text,
  tier             text check (tier is null or tier in ('starter', 'practice')),
  -- A downgrade Apple applies at the next renewal.
  pending_tier     text check (pending_tier is null or pending_tier in ('starter', 'practice')),
  environment      text check (environment is null or environment in ('PRODUCTION', 'SANDBOX')),
  period_end       timestamptz,
  last_event_id    text,
  last_event_at    timestamptz,
  last_event_type  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists dentvid_apple_subscriptions_clinic on public.dentvid_apple_subscriptions (clinic_id, updated_at desc);

alter table public.dentvid_apple_subscriptions enable row level security;
revoke all on public.dentvid_apple_subscriptions from anon, authenticated;

comment on table public.dentvid_apple_subscriptions is
  'DentVideo: every App Store subscription seen per clinic (RevenueCat webhook), with the last event applied. Service role only.';

-- Checks (run after applying) -----------------------------------------------------
-- select column_name from information_schema.columns where table_name = 'dentvid_clinics'
--  and column_name in ('billing_source', 'apple_original_transaction_id');                       -- 2 rows
-- select tgname from pg_trigger where tgrelid = 'public.dentvid_clinics'::regclass and tgname = 'dentvid_clinics_guard_billing_source';  -- 1 row
-- select relname, relrowsecurity from pg_class where relname = 'dentvid_apple_subscriptions';     -- t
-- select count(*) from pg_policies where tablename = 'dentvid_apple_subscriptions';               -- 0
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_name = 'dentvid_apple_subscriptions' and grantee in ('anon', 'authenticated');    -- 0 rows
-- Existing rows are untouched (every existing plan is the web's):
-- select count(*) from public.dentvid_clinics where billing_source is not null or apple_original_transaction_id is not null;  -- 0
-- Then, as a real clinic: save the clinic form and approve a video — both still work, and
--   update public.dentvid_clinics set billing_source = 'apple' where owner_id = auth.uid();
-- run with the clinic's JWT leaves billing_source unchanged.
