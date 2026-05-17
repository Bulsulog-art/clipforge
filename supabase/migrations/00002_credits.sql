-- ============================================================
-- ClipForge — Credits & consumable IAP support
-- Apple-refund-safe: credits are tracked atomically, deducted on use,
-- and consumable IAP can't be refunded once consumed.
-- ============================================================

set search_path = clipforge, public;

-- Credit balance lives on profile for fast reads
alter table clipforge.profiles
  add column if not exists credits_balance integer not null default 0,
  add column if not exists credits_lifetime_purchased integer not null default 0,
  add column if not exists credits_lifetime_consumed integer not null default 0,
  add column if not exists free_credits_refilled_at date;

-- Audit log for every credit movement (purchase / consume / refund / grant)
create type clipforge.credit_event_kind as enum (
  'purchase',          -- Apple/Stripe IAP
  'subscription_grant',-- monthly Plus/Pro subscription credits
  'free_monthly',      -- free tier monthly refill
  'consume',           -- video processed / thumbnail generated etc.
  'refund',            -- Apple refund webhook
  'admin_grant',       -- support team gift
  'bonus'              -- referral / promo
);

create table if not exists clipforge.credit_events (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references clipforge.profiles(id) on delete cascade,
  kind clipforge.credit_event_kind not null,
  amount integer not null,             -- positive = credit, negative = debit
  reason text,                          -- "clip generation", "iap product clipforge_credits_30" etc.
  reference text,                       -- external id (RC transaction, job id, etc.)
  metadata jsonb,
  balance_after integer not null,
  created_at timestamptz not null default now()
);
create index if not exists credit_events_user_idx on clipforge.credit_events (user_id, created_at desc);
create index if not exists credit_events_ref_idx on clipforge.credit_events (reference);

alter table clipforge.credit_events enable row level security;
create policy "credit events self read" on clipforge.credit_events
  for select using (auth.uid() = user_id);

-- Atomic credit operations via SECURITY DEFINER functions
-- These prevent race conditions when the worker deducts credits in parallel
create or replace function clipforge.grant_credits(
  p_user_id uuid,
  p_amount integer,
  p_kind clipforge.credit_event_kind,
  p_reason text default null,
  p_reference text default null,
  p_metadata jsonb default '{}'::jsonb
) returns integer
language plpgsql
security definer
set search_path = clipforge, public
as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'grant_credits requires positive amount';
  end if;

  update clipforge.profiles
  set credits_balance = credits_balance + p_amount,
      credits_lifetime_purchased = case
        when p_kind in ('purchase','subscription_grant') then credits_lifetime_purchased + p_amount
        else credits_lifetime_purchased
      end
  where id = p_user_id
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'profile not found: %', p_user_id;
  end if;

  insert into clipforge.credit_events (user_id, kind, amount, reason, reference, metadata, balance_after)
  values (p_user_id, p_kind, p_amount, p_reason, p_reference, p_metadata, new_balance);

  return new_balance;
end;
$$;

create or replace function clipforge.consume_credits(
  p_user_id uuid,
  p_amount integer,
  p_reason text default null,
  p_reference text default null
) returns integer
language plpgsql
security definer
set search_path = clipforge, public
as $$
declare
  new_balance integer;
begin
  if p_amount <= 0 then
    raise exception 'consume_credits requires positive amount';
  end if;

  update clipforge.profiles
  set credits_balance = credits_balance - p_amount,
      credits_lifetime_consumed = credits_lifetime_consumed + p_amount
  where id = p_user_id
    and credits_balance >= p_amount
  returning credits_balance into new_balance;

  if new_balance is null then
    raise exception 'insufficient_credits' using errcode = 'P0001';
  end if;

  insert into clipforge.credit_events (user_id, kind, amount, reason, reference, balance_after)
  values (p_user_id, 'consume', -p_amount, p_reason, p_reference, new_balance);

  return new_balance;
end;
$$;

-- Free monthly top-up — call from a Supabase cron at month start
create or replace function clipforge.refill_free_credits(p_amount integer default 5)
returns integer
language plpgsql
security definer
set search_path = clipforge, public
as $$
declare
  refilled integer := 0;
  rec record;
begin
  for rec in
    select id from clipforge.profiles
    where tier = 'free'
      and (free_credits_refilled_at is null
           or free_credits_refilled_at < date_trunc('month', current_date)::date)
  loop
    perform clipforge.grant_credits(rec.id, p_amount, 'free_monthly', 'monthly refill');
    update clipforge.profiles
      set free_credits_refilled_at = current_date
      where id = rec.id;
    refilled := refilled + 1;
  end loop;
  return refilled;
end;
$$;

-- Grant initial 5 free credits to existing users
update clipforge.profiles
set credits_balance = 5,
    free_credits_refilled_at = current_date
where credits_balance = 0
  and free_credits_refilled_at is null;

-- Update the new user trigger to grant 5 starter credits
create or replace function clipforge.handle_new_user()
returns trigger language plpgsql security definer set search_path = clipforge, public as $$
begin
  insert into clipforge.profiles (id, email, credits_balance, free_credits_refilled_at)
  values (new.id, new.email, 5, current_date)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Convenience view: monthly limits / credits remaining
create or replace view clipforge.v_user_credits as
select
  p.id as user_id,
  p.tier,
  p.credits_balance,
  p.credits_lifetime_purchased,
  p.credits_lifetime_consumed,
  case p.tier
    when 'free' then 5
    when 'starter' then 30
    when 'pro' then 150
    when 'agency' then 800
  end as monthly_grant
from clipforge.profiles p;
