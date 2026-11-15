-- ============================================================
-- DentVideo: clinic referrals ("give a month, get a month") on Liman.
-- NOT applied automatically. Apply by hand after 0001–0017 (Liman SQL editor
-- or psql), then run the checks at the bottom. Idempotent; safe to run twice.
-- The app and the webhook keep working before it is applied: they detect the
-- missing columns / table and simply offer no referral program.
--
-- 1. dentvid_clinics gets four columns, all written only by the service role
--    (the web app's API routes and the Dodo webhook):
--      referral_code          the clinic's own code (DV + 6 chars), made the
--                             first time its owner opens Settings
--      referred_by_code       the code the clinic signed up with (?ref=…)
--      referred_by_clinic_id  the clinic that owns that code (no FK: a
--                             referrer deleting its account must not touch
--                             the referred clinic's row through a cascade)
--      referred_at            when the referral was attached
--    The owner's own update policy (0001) covers the whole row, so a trigger
--    reverts any owner (anon / authenticated) write to these columns, like
--    the billing guard in 0002. An owner can therefore never pick a code,
--    claim a referrer, or point a referral at themselves through PostgREST.
--
-- 2. dentvid_referral_rewards — one row per referred clinic (unique), made by
--    the webhook when the referred clinic's first payment succeeds. It is the
--    referrer's free month, held for the refund window:
--      pending   recorded; due once eligible_at has passed (30 days)
--      applied   the owner applied the free month in Dodo (admin panel)
--      void      refunded / charged back / self-referral — no credit
--      capped    over the per-clinic yearly cap — no credit
--    Service role only: RLS on, no policies, every grant revoked from anon
--    and authenticated (clients can neither read nor write rewards).
-- ============================================================

-- 1. Clinic columns --------------------------------------------------------------
alter table public.dentvid_clinics add column if not exists referral_code text;
alter table public.dentvid_clinics add column if not exists referred_by_code text;
alter table public.dentvid_clinics add column if not exists referred_by_clinic_id uuid;
alter table public.dentvid_clinics add column if not exists referred_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'dentvid_clinics_referral_code_check') then
    alter table public.dentvid_clinics
      add constraint dentvid_clinics_referral_code_check check (referral_code is null or referral_code ~ '^DV[2-9A-HJ-NP-Z]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dentvid_clinics_referred_by_code_check') then
    alter table public.dentvid_clinics
      add constraint dentvid_clinics_referred_by_code_check check (referred_by_code is null or referred_by_code ~ '^DV[2-9A-HJ-NP-Z]{6}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'dentvid_clinics_not_self_referred') then
    alter table public.dentvid_clinics
      add constraint dentvid_clinics_not_self_referred check (referred_by_clinic_id is null or referred_by_clinic_id <> id);
  end if;
end $$;

create unique index if not exists dentvid_clinics_referral_code on public.dentvid_clinics (referral_code) where referral_code is not null;
create index if not exists dentvid_clinics_referred_by on public.dentvid_clinics (referred_by_clinic_id) where referred_by_clinic_id is not null;

create or replace function public.dentvid_clinics_guard_referral()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      new.referral_code := null;
      new.referred_by_code := null;
      new.referred_by_clinic_id := null;
      new.referred_at := null;
    else
      new.referral_code := old.referral_code;
      new.referred_by_code := old.referred_by_code;
      new.referred_by_clinic_id := old.referred_by_clinic_id;
      new.referred_at := old.referred_at;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists dentvid_clinics_guard_referral on public.dentvid_clinics;
create trigger dentvid_clinics_guard_referral
  before insert or update on public.dentvid_clinics
  for each row execute function public.dentvid_clinics_guard_referral();

comment on column public.dentvid_clinics.referral_code is 'DentVideo: this clinic''s own referral code (DV + 6). Service role only.';
comment on column public.dentvid_clinics.referred_by_code is 'DentVideo: referral code the clinic signed up with. Service role only, set once, before the first payment.';
comment on column public.dentvid_clinics.referred_by_clinic_id is 'DentVideo: clinic owning referred_by_code (no FK on purpose). Service role only.';
comment on column public.dentvid_clinics.referred_at is 'DentVideo: when the referral was attached.';

-- 2. Rewards ----------------------------------------------------------------------
create table if not exists public.dentvid_referral_rewards (
  id                  bigint generated always as identity primary key,
  -- One reward per referred clinic, ever: the webhook's idempotency key.
  -- Kept (set null) when the referred clinic deletes its account after paying.
  referred_clinic_id  uuid unique references public.dentvid_clinics(id) on delete set null,
  referrer_clinic_id  uuid not null references public.dentvid_clinics(id) on delete cascade,
  code                text not null,
  dodo_payment_id     text,
  dodo_subscription_id text,
  first_paid_at       timestamptz not null,
  -- first_paid_at + the hold (refund window); a pending reward is due after it.
  eligible_at         timestamptz not null,
  status              text not null default 'pending' check (status in ('pending', 'applied', 'void', 'capped')),
  void_reason         text,
  applied_at          timestamptz,
  applied_note        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint dentvid_referral_rewards_not_self check (referred_clinic_id is null or referred_clinic_id <> referrer_clinic_id)
);

create index if not exists dentvid_referral_rewards_referrer on public.dentvid_referral_rewards (referrer_clinic_id, first_paid_at desc);
create index if not exists dentvid_referral_rewards_open on public.dentvid_referral_rewards (eligible_at) where status = 'pending';

alter table public.dentvid_referral_rewards enable row level security;
revoke all on public.dentvid_referral_rewards from anon, authenticated;

comment on table public.dentvid_referral_rewards is 'DentVideo: referrer free months, one per referred clinic, held for the refund window, applied by hand in Dodo. Service role only.';

-- Checks (run after applying) -------------------------------------------------
-- select tgname from pg_trigger where tgrelid = 'public.dentvid_clinics'::regclass and tgname = 'dentvid_clinics_guard_referral';  -- 1 row
-- select relrowsecurity from pg_class where relname = 'dentvid_referral_rewards';                                                -- t
-- select count(*) from pg_policies where tablename = 'dentvid_referral_rewards';                                                  -- 0
-- select grantee, privilege_type from information_schema.role_table_grants
--  where table_name = 'dentvid_referral_rewards' and grantee in ('anon', 'authenticated');                                         -- 0 rows
-- As an owner (authenticated JWT): update dentvid_clinics set referred_by_code = 'DVABCDEF' where owner_id = auth.uid();
--   then select referred_by_code ...  -- unchanged (null)
